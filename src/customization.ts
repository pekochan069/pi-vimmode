import type {
  PromptTransformAction,
  ResolvedVimEditorOptions,
  ResolvedVimKeymap,
  ResolvedVimMacros,
  ResolvedVimMarks,
  ResolvedVimPromptTransforms,
  VimCommandAction,
  VimMotionAction,
  VimOperatorAction,
  VimTextObjectKind,
  VimTextObjectTarget,
} from "./types.ts";

import {
  canonicalPromptTransformActionIdForShortName,
  legacyPromptTransformActionAliasForId,
} from "./prompt-transform-actions.ts";

export type VimActionKind =
  | "command"
  | "motion"
  | "operator"
  | "macro"
  | "mark"
  | "textObject"
  | "search"
  | "promptTransform";

export type VimActionEntry = {
  id: string;
  kind: VimActionKind;
  description: string;
  keys: readonly string[];
  aliases?: readonly string[];
  exCommands?: readonly string[];
};

export type ProtectedShortcut = {
  key: string;
  aliases: readonly string[];
  owner: "pi" | "pi-vimmode";
  reason: string;
  behavior: string;
  normalModeOwned?: boolean;
};

export type VimDiagnostics = {
  warnings: readonly string[];
};

const COMMAND_DESCRIPTIONS: Record<VimCommandAction, string> = {
  insertBefore: "enter insert mode before cursor",
  insertAfter: "enter insert mode after cursor",
  insertLineStart: "enter insert mode at line start",
  insertLineEnd: "enter insert mode at line end",
  openLineBelow: "open line below",
  openLineAbove: "open line above",
  visualChar: "enter characterwise visual mode",
  visualLine: "enter linewise visual mode",
  visualBlock: "enter blockwise visual mode",
  deleteChar: "delete character under cursor",
  deleteToLineEnd: "delete to line end",
  changeToLineEnd: "change to line end",
  yankLine: "yank current line",
  joinLine: "join current line with next line",
  pasteAfter: "paste after cursor",
  pasteBefore: "paste before cursor",
  incrementNumber: "increment number at or after cursor",
  decrementNumber: "decrement number at or after cursor",
  toggleCase: "toggle character case",
  replaceChar: "replace one character",
  substituteChar: "substitute one character",
  substituteLine: "substitute current line",
  findCharForward: "find character forward on line",
  findCharBackward: "find character backward on line",
  tillCharForward: "move before character forward on line",
  tillCharBackward: "move after character backward on line",
  repeatCharSearch: "repeat character search",
  repeatCharSearchReverse: "repeat character search in reverse",
  startSearch: "start forward prompt search",
  startSearchBackward: "start backward prompt search",
  repeatSearch: "repeat prompt search",
  repeatSearchReverse: "repeat prompt search in reverse",
  startExCommand: "start Ex command-line",
  repeatChange: "repeat last change",
  undo: "undo prompt edit",
  redo: "redo prompt edit",
};

const MOTION_DESCRIPTIONS: Record<VimMotionAction, string> = {
  left: "move left",
  down: "move down",
  up: "move up",
  right: "move right",
  wordForward: "move to next word",
  wordBackward: "move to previous word",
  wordEnd: "move to word end",
  lineStart: "move to line start",
  lineEnd: "move to line end",
  firstNonBlank: "move to first non-blank character",
  bufferStart: "move to prompt start",
  bufferEnd: "move to prompt end",
  matchingPair: "move to matching bracket or quote",
};

const SEARCH_COMMANDS = new Set<VimCommandAction>([
  "startSearch",
  "startSearchBackward",
  "repeatSearch",
  "repeatSearchReverse",
]);

const TRANSFORM_DESCRIPTIONS: Record<PromptTransformAction, string> = {
  quote: "quote addressed prompt lines",
  unquote: "remove quote markers from addressed prompt lines",
  bulletize: "turn addressed prompt lines into bullets",
  fence: "wrap addressed prompt lines in a code fence",
  indent: "indent addressed prompt lines",
  dedent: "dedent addressed prompt lines",
  reflow: "reflow addressed prose paragraphs",
};

const OPERATOR_DESCRIPTIONS: Record<VimOperatorAction, string> = {
  delete: "delete by motion or text object",
  change: "change by motion or text object",
  yank: "yank by motion or text object",
  indent: "indent selected/current lines",
  dedent: "dedent selected/current lines",
};

