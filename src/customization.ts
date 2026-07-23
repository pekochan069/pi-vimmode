import type {
  ResolvedVimEditorOptions,
  ResolvedVimKeymap,
  ResolvedVimMacros,
  ResolvedVimMarks,
  ResolvedVimPromptTransforms,
  VimCommandAction,
  VimMotionAction,
  VimOperatorAction,
} from "./types.ts";

import {
  diagnosticActionEntries,
  diagnosticActionMessage,
  type DiagnosticActionEntry,
} from "./diagnostic-actions.ts";
import { displayMappingSequence } from "./mapping-scopes.ts";
import {
  PROMPT_TRANSFORM_ACTIONS,
  canonicalPromptTransformActionIdForShortName,
} from "./prompt-transform-actions.ts";

export type VimActionKind =
  | "command"
  | "motion"
  | "operator"
  | "macro"
  | "mark"
  | "textObject"
  | "search"
  | "escape"
  | "promptTransform"
  | "diagnostic"
  | "runtimeHelp";

export type VimActionEntry = {
  id: string;
  kind: VimActionKind;
  description: string;
  keys: readonly string[];
  aliases?: readonly string[];
  exCommands?: readonly string[];
  argSummary?: string;
  disabledReason?: string;
  bindable?: false;
};

function diagnosticActionEntry(entry: DiagnosticActionEntry): VimActionEntry {
  return {
    id: entry.id,
    kind: entry.category,
    description: entry.description,
    keys: [],
    aliases: entry.topics,
    exCommands: [entry.command],
    bindable: false,
  };
}

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

export type KeybindingCatalogContext = {
  keymap: ResolvedVimKeymap;
  promptTransforms?: ResolvedVimPromptTransforms;
  macros?: ResolvedVimMacros;
  marks?: ResolvedVimMarks;
  warnings?: readonly string[];
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
  deleteCharBefore: "delete character before cursor",
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
  searchWordForward: "search word under cursor forward",
  searchWordBackward: "search word under cursor backward",
  startExCommand: "start Ex command-line",
  repeatChange: "repeat last change",
  undo: "undo prompt edit",
  redo: "redo prompt edit",
  showKeybindings: "show keybindings popup",
  reselectVisual: "reselect last visual selection",
  easymotion: "jump to character on current file (EasyMotion)",
};

const MOTION_DESCRIPTIONS: Record<VimMotionAction, string> = {
  left: "move left",
  down: "move down",
  up: "move up",
  right: "move right",
  wordForward: "move to next word",
  wordBackward: "move to previous word",
  wordEnd: "move to word end",
  wordForwardBig: "move to next WORD",
  wordBackwardBig: "move to previous WORD",
  wordEndBig: "move to WORD end",
  wordPreviousEnd: "move to previous word end",
  wordPreviousEndBig: "move to previous WORD end",
  lineStart: "move to line start",
  lineEnd: "move to line end",
  firstNonBlank: "move to first non-blank character",
  bufferStart: "move to prompt start",
  bufferEnd: "move to prompt end",
  matchingPair: "move to matching bracket or quote",
  halfPageDown: "move down by half a prompt page",
  halfPageUp: "move up by half a prompt page",
  paragraphBackward: "move to previous paragraph",
  paragraphForward: "move to next paragraph",
};

const SEARCH_COMMANDS = new Set<VimCommandAction>([
  "startSearch",
  "startSearchBackward",
  "repeatSearch",
  "repeatSearchReverse",
  "searchWordForward",
  "searchWordBackward",
]);

