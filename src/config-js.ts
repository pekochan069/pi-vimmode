import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import type { BindablePromptTransformActionId } from "./prompt-transform-actions.ts";
import type {
  VimActionBindingMode,
  VimEditorOptions,
  VimInsertAction,
  VimMode,
  VimPreset,
} from "./types.ts";

import { protectedShortcutForKey } from "./customization.ts";

export const DEFAULT_JS_CONFIG_PATH = join(homedir(), ".pi", "agent", "pi-vimmode.config.js");

type BuiltinCommand =
  | { kind: "insert"; action: VimInsertAction }
  | {
      kind: "promptTransform";
      actionId: BindablePromptTransformActionId;
      args?: Record<string, unknown>;
    };

export type VimJsConfigMapOperation =
  | { kind: "insert"; action: VimInsertAction; key: string }
  | {
      kind: "action";
      actionId: BindablePromptTransformActionId;
      key: string;
      args?: Readonly<Record<string, unknown>>;
      modes: readonly VimActionBindingMode[];
    }
  | {
      kind: "remap";
      key: string;
      inputs: readonly string[];
      modes: readonly VimActionBindingMode[];
    };

export type VimJsConfigOperation =
  | { kind: "preset"; preset: VimPreset }
  | { kind: "leaf"; path: "leader"; value: string | null }
  | { kind: "map"; mapping: VimJsConfigMapOperation }
  | { kind: "unmap"; key: string; modes: readonly VimMode[] };

export type VimJsConfigLoadResult =
  | { kind: "missing"; warnings: readonly string[] }
  | { kind: "success"; operations: readonly VimJsConfigOperation[]; warnings: readonly string[] }
  | { kind: "fatal"; warnings: readonly string[] };

type ConfigSession = {
  vim: object;
  assertOpen(): void;
  close(): void;
  readLeader(): string | null | undefined;
  setMapleader(value: unknown): void;
  setPreset(value: unknown): void;
  warning(message: string): void;
  recordMap(mapping: VimJsConfigMapOperation): void;
  recordUnmap(key: string, modes: readonly VimMode[]): void;
  success(): Extract<VimJsConfigLoadResult, { kind: "success" }>;
};

const MODE_ALIASES: Record<string, readonly VimMode[]> = {
  i: ["insert"],
  insert: ["insert"],
  n: ["normal"],
  normal: ["normal"],
  v: ["visual", "visualLine", "visualBlock"],
  visual: ["visual"],
  visualLine: ["visualLine"],
  visualBlock: ["visualBlock"],
};

const INSERT_ACTIONS = new Set<VimInsertAction>([
  "openLineBelow",
  "openLineAbove",
  "deleteWordBackward",
  "deleteWordForward",
  "deleteLineBackward",
  "deleteLineForward",
  "moveWordBackward",
  "moveWordForward",
  "moveLineStart",
  "moveLineEnd",
]);

const VIM_PRESETS = new Set<VimPreset>(["minimal", "prompt-safe", "vim-heavy"]);

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

function modesFor(rawMode: unknown): readonly VimMode[] | undefined {
  if (Array.isArray(rawMode)) {
    const modes = rawMode.flatMap((mode) => modesFor(mode) ?? []);
    return modes.length > 0 ? [...new Set(modes)] : undefined;
  }
  if (typeof rawMode !== "string") return undefined;
  return MODE_ALIASES[rawMode];
}

function isBuiltinCommand(value: unknown): value is BuiltinCommand {
  if (!value || typeof value !== "object") return false;
  const command = value as Partial<BuiltinCommand>;
  return command.kind === "insert" || command.kind === "promptTransform";
}

function builtinPromptTransform(action: string, args?: Record<string, unknown>): BuiltinCommand {
  return {
    kind: "promptTransform",
    actionId: `prompt.transform.${action}` as BindablePromptTransformActionId,
    args,
  };
}

