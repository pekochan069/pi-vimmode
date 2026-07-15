import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { BindablePromptTransformActionId } from "./prompt-transform-actions.ts";
import type {
  CursorStyle,
  CursorStyles,
  PromptStructureTarget,
  PromptTransformAction,
  ResolvedVimActionBinding,
  ResolvedVimExCommand,
  ResolvedVimInsertKeymap,
  ResolvedVimKeymap,
  ResolvedVimMacros,
  ResolvedVimMarks,
  ResolvedVimPromptStructures,
  ResolvedVimPromptTransforms,
  ResolvedVimSearch,
  ResolvedVimUi,
  StartupMode,
  VimActionBindingMode,
  VimActionKeybindingPreset,
  VimCommandAction,
  VimEditorOptions,
  ResolvedVimEditorOptions,
  VimFeedbackOptions,
  VimMode,
  VimMotionAction,
  VimMotionOperatorAction,
  VimOperatorAction,
  VimPreset,
  VimStatusItem,
  VimTextObjectKind,
  VimTextObjectTarget,
  VimUiEditorOptions,
} from "./types.ts";

import {
  actionKeybindingPresetActions,
  isActionKeybindingPreset,
} from "./action-keybinding-recipes.ts";
import {
  DEFAULT_JS_CONFIG_PATH,
  isPrintableLeader,
  loadVimJsConfig,
  type VimJsConfigOperation,
} from "./config-js.ts";
import { protectedShortcutForKey } from "./customization.ts";
import {
  deriveActionKeys,
  deriveActionsWhere,
  deriveDefaultKeyBindings,
  deriveSet,
  KEYMAP_COMMAND_DESCRIPTORS,
  KEYMAP_INSERT_DESCRIPTORS,
  KEYMAP_MARK_DESCRIPTORS,
  KEYMAP_MACRO_DESCRIPTORS,
  KEYMAP_MOTION_DESCRIPTORS,
  KEYMAP_OPERATOR_DESCRIPTORS,
  KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS,
  KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS,
} from "./keymap-descriptors.ts";
import { grammarBindingsForKeymap, grammarConflictForActionKey } from "./keymap-grammar.ts";
import {
  PROMPT_TRANSFORM_ACTIONS as PROMPT_TRANSFORM_ACTION_REGISTRY,
  bindablePromptTransformActionIds,
  normalizePromptTransformActionArgs,
  promptTransformActionForId,
} from "./prompt-transform-actions.ts";

const VIM_MODES = [
  "insert",
  "normal",
  "visual",
  "visualLine",
  "visualBlock",
] as const satisfies readonly VimMode[];
const REMAP_MODES = new Set<VimActionBindingMode>([
  "normal",
  "visual",
  "visualLine",
  "visualBlock",
]);
const START_MODES = new Set<StartupMode>(["insert", "normal"]);
const CURSOR_STYLES = new Set<CursorStyle>(["block", "bar", "underline"]);

export const VIM_MOTION_OPERATOR_ACTIONS = deriveActionsWhere(
  KEYMAP_OPERATOR_DESCRIPTORS,
  (descriptor) => "motionOperator" in descriptor && Boolean(descriptor.motionOperator),
) as readonly VimMotionOperatorAction[];
export const VIM_OPERATOR_ACTIONS = deriveActionKeys(
  KEYMAP_OPERATOR_DESCRIPTORS,
) as readonly VimOperatorAction[];
export const VIM_MOTION_ACTIONS = deriveActionKeys(
  KEYMAP_MOTION_DESCRIPTORS,
) as readonly VimMotionAction[];
export const VIM_COMMAND_ACTIONS = deriveActionKeys(
  KEYMAP_COMMAND_DESCRIPTORS,
) as readonly VimCommandAction[];
const MACRO_ACTION_SET = deriveSet(KEYMAP_MACRO_DESCRIPTORS);
const MARK_ACTION_SET = deriveSet(KEYMAP_MARK_DESCRIPTORS);
export const VIM_STATUS_ITEMS = [
  "mode",
  "pendingOperator",
  "selection",
  "cursorPosition",
] as const satisfies readonly VimStatusItem[];
export const VIM_TEXT_OBJECT_KINDS = deriveActionKeys(
  KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS,
) as VimTextObjectKind[];
export const VIM_TEXT_OBJECT_TARGETS = deriveActionKeys(
  KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS,
) as VimTextObjectTarget[];
export const PROMPT_STRUCTURE_TARGETS = [
  "codeFence",
  "headingSection",
  "listItem",
  "tag",
  "errorBlock",
] as const satisfies readonly PromptStructureTarget[];
export const PROMPT_TRANSFORM_ACTIONS = PROMPT_TRANSFORM_ACTION_REGISTRY.map(
  ({ action }) => action,
) as PromptTransformAction[];

const MOTION_OPERATOR_ACTION_SET = new Set<string>(VIM_MOTION_OPERATOR_ACTIONS);
const OPERATOR_ACTION_SET = deriveSet(KEYMAP_OPERATOR_DESCRIPTORS);
const MOTION_ACTION_SET = deriveSet(KEYMAP_MOTION_DESCRIPTORS);
const COMMAND_ACTION_SET = deriveSet(KEYMAP_COMMAND_DESCRIPTORS);
const INSERT_ACTION_SET = deriveSet(KEYMAP_INSERT_DESCRIPTORS);
const LOWERCASE_SLOT_KEYS = "abcdefghijklmnopqrstuvwxyz".split("");
const OPERATOR_MOTION_ACTIONS = VIM_MOTION_ACTIONS.filter(
  (action) => action !== "halfPageDown" && action !== "halfPageUp",
);
const OPERATOR_MOTION_ACTION_SET = new Set<string>(OPERATOR_MOTION_ACTIONS);
const STATUS_ITEM_SET = new Set<string>(VIM_STATUS_ITEMS);
const TEXT_OBJECT_KIND_SET = deriveSet(KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS);
const TEXT_OBJECT_TARGET_SET = deriveSet(KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS);
const PROMPT_STRUCTURE_TARGET_SET = new Set<string>(PROMPT_STRUCTURE_TARGETS);
const PROMPT_TRANSFORM_ACTION_SET = new Set<string>(PROMPT_TRANSFORM_ACTIONS);
const BINDABLE_PROMPT_TRANSFORM_ACTION_SET = new Set<string>(bindablePromptTransformActionIds());
const VIM_PRESETS = new Set<VimPreset>(["minimal", "prompt-safe", "vim-heavy"]);
const NOOP_FEEDBACK_VALUES = new Set<VimFeedbackOptions["noop"]>(["off", "status"]);
const WORKBENCH_RESERVED_ROWS_MAX = 5;

function freezeArrayRecord<T extends Record<string, readonly string[]>>(
  record: T,
): { readonly [K in keyof T]: readonly string[] } {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(record).map(([key, values]) => [key, Object.freeze([...values])]),
    ) as { [K in keyof T]: readonly string[] },
  );
}

export const DEFAULT_VIM_KEYMAP = Object.freeze({
  escape: Object.freeze([]),
  operators: freezeArrayRecord(deriveDefaultKeyBindings(KEYMAP_OPERATOR_DESCRIPTORS)),
  motions: freezeArrayRecord(deriveDefaultKeyBindings(KEYMAP_MOTION_DESCRIPTORS)),
  macros: freezeArrayRecord(deriveDefaultKeyBindings(KEYMAP_MACRO_DESCRIPTORS)),
  marks: freezeArrayRecord(deriveDefaultKeyBindings(KEYMAP_MARK_DESCRIPTORS)),
  textObjects: Object.freeze({
    kinds: freezeArrayRecord(deriveDefaultKeyBindings(KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS)),
    targets: freezeArrayRecord(deriveDefaultKeyBindings(KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS)),
  }),
  commands: freezeArrayRecord(deriveDefaultKeyBindings(KEYMAP_COMMAND_DESCRIPTORS)),
  operatorMotions: freezeArrayRecord(
    Object.fromEntries(
      VIM_MOTION_OPERATOR_ACTIONS.map((action) => [action, OPERATOR_MOTION_ACTIONS]),
    ),
  ),
  insert: freezeArrayRecord(deriveDefaultKeyBindings(KEYMAP_INSERT_DESCRIPTORS)),
  actions: Object.freeze({
    accepted: Object.freeze([]),
  }),
  remaps: Object.freeze({
    accepted: Object.freeze([]),
  }),
}) as unknown as ResolvedVimKeymap;

export const DEFAULT_VIM_UI = Object.freeze({
  status: Object.freeze({
    enabled: true,
    position: "left",
    items: Object.freeze(["mode", "pendingOperator", "selection", "cursorPosition"]),
  }),
  mode: Object.freeze({
    enabled: true,
    labels: Object.freeze({
      insert: "INSERT",
      normal: "NORMAL",
      visual: "VISUAL",
      visualLine: "V-LINE",
      visualBlock: "V-BLOCK",
    }),
    narrowLabels: Object.freeze({
      insert: "I",
      normal: "N",
      visual: "V",
      visualLine: "VL",
      visualBlock: "VB",
    }),
  }),
  selection: Object.freeze({
    enabled: true,
    previewMaxChars: 16,
  }),
  cursorPosition: Object.freeze({
    enabled: true,
    base: 1,
    format: "{line}:{column}",
  }),
  workbench: Object.freeze({
    reservedRows: 0,
  }),
}) as unknown as ResolvedVimUi;

export const DEFAULT_VIM_MACROS = Object.freeze({
  enabled: true,
  slots: Object.freeze(LOWERCASE_SLOT_KEYS),
  maxReplaySteps: 1000,
}) as unknown as ResolvedVimMacros;

export const DEFAULT_VIM_MARKS = Object.freeze({
  enabled: true,
  slots: Object.freeze(LOWERCASE_SLOT_KEYS),
}) as unknown as ResolvedVimMarks;

export const DEFAULT_VIM_SEARCH = Object.freeze({
  highlight: true,
  highlightCurrent: true,
  clearOnCancel: true,
  clearOnInsert: true,
  maxHighlights: 200,
}) as unknown as ResolvedVimSearch;

export const DEFAULT_VIM_EX_COMMAND = Object.freeze({
  autocomplete: true,
}) as unknown as ResolvedVimExCommand;

export const DEFAULT_VIM_PROMPT_STRUCTURES = Object.freeze({
  enabled: true,
  targets: Object.freeze({
    codeFence: true,
    headingSection: true,
    listItem: true,
    tag: true,
    errorBlock: true,
  }),
}) as unknown as ResolvedVimPromptStructures;

export const DEFAULT_VIM_FEEDBACK = Object.freeze({
  noop: "off",
}) as unknown as VimFeedbackOptions;

export const DEFAULT_VIM_PROMPT_TRANSFORMS = Object.freeze({
  enabled: true,
  actions: Object.freeze({
    quote: true,
    unquote: true,
    bulletize: true,
    fence: true,
    indent: true,
    dedent: true,
    reflow: true,
  }),
  commands: Object.freeze({
    quote: Object.freeze(["quote"]),
    unquote: Object.freeze(["unquote"]),
    bulletize: Object.freeze(["bulletize"]),
    fence: Object.freeze(["fence"]),
    indent: Object.freeze(["indent"]),
    dedent: Object.freeze(["dedent"]),
    reflow: Object.freeze(["reflow"]),
  }),
}) as unknown as ResolvedVimPromptTransforms;