export const PROTECTED_SHORTCUTS = [
  {
    key: "enter",
    aliases: ["return"],
    owner: "pi",
    reason: "submit prompt",
    behavior: "resets Vim state and delegates to Pi",
  },
  {
    key: "escape",
    aliases: ["esc"],
    owner: "pi",
    reason: "cancel/escape application state",
    behavior: "handled by pi-vimmode mode transitions where supported",
  },
  {
    key: "tab",
    aliases: [],
    owner: "pi",
    reason: "autocomplete navigation",
    behavior: "delegates to Pi",
  },
  {
    key: "shift+enter",
    aliases: [],
    owner: "pi",
    reason: "insert newline/submit variant",
    behavior: "delegates to Pi",
  },
  {
    key: "ctrl+c",
    aliases: [],
    owner: "pi",
    reason: "interrupt/cancel",
    behavior: "resets Vim state and delegates to Pi",
  },
  {
    key: "ctrl+d",
    aliases: [],
    owner: "pi",
    reason: "EOF/delete application shortcut",
    behavior: "delegates to Pi",
  },
  {
    key: "ctrl+g",
    aliases: [],
    owner: "pi",
    reason: "cancel/escape application shortcut",
    behavior: "resets Vim state and delegates to Pi",
  },
  {
    key: "ctrl+l",
    aliases: [],
    owner: "pi",
    reason: "clear/redraw terminal",
    behavior: "delegates to Pi",
  },
  {
    key: "ctrl+p",
    aliases: [],
    owner: "pi",
    reason: "Pi command/model palette",
    behavior: "delegates to Pi",
  },
  {
    key: "shift+ctrl+p",
    aliases: ["ctrl+shift+p"],
    owner: "pi",
    reason: "Pi command palette variant",
    behavior: "delegates to Pi",
  },
  {
    key: "ctrl+t",
    aliases: [],
    owner: "pi",
    reason: "external editor or tool shortcut",
    behavior: "delegates to Pi",
  },
  {
    key: "shift+tab",
    aliases: [],
    owner: "pi",
    reason: "reverse autocomplete navigation",
    behavior: "delegates to Pi",
  },
] as const satisfies readonly ProtectedShortcut[];

export function normalizeShortcutKey(key: string): string {
  const aliases: Record<string, string> = {
    return: "enter",
    esc: "escape",
    "ctrl+shift+p": "shift+ctrl+p",
  };
  const normalized = key.trim().toLowerCase();
  const angleMatch = /^<([^>]+)>$/.exec(normalized);
  const canonical = angleMatch?.[1]
    ? angleMatch[1]
        .split("-")
        .map((part) => (part === "c" ? "ctrl" : part === "s" ? "shift" : part))
        .join("+")
    : normalized;
  return aliases[canonical] ?? canonical;
}

export function protectedShortcutForKey(key: string): ProtectedShortcut | undefined {
  const normalized = normalizeShortcutKey(key);
  return PROTECTED_SHORTCUTS.find(
    (shortcut) =>
      shortcut.key === normalized || (shortcut.aliases as readonly string[]).includes(normalized),
  );
}

export function isProtectedShortcut(key: string): boolean {
  return protectedShortcutForKey(key) !== undefined;
}

export function actionEntriesForKeymap(
  keymap: ResolvedVimKeymap,
  promptTransforms?: ResolvedVimPromptTransforms,
  macros?: ResolvedVimMacros,
  marks?: ResolvedVimMarks,
): VimActionEntry[] {
  const entries: VimActionEntry[] = [];
  for (const [id, keys] of Object.entries(keymap.commands) as [
    VimCommandAction,
    readonly string[],
  ][]) {
    const kind: VimActionKind = SEARCH_COMMANDS.has(id) ? "search" : "command";
    entries.push({ id, kind, description: COMMAND_DESCRIPTIONS[id], keys });
  }
  for (const [id, keys] of Object.entries(keymap.motions) as [
    VimMotionAction,
    readonly string[],
  ][]) {
    entries.push({ id, kind: "motion", description: MOTION_DESCRIPTIONS[id], keys });
  }
  for (const [id, keys] of Object.entries(keymap.operators) as [
    VimOperatorAction,
    readonly string[],
  ][]) {
    entries.push({ id, kind: "operator", description: OPERATOR_DESCRIPTIONS[id], keys });
  }
  if (macros?.enabled !== false) {
    for (const [id, keys] of Object.entries(keymap.macros)) {
      entries.push({ id: `macro.${id}`, kind: "macro", description: `${id} macro`, keys });
    }
  }
  if (marks?.enabled !== false) {
    for (const [id, keys] of Object.entries(keymap.marks)) {
      entries.push({ id: `mark.${id}`, kind: "mark", description: `${id} mark`, keys });
    }
  }
  for (const [id, keys] of Object.entries(keymap.textObjects.kinds) as [
    VimTextObjectKind,
    readonly string[],
  ][]) {
    entries.push({
      id: `textObject.kind.${id}`,
      kind: "textObject",
      description: `${id} text object prefix`,
      keys,
    });
  }
  for (const [id, keys] of Object.entries(keymap.textObjects.targets) as [
    VimTextObjectTarget,
    readonly string[],
  ][]) {
    entries.push({
      id: `textObject.target.${id}`,
      kind: "textObject",
      description: `${id} text object target`,
      keys,
    });
  }
  if (promptTransforms?.enabled !== false) {
    for (const [id, exCommands] of Object.entries(promptTransforms?.commands ?? {}) as [
      PromptTransformAction,
      readonly string[],
    ][]) {
      if (promptTransforms?.actions[id] === false) continue;
      const actionId = canonicalPromptTransformActionIdForShortName(id);
      const actionKeys = keymap.actions.accepted
        .filter((binding) => binding.actionId === actionId)
        .map((binding) => binding.key);
      entries.push({
        id: actionId,
        kind: "promptTransform",
        description: TRANSFORM_DESCRIPTIONS[id],
        keys: actionKeys,
        aliases: [legacyPromptTransformActionAliasForId(actionId)],
        exCommands,
      });
    }
  }
  return entries;
}

