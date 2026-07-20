import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import type { BindablePromptTransformActionId } from "./prompt-transform-actions.ts";
import type {
  VimActionBindingMode,
  VimFiniteActionId,
  VimInsertAction,
  VimPreset,
} from "./types.ts";

import { protectedShortcutForKey } from "./customization.ts";
import {
  KEYMAP_COMMAND_DESCRIPTORS,
  KEYMAP_INSERT_DESCRIPTORS,
  KEYMAP_MARK_DESCRIPTORS,
  KEYMAP_MACRO_DESCRIPTORS,
  KEYMAP_MOTION_DESCRIPTORS,
  KEYMAP_OPERATOR_DESCRIPTORS,
  KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS,
  KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS,
} from "./keymap-descriptors.ts";
import {
  mappingScopesForKeymapEntry,
  VIM_MAPPING_SCOPES,
  type VimMappingFamily,
  type VimMappingScope,
} from "./mapping-scopes.ts";
import { PROMPT_TRANSFORM_ACTIONS } from "./prompt-transform-actions.ts";
import { VIM_PRESETS } from "./types.ts";

export const DEFAULT_JS_CONFIG_PATH = join(homedir(), ".pi", "agent", "pi-vimmode.config.js");

type ActionDescriptor = {
  actionId: VimFiniteActionId;
  args?: unknown;
};

const ACTION_DESCRIPTORS = new WeakMap<object, ActionDescriptor>();

export type VimJsConfigMapOperation =
  | {
      kind: "descriptor";
      actionId: VimFiniteActionId;
      key: string;
      modes: readonly VimMappingScope[];
      args?: Readonly<Record<string, unknown>>;
      allowProtected?: boolean;
      desc?: string;
    }
  | {
      kind: "insert";
      action: VimInsertAction;
      key: string;
      allowProtected?: boolean;
      desc?: string;
    }
  | {
      kind: "action";
      actionId: BindablePromptTransformActionId;
      key: string;
      args?: Readonly<Record<string, unknown>>;
      modes: readonly VimActionBindingMode[];
      allowProtected?: boolean;
      desc?: string;
    }
  | {
      kind: "remap";
      key: string;
      inputs: readonly string[];
      modes: readonly VimActionBindingMode[];
    }
  | {
      kind: "command";
      command: string;
      key: string;
      modes: readonly VimActionBindingMode[];
    };

export type VimJsConfigOperation =
  | { kind: "preset"; preset: VimPreset }
  | { kind: "leaf"; path: string; value: unknown }
  | { kind: "map"; mapping: VimJsConfigMapOperation }
  | { kind: "unmap"; key: string; modes: readonly VimMappingScope[]; allowProtected?: boolean };

export type VimJsConfigRules = {
  validate(
    path: string,
    value: unknown,
  ):
    | { readonly ok: true; readonly value: unknown }
    | { readonly ok: false; readonly message: string };
  applyPreset(state: Record<string, unknown>, preset: VimPreset): Record<string, unknown>;
};

export type VimJsConfigLoadResult =
  | { kind: "missing"; warnings: readonly string[] }
  | { kind: "success"; operations: readonly VimJsConfigOperation[]; warnings: readonly string[] }
  | { kind: "fatal"; warnings: readonly string[] };

type ConfigSession = {
  vim: object;
  assertOpen(): void;
  close(): void;
  readOption(path: string): unknown;
  setOption(path: string, value: unknown): void;
  setPreset(value: unknown): void;
  warning(message: string): void;
  recordMap(mapping: VimJsConfigMapOperation): void;
  recordUnmap(key: string, modes: readonly VimMappingScope[], allowProtected?: boolean): void;
  success(): Extract<VimJsConfigLoadResult, { kind: "success" }>;
};

const MODE_ALIASES: Record<string, readonly VimMappingScope[]> = {
  i: ["insert"],
  insert: ["insert"],
  n: ["normal"],
  normal: ["normal"],
  v: ["visual", "visualLine", "visualBlock"],
  x: ["visual", "visualLine", "visualBlock"],
  visual: ["visual", "visualLine", "visualBlock"],
  visualLine: ["visualLine"],
  visualBlock: ["visualBlock"],
  o: ["operatorPending"],
  operatorPending: ["operatorPending"],
  "operator-pending": ["operatorPending"],
};