export const DEFAULT_VIM_OPTIONS: ResolvedVimEditorOptions = Object.freeze({
  startMode: "insert",
  cursor: Object.freeze({
    insert: "bar",
    normal: "block",
    visual: "block",
    visualLine: "block",
    visualBlock: "block",
  }),
  keymap: DEFAULT_VIM_KEYMAP,
  ui: DEFAULT_VIM_UI,
  macros: DEFAULT_VIM_MACROS,
  marks: DEFAULT_VIM_MARKS,
  search: DEFAULT_VIM_SEARCH,
  exCommand: DEFAULT_VIM_EX_COMMAND,
  feedback: DEFAULT_VIM_FEEDBACK,
  promptStructures: DEFAULT_VIM_PROMPT_STRUCTURES,
  promptTransforms: DEFAULT_VIM_PROMPT_TRANSFORMS,
});

type PartialVimOptions = {
  preset?: VimPreset;
  leader?: string | null;
  startMode?: StartupMode;
  cursor?: Partial<CursorStyles>;
  keymap?: PartialKeymapOptions;
  ui?: PartialUiOptions;
  macros?: PartialMacroOptions;
  marks?: PartialMarkOptions;
  search?: PartialSearchOptions;
  exCommand?: PartialExCommandOptions;
  feedback?: PartialFeedbackOptions;
  promptStructures?: PartialPromptStructureOptions;
  promptTransforms?: PartialPromptTransformOptions;
};

type PartialKeymapOptions = {
  escape?: string[];
  operators?: Partial<Record<VimOperatorAction, string[]>>;
  motions?: Partial<Record<VimMotionAction, string[]>>;
  commands?: Partial<Record<VimCommandAction, string[]>>;
  macros?: Partial<Record<keyof ResolvedVimKeymap["macros"], string[]>>;
  marks?: Partial<Record<keyof ResolvedVimKeymap["marks"], string[]>>;
  textObjects?: {
    kinds?: Partial<Record<VimTextObjectKind, string[]>>;
    targets?: Partial<Record<VimTextObjectTarget, string[]>>;
  };
  operatorMotions?: Partial<Record<VimMotionOperatorAction, VimMotionAction[]>>;
  insert?: Partial<ResolvedVimInsertKeymap>;
  actionPresets?: VimActionKeybindingPreset[];
  actions?: Partial<Record<BindablePromptTransformActionId, ResolvedVimActionBinding[]>>;
  remaps?: ResolvedVimKeymap["remaps"];
  unmaps?: Array<{ key: string; modes: readonly VimMode[] }>;
  allowProtectedOverrides?: string[];
};

type PartialMacroOptions = Partial<ResolvedVimMacros>;
type PartialMarkOptions = Partial<ResolvedVimMarks>;
type PartialSearchOptions = Partial<ResolvedVimSearch>;
type PartialFeedbackOptions = Partial<VimFeedbackOptions>;
type PartialPromptStructureOptions = {
  enabled?: boolean;
  targets?: Partial<Record<PromptStructureTarget, boolean>>;
};
type PartialPromptTransformOptions = {
  enabled?: boolean;
  actions?: Partial<Record<PromptTransformAction, boolean>>;
  commands?: Partial<Record<PromptTransformAction, string[]>>;
};

type PartialUiOptions = VimUiEditorOptions;

export type VimConfigLoadResult = {
  options: ResolvedVimEditorOptions;
  warnings: string[];
};

export type VimConfigPaths = {
  cwd?: string;
  globalSettingsPath?: string;
  projectSettingsPath?: string;
  jsConfigPath?: string;
};

function cloneArrayRecord<T extends Record<string, readonly unknown[]>>(
  record: T,
): { [K in keyof T]: Array<T[K][number]> } {
  return Object.fromEntries(Object.entries(record).map(([key, values]) => [key, [...values]])) as {
    [K in keyof T]: Array<T[K][number]>;
  };
}

function clonePlainRecord<T extends Record<string, unknown>>(record: T): T {
  return { ...record };
}

function cloneKeymap(keymap: ResolvedVimKeymap = DEFAULT_VIM_KEYMAP): ResolvedVimKeymap {
  return {
    leader: keymap.leader,
    escape: [...keymap.escape],
    operators: cloneArrayRecord(keymap.operators),
    motions: cloneArrayRecord(keymap.motions),
    macros: cloneArrayRecord(keymap.macros),
    marks: cloneArrayRecord(keymap.marks),
    textObjects: {
      kinds: cloneArrayRecord(keymap.textObjects.kinds),
      targets: cloneArrayRecord(keymap.textObjects.targets),
    },
    commands: cloneArrayRecord(keymap.commands),
    operatorMotions: cloneArrayRecord(keymap.operatorMotions),
    insert: {
      openLineBelow: [...keymap.insert.openLineBelow],
      openLineAbove: [...keymap.insert.openLineAbove],
      deleteWordBackward: [...keymap.insert.deleteWordBackward],
      deleteWordForward: [...keymap.insert.deleteWordForward],
      deleteLineBackward: [...keymap.insert.deleteLineBackward],
      deleteLineForward: [...keymap.insert.deleteLineForward],
      moveWordBackward: [...keymap.insert.moveWordBackward],
      moveWordForward: [...keymap.insert.moveWordForward],
      moveLineStart: [...keymap.insert.moveLineStart],
      moveLineEnd: [...keymap.insert.moveLineEnd],
    },
    actions: {
      accepted: keymap.actions.accepted.map((binding) => ({
        ...binding,
        args: { ...binding.args },
      })),
    },
    remaps: {
      accepted: keymap.remaps.accepted.map((binding) => ({
        ...binding,
        inputs: [...binding.inputs],
        modes: binding.modes ? [...binding.modes] : undefined,
      })),
    },
  };
}

function cloneMacros(macros: ResolvedVimMacros = DEFAULT_VIM_MACROS): ResolvedVimMacros {
  return {
    enabled: macros.enabled,
    slots: [...macros.slots],
    maxReplaySteps: macros.maxReplaySteps,
  };
}

function cloneMarks(marks: ResolvedVimMarks = DEFAULT_VIM_MARKS): ResolvedVimMarks {
  return {
    enabled: marks.enabled,
    slots: [...marks.slots],
  };
}

function cloneSearch(search: ResolvedVimSearch = DEFAULT_VIM_SEARCH): ResolvedVimSearch {
  return { ...search };
}

function cloneExCommand(
  exCommand: ResolvedVimExCommand = DEFAULT_VIM_EX_COMMAND,
): ResolvedVimExCommand {
  return { ...exCommand };
}

function cloneFeedback(feedback: VimFeedbackOptions = DEFAULT_VIM_FEEDBACK): VimFeedbackOptions {
  return { ...feedback };
}

function clonePromptStructures(
  promptStructures: ResolvedVimPromptStructures = DEFAULT_VIM_PROMPT_STRUCTURES,
): ResolvedVimPromptStructures {
  return { enabled: promptStructures.enabled, targets: { ...promptStructures.targets } };
}

function clonePromptTransforms(
  promptTransforms: ResolvedVimPromptTransforms = DEFAULT_VIM_PROMPT_TRANSFORMS,
): ResolvedVimPromptTransforms {
  return {
    enabled: promptTransforms.enabled,
    actions: clonePlainRecord(promptTransforms.actions),
    commands: cloneArrayRecord(promptTransforms.commands),
  };
}

function cloneUi(ui: ResolvedVimUi = DEFAULT_VIM_UI): ResolvedVimUi {
  return {
    status: {
      enabled: ui.status.enabled,
      position: ui.status.position,
      items: [...ui.status.items],
    },
    mode: {
      enabled: ui.mode.enabled,
      labels: clonePlainRecord(ui.mode.labels),
      narrowLabels: clonePlainRecord(ui.mode.narrowLabels),
    },
    selection: clonePlainRecord(ui.selection),
    cursorPosition: clonePlainRecord(ui.cursorPosition),
    workbench: clonePlainRecord(ui.workbench),
  };
}

export function cloneResolvedVimOptions(
  options: ResolvedVimEditorOptions = DEFAULT_VIM_OPTIONS,
): ResolvedVimEditorOptions {
  return {
    preset: options.preset,
    leader: options.leader,
    startMode: options.startMode,
    cursor: { ...options.cursor },
    keymap: options.keymap ? cloneKeymap(options.keymap) : undefined,
    ui: options.ui ? cloneUi(options.ui) : undefined,
    macros: options.macros ? cloneMacros(options.macros) : undefined,
    marks: options.marks ? cloneMarks(options.marks) : undefined,
    search: options.search ? cloneSearch(options.search) : undefined,
    exCommand: options.exCommand ? cloneExCommand(options.exCommand) : undefined,
    feedback: options.feedback ? cloneFeedback(options.feedback) : undefined,
    promptStructures: options.promptStructures
      ? clonePromptStructures(options.promptStructures)
      : undefined,
    promptTransforms: options.promptTransforms
      ? clonePromptTransforms(options.promptTransforms)
      : undefined,
  };
}

function cloneDefaultOptions(): ResolvedVimEditorOptions {
  return cloneResolvedVimOptions();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const LEADER_TOKEN = "<leader>";
const LEADER_TOKEN_PATTERN = /<leader>/gi;

function normalizeVimKeySequence(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  if (/<leader>/i.test(value)) {
    const normalized = value.replace(LEADER_TOKEN_PATTERN, LEADER_TOKEN);
    if (!normalized.startsWith(LEADER_TOKEN)) return undefined;
    const prefix = normalized.match(/^(?:<leader>)+/)?.[0] ?? "";
    const suffix = normalized.slice(prefix.length);
    if (!suffix.startsWith("<")) return normalized;
    if (!/^<[^>]+>$/.test(suffix)) return undefined;
    const normalizedSuffix = normalizeVimKeySequence(suffix);
    return normalizedSuffix ? `${prefix}${normalizedSuffix}` : undefined;
  }

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

function parseStringArray(
  value: unknown,
  label: string,
  warnings: string[],
  options: { singleKeyOnly?: boolean; allowProtectedKey?: (key: string) => boolean } = {},
): string[] | undefined {
  if (!Array.isArray(value)) {
    warnings.push(`${label} must be an array of key strings`);
    return undefined;
  }

  const parsed: string[] = [];
  for (const item of value) {
    const sequence = normalizeVimKeySequence(item);
    if (!sequence) {
      warnings.push(`${label} contains unsupported key`);
      continue;
    }
    const protectedShortcut = protectedShortcutForKey(sequence);
    if (protectedShortcut && !options.allowProtectedKey?.(sequence)) {
      warnings.push(`${label} contains protected key ${sequence} (${protectedShortcut.reason})`);
      continue;
    }
    if (options.singleKeyOnly && sequence.length !== 1) {
      warnings.push(`${label} contains unsupported multi-key text object binding ${sequence}`);
      continue;
    }
    parsed.push(sequence);
  }

  return parsed.length > 0 ? parsed : undefined;
}

const NON_PRINTABLE_KEY_NAMES = new Set([
  "enter",
  "tab",
  "escape",
  "backspace",
  "delete",
  "home",
  "end",
  "pageup",
  "pagedown",
  "insert",
  "up",
  "down",
  "left",
  "right",
]);

function isPrintableTextSequence(sequence: string): boolean {
  if (sequence.includes("+")) return false;
  if (NON_PRINTABLE_KEY_NAMES.has(sequence)) return false;
  return [...sequence].every((char) => char.charCodeAt(0) >= 32);
}

function parseInsertEscapeArray(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
  options: { allowProtectedKey?: (key: string) => boolean } = {},
): string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value) && value.length === 0) return [];
  const label = `${sourceLabel}: piVimMode.keymap.escape`;
  const sequences = parseStringArray(value, label, warnings, options);
  const parsed = sequences?.filter((sequence) => {
    if (!isPrintableTextSequence(sequence)) return true;
    warnings.push(`${label} contains unsupported printable text sequence ${sequence}`);
    return false;
  });
  return parsed && parsed.length > 0 ? parsed : undefined;
}