export function searchActions(
  keymap: ResolvedVimKeymap,
  query = "",
  promptTransforms?: ResolvedVimPromptTransforms,
  macros?: ResolvedVimMacros,
  marks?: ResolvedVimMarks,
): VimActionEntry[] {
  const entries = actionEntriesForKeymap(keymap, promptTransforms, macros, marks);
  const needle = query.trim().toLowerCase();
  if (!needle) return entries;
  return entries.filter((entry) => {
    const haystack = [
      entry.id,
      entry.kind,
      entry.description,
      ...(entry.aliases ?? []),
      ...(entry.exCommands ?? []),
      ...entry.keys,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

function summarizeEntry(entry: VimActionEntry): string {
  const keys = entry.keys.length > 0 ? entry.keys.join(",") : "unbound";
  const ex = entry.exCommands?.length ? ` ex=${entry.exCommands.join(",")}` : "";
  const id = entry.kind === "promptTransform" ? entry.id : `${entry.kind}.${entry.id}`;
  return `${id} ${keys}${ex} — ${entry.description}`;
}

export function actionsMessage(
  keymap: ResolvedVimKeymap,
  query = "",
  promptTransforms?: ResolvedVimPromptTransforms,
  macros?: ResolvedVimMacros,
  marks?: ResolvedVimMarks,
): string {
  const matches = searchActions(keymap, query, promptTransforms, macros, marks);
  if (query.trim())
    return matches[0] ? summarizeEntry(matches[0]) : `actions: no match for ${query.trim()}`;
  const counts = new Map<VimActionKind, number>();
  for (const entry of matches) counts.set(entry.kind, (counts.get(entry.kind) ?? 0) + 1);
  return `actions: ${counts.get("command") ?? 0} commands, ${counts.get("motion") ?? 0} motions, ${counts.get("operator") ?? 0} operators, ${counts.get("textObject") ?? 0} text objects, ${counts.get("macro") ?? 0} macros, ${counts.get("mark") ?? 0} marks, ${counts.get("search") ?? 0} searches, ${counts.get("promptTransform") ?? 0} transforms; :actions <query>`;
}

export function keymapMessage(
  keymap: ResolvedVimKeymap,
  query = "",
  promptTransforms?: ResolvedVimPromptTransforms,
  macros?: ResolvedVimMacros,
  marks?: ResolvedVimMarks,
): string {
  const matches = searchActions(keymap, query, promptTransforms, macros, marks);
  if (!query.trim())
    return `keymap: ${actionEntriesForKeymap(keymap, promptTransforms, macros, marks).length} entries; :keymap <action>`;
  return matches[0] ? summarizeEntry(matches[0]) : `keymap: no match for ${query.trim()}`;
}

export function mapcheckMessage(
  keymap: ResolvedVimKeymap,
  query: string,
  warnings: readonly string[] = [],
): string {
  const key = normalizeShortcutKey(query);
  const protectedShortcut = protectedShortcutForKey(key);
  if (protectedShortcut)
    return `mapcheck: ${key} protected for ${protectedShortcut.reason}; ${protectedShortcut.behavior}`;
  const actionBinding = keymap.actions.accepted.find((binding) => binding.key === key);
  if (actionBinding) return `mapcheck: ${key} -> ${actionBinding.actionId}`;
  const conflict = warnings.find((warning) => warning.includes(key));
  if (conflict) return `mapcheck: ${key} warning: ${conflict}`;
  const matches = actionEntriesForKeymap(keymap).filter((entry) => entry.keys.includes(key));
  if (matches[0]) {
    const target =
      matches[0].kind === "promptTransform" ? matches[0].id : `${matches[0].kind}.${matches[0].id}`;
    return `mapcheck: ${key} -> ${target}`;
  }
  return `mapcheck: ${key} is unmapped`;
}

export function doctorMessage(
  options: ResolvedVimEditorOptions,
  diagnostics: VimDiagnostics = { warnings: [] },
): string {
  const warnings = diagnostics.warnings;
  if (warnings.length === 0) return "vimdoctor: ok — customization healthy";
  return `vimdoctor: ${warnings.length} warning${warnings.length === 1 ? "" : "s"}: ${warnings[0]}`;
}