const ACTION_FAMILIES: ReadonlyArray<
  readonly [VimMappingFamily, Record<string, { defaults: readonly string[] }>]
> = [
  ["operator", KEYMAP_OPERATOR_DESCRIPTORS],
  ["motion", KEYMAP_MOTION_DESCRIPTORS],
  ["command", KEYMAP_COMMAND_DESCRIPTORS],
  ["macro", KEYMAP_MACRO_DESCRIPTORS],
  ["mark", KEYMAP_MARK_DESCRIPTORS],
  ["insert", KEYMAP_INSERT_DESCRIPTORS],
  ["textObject.kind", KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS],
  ["textObject.target", KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS],
];

const INSERT_ACTIONS = new Set<VimInsertAction>(
  Object.keys(KEYMAP_INSERT_DESCRIPTORS) as VimInsertAction[],
);

const ACTION_SCOPES = new Map<VimFiniteActionId, readonly VimMappingScope[]>([
  ["escape", VIM_MAPPING_SCOPES.filter((scope) => scope !== "normal")],
  ...ACTION_FAMILIES.flatMap(([family, actions]) =>
    Object.keys(actions).map(
      (action) =>
        [
          `${family}.${action}` as VimFiniteActionId,
          mappingScopesForKeymapEntry(family, action).filter(
            (scope) => family !== "mark" || scope !== "operatorPending",
          ),
        ] as const,
    ),
  ),
  ...PROMPT_TRANSFORM_ACTIONS.map(({ id, modes }) => [id as VimFiniteActionId, modes] as const),
]);

function hasValidDescriptorArguments(actionId: VimFiniteActionId, args: unknown): boolean {
  if (args === undefined) return true;
  if (!args || typeof args !== "object" || Array.isArray(args)) return false;
  const record = args as Record<string, unknown>;
  if (actionId === "prompt.transform.fence") {
    return Object.keys(record).every(
      (key) => key === "language" && typeof record.language === "string",
    );
  }
  if (actionId === "prompt.transform.reflow") {
    return Object.keys(record).every((key) => key === "width" && typeof record.width === "number");
  }
  return false;
}

const VIM_PRESET_SET = new Set<VimPreset>(VIM_PRESETS);

const RHS_INPUT_ALIASES: Record<string, string> = {
  cr: "\r",
  enter: "\r",
  return: "\r",
  esc: "\x1b",
  escape: "\x1b",
  tab: "\t",
};

let rootLoadId = 0;

function warning(message: string): string {
  return `global JS config: ${message}`;
}

function frozenSnapshot<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map(frozenSnapshot)) as T;
  if (!value || typeof value !== "object") return value;
  return Object.freeze(
    Object.fromEntries(Object.entries(value).map(([key, child]) => [key, frozenSnapshot(child)])),
  ) as T;
}

type OptionEntry = { path: string };

const OPTION_ENTRIES: readonly OptionEntry[] = [
  { path: "leader" },
  { path: "startMode" },
  ...["insert", "normal", "visual", "visualLine", "visualBlock"].map((mode) => ({
    path: `cursor.${mode}`,
  })),
  { path: "keymap.actionPresets" },
  { path: "keymap.operatorMotions" },
  { path: "ui.status.enabled" },
  { path: "ui.status.position" },
  { path: "ui.status.items" },
  { path: "ui.mode.enabled" },
  { path: "ui.mode.labels" },
  { path: "ui.mode.narrowLabels" },
  { path: "ui.selection.enabled" },
  { path: "ui.selection.previewMaxChars" },
  { path: "ui.cursorPosition.enabled" },
  { path: "ui.cursorPosition.base" },
  { path: "ui.cursorPosition.format" },
  { path: "ui.workbench.reservedRows" },
  { path: "macros.enabled" },
  { path: "macros.slots" },
  { path: "macros.maxReplaySteps" },
  { path: "marks.enabled" },
  { path: "marks.slots" },
  { path: "search.highlight" },
  { path: "search.highlightCurrent" },
  { path: "search.clearOnCancel" },
  { path: "search.clearOnInsert" },
  { path: "search.maxHighlights" },
  { path: "exCommand.autocomplete" },
  { path: "feedback.noop" },
  { path: "promptStructures.enabled" },
  { path: "promptStructures.targets" },
  { path: "promptTransforms.enabled" },
  { path: "promptTransforms.actions" },
  { path: "promptTransforms.commands" },
];