function parseInsertBindings(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
  options: { allowProtectedKey?: (key: string) => boolean } = {},
): Partial<ResolvedVimInsertKeymap> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: piVimMode.keymap.insert must be an object`);
    return undefined;
  }

  const parsed: Partial<ResolvedVimInsertKeymap> = {};
  const seen = new Map<string, string>();
  for (const [action, bindings] of Object.entries(value)) {
    if (!INSERT_ACTION_SET.has(action)) {
      warnings.push(`${sourceLabel}: unsupported piVimMode.keymap.insert.${action}`);
      continue;
    }
    const label = `${sourceLabel}: piVimMode.keymap.insert.${action}`;
    const keys = parseStringArray(bindings, label, warnings, {
      allowProtectedKey: options.allowProtectedKey,
    });
    if (!keys) continue;
    const filtered = keys.filter((sequence) => {
      if (!isPrintableTextSequence(sequence)) return true;
      warnings.push(`${label} contains unsupported printable text sequence ${sequence}`);
      return false;
    });
    if (filtered.length > 0) {
      parsed[action as keyof ResolvedVimInsertKeymap] = filtered;
      for (const key of filtered) {
        const previous = seen.get(key);
        if (previous && previous !== action) {
          warnings.push(
            `${sourceLabel}: duplicate piVimMode.keymap.insert binding ${key} for ${previous} and ${action}`,
          );
        } else {
          seen.set(key, action);
        }
      }
    }
  }

  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function parseActionStringArray<T extends string>(
  value: unknown,
  allowed: Set<string>,
  label: string,
  warnings: string[],
): T[] | undefined {
  if (!Array.isArray(value)) {
    warnings.push(`${label} must be an array`);
    return undefined;
  }

  const parsed: T[] = [];
  for (const item of value) {
    if (typeof item === "string" && allowed.has(item)) parsed.push(item as T);
    else warnings.push(`${label} contains unsupported action`);
  }

  return parsed.length > 0 ? parsed : undefined;
}

function parseKeyBindings<T extends string>(
  value: unknown,
  allowed: Set<string>,
  sourceLabel: string,
  group: string,
  warnings: string[],
  options: { singleKeyOnly?: boolean; allowProtectedKey?: (key: string) => boolean } = {},
): Partial<Record<T, string[]>> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: piVimMode.keymap.${group} must be an object`);
    return undefined;
  }

  const parsed: Partial<Record<T, string[]>> = {};
  const seen = new Map<string, string>();
  for (const [action, bindings] of Object.entries(value)) {
    if (!allowed.has(action)) {
      warnings.push(`${sourceLabel}: unsupported piVimMode.keymap.${group}.${action}`);
      continue;
    }
    const keys = parseStringArray(
      bindings,
      `${sourceLabel}: piVimMode.keymap.${group}.${action}`,
      warnings,
      {
        ...options,
        allowProtectedKey: (key) =>
          (group === "motions" &&
            ((action === "halfPageDown" && key === "ctrl+d") ||
              (action === "halfPageUp" && key === "ctrl+u"))) ||
          options.allowProtectedKey?.(key) === true,
      },
    );
    if (!keys) continue;
    parsed[action as T] = keys;
    for (const key of keys) {
      const previous = seen.get(key);
      if (previous && previous !== action) {
        warnings.push(
          `${sourceLabel}: duplicate piVimMode.keymap.${group} binding ${key} for ${previous} and ${action}`,
        );
      } else {
        seen.set(key, action);
      }
    }
  }

  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function parseActionBindingEntry(
  entry: unknown,
  actionId: BindablePromptTransformActionId,
  label: string,
  warnings: string[],
  options: { allowProtectedKey?: (key: string) => boolean } = {},
): ResolvedVimActionBinding | undefined {
  let rawKey: unknown;
  let rawArgs: unknown;
  let modes: VimActionBindingMode[] | undefined;
  if (typeof entry === "string") rawKey = entry;
  else if (isRecord(entry)) {
    rawKey = entry.key;
    rawArgs = entry.args;
    if (entry.modes !== undefined) {
      if (!Array.isArray(entry.modes)) {
        warnings.push(`${label} contains unsupported action binding modes`);
        return undefined;
      }
      const validModes = new Set<VimActionBindingMode>([
        "normal",
        "visual",
        "visualLine",
        "visualBlock",
      ]);
      modes = entry.modes.filter(
        (mode): mode is VimActionBindingMode =>
          typeof mode === "string" && validModes.has(mode as VimActionBindingMode),
      );
      if (modes.length !== entry.modes.length) {
        warnings.push(`${label} contains unsupported action binding mode`);
        return undefined;
      }
    }
  } else {
    warnings.push(`${label} contains unsupported action binding entry`);
    return undefined;
  }

  const key = normalizeVimKeySequence(rawKey);
  if (!key) {
    warnings.push(`${label} contains unsupported key`);
    return undefined;
  }
  const protectedShortcut = protectedShortcutForKey(key);
  if (protectedShortcut && !options.allowProtectedKey?.(key)) {
    warnings.push(`${label} contains protected key ${key} (${protectedShortcut.reason})`);
    return undefined;
  }

  const normalized = normalizePromptTransformActionArgs({
    source: "keymap",
    actionId,
    args: rawArgs,
  });
  if (!normalized.ok) {
    warnings.push(`${label}.${key}: ${normalized.message}`);
    return undefined;
  }
  return { key, actionId, args: normalized.transform, modes };
}

function parseActionBindings(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
  options: { allowProtectedKey?: (key: string) => boolean } = {},
): Partial<Record<BindablePromptTransformActionId, ResolvedVimActionBinding[]>> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: piVimMode.keymap.actions must be an object`);
    return undefined;
  }

  const parsed: Partial<Record<BindablePromptTransformActionId, ResolvedVimActionBinding[]>> = {};
  for (const [rawActionId, entries] of Object.entries(value)) {
    if (!BINDABLE_PROMPT_TRANSFORM_ACTION_SET.has(rawActionId)) {
      warnings.push(`${sourceLabel}: unsupported piVimMode.keymap.actions.${rawActionId}`);
      continue;
    }
    if (!Array.isArray(entries)) {
      warnings.push(`${sourceLabel}: piVimMode.keymap.actions.${rawActionId} must be an array`);
      continue;
    }
    const actionId = rawActionId as BindablePromptTransformActionId;
    const label = `${sourceLabel}: piVimMode.keymap.actions.${rawActionId}`;
    const bindings = entries
      .map((entry) => parseActionBindingEntry(entry, actionId, label, warnings, options))
      .filter((binding): binding is ResolvedVimActionBinding => Boolean(binding));
    parsed[actionId] = bindings;
  }

  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function mergeParsedActionBindings(
  target: Partial<Record<BindablePromptTransformActionId, ResolvedVimActionBinding[]>>,
  source: Partial<Record<BindablePromptTransformActionId, ResolvedVimActionBinding[]>> | undefined,
): void {
  if (!source) return;
  for (const [actionId, bindings] of Object.entries(source)) {
    target[actionId as BindablePromptTransformActionId] = bindings ?? [];
  }
}

function parseActionPresets(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
): {
  presets?: VimActionKeybindingPreset[];
  actions?: Partial<Record<BindablePromptTransformActionId, ResolvedVimActionBinding[]>>;
} {
  if (value === undefined) return {};
  if (!Array.isArray(value)) {
    warnings.push(`${sourceLabel}: piVimMode.keymap.actionPresets must be an array`);
    return {};
  }

  const presets: VimActionKeybindingPreset[] = [];
  const actions: Partial<Record<BindablePromptTransformActionId, ResolvedVimActionBinding[]>> = {};
  for (const entry of value) {
    if (typeof entry !== "string" || !isActionKeybindingPreset(entry)) {
      const suffix = typeof entry === "string" ? `.${entry}` : " contains unsupported preset";
      warnings.push(`${sourceLabel}: unsupported piVimMode.keymap.actionPresets${suffix}`);
      continue;
    }
    presets.push(entry);
    const presetActions = parseActionBindings(
      actionKeybindingPresetActions(entry),
      `${sourceLabel}: piVimMode.keymap.actionPresets.${entry}`,
      warnings,
    );
    mergeParsedActionBindings(actions, presetActions);
  }
  return {
    presets: presets.length > 0 ? presets : undefined,
    actions: Object.keys(actions).length > 0 ? actions : undefined,
  };
}

function parseKeymap(
  value: unknown,
  sourceLabel: string,
): { partial?: PartialKeymapOptions; warnings: string[] } {
  const warnings: string[] = [];
  const partial: PartialKeymapOptions = {};
  if (value === undefined) return { warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: piVimMode.keymap must be an object`);
    return { warnings };
  }

  partial.allowProtectedOverrides = parseAllowProtectedOverrides(
    value.allowProtectedOverrides,
    sourceLabel,
    warnings,
  );
  const allowProtectedKey: (key: string) => boolean = partial.allowProtectedOverrides
    ? (key: string) => partial.allowProtectedOverrides!.includes(key)
    : () => false;

  partial.escape = parseInsertEscapeArray(value.escape, sourceLabel, warnings, {
    allowProtectedKey,
  });

  partial.operators = parseKeyBindings<VimOperatorAction>(
    value.operators,
    OPERATOR_ACTION_SET,
    sourceLabel,
    "operators",
    warnings,
    { allowProtectedKey },
  );
  partial.motions = parseKeyBindings<VimMotionAction>(
    value.motions,
    MOTION_ACTION_SET,
    sourceLabel,
    "motions",
    warnings,
    { allowProtectedKey },
  );
  partial.commands = parseKeyBindings<VimCommandAction>(
    value.commands,
    COMMAND_ACTION_SET,
    sourceLabel,
    "commands",
    warnings,
    { allowProtectedKey },
  );
  partial.macros = parseKeyBindings<keyof ResolvedVimKeymap["macros"]>(
    value.macros,
    MACRO_ACTION_SET,
    sourceLabel,
    "macros",
    warnings,
    { allowProtectedKey },
  );
  partial.marks = parseKeyBindings<keyof ResolvedVimKeymap["marks"]>(
    value.marks,
    MARK_ACTION_SET,
    sourceLabel,
    "marks",
    warnings,
    { allowProtectedKey },
  );

  partial.insert = parseInsertBindings(value.insert, sourceLabel, warnings, {
    allowProtectedKey,
  });

  if (value.textObjects !== undefined) {
    if (!isRecord(value.textObjects)) {
      warnings.push(`${sourceLabel}: piVimMode.keymap.textObjects must be an object`);
    } else {
      const textObjects: NonNullable<PartialKeymapOptions["textObjects"]> = {};
      textObjects.kinds = parseKeyBindings<VimTextObjectKind>(
        value.textObjects.kinds,
        TEXT_OBJECT_KIND_SET,
        sourceLabel,
        "textObjects.kinds",
        warnings,
        { singleKeyOnly: true, allowProtectedKey },
      );
      textObjects.targets = parseKeyBindings<VimTextObjectTarget>(
        value.textObjects.targets,
        TEXT_OBJECT_TARGET_SET,
        sourceLabel,
        "textObjects.targets",
        warnings,
        { singleKeyOnly: true, allowProtectedKey },
      );
      if (textObjects.kinds || textObjects.targets) partial.textObjects = textObjects;
    }
  }

  if (value.operatorMotions !== undefined) {
    if (!isRecord(value.operatorMotions)) {
      warnings.push(`${sourceLabel}: piVimMode.keymap.operatorMotions must be an object`);
    } else {
      const operatorMotions: Partial<Record<VimMotionOperatorAction, VimMotionAction[]>> = {};
      for (const [operator, motions] of Object.entries(value.operatorMotions)) {
        if (!MOTION_OPERATOR_ACTION_SET.has(operator)) {
          warnings.push(`${sourceLabel}: unsupported piVimMode.keymap.operatorMotions.${operator}`);
          continue;
        }
        const parsed = parseActionStringArray<VimMotionAction>(
          motions,
          OPERATOR_MOTION_ACTION_SET,
          `${sourceLabel}: piVimMode.keymap.operatorMotions.${operator} contains unsupported operator motion`,
          warnings,
        );
        if (parsed) operatorMotions[operator as VimMotionOperatorAction] = parsed;
      }
      if (Object.keys(operatorMotions).length > 0) partial.operatorMotions = operatorMotions;
    }
  }

  const actionPresets = parseActionPresets(value.actionPresets, sourceLabel, warnings);
  partial.actionPresets = actionPresets.presets;
  const actions: Partial<Record<BindablePromptTransformActionId, ResolvedVimActionBinding[]>> = {};
  mergeParsedActionBindings(actions, actionPresets.actions);
  mergeParsedActionBindings(
    actions,
    parseActionBindings(value.actions, sourceLabel, warnings, { allowProtectedKey }),
  );
  partial.actions = Object.keys(actions).length > 0 ? actions : undefined;
  partial.remaps = parseRemaps(value.remaps, sourceLabel, warnings);

  return { partial, warnings };
}

