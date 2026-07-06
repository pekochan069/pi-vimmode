import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import type { BindablePromptTransformActionId } from "./prompt-transform-actions.ts";
import type { VimActionBindingMode, VimEditorOptions, VimInsertAction, VimMode } from "./types.ts";

import { protectedShortcutForKey } from "./customization.ts";

export const DEFAULT_JS_CONFIG_PATH = join(homedir(), ".pi", "agent", "pi-vimmode.config.js");

export type VimJsConfigLoadResult = {
  partial?: VimEditorOptions;
  warnings: string[];
  appendKeymap?: boolean;
};

type BuiltinCommand =
  | { kind: "insert"; action: VimInsertAction }
  | {
      kind: "promptTransform";
      actionId: BindablePromptTransformActionId;
      args?: Record<string, unknown>;
    };

type BuilderState = {
  partial: VimEditorOptions;
  warnings: string[];
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

function warning(message: string): string {
  return `global JS config: ${message}`;
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

function addInsertBinding(state: BuilderState, lhs: string, action: VimInsertAction): void {
  const keymap = (state.partial.keymap ??= {});
  const insert = (keymap.insert ??= {});
  insert[action] = [...(insert[action] ?? []), lhs];
}

const RHS_INPUT_ALIASES: Record<string, string> = {
  cr: "\r",
  enter: "\r",
  return: "\r",
  esc: "\x1b",
  escape: "\x1b",
  tab: "\t",
};

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

function tokenizeReplayInputs(value: string): string[] | undefined {
  const keys = tokenizeKeys(value);
  if (!keys) return undefined;
  return keys.map((key) => RHS_INPUT_ALIASES[key] ?? key);
}

function addActionBinding(
  state: BuilderState,
  lhs: string,
  command: Extract<BuiltinCommand, { kind: "promptTransform" }>,
  modes: readonly VimMode[],
): void {
  const actionModes = modes.filter((mode) => mode !== "insert") as Exclude<VimMode, "insert">[];
  if (actionModes.length === 0) {
    state.warnings.push(warning(`${command.actionId} does not support insert mode`));
    return;
  }
  const keymap = (state.partial.keymap ??= {});
  const actions = (keymap.actions ??= {});
  actions[command.actionId] = [
    ...(actions[command.actionId] ?? []),
    { key: lhs, args: command.args, modes: actionModes },
  ];
}

function compileMapping(state: BuilderState, mode: unknown, lhs: unknown, rhs: unknown): void {
  const modes = modesFor(mode);
  if (!modes) {
    state.warnings.push(warning(`unsupported mode ${String(mode)}`));
    return;
  }
  if (typeof lhs !== "string" || lhs.length === 0) {
    state.warnings.push(warning("keymap lhs must be a non-empty string"));
    return;
  }
  const lhsKeys = tokenizeKeys(lhs);
  if (!lhsKeys || lhsKeys.length === 0) {
    state.warnings.push(warning("keymap lhs must contain supported key syntax"));
    return;
  }
  const normalizedLhs = lhsKeys.join("");
  const protectedShortcut = protectedShortcutForKey(normalizedLhs);
  if (protectedShortcut) {
    state.warnings.push(
      warning(`keymap lhs contains protected key ${normalizedLhs} (${protectedShortcut.reason})`),
    );
    return;
  }
  if (typeof rhs === "string") {
    addStringRemap(state, normalizedLhs, rhs, modes);
    return;
  }
  if (!isBuiltinCommand(rhs)) {
    state.warnings.push(warning("keymap rhs must be a vim.prompt.* builtin command or key string"));
    return;
  }
  if (rhs.kind === "insert") {
    if (!modes.includes("insert") || modes.length !== 1) {
      state.warnings.push(warning(`vim.prompt.${rhs.action}() only supports insert mode`));
      return;
    }
    if (!INSERT_ACTIONS.has(rhs.action)) {
      state.warnings.push(warning(`unsupported insert action ${rhs.action}`));
      return;
    }
    addInsertBinding(state, normalizedLhs, rhs.action);
    return;
  }
  addActionBinding(state, normalizedLhs, rhs, modes);
}

function addStringRemap(
  state: BuilderState,
  lhs: string,
  rhs: string,
  modes: readonly VimMode[],
): void {
  const actionModes = modes.filter((mode) => mode !== "insert") as VimActionBindingMode[];
  if (actionModes.length === 0) {
    state.warnings.push(warning("string rhs keymaps only support normal and visual modes"));
    return;
  }
  const inputs = tokenizeReplayInputs(rhs);
  if (!inputs || inputs.length === 0) {
    state.warnings.push(warning("string rhs must contain supported key syntax"));
    return;
  }
  const keymap = (state.partial.keymap ??= {});
  const remaps = (keymap.remaps ??= { accepted: [] });
  remaps.accepted = [...remaps.accepted, { key: lhs, inputs, modes: actionModes }];
}

function buildVim() {
  const state: BuilderState = { partial: {}, warnings: [] };
  const prompt = {
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
  };
  return {
    state,
    vim: {
      prompt,
      keymap: {
        set: (mode: unknown, lhs: unknown, rhs: unknown) => compileMapping(state, mode, lhs, rhs),
      },
    },
  };
}

export async function loadVimJsConfig(
  configPath = DEFAULT_JS_CONFIG_PATH,
): Promise<VimJsConfigLoadResult> {
  if (!existsSync(configPath)) return { warnings: [] };

  try {
    const mtime = statSync(configPath).mtimeMs;
    const moduleUrl = `${pathToFileURL(configPath).href}?mtime=${mtime}`;
    const module = (await import(moduleUrl)) as { default?: unknown };
    const exported = module.default;
    if (typeof exported !== "function") {
      return { warnings: [warning("default export must be a function")] };
    }
    const { state, vim } = buildVim();
    await exported(vim);
    return { partial: state.partial, warnings: state.warnings, appendKeymap: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { warnings: [warning(`failed to load (${message})`)] };
  }
}