function optionPath(prefix: string, property: string): string {
  return prefix ? `${prefix}.${property}` : property;
}

function hasOption(path: string): boolean {
  return OPTION_ENTRIES.some((entry) => entry.path === path);
}

function hasOptionChild(path: string): boolean {
  return OPTION_ENTRIES.some((entry) => entry.path.startsWith(`${path}.`));
}

export function optionValueAtPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

export function setOptionPath(value: Record<string, unknown>, path: string, next: unknown): void {
  const keys = path.split(".");
  const leaf = keys.pop();
  if (!leaf) return;
  let target = value;
  for (const key of keys) {
    const child = target[key];
    if (!child || typeof child !== "object") target[key] = {};
    target = target[key] as Record<string, unknown>;
  }
  target[leaf] = next;
}

function createOptionNamespace(
  session: ConfigSession,
  prefix: string,
  target: object = {},
): object {
  return new Proxy(target, {
    get(current, property, receiver) {
      if (typeof property !== "string") return Reflect.get(current, property, receiver);
      if (Reflect.has(current, property)) return Reflect.get(current, property, receiver);
      const path = optionPath(prefix, property);
      if (hasOption(path)) return frozenSnapshot(session.readOption(path));
      if (hasOptionChild(path)) return createOptionNamespace(session, path);
      return undefined;
    },
    set(current, property, value, receiver) {
      session.assertOpen();
      if (typeof property !== "string") return Reflect.set(current, property, value, receiver);
      if (Reflect.has(current, property)) return Reflect.set(current, property, value, receiver);
      const path = optionPath(prefix, property);
      if (hasOption(path)) {
        session.setOption(path, value);
        return true;
      }
      session.warning(`unknown vim${prefix ? `.${prefix}` : ""} property ${property}`);
      return true;
    },
    defineProperty(current, property, descriptor) {
      session.assertOpen();
      return Reflect.defineProperty(current, property, descriptor);
    },
  });
}

function modesFor(rawMode: unknown): readonly VimMappingScope[] | undefined {
  if (Array.isArray(rawMode)) {
    const modes: VimMappingScope[] = [];
    for (const mode of rawMode) {
      const resolved = modesFor(mode);
      if (!resolved) return undefined;
      modes.push(...resolved);
    }
    return [...new Set(modes)];
  }
  if (typeof rawMode !== "string") return undefined;
  return MODE_ALIASES[rawMode];
}

function descriptor(actionId: VimFiniteActionId, args?: unknown): object {
  const value = Object.freeze({});
  ACTION_DESCRIPTORS.set(value, {
    actionId,
    args: args === undefined ? undefined : frozenSnapshot(args),
  });
  return value;
}

function actionDescriptor(value: unknown): ActionDescriptor | undefined {
  return value && typeof value === "object" ? ACTION_DESCRIPTORS.get(value) : undefined;
}

function builtinPromptTransform(action: string, args?: unknown): object {
  return descriptor(`prompt.transform.${action}` as VimFiniteActionId, args);
}

function builtinInsert(action: VimInsertAction): object {
  return descriptor(`insert.${action}`);
}

function normalizeKey(value: string): string | undefined {
  const angleMatch = value.match(/^<(.+)>$/);
  if (!angleMatch) return value;

  const parts = angleMatch[1]?.split("-").filter(Boolean) ?? [];
  if (parts.length === 0) return undefined;

  const key = parts.at(-1)?.toLowerCase();
  if (!key) return undefined;

  const modifiers = parts.slice(0, -1).map((part) => {
    const modifier = part.toLowerCase();
    if (modifier === "c" || modifier === "control" || modifier === "ctrl") return "ctrl";
    if (modifier === "a" || modifier === "m" || modifier === "alt" || modifier === "meta") {
      return "alt";
    }
    if (modifier === "s" || modifier === "shift") return "shift";
    if (modifier === "super" || modifier === "cmd" || modifier === "d") return "super";
    return undefined;
  });

  if (modifiers.some((modifier) => modifier === undefined)) return undefined;
  return [...(modifiers as string[]), key].join("+");
}