function parseRemaps(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
): ResolvedVimKeymap["remaps"] | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || !Array.isArray(value.accepted)) {
    warnings.push(`${sourceLabel}: piVimMode.keymap.remaps must be an internal remap object`);
    return undefined;
  }

  const accepted = value.accepted.filter(
    (entry): entry is ResolvedVimKeymap["remaps"]["accepted"][number] => {
      if (!isRecord(entry)) return false;
      if (typeof entry.key !== "string" || !Array.isArray(entry.inputs)) return false;
      if (!entry.inputs.every((input) => typeof input === "string")) return false;
      if (entry.modes === undefined) return true;
      return Array.isArray(entry.modes) && entry.modes.every((mode) => REMAP_MODES.has(mode));
    },
  );
  return accepted.length > 0 ? { accepted } : undefined;
}

function parseAllowProtectedOverrides(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
): string[] | undefined {
  if (value === undefined) return undefined;
  const label = `${sourceLabel}: piVimMode.keymap.allowProtectedOverrides`;
  return parseStringArray(value, label, warnings, {
    allowProtectedKey: () => true,
  });
}

function parseModeLabelMap(
  value: unknown,
  sourceLabel: string,
  field: "labels" | "narrowLabels",
  warnings: string[],
): Partial<Record<VimMode, string>> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: piVimMode.ui.mode.${field} must be an object`);
    return undefined;
  }

  const labels: Partial<Record<VimMode, string>> = {};
  for (const mode of VIM_MODES) {
    const label = value[mode];
    if (label === undefined) continue;
    if (typeof label === "string" && label.length > 0) labels[mode] = label;
    else
      warnings.push(
        `${sourceLabel}: piVimMode.ui.mode.${field}.${mode} must be a non-empty string`,
      );
  }
  return Object.keys(labels).length > 0 ? labels : undefined;
}

function parseUi(
  value: unknown,
  sourceLabel: string,
): { partial?: PartialUiOptions; warnings: string[] } {
  const warnings: string[] = [];
  const partial: PartialUiOptions = {};
  if (value === undefined) return { warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: piVimMode.ui must be an object`);
    return { warnings };
  }

  if (value.status !== undefined) {
    if (!isRecord(value.status)) {
      warnings.push(`${sourceLabel}: piVimMode.ui.status must be an object`);
    } else {
      const status: Partial<ResolvedVimUi["status"]> = {};
      if (typeof value.status.enabled === "boolean") status.enabled = value.status.enabled;
      else if (value.status.enabled !== undefined)
        warnings.push(`${sourceLabel}: piVimMode.ui.status.enabled must be a boolean`);
      if (value.status.position === "left" || value.status.position === "right") {
        status.position = value.status.position;
      } else if (value.status.position !== undefined) {
        warnings.push(`${sourceLabel}: piVimMode.ui.status.position must be "left" or "right"`);
      }
      if (value.status.items !== undefined) {
        const items = parseActionStringArray<VimStatusItem>(
          value.status.items,
          STATUS_ITEM_SET,
          `${sourceLabel}: piVimMode.ui.status.items`,
          warnings,
        );
        if (items) status.items = items;
      }
      partial.status = status;
    }
  }

  if (value.mode !== undefined) {
    if (!isRecord(value.mode)) {
      warnings.push(`${sourceLabel}: piVimMode.ui.mode must be an object`);
    } else {
      const mode: PartialUiOptions["mode"] = {};
      if (typeof value.mode.enabled === "boolean") mode.enabled = value.mode.enabled;
      else if (value.mode.enabled !== undefined)
        warnings.push(`${sourceLabel}: piVimMode.ui.mode.enabled must be a boolean`);
      mode.labels = parseModeLabelMap(value.mode.labels, sourceLabel, "labels", warnings);
      mode.narrowLabels = parseModeLabelMap(
        value.mode.narrowLabels,
        sourceLabel,
        "narrowLabels",
        warnings,
      );
      partial.mode = mode;
    }
  }

  if (value.selection !== undefined) {
    if (!isRecord(value.selection)) {
      warnings.push(`${sourceLabel}: piVimMode.ui.selection must be an object`);
    } else {
      const selection: Partial<ResolvedVimUi["selection"]> = {};
      if (typeof value.selection.enabled === "boolean") selection.enabled = value.selection.enabled;
      else if (value.selection.enabled !== undefined)
        warnings.push(`${sourceLabel}: piVimMode.ui.selection.enabled must be a boolean`);
      if (
        typeof value.selection.previewMaxChars === "number" &&
        Number.isInteger(value.selection.previewMaxChars) &&
        value.selection.previewMaxChars >= 0
      ) {
        selection.previewMaxChars = value.selection.previewMaxChars;
      } else if (value.selection.previewMaxChars !== undefined) {
        warnings.push(
          `${sourceLabel}: piVimMode.ui.selection.previewMaxChars must be a non-negative integer`,
        );
      }
      partial.selection = selection;
    }
  }

  if (value.cursorPosition !== undefined) {
    if (!isRecord(value.cursorPosition)) {
      warnings.push(`${sourceLabel}: piVimMode.ui.cursorPosition must be an object`);
    } else {
      const cursorPosition: Partial<ResolvedVimUi["cursorPosition"]> = {};
      if (typeof value.cursorPosition.enabled === "boolean") {
        cursorPosition.enabled = value.cursorPosition.enabled;
      } else if (value.cursorPosition.enabled !== undefined) {
        warnings.push(`${sourceLabel}: piVimMode.ui.cursorPosition.enabled must be a boolean`);
      }
      if (value.cursorPosition.base === 0 || value.cursorPosition.base === 1) {
        cursorPosition.base = value.cursorPosition.base;
      } else if (value.cursorPosition.base !== undefined) {
        warnings.push(`${sourceLabel}: piVimMode.ui.cursorPosition.base must be 0 or 1`);
      }
      if (
        typeof value.cursorPosition.format === "string" &&
        value.cursorPosition.format.includes("{line}") &&
        value.cursorPosition.format.includes("{column}")
      ) {
        cursorPosition.format = value.cursorPosition.format;
      } else if (value.cursorPosition.format !== undefined) {
        warnings.push(
          `${sourceLabel}: piVimMode.ui.cursorPosition.format must include {line} and {column}`,
        );
      }
      partial.cursorPosition = cursorPosition;
    }
  }

  if (value.workbench !== undefined) {
    if (!isRecord(value.workbench)) {
      warnings.push(`${sourceLabel}: piVimMode.ui.workbench must be an object`);
    } else {
      const workbench: Partial<ResolvedVimUi["workbench"]> = {};
      if (
        typeof value.workbench.reservedRows === "number" &&
        Number.isInteger(value.workbench.reservedRows) &&
        value.workbench.reservedRows >= 0 &&
        value.workbench.reservedRows <= WORKBENCH_RESERVED_ROWS_MAX
      ) {
        workbench.reservedRows = value.workbench.reservedRows;
      } else if (value.workbench.reservedRows !== undefined) {
        warnings.push(
          `${sourceLabel}: piVimMode.ui.workbench.reservedRows must be an integer between 0 and ${WORKBENCH_RESERVED_ROWS_MAX}`,
        );
      }
      partial.workbench = workbench;
    }
  }

  return { partial, warnings };
}

function parseLowercaseSlots(
  value: unknown,
  label: string,
  warnings: string[],
): string[] | undefined {
  if (!Array.isArray(value)) {
    warnings.push(`${label} must be an array`);
    return undefined;
  }
  const slots = value.filter(
    (slot): slot is string => typeof slot === "string" && /^[a-z]$/.test(slot),
  );
  if (slots.length !== value.length) warnings.push(`${label} only supports lowercase a-z slots`);
  return slots.length > 0 ? [...new Set(slots)] : undefined;
}

function parseMacros(
  value: unknown,
  sourceLabel: string,
): { partial?: PartialMacroOptions; warnings: string[] } {
  const warnings: string[] = [];
  const partial: PartialMacroOptions = {};
  if (value === undefined) return { warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: piVimMode.macros must be an object`);
    return { warnings };
  }

  if (typeof value.enabled === "boolean") partial.enabled = value.enabled;
  else if (value.enabled !== undefined)
    warnings.push(`${sourceLabel}: piVimMode.macros.enabled must be a boolean`);

  if (value.slots !== undefined) {
    const slots = parseLowercaseSlots(
      value.slots,
      `${sourceLabel}: piVimMode.macros.slots`,
      warnings,
    );
    if (slots) partial.slots = slots;
  }

  if (
    typeof value.maxReplaySteps === "number" &&
    Number.isInteger(value.maxReplaySteps) &&
    value.maxReplaySteps > 0
  ) {
    partial.maxReplaySteps = value.maxReplaySteps;
  } else if (value.maxReplaySteps !== undefined) {
    warnings.push(`${sourceLabel}: piVimMode.macros.maxReplaySteps must be a positive integer`);
  }

  return Object.keys(partial).length > 0 ? { partial, warnings } : { warnings };
}

function parseSearch(
  value: unknown,
  sourceLabel: string,
): { partial?: PartialSearchOptions; warnings: string[] } {
  const warnings: string[] = [];
  const partial: PartialSearchOptions = {};
  if (value === undefined) return { warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: piVimMode.search must be an object`);
    return { warnings };
  }

  for (const field of [
    "highlight",
    "highlightCurrent",
    "clearOnCancel",
    "clearOnInsert",
  ] as const) {
    if (typeof value[field] === "boolean") partial[field] = value[field];
    else if (value[field] !== undefined)
      warnings.push(`${sourceLabel}: piVimMode.search.${field} must be a boolean`);
  }

  if (
    typeof value.maxHighlights === "number" &&
    Number.isInteger(value.maxHighlights) &&
    value.maxHighlights >= 0
  ) {
    partial.maxHighlights = value.maxHighlights;
  } else if (value.maxHighlights !== undefined) {
    warnings.push(`${sourceLabel}: piVimMode.search.maxHighlights must be a non-negative integer`);
  }

  return Object.keys(partial).length > 0 ? { partial, warnings } : { warnings };
}

