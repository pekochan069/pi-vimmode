import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type {
  CursorStyle,
  CursorStyles,
  PromptStructureTarget,
  PromptTransformAction,
  ResolvedVimKeymap,
  ResolvedVimMacros,
  ResolvedVimMarks,
  ResolvedVimPromptStructures,
  ResolvedVimPromptTransforms,
  ResolvedVimSearch,
  ResolvedVimUi,
  StartupMode,
  VimCommandAction,
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
} from "./types.ts";

import { protectedShortcutForKey } from "./customization.ts";

const VIM_MODES = [
  "insert",
  "normal",
  "visual",
  "visualLine",
  "visualBlock",
] as const satisfies readonly VimMode[];
const START_MODES = new Set<StartupMode>(["insert", "normal"]);
const CURSOR_STYLES = new Set<CursorStyle>(["block", "bar", "underline"]);

export const VIM_MOTION_OPERATOR_ACTIONS = ["delete", "change", "yank"] as const;
export const VIM_OPERATOR_ACTIONS = [...VIM_MOTION_OPERATOR_ACTIONS, "indent", "dedent"] as const;
export const VIM_MOTION_ACTIONS = [
  "left",
  "down",
  "up",
  "right",
  "wordForward",
  "wordBackward",
  "wordEnd",
  "lineStart",
  "lineEnd",
  "firstNonBlank",
  "bufferStart",
  "bufferEnd",
  "matchingPair",
] as const satisfies readonly VimMotionAction[];
export const VIM_COMMAND_ACTIONS = [
  "insertBefore",
  "insertAfter",
  "insertLineStart",
  "insertLineEnd",
  "openLineBelow",
  "openLineAbove",
  "visualChar",
  "visualLine",
  "visualBlock",
  "deleteChar",
  "deleteToLineEnd",
  "changeToLineEnd",
  "yankLine",
  "joinLine",
  "pasteAfter",
  "pasteBefore",
  "incrementNumber",
  "decrementNumber",
  "toggleCase",
  "replaceChar",
  "substituteChar",
  "substituteLine",
  "findCharForward",
  "findCharBackward",
  "tillCharForward",
  "tillCharBackward",
  "repeatCharSearch",
  "repeatCharSearchReverse",
  "startSearch",
  "startSearchBackward",
  "repeatSearch",
  "repeatSearchReverse",
  "startExCommand",
  "repeatChange",
  "undo",
  "redo",
] as const satisfies readonly VimCommandAction[];
export const VIM_STATUS_ITEMS = [
  "mode",
  "pendingOperator",
  "selection",
  "cursorPosition",
] as const satisfies readonly VimStatusItem[];
export const VIM_TEXT_OBJECT_KINDS = [
  "inner",
  "around",
] as const satisfies readonly VimTextObjectKind[];
export const VIM_TEXT_OBJECT_TARGETS = [
  "word",
  "singleQuote",
  "doubleQuote",
  "paren",
  "bracket",
  "brace",
  "codeFence",
  "headingSection",
  "listItem",
  "tag",
  "errorBlock",
] as const satisfies readonly VimTextObjectTarget[];
export const PROMPT_STRUCTURE_TARGETS = [
  "codeFence",
  "headingSection",
  "listItem",
  "tag",
  "errorBlock",
] as const satisfies readonly PromptStructureTarget[];
export const PROMPT_TRANSFORM_ACTIONS = [
  "quote",
  "unquote",
  "bulletize",
  "fence",
  "indent",
  "dedent",
  "reflow",
] as const satisfies readonly PromptTransformAction[];

const MOTION_OPERATOR_ACTION_SET = new Set<string>(VIM_MOTION_OPERATOR_ACTIONS);
const OPERATOR_ACTION_SET = new Set<string>(VIM_OPERATOR_ACTIONS);
const MOTION_ACTION_SET = new Set<string>(VIM_MOTION_ACTIONS);
const COMMAND_ACTION_SET = new Set<string>(VIM_COMMAND_ACTIONS);
const LOWERCASE_SLOT_KEYS = "abcdefghijklmnopqrstuvwxyz".split("");
const OPERATOR_MOTION_ACTION_SET = new Set<string>([
  "wordForward",
  "wordBackward",
  "wordEnd",
  "lineStart",
  "firstNonBlank",
  "lineEnd",
]);
const STATUS_ITEM_SET = new Set<string>(VIM_STATUS_ITEMS);
const TEXT_OBJECT_KIND_SET = new Set<string>(VIM_TEXT_OBJECT_KINDS);
const TEXT_OBJECT_TARGET_SET = new Set<string>(VIM_TEXT_OBJECT_TARGETS);
const PROMPT_STRUCTURE_TARGET_SET = new Set<string>(PROMPT_STRUCTURE_TARGETS);
const PROMPT_TRANSFORM_ACTION_SET = new Set<string>(PROMPT_TRANSFORM_ACTIONS);
const VIM_PRESETS = new Set<VimPreset>(["minimal", "prompt-safe", "vim-heavy"]);
const NOOP_FEEDBACK_VALUES = new Set<VimFeedbackOptions["noop"]>(["off", "status"]);
const WORKBENCH_RESERVED_ROWS_MAX = 5;