function tokenizeKeys(value: string): string[] | undefined {
  const tokens = value.match(/<[^>]+>|./g) ?? [];
  const normalized = tokens.map(normalizeKey);
  return normalized.every((key) => key !== undefined) ? (normalized as string[]) : undefined;
}

function tokenizeLhsKeys(value: string): string[] | undefined {
  const tokens = value.match(/<[^>]+>|./g) ?? [];
  const normalized = tokens.map((token) =>
    /^<leader>$/i.test(token) ? "<leader>" : normalizeKey(token),
  );
  return normalized.every((key) => key !== undefined) ? (normalized as string[]) : undefined;
}

function tokenizeReplayInputs(value: string): string[] | undefined {
  const keys = tokenizeKeys(value);
  if (!keys) return undefined;
  return keys.map((key) => RHS_INPUT_ALIASES[key] ?? key);
}

type MappingOptions = { allowProtected?: boolean; desc?: string };

function mappingOptions(value: unknown): MappingOptions | undefined {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value);
  if (entries.some(([key]) => key !== "allowProtected" && key !== "desc")) return undefined;
  const options = value as MappingOptions;
  if (options.allowProtected !== undefined && typeof options.allowProtected !== "boolean")
    return undefined;
  if (options.desc !== undefined && typeof options.desc !== "string") return undefined;
  return options;
}

function recordDescriptorMapping(
  session: ConfigSession,
  key: string,
  modes: readonly VimMappingScope[],
  action: ActionDescriptor,
  options: MappingOptions,
): void {
  const scopes = ACTION_SCOPES.get(action.actionId);
  if (!scopes || !modes.every((candidate) => scopes.includes(candidate))) {
    session.warning(`${action.actionId} does not support selected mode`);
    return;
  }
  if (!hasValidDescriptorArguments(action.actionId, action.args)) {
    session.warning(`${action.actionId} does not accept these arguments`);
    return;
  }
  if (action.actionId.startsWith("insert.")) {
    const insertAction = action.actionId.slice("insert.".length) as VimInsertAction;
    if (!INSERT_ACTIONS.has(insertAction)) {
      session.warning(`unsupported insert action ${insertAction}`);
      return;
    }
    session.recordMap({
      kind: "insert",
      action: insertAction,
      key,
      ...(options.allowProtected ? { allowProtected: true } : {}),
      ...(options.desc === undefined ? {} : { desc: options.desc }),
    });
    return;
  }
  if (action.actionId.startsWith("prompt.transform.")) {
    session.recordMap({
      kind: "action",
      actionId: action.actionId as BindablePromptTransformActionId,
      key,
      args: action.args as Readonly<Record<string, unknown>> | undefined,
      modes: modes as VimActionBindingMode[],
      ...(options.allowProtected ? { allowProtected: true } : {}),
      ...(options.desc === undefined ? {} : { desc: options.desc }),
    });
    return;
  }
  session.recordMap({
    kind: "descriptor",
    actionId: action.actionId,
    key,
    modes,
    args: action.args as Readonly<Record<string, unknown>> | undefined,
    ...(options.allowProtected ? { allowProtected: true } : {}),
    ...(options.desc === undefined ? {} : { desc: options.desc }),
  });
}

function compileMapping(
  session: ConfigSession,
  mode: unknown,
  lhs: unknown,
  rhs: unknown,
  rawOptions?: unknown,
): void {
  session.assertOpen();
  const modes = modesFor(mode);
  if (!modes) {
    session.warning(`unsupported mode ${String(mode)}`);
    return;
  }
  if (typeof lhs !== "string" || lhs.length === 0) {
    session.warning("keymap lhs must be a non-empty string");
    return;
  }
  const options = mappingOptions(rawOptions);
  if (!options) {
    session.warning("keymap options only support allowProtected:boolean and desc:string");
    return;
  }
  const lhsKeys = tokenizeLhsKeys(lhs);
  if (!lhsKeys || lhsKeys.length === 0) {
    session.warning("keymap lhs must contain supported key syntax");
    return;
  }
  const key = lhsKeys.join("");
  const protectedKey = lhsKeys.find((candidate) => protectedShortcutForKey(candidate));
  const protectedShortcut = protectedKey ? protectedShortcutForKey(protectedKey) : undefined;
  if (protectedKey && protectedShortcut && !options.allowProtected) {
    session.warning(
      `keymap lhs contains protected key ${protectedKey} (${protectedShortcut.reason})`,
    );
    return;
  }
  if (rhs === null) {
    session.recordUnmap(key, modes, options.allowProtected);
    return;
  }
  if (typeof rhs === "string") {
    recordStringRemap(session, key, rhs, modes);
    return;
  }
  const action = actionDescriptor(rhs);
  if (!action) {
    session.warning(
      "keymap rhs must be an opaque vim.action descriptor, vim.prompt alias, key string, or null",
    );
    return;
  }
  recordDescriptorMapping(session, key, modes, action, options);
}