function parseFeedback(
  value: unknown,
  sourceLabel: string,
): { partial?: PartialFeedbackOptions; warnings: string[] } {
  const warnings: string[] = [];
  const partial: PartialFeedbackOptions = {};
  if (value === undefined) return { warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: piVimMode.feedback must be an object`);
    return { warnings };
  }

  if (value.noop === undefined) return { warnings };
  if (
    typeof value.noop === "string" &&
    NOOP_FEEDBACK_VALUES.has(value.noop as VimFeedbackOptions["noop"])
  ) {
    partial.noop = value.noop as VimFeedbackOptions["noop"];
  } else {
    warnings.push(`${sourceLabel}: piVimMode.feedback.noop must be off or status`);
  }

  return Object.keys(partial).length > 0 ? { partial, warnings } : { warnings };
}

type PartialExCommandOptions = {
  autocomplete?: boolean;
};

function parseExCommand(
  value: unknown,
  sourceLabel: string,
): { partial?: PartialExCommandOptions; warnings: string[] } {
  const warnings: string[] = [];
  if (value === undefined) return { warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: piVimMode.exCommand must be an object`);
    return { warnings };
  }
  const partial: PartialExCommandOptions = {};
  if (typeof value.autocomplete === "boolean") partial.autocomplete = value.autocomplete;
  else if (value.autocomplete !== undefined)
    warnings.push(`${sourceLabel}: piVimMode.exCommand.autocomplete must be a boolean`);
  return Object.keys(partial).length > 0 ? { partial, warnings } : { warnings };
}

function parseBooleanMap<T extends string>(
  value: unknown,
  allowed: Set<string>,
  label: string,
  warnings: string[],
): Partial<Record<T, boolean>> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(`${label} must be an object`);
    return undefined;
  }
  const parsed: Partial<Record<T, boolean>> = {};
  for (const [key, enabled] of Object.entries(value)) {
    if (!allowed.has(key)) {
      warnings.push(`${label}.${key} is unsupported`);
      continue;
    }
    if (typeof enabled === "boolean") parsed[key as T] = enabled;
    else warnings.push(`${label}.${key} must be a boolean`);
  }
  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function parseMarks(
  value: unknown,
  sourceLabel: string,
): { partial?: PartialMarkOptions; warnings: string[] } {
  const warnings: string[] = [];
  const partial: PartialMarkOptions = {};
  if (value === undefined) return { warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: piVimMode.marks must be an object`);
    return { warnings };
  }

  if (typeof value.enabled === "boolean") partial.enabled = value.enabled;
  else if (value.enabled !== undefined)
    warnings.push(`${sourceLabel}: piVimMode.marks.enabled must be a boolean`);

  if (value.slots !== undefined) {
    const slots = parseLowercaseSlots(
      value.slots,
      `${sourceLabel}: piVimMode.marks.slots`,
      warnings,
    );
    if (slots) partial.slots = slots;
  }

  return Object.keys(partial).length > 0 ? { partial, warnings } : { warnings };
}

function parsePromptStructures(
  value: unknown,
  sourceLabel: string,
): { partial?: PartialPromptStructureOptions; warnings: string[] } {
  const warnings: string[] = [];
  const partial: PartialPromptStructureOptions = {};
  if (value === undefined) return { warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: piVimMode.promptStructures must be an object`);
    return { warnings };
  }

  if (typeof value.enabled === "boolean") partial.enabled = value.enabled;
  else if (value.enabled !== undefined)
    warnings.push(`${sourceLabel}: piVimMode.promptStructures.enabled must be a boolean`);

  const targets = parseBooleanMap<PromptStructureTarget>(
    value.targets,
    PROMPT_STRUCTURE_TARGET_SET,
    `${sourceLabel}: piVimMode.promptStructures.targets`,
    warnings,
  );
  if (targets) partial.targets = targets;

  return Object.keys(partial).length > 0 ? { partial, warnings } : { warnings };
}

function parsePromptTransforms(
  value: unknown,
  sourceLabel: string,
): { partial?: PartialPromptTransformOptions; warnings: string[] } {
  const warnings: string[] = [];
  const partial: PartialPromptTransformOptions = {};
  if (value === undefined) return { warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: piVimMode.promptTransforms must be an object`);
    return { warnings };
  }

  if (typeof value.enabled === "boolean") partial.enabled = value.enabled;
  else if (value.enabled !== undefined)
    warnings.push(`${sourceLabel}: piVimMode.promptTransforms.enabled must be a boolean`);

  const actions = parseBooleanMap<PromptTransformAction>(
    value.actions,
    PROMPT_TRANSFORM_ACTION_SET,
    `${sourceLabel}: piVimMode.promptTransforms.actions`,
    warnings,
  );
  if (actions) partial.actions = actions;

  if (value.commands !== undefined) {
    if (!isRecord(value.commands)) {
      warnings.push(`${sourceLabel}: piVimMode.promptTransforms.commands must be an object`);
    } else {
      const commands: Partial<Record<PromptTransformAction, string[]>> = {};
      for (const [action, commandNames] of Object.entries(value.commands)) {
        if (!PROMPT_TRANSFORM_ACTION_SET.has(action)) {
          warnings.push(
            `${sourceLabel}: unsupported piVimMode.promptTransforms.commands.${action}`,
          );
          continue;
        }
        const names = parseStringArray(
          commandNames,
          `${sourceLabel}: piVimMode.promptTransforms.commands.${action}`,
          warnings,
        )?.filter((name) => /^[A-Za-z]+$/.test(name));
        if (names) commands[action as PromptTransformAction] = names;
      }
      if (Object.keys(commands).length > 0) partial.commands = commands;
    }
  }

  return Object.keys(partial).length > 0 ? { partial, warnings } : { warnings };
}

function parsePiVimMode(
  value: unknown,
  sourceLabel: string,
): { partial: PartialVimOptions; warnings: string[] } {
  const warnings: string[] = [];
  const partial: PartialVimOptions = {};

  if (value === undefined) return { partial, warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: piVimMode must be an object`);
    return { partial, warnings };
  }

  if (value.leader !== undefined) {
    if (value.leader === null || isPrintableLeader(value.leader)) {
      partial.leader = value.leader;
    } else {
      warnings.push(`${sourceLabel}: piVimMode.leader must be one printable character or null`);
    }
  }

  const preset = value.preset;
  if (preset !== undefined) {
    if (typeof preset === "string" && VIM_PRESETS.has(preset as VimPreset)) {
      partial.preset = preset as VimPreset;
    } else {
      warnings.push(`${sourceLabel}: unsupported piVimMode.preset`);
    }
  }

  const startMode = value.startMode;
  if (startMode !== undefined) {
    if (typeof startMode === "string" && START_MODES.has(startMode as StartupMode)) {
      partial.startMode = startMode as StartupMode;
    } else {
      warnings.push(`${sourceLabel}: unsupported piVimMode.startMode`);
    }
  }

  const cursor = value.cursor;
  if (cursor !== undefined) {
    if (!isRecord(cursor)) {
      warnings.push(`${sourceLabel}: piVimMode.cursor must be an object`);
    } else {
      const parsedCursor: Partial<CursorStyles> = {};
      for (const mode of VIM_MODES) {
        const style = cursor[mode];
        if (style === undefined) continue;
        if (typeof style === "string" && CURSOR_STYLES.has(style as CursorStyle)) {
          parsedCursor[mode] = style as CursorStyle;
        } else {
          warnings.push(`${sourceLabel}: unsupported piVimMode.cursor.${mode}`);
        }
      }
      partial.cursor = parsedCursor;
    }
  }

  if (value.vimOptions !== undefined) {
    warnings.push(`${sourceLabel}: piVimMode.vimOptions is no longer supported; use piVimMode.ui`);
  }

  const keymap = parseKeymap(value.keymap, sourceLabel);
  partial.keymap = keymap.partial;
  warnings.push(...keymap.warnings);

  const ui = parseUi(value.ui, sourceLabel);
  partial.ui = ui.partial;
  warnings.push(...ui.warnings);

  const macros = parseMacros(value.macros, sourceLabel);
  partial.macros = macros.partial;
  warnings.push(...macros.warnings);

  const marks = parseMarks(value.marks, sourceLabel);
  partial.marks = marks.partial;
  warnings.push(...marks.warnings);

  const search = parseSearch(value.search, sourceLabel);
  partial.search = search.partial;
  warnings.push(...search.warnings);

  const exCommand = parseExCommand(value.exCommand, sourceLabel);
  partial.exCommand = exCommand.partial;
  warnings.push(...exCommand.warnings);

  const feedback = parseFeedback(value.feedback, sourceLabel);
  partial.feedback = feedback.partial;
  warnings.push(...feedback.warnings);

  const promptStructures = parsePromptStructures(value.promptStructures, sourceLabel);
  partial.promptStructures = promptStructures.partial;
  warnings.push(...promptStructures.warnings);

  const promptTransforms = parsePromptTransforms(value.promptTransforms, sourceLabel);
  partial.promptTransforms = promptTransforms.partial;
  warnings.push(...promptTransforms.warnings);

  return { partial, warnings };
}

function configuredTopLevelKeymapSequences(partial: PartialKeymapOptions): Set<string> {
  const sequences = new Set<string>();
  for (const group of [partial.operators, partial.motions, partial.macros, partial.marks]) {
    for (const bindings of Object.values(group ?? {})) {
      for (const sequence of bindings ?? []) sequences.add(sequence);
    }
  }
  for (const [command, bindings] of Object.entries(partial.commands ?? {})) {
    if (command === "showKeybindings") continue;
    for (const sequence of bindings ?? []) sequences.add(sequence);
  }
  for (const remap of partial.remaps?.accepted ?? []) sequences.add(remap.key);
  return sequences;
}

function removeTopLevelKeymapSequences(target: ResolvedVimKeymap, sequences: Set<string>): void {
  if (sequences.size === 0) return;
  const remove = <K extends string>(record: Record<K, readonly string[]>): Record<K, string[]> => {
    const next = {} as Record<K, string[]>;
    for (const action of Object.keys(record) as K[]) {
      next[action] = record[action].filter(
        (binding) =>
          ![...sequences].some((sequence) => {
            if (binding === sequence) return true;
            if (binding.includes("+") || sequence.includes("+")) return false;
            return binding.startsWith(sequence) || sequence.startsWith(binding);
          }),
      );
    }
    return next;
  };

  target.operators = remove(target.operators);
  target.motions = remove(target.motions);
  target.commands = remove(target.commands);
  target.macros = remove(target.macros);
  target.marks = remove(target.marks);
  target.remaps = {
    accepted: target.remaps.accepted.filter(
      (remap) =>
        ![...sequences].some((sequence) => {
          if (remap.key === sequence) return true;
          if (remap.key.includes("+") || sequence.includes("+")) return false;
          return remap.key.startsWith(sequence) || sequence.startsWith(remap.key);
        }),
    ),
  };
}