export const DEFAULT_VIM_KEYMAP = Object.freeze({
  operators: Object.freeze({
    delete: Object.freeze(["d"]),
    change: Object.freeze(["c"]),
    yank: Object.freeze(["y"]),
    indent: Object.freeze([">"]),
    dedent: Object.freeze(["<"]),
  }),
  motions: Object.freeze({
    left: Object.freeze(["h"]),
    down: Object.freeze(["j"]),
    up: Object.freeze(["k"]),
    right: Object.freeze(["l"]),
    wordForward: Object.freeze(["w"]),
    wordBackward: Object.freeze(["b"]),
    wordEnd: Object.freeze(["e"]),
    lineStart: Object.freeze(["0"]),
    lineEnd: Object.freeze(["$"]),
    firstNonBlank: Object.freeze(["^", "_"]),
    bufferStart: Object.freeze(["gg"]),
    bufferEnd: Object.freeze(["G"]),
    matchingPair: Object.freeze(["%"]),
  }),
  macros: Object.freeze({
    record: Object.freeze(["q"]),
    play: Object.freeze(["@"]),
  }),
  marks: Object.freeze({
    set: Object.freeze(["m"]),
    jumpExact: Object.freeze(["`"]),
    jumpLine: Object.freeze(["'"]),
  }),
  textObjects: Object.freeze({
    kinds: Object.freeze({
      inner: Object.freeze(["i"]),
      around: Object.freeze(["a"]),
    }),
    targets: Object.freeze({
      word: Object.freeze(["w"]),
      singleQuote: Object.freeze(["'"]),
      doubleQuote: Object.freeze(['"']),
      paren: Object.freeze(["(", ")"]),
      bracket: Object.freeze(["[", "]"]),
      brace: Object.freeze(["{", "}"]),
      codeFence: Object.freeze(["f"]),
      headingSection: Object.freeze(["h"]),
      listItem: Object.freeze(["l"]),
      tag: Object.freeze(["t"]),
      errorBlock: Object.freeze(["e"]),
    }),
  }),
  commands: Object.freeze({
    insertBefore: Object.freeze(["i"]),
    insertAfter: Object.freeze(["a"]),
    insertLineStart: Object.freeze(["I"]),
    insertLineEnd: Object.freeze(["A"]),
    openLineBelow: Object.freeze(["o"]),
    openLineAbove: Object.freeze(["O"]),
    visualChar: Object.freeze(["v"]),
    visualLine: Object.freeze(["V"]),
    visualBlock: Object.freeze([]),
    deleteChar: Object.freeze(["x"]),
    deleteToLineEnd: Object.freeze(["D"]),
    changeToLineEnd: Object.freeze(["C"]),
    yankLine: Object.freeze(["Y"]),
    joinLine: Object.freeze(["J"]),
    pasteAfter: Object.freeze(["p"]),
    pasteBefore: Object.freeze(["P"]),
    incrementNumber: Object.freeze(["ctrl+a"]),
    decrementNumber: Object.freeze(["ctrl+x"]),
    toggleCase: Object.freeze(["~"]),
    replaceChar: Object.freeze(["r"]),
    substituteChar: Object.freeze(["s"]),
    substituteLine: Object.freeze(["S"]),
    findCharForward: Object.freeze(["f"]),
    findCharBackward: Object.freeze(["F"]),
    tillCharForward: Object.freeze(["t"]),
    tillCharBackward: Object.freeze(["T"]),
    repeatCharSearch: Object.freeze([";"]),
    repeatCharSearchReverse: Object.freeze([","]),
    startSearch: Object.freeze(["/"]),
    startSearchBackward: Object.freeze(["?"]),
    repeatSearch: Object.freeze(["n"]),
    repeatSearchReverse: Object.freeze(["N"]),
    startExCommand: Object.freeze([":"]),
    repeatChange: Object.freeze(["."]),
    undo: Object.freeze(["u"]),
    redo: Object.freeze(["ctrl+r"]),
  }),
  operatorMotions: Object.freeze({
    delete: Object.freeze([
      "wordForward",
      "wordBackward",
      "wordEnd",
      "lineStart",
      "firstNonBlank",
      "lineEnd",
    ]),
    change: Object.freeze([
      "wordForward",
      "wordBackward",
      "wordEnd",
      "lineStart",
      "firstNonBlank",
      "lineEnd",
    ]),
    yank: Object.freeze([
      "wordForward",
      "wordBackward",
      "wordEnd",
      "lineStart",
      "firstNonBlank",
      "lineEnd",
    ]),
  }),
}) as unknown as ResolvedVimKeymap;