function builtinInsert(action: VimInsertAction): BuiltinCommand {
  return { kind: "insert", action };
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

function compileMapping(session: ConfigSession, mode: unknown, lhs: unknown, rhs: unknown): void {
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
  const lhsKeys = tokenizeLhsKeys(lhs);
  if (!lhsKeys || lhsKeys.length === 0) {
    session.warning("keymap lhs must contain supported key syntax");
    return;
  }
  const key = lhsKeys.join("");
  const protectedKey = lhsKeys.find((candidate) => protectedShortcutForKey(candidate));
  const protectedShortcut = protectedKey ? protectedShortcutForKey(protectedKey) : undefined;
  if (protectedKey && protectedShortcut) {
    session.warning(
      `keymap lhs contains protected key ${protectedKey} (${protectedShortcut.reason})`,
    );
    return;
  }
  if (rhs === null) {
    session.recordUnmap(key, modes);
    return;
  }
  if (typeof rhs === "string") {
    recordStringRemap(session, key, rhs, modes);
    return;
  }
  if (!isBuiltinCommand(rhs)) {
    session.warning("keymap rhs must be a vim.prompt.* builtin command or key string");
    return;
  }
  if (rhs.kind === "insert") {
    if (!modes.includes("insert") || modes.length !== 1) {
      session.warning(`vim.prompt.${rhs.action}() only supports insert mode`);
      return;
    }
    if (!INSERT_ACTIONS.has(rhs.action)) {
      session.warning(`unsupported insert action ${rhs.action}`);
      return;
    }
    session.recordMap({ kind: "insert", action: rhs.action, key });
    return;
  }

  const actionModes = modes.filter((candidate) => candidate !== "insert") as VimActionBindingMode[];
  if (actionModes.length === 0) {
    session.warning(`${rhs.actionId} does not support insert mode`);
    return;
  }
  session.recordMap({
    kind: "action",
    actionId: rhs.actionId,
    key,
    args: rhs.args,
    modes: actionModes,
  });
}

function recordStringRemap(
  session: ConfigSession,
  key: string,
  rhs: string,
  modes: readonly VimMode[],
): void {
  const actionModes = modes.filter((mode) => mode !== "insert") as VimActionBindingMode[];
  if (actionModes.length === 0) {
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

function createGlobalApi(session: ConfigSession): object {
  return new Proxy(
    {
      get mapleader() {
        return session.readLeader();
      },
      set mapleader(value: unknown) {
        session.setMapleader(value);
      },
    },
    {
      set(target, property, value, receiver) {
        if (property === "mapleader") return Reflect.set(target, property, value, receiver);
        session.warning(`unknown vim.g property ${String(property)}`);
        return true;
      },
    },
  );
}

function createVimApi(session: ConfigSession, g: object): object {
  return new Proxy(
    {
      g,
      get preset() {
        return undefined;
      },
      set preset(value: unknown) {
        session.setPreset(value);
      },
      prompt: createPromptApi(),
      keymap: Object.freeze({
        set: (mode: unknown, lhs: unknown, rhs: unknown) => compileMapping(session, mode, lhs, rhs),
      }),
    },
    {
      set(target, property, value, receiver) {
        if (property === "preset") return Reflect.set(target, property, value, receiver);
        session.warning(`unknown vim property ${String(property)}`);
        return true;
      },
    },
  );
}

function createSession(seed: Pick<VimEditorOptions, "leader"> = {}): ConfigSession {
  let closed = false;
  let leader = seed.leader;
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
    readLeader: () => {
      assertOpen();
      return leader;
    },
    setMapleader: (value) => {
      assertOpen();
      if (value === null || isPrintableLeader(value)) {
        leader = value;
        operations.push({ kind: "leaf", path: "leader", value });
        return;
      }
      warnings.push(warning("vim.g.mapleader must be one printable character or null"));
    },
    setPreset: (value) => {
      assertOpen();
      if (typeof value === "string" && VIM_PRESETS.has(value as VimPreset)) {
        operations.push({ kind: "preset", preset: value as VimPreset });
        return;
      }
      warnings.push(warning("vim.preset must be a supported preset"));
    },
    warning: (message) => {
      assertOpen();
      warnings.push(warning(message));
    },
    recordMap: (mapping) => {
      assertOpen();
      operations.push({ kind: "map", mapping: frozenSnapshot(mapping) });
    },
    recordUnmap: (key, modes) => {
      assertOpen();
      operations.push({ kind: "unmap", key, modes: frozenSnapshot(modes) });
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
  seed: Pick<VimEditorOptions, "leader"> = {},
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

  const session = createSession(seed);
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