function mergeKeymap(target: ResolvedVimKeymap, partial: PartialKeymapOptions): void {
  for (const unmap of partial.unmaps ?? []) {
    if (unmap.modes.includes("insert")) {
      for (const action of Object.keys(target.insert) as Array<keyof ResolvedVimInsertKeymap>) {
        target.insert[action] = target.insert[action].filter((key) => key !== unmap.key);
      }
    }
    target.actions.accepted = target.actions.accepted.flatMap((binding) => {
      if (binding.key !== unmap.key) return [binding];
      const modes = binding.modes?.filter((mode) => !unmap.modes.includes(mode));
      return modes?.length ? [{ ...binding, modes }] : [];
    });
    target.remaps.accepted = target.remaps.accepted.flatMap((mapping) => {
      if (mapping.key !== unmap.key) return [mapping];
      const modes = mapping.modes?.filter((mode) => !unmap.modes.includes(mode));
      return modes?.length ? [{ ...mapping, modes }] : [];
    });
  }
  removeTopLevelKeymapSequences(target, configuredTopLevelKeymapSequences(partial));
  if (partial.escape) target.escape = [...partial.escape];
  if (partial.operators) target.operators = { ...target.operators, ...partial.operators };
  if (partial.motions) target.motions = { ...target.motions, ...partial.motions };
  if (partial.commands) target.commands = { ...target.commands, ...partial.commands };
  if (partial.macros) target.macros = { ...target.macros, ...partial.macros };
  if (partial.marks) target.marks = { ...target.marks, ...partial.marks };
  if (partial.textObjects) {
    target.textObjects = {
      kinds: { ...target.textObjects.kinds, ...partial.textObjects.kinds },
      targets: { ...target.textObjects.targets, ...partial.textObjects.targets },
    };
  }
  if (partial.operatorMotions) {
    target.operatorMotions = { ...target.operatorMotions, ...partial.operatorMotions };
  }
  if (partial.insert) {
    target.insert = { ...target.insert, ...partial.insert };
  }
  if (partial.actions) mergeActionBindings(target, partial.actions);
  if (partial.remaps) {
    target.remaps = { accepted: [...target.remaps.accepted, ...partial.remaps.accepted] };
  }
  for (const unmap of partial.unmaps ?? []) {
    target.actions.accepted = target.actions.accepted.flatMap((binding) => {
      if (binding.key !== unmap.key) return [binding];
      const modes = binding.modes?.filter((mode) => !unmap.modes.includes(mode));
      return modes?.length ? [{ ...binding, modes }] : [];
    });
    target.remaps.accepted = target.remaps.accepted.flatMap((mapping) => {
      if (mapping.key !== unmap.key) return [mapping];
      const modes = mapping.modes?.filter((mode) => !unmap.modes.includes(mode));
      return modes?.length ? [{ ...mapping, modes }] : [];
    });
  }
}

function additiveKeymapLayer(
  layers: readonly PartialKeymapOptions[],
  partial: PartialKeymapOptions,
): PartialKeymapOptions {
  const base = keymapOverlayFromLayers(layers);
  const next: PartialKeymapOptions = { ...partial };
  if (partial.insert) {
    const insert: Partial<ResolvedVimInsertKeymap> = {};
    for (const [action, keys] of Object.entries(partial.insert)) {
      const typedAction = action as keyof ResolvedVimInsertKeymap;
      insert[typedAction] = [...(base.insert?.[typedAction] ?? []), ...keys];
    }
    next.insert = insert;
  }
  if (partial.actions) {
    const actions: NonNullable<PartialKeymapOptions["actions"]> = {};
    for (const [actionId, bindings] of Object.entries(partial.actions)) {
      const typedAction = actionId as BindablePromptTransformActionId;
      actions[typedAction] = [...(base.actions?.[typedAction] ?? []), ...bindings];
    }
    next.actions = actions;
  }
  return next;
}

function removePartialRemaps(target: PartialKeymapOptions, sequences: Set<string>): void {
  if (!target.remaps || sequences.size === 0) return;
  target.remaps = {
    accepted: target.remaps.accepted.filter(
      (remap) =>
        ![...sequences].some((sequence) => {
          if (remap.key === sequence) return true;
          if (remap.key.includes("+") || sequence.includes("+")) return false;
          return remap.key.startsWith(sequence) || sequence.startsWith(remap.key);
        }),
    ),
  };
}

function mergeKeymapOverlay(target: PartialKeymapOptions, partial: PartialKeymapOptions): void {
  removePartialRemaps(target, configuredTopLevelKeymapSequences(partial));
  if (partial.escape) target.escape = [...partial.escape];
  if (partial.operators) target.operators = { ...target.operators, ...partial.operators };
  if (partial.motions) target.motions = { ...target.motions, ...partial.motions };
  if (partial.commands) target.commands = { ...target.commands, ...partial.commands };
  if (partial.macros) target.macros = { ...target.macros, ...partial.macros };
  if (partial.marks) target.marks = { ...target.marks, ...partial.marks };
  if (partial.textObjects) {
    target.textObjects = {
      kinds: { ...target.textObjects?.kinds, ...partial.textObjects.kinds },
      targets: { ...target.textObjects?.targets, ...partial.textObjects.targets },
    };
  }
  if (partial.operatorMotions) {
    target.operatorMotions = { ...target.operatorMotions, ...partial.operatorMotions };
  }
  if (partial.insert) {
    target.insert = { ...target.insert, ...partial.insert };
  }
  if (partial.actions) {
    target.actions = { ...target.actions, ...partial.actions };
  }
  if (partial.remaps) {
    target.remaps = { accepted: [...(target.remaps?.accepted ?? []), ...partial.remaps.accepted] };
  }
  if (partial.unmaps) target.unmaps = [...(target.unmaps ?? []), ...partial.unmaps];
}

function keymapOverlayFromLayers(layers: readonly PartialKeymapOptions[]): PartialKeymapOptions {
  const overlay: PartialKeymapOptions = {};
  for (const layer of layers) mergeKeymapOverlay(overlay, layer);
  return overlay;
}

type ExpandedLeaderSequence = { sequence?: string; usesLeader: boolean };
type LeaderExpansionContext = {
  leader: string | undefined;
  warnings: string[];
  expand: boolean;
};

function expandLeaderSequence(
  sequence: string,
  label: string,
  context: LeaderExpansionContext,
): ExpandedLeaderSequence {
  if (!/<leader>/i.test(sequence)) return { sequence, usesLeader: false };
  if (!sequence.toLowerCase().startsWith(LEADER_TOKEN)) {
    context.warnings.push(`${label} contains <leader> after another key`);
    return { usesLeader: false };
  }
  if (!context.leader) {
    context.warnings.push(`${label} uses <leader> but piVimMode.leader is unset`);
    return { usesLeader: false };
  }
  const suffix = sequence.replace(/^(?:<leader>)+/i, "");
  const protectedShortcut = protectedShortcutForKey(suffix);
  if (protectedShortcut) {
    context.warnings.push(
      `${label} contains protected key ${suffix} (${protectedShortcut.reason})`,
    );
    return { usesLeader: false };
  }
  if (sequence.toLowerCase() === LEADER_TOKEN) {
    context.warnings.push(`${label} cannot bind a lone <leader>`);
    return { usesLeader: false };
  }
  return {
    sequence: context.expand ? sequence.replace(LEADER_TOKEN_PATTERN, context.leader) : sequence,
    usesLeader: true,
  };
}

function expandBindingArray(
  bindings: string[],
  label: string,
  context: LeaderExpansionContext,
): { bindings?: string[]; usesLeader: boolean } {
  if (bindings.length === 0) return { bindings: [], usesLeader: false };
  const expanded: string[] = [];
  let usesLeader = false;
  for (const binding of bindings) {
    const result = expandLeaderSequence(binding, label, context);
    if (result.sequence) expanded.push(result.sequence);
    usesLeader ||= result.usesLeader;
  }
  return { bindings: expanded.length > 0 ? expanded : undefined, usesLeader };
}

function expandBindingRecord(
  record: Partial<Record<string, string[]>> | undefined,
  label: string,
  context: LeaderExpansionContext,
): boolean {
  if (!record) return false;
  let usesLeader = false;
  for (const [action, bindings] of Object.entries(record)) {
    if (!bindings) continue;
    const expanded = expandBindingArray(bindings, `${label}.${action}`, context);
    if (expanded.bindings) record[action] = expanded.bindings;
    else delete record[action];
    usesLeader ||= expanded.usesLeader;
  }
  return usesLeader;
}

function expandLeaderMappings(
  overlay: PartialKeymapOptions,
  leader: string | undefined,
  expand = true,
): {
  usesLeader: boolean;
  usesNonActionLeader: boolean;
  leaderActionBindings: Set<ResolvedVimActionBinding>;
  warnings: string[];
} {
  const context: LeaderExpansionContext = { leader, warnings: [], expand };
  const expandRecord = (record: object | undefined, label: string): boolean =>
    expandBindingRecord(record as Partial<Record<string, string[]>> | undefined, label, context);

  if (overlay.escape) {
    const expanded = expandBindingArray(
      overlay.escape,
      "resolved settings: piVimMode.keymap.escape",
      context,
    );
    overlay.escape = expanded.bindings;
  }

  let usesNonActionLeader = false;
  for (const [record, label] of [
    [overlay.operators, "operators"],
    [overlay.motions, "motions"],
    [overlay.commands, "commands"],
    [overlay.macros, "macros"],
    [overlay.marks, "marks"],
  ] as const) {
    if (expandRecord(record, `resolved settings: piVimMode.keymap.${label}`)) {
      usesNonActionLeader = true;
    }
  }
  expandRecord(overlay.textObjects?.kinds, "resolved settings: piVimMode.keymap.textObjects.kinds");
  expandRecord(
    overlay.textObjects?.targets,
    "resolved settings: piVimMode.keymap.textObjects.targets",
  );
  expandRecord(overlay.insert, "resolved settings: piVimMode.keymap.insert");

  const leaderActionBindings = new Set<ResolvedVimActionBinding>();
  for (const [actionId, bindings] of Object.entries(overlay.actions ?? {})) {
    if (!bindings) continue;
    const expanded: ResolvedVimActionBinding[] = [];
    for (const binding of bindings) {
      const result = expandLeaderSequence(
        binding.key,
        `resolved settings: piVimMode.keymap.actions.${actionId}`,
        context,
      );
      if (result.sequence) {
        const expandedBinding = { ...binding, key: result.sequence };
        expanded.push(expandedBinding);
        if (result.usesLeader && (!binding.modes || binding.modes.length > 0)) {
          leaderActionBindings.add(expandedBinding);
        }
      }
    }
    const typedActionId = actionId as BindablePromptTransformActionId;
    if (expanded.length > 0 || bindings.length === 0) overlay.actions![typedActionId] = expanded;
    else delete overlay.actions![typedActionId];
  }

  if (overlay.remaps) {
    const remaps: Array<ResolvedVimKeymap["remaps"]["accepted"][number]> = [];
    for (const remap of overlay.remaps.accepted) {
      const result = expandLeaderSequence(
        remap.key,
        "resolved settings: piVimMode.keymap.remaps",
        context,
      );
      if (result.sequence) remaps.push({ ...remap, key: result.sequence });
      usesNonActionLeader ||= result.usesLeader;
    }
    overlay.remaps = { accepted: remaps };
  }

  return {
    usesLeader: usesNonActionLeader || leaderActionBindings.size > 0,
    usesNonActionLeader,
    leaderActionBindings,
    warnings: context.warnings,
  };
}

function reserveLeaderPrefix(target: ResolvedVimKeymap, leader: string): void {
  const remove = <K extends string>(record: Record<K, readonly string[]>): Record<K, string[]> =>
    Object.fromEntries(
      Object.entries(record).map(([action, bindings]) => [
        action,
        (bindings as readonly string[]).filter(
          (binding) => binding !== leader && !binding.startsWith(leader),
        ),
      ]),
    ) as Record<K, string[]>;

  target.operators = remove(target.operators);
  target.motions = remove(target.motions);
  target.commands = remove(target.commands);
  target.macros = remove(target.macros);
  target.marks = remove(target.marks);
  target.textObjects = {
    kinds: remove(target.textObjects.kinds),
    targets: remove(target.textObjects.targets),
  };
  target.remaps = {
    accepted: target.remaps.accepted.filter(
      (remap) => remap.key !== leader && !remap.key.startsWith(leader),
    ),
  };
}