const OPERATOR_DESCRIPTIONS: Record<VimOperatorAction, string> = {
  delete: "delete by motion or text object",
  change: "change by motion or text object",
  yank: "yank by motion or text object",
  lowercase: "lowercase by motion or text object",
  uppercase: "uppercase by motion or text object",
  toggleCase: "toggle case by motion or text object",
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
    key: "ctrl+v",
    aliases: ["alt+v", "ctrl+alt+v"],
    owner: "pi",
    reason: "image/clipboard paste",
    behavior: "delegates to Pi unless explicitly bound by pi-vimmode",
  },
  {
    key: "ctrl+d",
    aliases: [],
    owner: "pi-vimmode",
    reason: "normal/visual half-page scroll down; insert-mode EOF/delete remains Pi-owned",
    behavior: "handled by Vim mode in normal/visual modes and delegated to Pi in insert mode",
    normalModeOwned: true,
  },
  {
    key: "ctrl+u",
    aliases: [],
    owner: "pi-vimmode",
    reason: "normal/visual half-page scroll up; insert mode remains Pi-owned",
    behavior: "handled by Vim mode in normal/visual modes and delegated to Pi in insert mode",
    normalModeOwned: true,
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

function keymapEntries(
  mappings: Readonly<Record<string, readonly string[]>>,
  entry: (id: string, keys: readonly string[]) => VimActionEntry,
): VimActionEntry[] {
  return Object.entries(mappings).map(([id, keys]) => entry(id, keys));
}

function promptTransformEntries(
  keymap: ResolvedVimKeymap,
  promptTransforms: ResolvedVimPromptTransforms | undefined,
): VimActionEntry[] {
  if (!promptTransforms) return [];
  return PROMPT_TRANSFORM_ACTIONS.map((registryEntry) => {
    const actionId = canonicalPromptTransformActionIdForShortName(registryEntry.action);
    const disabledReason =
      promptTransforms.enabled === false
        ? "prompt transform suite disabled"
        : promptTransforms.actions[registryEntry.action] === false
          ? "prompt transform action disabled"
          : undefined;
    return {
      id: actionId,
      kind: "promptTransform",
      description: registryEntry.description,
      keys: keymap.actions.accepted
        .filter((binding) => binding.actionId === actionId)
        .map((binding) => binding.key),
      exCommands: promptTransforms.commands[registryEntry.action],
      argSummary: promptTransformArgSummary(registryEntry.args),
      disabledReason,
    };
  });
}

function escapeEntry(keymap: ResolvedVimKeymap): VimActionEntry[] {
  return keymap.escape.length
    ? [
        {
          id: "alias",
          kind: "escape",
          description:
            "escape alias for insert, visual, and Ex command-line states; no recursive mappings or timeoutlen",
          keys: keymap.escape,
          aliases: ["escape", "piVimMode.keymap.escape"],
        },
      ]
    : [];
}

export function actionEntriesForKeymap(
  keymap: ResolvedVimKeymap,
  promptTransforms?: ResolvedVimPromptTransforms,
  macros?: ResolvedVimMacros,
  marks?: ResolvedVimMarks,
): VimActionEntry[] {
  const commandEntries = keymapEntries(keymap.commands, (id, keys) => ({
    id,
    kind: SEARCH_COMMANDS.has(id as VimCommandAction) ? "search" : "command",
    description: COMMAND_DESCRIPTIONS[id as VimCommandAction],
    keys,
  }));
  const motionEntries = keymapEntries(keymap.motions, (id, keys) => ({
    id,
    kind: "motion",
    description: MOTION_DESCRIPTIONS[id as VimMotionAction],
    keys,
  }));
  const operatorEntries = keymapEntries(keymap.operators, (id, keys) => ({
    id,
    kind: "operator",
    description: OPERATOR_DESCRIPTIONS[id as VimOperatorAction],
    keys,
  }));
  const macroEntries =
    macros?.enabled === false
      ? []
      : keymapEntries(keymap.macros, (id, keys) => ({
          id: `macro.${id}`,
          kind: "macro",
          description: `${id} macro`,
          keys,
        }));
  const markEntries =
    marks?.enabled === false
      ? []
      : keymapEntries(keymap.marks, (id, keys) => ({
          id: `mark.${id}`,
          kind: "mark",
          description: `${id} mark`,
          keys,
        }));
  const kindEntries = keymapEntries(keymap.textObjects.kinds, (id, keys) => ({
    id: `textObject.kind.${id}`,
    kind: "textObject",
    description: `${id} text object prefix`,
    keys,
  }));
  const targetEntries = keymapEntries(keymap.textObjects.targets, (id, keys) => ({
    id: `textObject.target.${id}`,
    kind: "textObject",
    description: `${id} text object target`,
    keys,
  }));
  return [
    ...escapeEntry(keymap),
    ...commandEntries,
    ...motionEntries,
    ...operatorEntries,
    ...macroEntries,
    ...markEntries,
    ...kindEntries,
    ...targetEntries,
    ...promptTransformEntries(keymap, promptTransforms),
    ...diagnosticActionEntries().map(diagnosticActionEntry),
  ].map((entry) => ({ ...entry, keys: entry.keys.map(displayMappingSequence) }));
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
      entry.argSummary ?? "",
      entry.disabledReason ?? "",
      ...entry.keys,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

function promptTransformArgSummary(
  args: (typeof PROMPT_TRANSFORM_ACTIONS)[number]["args"],
): string | undefined {
  if (args.length === 0) return undefined;
  return args.map((arg) => `${arg.name}${arg.required ? "" : "?"}:${arg.type}`).join(",");
}

function summarizeEntry(entry: VimActionEntry): string {
  const diagnostic = diagnosticActionEntries().find((action) => action.id === entry.id);
  if (diagnostic) return diagnosticActionMessage(diagnostic);
  const keys = entry.keys.length > 0 ? entry.keys.join(",") : "unbound";
  const ex = entry.exCommands?.length ? ` ex=${entry.exCommands.join(",")}` : "";
  const args = entry.argSummary ? ` args=${entry.argSummary}` : "";
  const disabled = entry.disabledReason ? ` disabled (${entry.disabledReason})` : "";
  const id = entry.kind === "promptTransform" ? entry.id : `${entry.kind}.${entry.id}`;
  return `${id} ${keys}${ex}${args}${disabled} — ${entry.description}`;
}

function preferredActionMatch(
  matches: readonly VimActionEntry[],
  query: string,
): VimActionEntry | undefined {
  const needle = query.trim().toLowerCase();
  if (!needle) return matches[0];
  return (
    matches.find((entry) => entry.id.toLowerCase() === needle) ??
    matches.find(
      (entry) =>
        entry.kind === "promptTransform" &&
        (entry.id.toLowerCase() === `prompt.transform.${needle}` ||
          entry.exCommands?.some((command) => command.toLowerCase() === needle)),
    ) ??
    matches[0]
  );
}

const ACTION_COUNT_LABELS: ReadonlyArray<readonly [VimActionKind, string]> = [
  ["command", "commands"],
  ["motion", "motions"],
  ["operator", "operators"],
  ["textObject", "text objects"],
  ["macro", "macros"],
  ["mark", "marks"],
  ["search", "searches"],
  ["escape", "escape aliases"],
  ["promptTransform", "transforms"],
  ["diagnostic", "diagnostic metadata"],
  ["runtimeHelp", "runtime-help metadata"],
];

function actionSummary(entries: readonly VimActionEntry[]): string {
  const counts = new Map<VimActionKind, number>();
  for (const entry of entries) counts.set(entry.kind, (counts.get(entry.kind) ?? 0) + 1);
  return ACTION_COUNT_LABELS.map(([kind, label]) => `${counts.get(kind) ?? 0} ${label}`).join(", ");
}

export function actionsMessage(
  keymap: ResolvedVimKeymap,
  query = "",
  promptTransforms?: ResolvedVimPromptTransforms,
  macros?: ResolvedVimMacros,
  marks?: ResolvedVimMarks,
): string {
  const matches = searchActions(keymap, query, promptTransforms, macros, marks);
  const needle = query.trim();
  if (!needle) return `actions: ${actionSummary(matches)}; :actions <query>`;
  const match = preferredActionMatch(matches, query);
  return match ? summarizeEntry(match) : `actions: no match for ${needle}`;
}

export function keymapMessage(
  keymap: ResolvedVimKeymap,
  query = "",
  promptTransforms?: ResolvedVimPromptTransforms,
  macros?: ResolvedVimMacros,
  marks?: ResolvedVimMarks,
): string {
  const matches = searchActions(keymap, query, promptTransforms, macros, marks);
  if (!query.trim()) {
    const bindingEntries = actionEntriesForKeymap(keymap, promptTransforms, macros, marks).filter(
      (entry) => entry.bindable !== false,
    );
    return `keymap: ${bindingEntries.length} entries; :keymap <action>`;
  }
  const match = preferredActionMatch(matches, query);
  return match ? summarizeEntry(match) : `keymap: no match for ${query.trim()}`;
}

export function keybindingCatalogLines(context: KeybindingCatalogContext): string[] {
  const entries = actionEntriesForKeymap(
    context.keymap,
    context.promptTransforms,
    context.macros,
    context.marks,
  );
  return [
    "Type :keybindings <key|action|text> to filter. Edit settings to rebind.",
    ...whichKeyCategoryLines("Commands", entries, "command"),
    ...whichKeyCategoryLines("Motions", entries, "motion"),
    ...whichKeyCategoryLines("Operators", entries, "operator"),
    ...whichKeyCategoryLines("Text objects", entries, "textObject"),
    ...whichKeyCategoryLines("Escape aliases", entries, "escape"),
    ...featureWhichKeyCategoryLines("Macros", entries, "macro", context.macros?.enabled !== false),
    ...featureWhichKeyCategoryLines("Marks", entries, "mark", context.marks?.enabled !== false),
    ...whichKeyCategoryLines("Searches", entries, "search"),
    ...featureWhichKeyCategoryLines(
      "Prompt transforms",
      entries,
      "promptTransform",
      context.promptTransforms?.enabled !== false,
    ),
    ...protectedShortcutTableLines(),
    "Boundaries: no runtime :map; no recursive mappings; no Vimscript; no command palette; no diagnostic/help action keybinding dispatch.",
  ];
}

export function keybindingDetailLines(context: KeybindingCatalogContext, query: string): string[] {
  const needle = query.trim();
  const matches = searchActions(
    context.keymap,
    needle,
    context.promptTransforms,
    context.macros,
    context.marks,
  );
  const ownership = keyOwnershipLine(context, needle);
  const detailLines = matches
    .filter((entry) => entry.bindable !== false && entry.keys.length > 0)
    .slice(0, 12)
    .map(detailEntryLine);
  if (ownership && !detailLines.includes(ownership)) detailLines.unshift(ownership);
  if (detailLines.length > 0) {
    return [
      `Query: ${needle}`,
      ...detailLines,
      "Read-only: discovery only; edit settings to rebind.",
    ];
  }
  return [
    `Query: ${needle}`,
    `No keybinding match for ${needle}`,
    "No runtime :map, recursive mappings, Vimscript, command palette, or metadata action dispatch.",
  ];
}

function whichKeyCategoryLines(
  title: string,
  entries: readonly VimActionEntry[],
  kind: VimActionKind,
): string[] {
  const matches = entries.filter(
    (entry) => entry.kind === kind && entry.bindable !== false && entry.keys.length > 0,
  );
  return [sectionHeader(title, matches.length), gridHeader(), ...matches.map(whichKeyRow)];
}

function featureWhichKeyCategoryLines(
  title: string,
  entries: readonly VimActionEntry[],
  kind: VimActionKind,
  enabled: boolean,
): string[] {
  if (!enabled) return [sectionHeader(title, 0), "  disabled"];
  return whichKeyCategoryLines(title, entries, kind);
}

function protectedShortcutTableLines(): string[] {
  return [
    sectionHeader("Protected Pi shortcuts", PROTECTED_SHORTCUTS.length),
    "  Key                    Mode        Behavior",
    "  ────────────────────── ─────────── ──────────────────────────────────────",
    ...PROTECTED_SHORTCUTS.map((shortcut) => {
      const keys = [shortcut.key, ...shortcut.aliases].join(",");
      return `  ${padCell(keys, 22)} ${padCell("delegated", 11)} protected for ${shortcut.reason}; ${shortcut.behavior}`;
    }),
  ];
}

function sectionHeader(title: string, count: number): string {
  return `▸ ${title} (${count})`;
}

function gridHeader(): string {
  return "  Key            Mode        Action                         Description";
}

function whichKeyRow(entry: VimActionEntry): string {
  return `  ${padCell(keyDisplay(entry), 14)} ${padCell(modeDisplay(entry), 11)} ${padCell(actionIdDisplay(entry), 30)} ${entry.description}`;
}

function keyDisplay(entry: VimActionEntry): string {
  return entry.keys.length > 0 ? entry.keys.join(",") : "unbound";
}

function actionIdDisplay(entry: VimActionEntry): string {
  return entry.kind === "promptTransform" || entry.id.includes(".")
    ? entry.id
    : `${entry.kind}.${entry.id}`;
}

function modeDisplay(entry: VimActionEntry): string {
  if (entry.kind === "motion" || entry.kind === "search" || entry.kind === "mark") return "n/v/op";
  if (entry.kind === "operator" || entry.kind === "promptTransform") return "n/v";
  if (entry.kind === "escape") return "modal";
  if (entry.kind === "textObject") return "op";
  return "normal";
}

function padCell(value: string, width: number): string {
  return value.length >= width ? `${value.slice(0, Math.max(0, width - 1))}…` : value.padEnd(width);
}

function detailEntryLine(entry: VimActionEntry): string {
  const target = actionIdDisplay(entry);
  const keys = entry.keys.length > 0 ? entry.keys.join(",") : "unbound";
  if (entry.bindable === false)
    return `${target} metadata-only not bindable -> ${keys} — ${entry.description}`;
  return `${target} -> ${keys} [${modeDisplay(entry)}] — ${entry.description}`;
}

function keyOwnershipLine(context: KeybindingCatalogContext, query: string): string | undefined {
  const normalized = normalizeShortcutKey(query);
  const binding = context.keymap.actions.accepted.find((entry) => entry.key === normalized);
  if (binding) return `${normalized} -> ${binding.actionId}`;
  const conflict = (context.warnings ?? []).find((warning) => warning.includes(normalized));
  if (conflict) return `${normalized} rejected: ${conflict}`;
  const matches = actionEntriesForKeymap(
    context.keymap,
    context.promptTransforms,
    context.macros,
    context.marks,
  ).filter((entry) => entry.keys.includes(normalized));
  if (matches.length > 0) return `${normalized} -> ${matches.map(detailEntryLine).join(" | ")}`;
  const protectedShortcut = protectedShortcutForKey(normalized);
  if (protectedShortcut && !protectedShortcut.normalModeOwned) {
    return mapcheckMessage(context.keymap, normalized, context.warnings ?? []);
  }
  return isKeyLikeQuery(normalized) ? `mapcheck: ${normalized} is unmapped` : undefined;
}

function isKeyLikeQuery(query: string): boolean {
  return query.length <= 3 || query.includes("+") || /^<[^>]+>$/.test(query);
}

export function mapcheckMessage(
  keymap: ResolvedVimKeymap,
  query: string,
  warnings: readonly string[] = [],
): string {
  const key = normalizeShortcutKey(query);
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
  const protectedShortcut = protectedShortcutForKey(key);
  if (protectedShortcut && !protectedShortcut.normalModeOwned)
    return `mapcheck: ${key} protected for ${protectedShortcut.reason}; ${protectedShortcut.behavior}`;
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