export const DEFAULT_VIM_UI = Object.freeze({
  status: Object.freeze({
    enabled: true,
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
  feedback: DEFAULT_VIM_FEEDBACK,
  promptStructures: DEFAULT_VIM_PROMPT_STRUCTURES,
  promptTransforms: DEFAULT_VIM_PROMPT_TRANSFORMS,
});

type PartialVimOptions = {
  preset?: VimPreset;
  startMode?: StartupMode;
  cursor?: Partial<CursorStyles>;
  keymap?: PartialKeymapOptions;
  ui?: PartialUiOptions;
  macros?: PartialMacroOptions;
  marks?: PartialMarkOptions;
  search?: PartialSearchOptions;
  feedback?: PartialFeedbackOptions;
  promptStructures?: PartialPromptStructureOptions;
  promptTransforms?: PartialPromptTransformOptions;
};

type PartialKeymapOptions = {
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

type PartialUiOptions = {
  status?: Partial<ResolvedVimUi["status"]>;
  mode?: {
    enabled?: boolean;
    labels?: Partial<Record<VimMode, string>>;
    narrowLabels?: Partial<Record<VimMode, string>>;
  };
  selection?: Partial<ResolvedVimUi["selection"]>;
  cursorPosition?: Partial<ResolvedVimUi["cursorPosition"]>;
  workbench?: Partial<ResolvedVimUi["workbench"]>;
};

export type VimConfigLoadResult = {
  options: ResolvedVimEditorOptions;
  warnings: string[];
};

export type VimConfigPaths = {
  cwd?: string;
  globalSettingsPath?: string;
  projectSettingsPath?: string;
};

function cloneKeymap(keymap: ResolvedVimKeymap = DEFAULT_VIM_KEYMAP): ResolvedVimKeymap {
  return {
    operators: {
      delete: [...keymap.operators.delete],
      change: [...keymap.operators.change],
      yank: [...keymap.operators.yank],
      indent: [...keymap.operators.indent],
      dedent: [...keymap.operators.dedent],
    },
    motions: {
      left: [...keymap.motions.left],
      down: [...keymap.motions.down],
      up: [...keymap.motions.up],
      right: [...keymap.motions.right],
      wordForward: [...keymap.motions.wordForward],
      wordBackward: [...keymap.motions.wordBackward],
      wordEnd: [...keymap.motions.wordEnd],
      lineStart: [...keymap.motions.lineStart],
      lineEnd: [...keymap.motions.lineEnd],
      firstNonBlank: [...keymap.motions.firstNonBlank],
      bufferStart: [...keymap.motions.bufferStart],
      bufferEnd: [...keymap.motions.bufferEnd],
      matchingPair: [...keymap.motions.matchingPair],
    },
    macros: {
      record: [...keymap.macros.record],
      play: [...keymap.macros.play],
    },
    marks: {
      set: [...keymap.marks.set],
      jumpExact: [...keymap.marks.jumpExact],
      jumpLine: [...keymap.marks.jumpLine],
    },
    textObjects: {
      kinds: {
        inner: [...keymap.textObjects.kinds.inner],
        around: [...keymap.textObjects.kinds.around],
      },
      targets: {
        word: [...keymap.textObjects.targets.word],
        singleQuote: [...keymap.textObjects.targets.singleQuote],
        doubleQuote: [...keymap.textObjects.targets.doubleQuote],
        paren: [...keymap.textObjects.targets.paren],
        bracket: [...keymap.textObjects.targets.bracket],
        brace: [...keymap.textObjects.targets.brace],
        codeFence: [...keymap.textObjects.targets.codeFence],
        headingSection: [...keymap.textObjects.targets.headingSection],
        listItem: [...keymap.textObjects.targets.listItem],
        tag: [...keymap.textObjects.targets.tag],
        errorBlock: [...keymap.textObjects.targets.errorBlock],
      },
    },
    commands: {
      insertBefore: [...keymap.commands.insertBefore],
      insertAfter: [...keymap.commands.insertAfter],
      insertLineStart: [...keymap.commands.insertLineStart],
      insertLineEnd: [...keymap.commands.insertLineEnd],
      openLineBelow: [...keymap.commands.openLineBelow],
      openLineAbove: [...keymap.commands.openLineAbove],
      visualChar: [...keymap.commands.visualChar],
      visualLine: [...keymap.commands.visualLine],
      visualBlock: [...keymap.commands.visualBlock],
      deleteChar: [...keymap.commands.deleteChar],
      deleteToLineEnd: [...keymap.commands.deleteToLineEnd],
      changeToLineEnd: [...keymap.commands.changeToLineEnd],
      yankLine: [...keymap.commands.yankLine],
      joinLine: [...keymap.commands.joinLine],
      pasteAfter: [...keymap.commands.pasteAfter],
      pasteBefore: [...keymap.commands.pasteBefore],
      incrementNumber: [...keymap.commands.incrementNumber],
      decrementNumber: [...keymap.commands.decrementNumber],
      toggleCase: [...keymap.commands.toggleCase],
      replaceChar: [...keymap.commands.replaceChar],
      substituteChar: [...keymap.commands.substituteChar],
      substituteLine: [...keymap.commands.substituteLine],
      findCharForward: [...keymap.commands.findCharForward],
      findCharBackward: [...keymap.commands.findCharBackward],
      tillCharForward: [...keymap.commands.tillCharForward],
      tillCharBackward: [...keymap.commands.tillCharBackward],
      repeatCharSearch: [...keymap.commands.repeatCharSearch],
      repeatCharSearchReverse: [...keymap.commands.repeatCharSearchReverse],
      startSearch: [...keymap.commands.startSearch],
      startSearchBackward: [...keymap.commands.startSearchBackward],
      repeatSearch: [...keymap.commands.repeatSearch],
      repeatSearchReverse: [...keymap.commands.repeatSearchReverse],
      startExCommand: [...keymap.commands.startExCommand],
      repeatChange: [...keymap.commands.repeatChange],
      undo: [...keymap.commands.undo],
      redo: [...keymap.commands.redo],
    },
    operatorMotions: {
      delete: [...keymap.operatorMotions.delete],
      change: [...keymap.operatorMotions.change],
      yank: [...keymap.operatorMotions.yank],
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
    actions: { ...promptTransforms.actions },
    commands: {
      quote: [...promptTransforms.commands.quote],
      unquote: [...promptTransforms.commands.unquote],
      bulletize: [...promptTransforms.commands.bulletize],
      fence: [...promptTransforms.commands.fence],
      indent: [...promptTransforms.commands.indent],
      dedent: [...promptTransforms.commands.dedent],
      reflow: [...promptTransforms.commands.reflow],
    },
  };
}

function cloneUi(ui: ResolvedVimUi = DEFAULT_VIM_UI): ResolvedVimUi {
  return {
    status: { enabled: ui.status.enabled, items: [...ui.status.items] },
    mode: {
      enabled: ui.mode.enabled,
      labels: { ...ui.mode.labels },
      narrowLabels: { ...ui.mode.narrowLabels },
    },
    selection: { ...ui.selection },
    cursorPosition: { ...ui.cursorPosition },
    workbench: { ...ui.workbench },
  };
}

function cloneDefaultOptions(): ResolvedVimEditorOptions {
  return {
    startMode: DEFAULT_VIM_OPTIONS.startMode,
    cursor: { ...DEFAULT_VIM_OPTIONS.cursor },
    keymap: cloneKeymap(),
    ui: cloneUi(),
    macros: cloneMacros(),
    marks: cloneMarks(),
    search: cloneSearch(),
    feedback: cloneFeedback(),
    promptStructures: clonePromptStructures(),
    promptTransforms: clonePromptTransforms(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeVimKeySequence(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;

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
  options: { singleKeyOnly?: boolean } = {},
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
    if (protectedShortcut) {
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
  options: { singleKeyOnly?: boolean } = {},
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
      options,
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

  partial.operators = parseKeyBindings<VimOperatorAction>(
    value.operators,
    OPERATOR_ACTION_SET,
    sourceLabel,
    "operators",
    warnings,
  );
  partial.motions = parseKeyBindings<VimMotionAction>(
    value.motions,
    MOTION_ACTION_SET,
    sourceLabel,
    "motions",
    warnings,
  );
  partial.commands = parseKeyBindings<VimCommandAction>(
    value.commands,
    COMMAND_ACTION_SET,
    sourceLabel,
    "commands",
    warnings,
  );
  partial.macros = parseKeyBindings<keyof ResolvedVimKeymap["macros"]>(
    value.macros,
    new Set(["record", "play"]),
    sourceLabel,
    "macros",
    warnings,
  );
  partial.marks = parseKeyBindings<keyof ResolvedVimKeymap["marks"]>(
    value.marks,
    new Set(["set", "jumpExact", "jumpLine"]),
    sourceLabel,
    "marks",
    warnings,
  );

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
        { singleKeyOnly: true },
      );
      textObjects.targets = parseKeyBindings<VimTextObjectTarget>(
        value.textObjects.targets,
        TEXT_OBJECT_TARGET_SET,
        sourceLabel,
        "textObjects.targets",
        warnings,
        { singleKeyOnly: true },
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

  return { partial, warnings };
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

function mergeKeymap(target: ResolvedVimKeymap, partial: PartialKeymapOptions): void {
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

function detectKeymapConflicts(keymap: ResolvedVimKeymap): string[] {
  const warnings: string[] = [];
  const seen = new Map<string, string>();
  const bindings: Array<{ sequence: string; label: string }> = [];
  const add = (sequence: string, label: string) => {
    bindings.push({ sequence, label });
    const previous = seen.get(sequence);
    if (previous && previous !== label) {
      warnings.push(
        `resolved settings: duplicate piVimMode.keymap binding ${sequence} for ${previous} and ${label}`,
      );
    } else {
      seen.set(sequence, label);
    }
  };

  for (const [operator, sequences] of Object.entries(keymap.operators)) {
    for (const sequence of sequences) add(sequence, `operators.${operator}`);
  }
  for (const [motion, sequences] of Object.entries(keymap.motions)) {
    for (const sequence of sequences) add(sequence, `motions.${motion}`);
  }
  for (const [command, sequences] of Object.entries(keymap.commands)) {
    for (const sequence of sequences) add(sequence, `commands.${command}`);
  }
  for (const [macro, sequences] of Object.entries(keymap.macros)) {
    for (const sequence of sequences) add(sequence, `macros.${macro}`);
  }
  for (const [mark, sequences] of Object.entries(keymap.marks)) {
    for (const sequence of sequences) add(sequence, `marks.${mark}`);
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
      keymap: { commands: { visualBlock: ["ctrl+v"] } },
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
  if (partial.startMode) target.startMode = partial.startMode;
  if (partial.cursor) target.cursor = { ...target.cursor, ...partial.cursor };
  if (partial.keymap) mergeKeymap(target.keymap ?? cloneKeymap(), partial.keymap);
  if (partial.ui) mergeUi(target.ui ?? cloneUi(), partial.ui);
  if (partial.macros) mergeMacros(target.macros ?? cloneMacros(), partial.macros);
  if (partial.marks) mergeMarks(target.marks ?? cloneMarks(), partial.marks);
  if (partial.search) mergeSearch(target.search ?? cloneSearch(), partial.search);
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

export function resolveVimOptions(
  globalSettings: unknown,
  projectSettings?: unknown,
): VimConfigLoadResult {
  const options = cloneDefaultOptions();
  const warnings: string[] = [];

  const globalPiVimMode = isRecord(globalSettings) ? globalSettings.piVimMode : undefined;
  const parsedGlobal = parsePiVimMode(globalPiVimMode, "global settings");
  if (parsedGlobal.partial.preset)
    mergePartialOptions(options, presetOptions(parsedGlobal.partial.preset));
  mergePartialOptions(options, parsedGlobal.partial);
  warnings.push(...parsedGlobal.warnings);

  const projectPiVimMode = isRecord(projectSettings) ? projectSettings.piVimMode : undefined;
  const parsedProject = parsePiVimMode(projectPiVimMode, "project settings");
  if (parsedProject.partial.preset)
    mergePartialOptions(options, presetOptions(parsedProject.partial.preset));
  mergePartialOptions(options, parsedProject.partial);
  warnings.push(...parsedProject.warnings);
  warnings.push(...detectKeymapConflicts(options.keymap ?? DEFAULT_VIM_KEYMAP));

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
  };
}

export function loadVimOptions(paths: VimConfigPaths = {}): VimConfigLoadResult {
  const defaults = defaultVimConfigPaths(paths.cwd);
  const globalPath = paths.globalSettingsPath ?? defaults.globalSettingsPath;
  const projectPath = paths.projectSettingsPath ?? defaults.projectSettingsPath;

  const globalRead = readJsonFile(globalPath, "global settings");
  const projectRead = readJsonFile(projectPath, "project settings");
  const resolved = resolveVimOptions(globalRead.settings, projectRead.settings);

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