function recordStringRemap(
  session: ConfigSession,
  key: string,
  rhs: string,
  modes: readonly VimMappingScope[],
): void {
  const actionModes = modes.filter(
    (mode): mode is VimActionBindingMode =>
      mode === "normal" || mode === "visual" || mode === "visualLine" || mode === "visualBlock",
  );
  if (actionModes.length !== modes.length) {
    session.warning("string rhs keymaps only support normal and visual modes");
    return;
  }
  const inputs = tokenizeReplayInputs(rhs);
  if (!inputs || inputs.length === 0) {
    session.warning("string rhs must contain supported key syntax");
    return;
  }
  session.recordMap({ kind: "remap", key, inputs, modes: actionModes });
}

export function isPrintableLeader(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length === 1 &&
    value.charCodeAt(0) >= 32 &&
    value.charCodeAt(0) !== 127
  );
}

function createPromptApi() {
  return Object.freeze({
    quote: () => builtinPromptTransform("quote"),
    unquote: () => builtinPromptTransform("unquote"),
    bulletize: () => builtinPromptTransform("bulletize"),
    fence: (args: { language?: string } = {}) => builtinPromptTransform("fence", args),
    indent: () => builtinPromptTransform("indent"),
    dedent: () => builtinPromptTransform("dedent"),
    reflow: (args: { width?: number } = {}) => builtinPromptTransform("reflow", args),
    openLineBelow: () => builtinInsert("openLineBelow"),
    openLineAbove: () => builtinInsert("openLineAbove"),
    deleteWordBackward: () => builtinInsert("deleteWordBackward"),
    deleteWordForward: () => builtinInsert("deleteWordForward"),
    deleteLineBackward: () => builtinInsert("deleteLineBackward"),
    deleteLineForward: () => builtinInsert("deleteLineForward"),
    moveWordBackward: () => builtinInsert("moveWordBackward"),
    moveWordForward: () => builtinInsert("moveWordForward"),
    moveLineStart: () => builtinInsert("moveLineStart"),
    moveLineEnd: () => builtinInsert("moveLineEnd"),
  });
}

function actionFactory(actionId: VimFiniteActionId): (args?: unknown) => object {
  const factory = (args?: unknown) => descriptor(actionId, args);
  // EasyMotion historically exposed its default char target as the command leaf.
  // Keep that call while making the documented nested form available.
  if (actionId === "command.easymotion") {
    Object.assign(factory, { goToChar: () => descriptor(actionId) });
  }
  return Object.freeze(factory);
}

function actionApiTree(prefix = ""): object {
  const tree: Record<string, unknown> = {};
  for (const actionId of ACTION_SCOPES.keys()) {
    if (!actionId.startsWith(prefix)) continue;
    const suffix = actionId.slice(prefix.length);
    const [name, ...rest] = suffix.split(".");
    if (!name) continue;
    if (rest.length === 0) {
      tree[name] = actionFactory(actionId);
      continue;
    }
    tree[name] ??= actionApiTree(`${prefix}${name}.`);
  }
  return Object.freeze(tree);
}

function createGlobalApi(session: ConfigSession): object {
  return new Proxy(
    {
      get mapleader() {
        return session.readOption("leader");
      },
      set mapleader(value: unknown) {
        if (value !== null && !isPrintableLeader(value)) {
          session.warning("vim.g.mapleader must be one printable character or null");
          return;
        }
        session.setOption("leader", value);
      },
    },
    {
      set(target, property, value, receiver) {
        if (property === "mapleader") return Reflect.set(target, property, value, receiver);
        session.warning(`unknown vim.g property ${String(property)}`);
        return true;
      },
      defineProperty(target, property, descriptor) {
        session.assertOpen();
        return Reflect.defineProperty(target, property, descriptor);
      },
    },
  );
}