function resolveKeymapFromLayers(
  layers: readonly PartialKeymapOptions[],
  leader?: string,
  reserveLeader = true,
): {
  keymap: ResolvedVimKeymap;
  usesNonActionLeader: boolean;
  leaderActionBindings: Set<ResolvedVimActionBinding>;
  warnings: string[];
} {
  const warnings: string[] = [];
  for (const layer of layers) {
    warnings.push(...expandLeaderMappings(layer, leader, false).warnings);
  }
  const overlay = keymapOverlayFromLayers(layers);
  const expanded = expandLeaderMappings(overlay, leader);
  warnings.push(...expanded.warnings);
  const keymap = cloneKeymap();
  if (reserveLeader && expanded.usesLeader && leader) {
    reserveLeaderPrefix(keymap, leader);
    keymap.leader = leader;
  }
  mergeKeymap(keymap, overlay);
  return {
    keymap,
    usesNonActionLeader: expanded.usesNonActionLeader,
    leaderActionBindings: expanded.leaderActionBindings,
    warnings,
  };
}

function mergeMacros(target: ResolvedVimMacros, partial: PartialMacroOptions): void {
  if (partial.enabled !== undefined) target.enabled = partial.enabled;
  if (partial.slots) target.slots = [...partial.slots];
  if (partial.maxReplaySteps) target.maxReplaySteps = partial.maxReplaySteps;
}

function mergeMarks(target: ResolvedVimMarks, partial: PartialMarkOptions): void {
  if (partial.enabled !== undefined) target.enabled = partial.enabled;
  if (partial.slots) target.slots = [...partial.slots];
}

function mergeSearch(target: ResolvedVimSearch, partial: PartialSearchOptions): void {
  Object.assign(target, partial);
}

function mergeExCommand(target: ResolvedVimExCommand, partial: PartialExCommandOptions): void {
  Object.assign(target, partial);
}

function mergeFeedback(target: VimFeedbackOptions, partial: PartialFeedbackOptions): void {
  Object.assign(target, partial);
}

function mergePromptStructures(
  target: ResolvedVimPromptStructures,
  partial: PartialPromptStructureOptions,
): void {
  if (partial.enabled !== undefined) target.enabled = partial.enabled;
  if (partial.targets) target.targets = { ...target.targets, ...partial.targets };
}

function mergePromptTransforms(
  target: ResolvedVimPromptTransforms,
  partial: PartialPromptTransformOptions,
): void {
  if (partial.enabled !== undefined) target.enabled = partial.enabled;
  if (partial.actions) target.actions = { ...target.actions, ...partial.actions };
  if (partial.commands) target.commands = { ...target.commands, ...partial.commands };
}

function mergeActionBindings(
  target: ResolvedVimKeymap,
  actions: NonNullable<PartialKeymapOptions["actions"]>,
): void {
  const byId = new Map<BindablePromptTransformActionId, ResolvedVimActionBinding[]>();
  for (const binding of target.actions.accepted) {
    byId.set(binding.actionId, [...(byId.get(binding.actionId) ?? []), binding]);
  }
  for (const [actionId, bindings] of Object.entries(actions)) {
    byId.set(actionId as BindablePromptTransformActionId, bindings ?? []);
  }
  target.actions = { accepted: [...byId.values()].flat() };
}

function mergeUi(target: ResolvedVimUi, partial: PartialUiOptions): void {
  if (partial.status) target.status = { ...target.status, ...partial.status };
  if (partial.mode) {
    target.mode = {
      ...target.mode,
      enabled: partial.mode.enabled ?? target.mode.enabled,
      labels: { ...target.mode.labels, ...partial.mode.labels },
      narrowLabels: { ...target.mode.narrowLabels, ...partial.mode.narrowLabels },
    };
  }
  if (partial.selection) target.selection = { ...target.selection, ...partial.selection };
  if (partial.cursorPosition) {
    target.cursorPosition = { ...target.cursorPosition, ...partial.cursorPosition };
  }
  if (partial.workbench) target.workbench = { ...target.workbench, ...partial.workbench };
}

type ActionBindingConflict = { rejected: boolean; reason?: string };

function actionModesOverlap(
  left: readonly VimActionBindingMode[] | undefined,
  right: readonly VimActionBindingMode[] | undefined,
): boolean {
  if (!left || !right) return true;
  return left.some((mode) => right.includes(mode));
}

function disabledActionReason(
  actionId: BindablePromptTransformActionId,
  promptTransforms: ResolvedVimPromptTransforms,
): string | undefined {
  const action = promptTransformActionForId(actionId);
  if (!action) return `unsupported action ${actionId}`;
  if (!promptTransforms.enabled) return `disabled prompt transform suite for ${actionId}`;
  if (promptTransforms.actions[action] === false) {
    return `disabled prompt transform action ${actionId}`;
  }
  return undefined;
}

function resolveActionBindings(
  keymap: ResolvedVimKeymap,
  promptTransforms: ResolvedVimPromptTransforms,
): { accepted: ResolvedVimActionBinding[]; warnings: string[] } {
  const warnings: string[] = [];
  const candidates: ResolvedVimActionBinding[] = [];
  const seenSameAction = new Set<string>();
  for (const binding of keymap.actions.accepted) {
    const modes = [...(binding.modes ?? [])].sort().join(",");
    const dedupeKey = `${binding.actionId}\0${binding.key}\0${modes}\0${JSON.stringify(binding.args ?? {})}`;
    if (seenSameAction.has(dedupeKey)) continue;
    seenSameAction.add(dedupeKey);
    candidates.push(binding);
  }

  const conflicts = new Map<ResolvedVimActionBinding, ActionBindingConflict>();
  const byKey = new Map<string, ResolvedVimActionBinding[]>();
  for (const binding of candidates) {
    byKey.set(binding.key, [...(byKey.get(binding.key) ?? []), binding]);
  }

  for (const binding of candidates) {
    const reason = disabledActionReason(binding.actionId, promptTransforms);
    if (reason) conflicts.set(binding, { rejected: true, reason });
  }
  for (const [key, bindings] of byKey) {
    const conflicting = bindings.filter((binding, index) =>
      bindings.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          binding.actionId !== other.actionId &&
          actionModesOverlap(binding.modes, other.modes),
      ),
    );
    if (conflicting.length === 0) continue;
    const ids = [...new Set(bindings.map((binding) => binding.actionId))].sort();
    warnings.push(`resolved settings: duplicate action key ${key} for ${ids.join(" and ")}`);
    for (const binding of bindings) {
      conflicts.set(binding, { rejected: true, reason: `duplicate action key ${key}` });
    }
  }

  const grammarBindings = grammarBindingsForKeymap(keymap);
  for (const binding of candidates) {
    if (conflicts.get(binding)?.rejected) continue;
    const reason = grammarConflictForActionKey(binding.key, grammarBindings);
    if (reason) conflicts.set(binding, { rejected: true, reason });
  }

  const accepted: ResolvedVimActionBinding[] = [];
  for (const binding of candidates) {
    const conflict = conflicts.get(binding);
    if (conflict?.rejected) {
      warnings.push(
        `resolved settings: rejected piVimMode.keymap.actions.${binding.actionId}.${binding.key}: ${conflict.reason}`,
      );
      continue;
    }
    accepted.push(binding);
  }
  return { accepted, warnings };
}

function rejectShowKeybindingsConflicts(keymap: ResolvedVimKeymap): string[] {
  const warnings: string[] = [];
  const grammarBindings = grammarBindingsForKeymap(keymap).filter(
    (binding) => binding.label !== "commands.showKeybindings",
  );
  const accepted: string[] = [];
  for (const key of keymap.commands.showKeybindings) {
    const reason = grammarConflictForActionKey(key, grammarBindings);
    if (reason) {
      warnings.push(
        `resolved settings: rejected piVimMode.keymap.commands.showKeybindings.${key}: ${reason}`,
      );
    } else {
      accepted.push(key);
    }
  }
  keymap.commands = { ...keymap.commands, showKeybindings: accepted };
  return warnings;
}

function detectKeymapConflicts(keymap: ResolvedVimKeymap): string[] {
  const warnings: string[] = [];
  const seen = new Map<string, string>();
  const bindings = grammarBindingsForKeymap(keymap).filter(
    (binding) => !binding.label.startsWith("textObjects."),
  );
  for (const binding of bindings) {
    const previous = seen.get(binding.sequence);
    if (previous && previous !== binding.label) {
      warnings.push(
        `resolved settings: duplicate piVimMode.keymap binding ${binding.sequence} for ${previous} and ${binding.label}`,
      );
    } else {
      seen.set(binding.sequence, binding.label);
    }
  }
  const primaryBindings = bindings.filter(
    (binding) =>
      binding.label.startsWith("operators.") ||
      binding.label.startsWith("motions.") ||
      binding.label.startsWith("commands."),
  );
  for (const [kind, sequences] of Object.entries(keymap.textObjects.kinds)) {
    const defaultSequences =
      DEFAULT_VIM_KEYMAP.textObjects.kinds[
        kind as keyof typeof DEFAULT_VIM_KEYMAP.textObjects.kinds
      ] ?? [];
    for (const sequence of sequences) {
      if (defaultSequences.includes(sequence)) continue;
      const binding = primaryBindings.find((candidate) => candidate.sequence === sequence);
      if (binding) {
        warnings.push(
          `resolved settings: duplicate piVimMode.keymap binding ${sequence} for ${binding.label} and textObjects.kinds.${kind}`,
        );
      }
    }
  }
  for (const [target, sequences] of Object.entries(keymap.textObjects.targets)) {
    const defaultSequences =
      DEFAULT_VIM_KEYMAP.textObjects.targets[
        target as keyof typeof DEFAULT_VIM_KEYMAP.textObjects.targets
      ] ?? [];
    for (const sequence of sequences) {
      if (defaultSequences.includes(sequence)) continue;
      const binding = primaryBindings.find((candidate) => candidate.sequence === sequence);
      if (binding) {
        warnings.push(
          `resolved settings: duplicate piVimMode.keymap binding ${sequence} for ${binding.label} and textObjects.targets.${target}`,
        );
      }
    }
  }

  for (const first of bindings) {
    for (const second of bindings) {
      if (first === second) continue;
      if (second.sequence.length <= first.sequence.length) continue;
      if (second.sequence.includes("+")) continue;
      if (!second.sequence.startsWith(first.sequence)) continue;
      // Arrow-key aliases are atomic terminal sequences, never typed character-by-character.
      // Suppress shadow warnings when the longer binding is an atomic alias.
      if (
        second.sequence === "left" ||
        second.sequence === "down" ||
        second.sequence === "up" ||
        second.sequence === "right"
      )
        continue;
      warnings.push(
        `resolved settings: piVimMode.keymap binding ${first.sequence} for ${first.label} is shadowed by longer binding ${second.sequence} for ${second.label}`,
      );
    }
  }

  return warnings;
}

function presetOptions(preset: VimPreset): PartialVimOptions {
  if (preset === "minimal") {
    return {
      preset,
      ui: { status: { items: ["mode"] } },
      macros: { enabled: false },
      marks: { enabled: false },
      search: { highlightCurrent: false, maxHighlights: 50 },
    };
  }
  if (preset === "vim-heavy") {
    return {
      preset,
      startMode: "normal",
      keymap: { commands: { visualBlock: [] } },
      ui: { status: { items: ["mode", "pendingOperator", "selection", "cursorPosition"] } },
    };
  }
  return {
    preset,
    startMode: "insert",
    feedback: { noop: "off" },
    search: { clearOnInsert: true, maxHighlights: 200 },
  };
}