function createVimApi(session: ConfigSession, g: object): object {
  const keymap = createOptionNamespace(session, "keymap", {
    set: (mode: unknown, lhs: unknown, rhs: unknown, options?: unknown) =>
      compileMapping(session, mode, lhs, rhs, options),
  });
  return createOptionNamespace(session, "", {
    g,
    get preset() {
      return session.readOption("preset");
    },
    set preset(value: unknown) {
      session.setPreset(value);
    },
    action: actionApiTree(),
    prompt: createPromptApi(),
    keymap,
  });
}

function createSession(
  seed: Record<string, unknown> = {},
  rules?: VimJsConfigRules,
): ConfigSession {
  let closed = false;
  let staged = frozenSnapshot(seed) as Record<string, unknown>;
  const warnings: string[] = [];
  const operations: VimJsConfigOperation[] = [];
  const assertOpen = () => {
    if (closed) throw new Error("config session closed");
  };
  const session: ConfigSession = {
    vim: {},
    assertOpen,
    close: () => {
      closed = true;
    },
    readOption: (path) => {
      assertOpen();
      return optionValueAtPath(staged, path);
    },
    setOption: (path, value) => {
      assertOpen();
      const result = rules?.validate(path, value) ?? { ok: true as const, value };
      if (!result.ok) {
        warnings.push(warning(result.message));
        return;
      }
      const next = structuredClone(staged);
      setOptionPath(next, path, frozenSnapshot(result.value));
      staged = next;
      operations.push({ kind: "leaf", path, value: frozenSnapshot(result.value) });
    },
    setPreset: (value) => {
      assertOpen();
      if (typeof value !== "string" || !VIM_PRESET_SET.has(value as VimPreset)) {
        warnings.push(warning("vim.preset must be a supported preset"));
        return;
      }
      const next =
        rules?.applyPreset(structuredClone(staged), value as VimPreset) ?? structuredClone(staged);
      setOptionPath(next, "preset", value);
      staged = next;
      operations.push({ kind: "preset", preset: value as VimPreset });
    },
    warning: (message) => {
      assertOpen();
      warnings.push(warning(message));
    },
    recordMap: (mapping) => {
      assertOpen();
      operations.push({ kind: "map", mapping: frozenSnapshot(mapping) });
    },
    recordUnmap: (key, modes, allowProtected) => {
      assertOpen();
      operations.push({
        kind: "unmap",
        key,
        modes: frozenSnapshot(modes),
        ...(allowProtected ? { allowProtected: true } : {}),
      });
    },
    success: () => ({
      kind: "success",
      operations: frozenSnapshot(operations),
      warnings: frozenSnapshot(warnings),
    }),
  };
  session.vim = createVimApi(session, createGlobalApi(session));
  return session;
}

function fatal(error: unknown): Extract<VimJsConfigLoadResult, { kind: "fatal" }> {
  const message = error instanceof Error ? error.message : String(error);
  return { kind: "fatal", warnings: frozenSnapshot([warning(`failed to load (${message})`)]) };
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as PromiseLike<unknown>).then === "function"
  );
}

export async function loadVimJsConfig(
  configPath = DEFAULT_JS_CONFIG_PATH,
  seed: Record<string, unknown> = {},
  rules?: VimJsConfigRules,
): Promise<VimJsConfigLoadResult> {
  if (!existsSync(configPath)) return { kind: "missing", warnings: [] };

  let exported: unknown;
  try {
    const mtime = statSync(configPath).mtimeMs;
    const moduleUrl = `${pathToFileURL(configPath).href}?mtime=${mtime}&load=${++rootLoadId}`;
    const module = (await import(moduleUrl)) as { default?: unknown };
    exported = module.default;
  } catch (error) {
    return fatal(error);
  }
  if (typeof exported !== "function") return fatal(new Error("default export must be a function"));

  const session = createSession(seed, rules);
  try {
    const result = exported(session.vim);
    if (isThenable(result)) await result;
    return session.success();
  } catch (error) {
    return fatal(error);
  } finally {
    session.close();
  }
}