function mergePartialOptions(target: ResolvedVimEditorOptions, partial: PartialVimOptions): void {
  if (partial.preset) target.preset = partial.preset;
  if (partial.leader !== undefined) {
    if (partial.leader === null) delete target.leader;
    else target.leader = partial.leader;
  }
  if (partial.startMode) target.startMode = partial.startMode;
  if (partial.cursor) target.cursor = { ...target.cursor, ...partial.cursor };
  if (partial.keymap) mergeKeymap(target.keymap ?? cloneKeymap(), partial.keymap);
  if (partial.ui) mergeUi(target.ui ?? cloneUi(), partial.ui);
  if (partial.macros) mergeMacros(target.macros ?? cloneMacros(), partial.macros);
  if (partial.marks) mergeMarks(target.marks ?? cloneMarks(), partial.marks);
  if (partial.search) mergeSearch(target.search ?? cloneSearch(), partial.search);
  if (partial.exCommand) mergeExCommand(target.exCommand ?? cloneExCommand(), partial.exCommand);
  if (partial.feedback) mergeFeedback(target.feedback ?? cloneFeedback(), partial.feedback);
  if (partial.promptStructures) {
    mergePromptStructures(
      target.promptStructures ?? clonePromptStructures(),
      partial.promptStructures,
    );
  }
  if (partial.promptTransforms) {
    mergePromptTransforms(
      target.promptTransforms ?? clonePromptTransforms(),
      partial.promptTransforms,
    );
  }
}

function removeJsMappings(
  keymap: PartialKeymapOptions,
  key: string,
  modes: readonly VimMode[],
): void {
  const removesMode = (mode: VimMode) => modes.includes(mode);
  if (keymap.insert && removesMode("insert")) {
    for (const action of Object.keys(keymap.insert) as Array<keyof ResolvedVimInsertKeymap>) {
      keymap.insert[action] = keymap.insert[action]?.filter((binding) => binding !== key);
    }
  }
  if (keymap.actions) {
    for (const [actionId, bindings] of Object.entries(keymap.actions)) {
      keymap.actions[actionId as BindablePromptTransformActionId] = (bindings ?? []).flatMap(
        (binding) => {
          if (binding.key !== key) return [binding];
          const remainingModes = binding.modes?.filter((mode) => !removesMode(mode));
          return remainingModes?.length ? [{ ...binding, modes: remainingModes }] : [];
        },
      );
    }
  }
  if (keymap.remaps) {
    keymap.remaps.accepted = keymap.remaps.accepted.flatMap((mapping) => {
      if (mapping.key !== key) return [mapping];
      const remainingModes = mapping.modes?.filter((mode) => !removesMode(mode));
      return remainingModes?.length ? [{ ...mapping, modes: remainingModes }] : [];
    });
  }
}

function partialFromJsOperations(operations: readonly VimJsConfigOperation[]): VimEditorOptions {
  const partial: VimEditorOptions = {};
  for (const operation of operations) {
    if (operation.kind === "preset") {
      partial.preset = operation.preset;
      continue;
    }
    if (operation.kind === "leaf") {
      partial.leader = operation.value;
      continue;
    }
    const keymap = (partial.keymap ??= {});
    if (operation.kind === "unmap") {
      removeJsMappings(keymap as PartialKeymapOptions, operation.key, operation.modes);
      const unmaps = ((keymap as PartialKeymapOptions).unmaps ??= []);
      unmaps.push({ key: operation.key, modes: operation.modes });
      continue;
    }
    const mapping = operation.mapping;
    if (mapping.kind === "insert") {
      const insert = (keymap.insert ??= {});
      insert[mapping.action] = [...(insert[mapping.action] ?? []), mapping.key];
      continue;
    }
    if (mapping.kind === "action") {
      const actions = (keymap.actions ??= {});
      actions[mapping.actionId] = [
        ...(actions[mapping.actionId] ?? []),
        { key: mapping.key, args: mapping.args, modes: mapping.modes },
      ];
      continue;
    }
    const remaps = (keymap.remaps ??= { accepted: [] });
    remaps.accepted = [
      ...remaps.accepted,
      { key: mapping.key, inputs: mapping.inputs, modes: mapping.modes },
    ];
  }
  return partial;
}

export function resolveVimOptions(
  globalSettings: unknown,
  projectSettings?: unknown,
  jsConfig?: {
    kind?: "success" | "fatal" | "missing";
    operations?: readonly VimJsConfigOperation[];
    partial?: unknown;
    warnings?: readonly string[];
    appendKeymap?: boolean;
  },
): VimConfigLoadResult {
  const options = cloneDefaultOptions();
  const warnings: string[] = [];

  const keymapLayers: PartialKeymapOptions[] = [];

  const globalPiVimMode = isRecord(globalSettings) ? globalSettings.piVimMode : undefined;
  const parsedGlobal = parsePiVimMode(globalPiVimMode, "global settings");
  if (parsedGlobal.partial.preset) {
    const preset = presetOptions(parsedGlobal.partial.preset);
    mergePartialOptions(options, preset);
    if (preset.keymap) keymapLayers.push(preset.keymap);
  }
  mergePartialOptions(options, parsedGlobal.partial);
  if (parsedGlobal.partial.keymap) keymapLayers.push(parsedGlobal.partial.keymap);
  warnings.push(...parsedGlobal.warnings);

  const jsPartialSource = jsConfig?.operations
    ? partialFromJsOperations(jsConfig.operations)
    : jsConfig?.partial;
  const parsedJs = parsePiVimMode(jsPartialSource, "global JS config");
  const appendJsKeymap = jsConfig?.kind === "success" || jsConfig?.appendKeymap;
  if (parsedJs.partial.preset) {
    const preset = presetOptions(parsedJs.partial.preset);
    mergePartialOptions(options, preset);
    if (preset.keymap) keymapLayers.push(preset.keymap);
  }
  const jsUnmaps = jsConfig?.operations
    ? (partialFromJsOperations(jsConfig.operations).keymap as PartialKeymapOptions | undefined)
        ?.unmaps
    : undefined;
  const jsPartial =
    appendJsKeymap && parsedJs.partial.keymap
      ? {
          ...parsedJs.partial,
          keymap: {
            ...additiveKeymapLayer(keymapLayers, parsedJs.partial.keymap),
            unmaps: jsUnmaps,
          },
        }
      : parsedJs.partial;
  mergePartialOptions(options, jsPartial);
  if (jsPartial.keymap) keymapLayers.push(jsPartial.keymap);
  warnings.push(...(jsConfig?.warnings ?? []), ...parsedJs.warnings);

  const projectPiVimMode = isRecord(projectSettings) ? projectSettings.piVimMode : undefined;
  const parsedProject = parsePiVimMode(projectPiVimMode, "project settings");
  if (parsedProject.partial.preset) {
    const preset = presetOptions(parsedProject.partial.preset);
    mergePartialOptions(options, preset);
    if (preset.keymap) keymapLayers.push(preset.keymap);
  }
  mergePartialOptions(options, parsedProject.partial);
  if (parsedProject.partial.keymap) keymapLayers.push(parsedProject.partial.keymap);
  let keymapResolution: ReturnType<typeof resolveKeymapFromLayers> | undefined;
  if (keymapLayers.length > 0) {
    keymapResolution = resolveKeymapFromLayers(keymapLayers, options.leader);
    options.keymap = keymapResolution.keymap;
    warnings.push(...keymapResolution.warnings);
  }
  warnings.push(...parsedProject.warnings);

  let keymap = options.keymap ?? DEFAULT_VIM_KEYMAP;
  let keymapWarnings = rejectShowKeybindingsConflicts(keymap);
  let actionBindings = resolveActionBindings(
    keymap,
    options.promptTransforms ?? DEFAULT_VIM_PROMPT_TRANSFORMS,
  );
  const acceptedLeaderAction = actionBindings.accepted.some((binding) =>
    keymapResolution?.leaderActionBindings.has(binding),
  );
  if (
    keymapResolution &&
    keymap.leader &&
    !keymapResolution.usesNonActionLeader &&
    !acceptedLeaderAction
  ) {
    keymap = resolveKeymapFromLayers(keymapLayers, options.leader, false).keymap;
    options.keymap = keymap;
    keymapWarnings = rejectShowKeybindingsConflicts(keymap);
    actionBindings = resolveActionBindings(
      keymap,
      options.promptTransforms ?? DEFAULT_VIM_PROMPT_TRANSFORMS,
    );
  }
  if (options.keymap) options.keymap.actions = { accepted: actionBindings.accepted };
  warnings.push(...keymapWarnings, ...actionBindings.warnings);
  warnings.push(...detectKeymapConflicts(keymap));

  return { options, warnings };
}

function readJsonFile(
  path: string,
  sourceLabel: string,
): { settings: unknown | undefined; warnings: string[] } {
  if (!existsSync(path)) return { settings: undefined, warnings: [] };

  try {
    return { settings: JSON.parse(readFileSync(path, "utf8")), warnings: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      settings: undefined,
      warnings: [`${sourceLabel}: failed to read settings (${message})`],
    };
  }
}

export function defaultVimConfigPaths(cwd = process.cwd()): Required<Omit<VimConfigPaths, "cwd">> {
  return {
    globalSettingsPath: join(homedir(), ".pi", "agent", "settings.json"),
    projectSettingsPath: join(cwd, ".pi", "settings.json"),
    jsConfigPath: DEFAULT_JS_CONFIG_PATH,
  };
}

export async function loadVimOptions(paths: VimConfigPaths = {}): Promise<VimConfigLoadResult> {
  const defaults = defaultVimConfigPaths(paths.cwd);
  const globalPath = paths.globalSettingsPath ?? defaults.globalSettingsPath;
  const projectPath = paths.projectSettingsPath ?? defaults.projectSettingsPath;
  const jsConfigPath = paths.jsConfigPath ?? defaults.jsConfigPath;

  const globalRead = readJsonFile(globalPath, "global settings");
  const projectRead = readJsonFile(projectPath, "project settings");
  const globalSeed = resolveVimOptions(globalRead.settings).options;
  const jsRead = await loadVimJsConfig(jsConfigPath, { leader: globalSeed.leader });
  const resolved = resolveVimOptions(globalRead.settings, projectRead.settings, jsRead);

  return {
    options: resolved.options,
    warnings: [...globalRead.warnings, ...projectRead.warnings, ...resolved.warnings],
  };
}

export function keymapForOptions(options: ResolvedVimEditorOptions): ResolvedVimKeymap {
  return options.keymap ?? DEFAULT_VIM_KEYMAP;
}

export function uiForOptions(options: ResolvedVimEditorOptions): ResolvedVimUi {
  return options.ui ?? DEFAULT_VIM_UI;
}

export function macrosForOptions(options: ResolvedVimEditorOptions): ResolvedVimMacros {
  return options.macros ?? DEFAULT_VIM_MACROS;
}

export function marksForOptions(options: ResolvedVimEditorOptions): ResolvedVimMarks {
  return options.marks ?? DEFAULT_VIM_MARKS;
}

export function searchForOptions(options: ResolvedVimEditorOptions): ResolvedVimSearch {
  return options.search ?? DEFAULT_VIM_SEARCH;
}

export function feedbackForOptions(options: ResolvedVimEditorOptions): VimFeedbackOptions {
  return options.feedback ?? DEFAULT_VIM_FEEDBACK;
}

export function promptStructuresForOptions(
  options: ResolvedVimEditorOptions,
): ResolvedVimPromptStructures {
  return options.promptStructures ?? DEFAULT_VIM_PROMPT_STRUCTURES;
}

export function promptTransformsForOptions(
  options: ResolvedVimEditorOptions,
): ResolvedVimPromptTransforms {
  return options.promptTransforms ?? DEFAULT_VIM_PROMPT_TRANSFORMS;
}

export function cursorStyleForMode(options: ResolvedVimEditorOptions, mode: VimMode): CursorStyle {
  return options.cursor[mode] ?? DEFAULT_VIM_OPTIONS.cursor[mode];
}
