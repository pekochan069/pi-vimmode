import type { ResolvedVimEditorOptions } from "./types.ts";

import { actionKeybindingRecipeMessage } from "./action-keybinding-recipes.ts";
import {
  keymapForOptions,
  macrosForOptions,
  marksForOptions,
  promptTransformsForOptions,
} from "./config.ts";
import {
  actionsMessage,
  mapcheckMessage,
  protectedShortcutForKey,
  searchActions,
  type VimDiagnostics,
} from "./customization.ts";
import { diagnosticActionMessage, searchDiagnosticActions } from "./diagnostic-actions.ts";

export type RuntimeHelpCategory =
  | "modes"
  | "motions"
  | "editing"
  | "search"
  | "ex"
  | "transforms"
  | "registers"
  | "marks"
  | "macros"
  | "settings"
  | "shortcuts"
  | "diagnostics";

export type RuntimeHelpEntry = {
  id: string;
  category: RuntimeHelpCategory;
  topics: readonly string[];
  summary: string;
  examples: readonly string[];
  limits: readonly string[];
  docsAnchor: string;
  specAnchor: string;
  testAnchors: readonly string[];
};

export type RuntimeHelpContext = {
  options: ResolvedVimEditorOptions;
  diagnostics?: VimDiagnostics;
};

const ENTRIES = [
  {
    id: "runtime-help",
    category: "diagnostics",
    topics: ["help", "features", "messages", "runtime", "inspect", "vimmode"],
    summary:
      ":help, :features, and :keybindings show compact source-backed pi-vimmode help; :vimmode inspect summarizes current prompt-local state; :messages shows recent runtime messages",
    examples: [":help search", ":features redo", ":keybindings", ":vimmode inspect", ":messages"],
    limits: ["finite topics only", "no pager", "no Vim help tags"],
    docsAnchor: "runtime-help:runtime-help",
    specAnchor: "openspec/specs/vim-ex-command-line/spec.md",
    testAnchors: ["test/runtime-help.test.ts", "test/ex.test.ts", "test/modal.test.ts"],
  },
  {
    id: "search",
    category: "search",
    topics: ["search", "/", "?", "nohlsearch", "noh"],
    summary:
      "prompt search uses /, ?, n, and N; :noh/:nohlsearch clear visible highlights while keeping repeat-search state",
    examples: ["/term", "?term", ":nohlsearch"],
    limits: ["prompt-local", "literal by default", "no cross-prompt history"],
    docsAnchor: "runtime-help:search",
    specAnchor: "openspec/specs/vim-search/spec.md",
    testAnchors: ["test/modal.test.ts", "test/vim-editor.test.ts"],
  },
  {
    id: "ex",
    category: "ex",
    topics: ["ex", ":", "substitute", "s", "commands", "repeat", "register"],
    summary:
      "finite Ex command-line supports :s substitution, :& repeat substitution, line commands with register operands, transforms, diagnostics, and runtime help",
    examples: [":s/old/new/", ":%s/old/new/gn", ":&", ":delete a", ":help ex"],
    limits: ["no Vimscript", "no confirmation flag", "no shell/file/window commands"],
    docsAnchor: "runtime-help:ex",
    specAnchor: "openspec/specs/vim-ex-command-line/spec.md",
    testAnchors: ["test/ex.test.ts", "test/modal.test.ts"],
  },
  {
    id: "actions",
    category: "diagnostics",
    topics: ["actions", "keybindings", "keymap", "mapcheck", "vimdoctor", "customization"],
    summary:
      ":actions, :keybindings, :keymap, :mapcheck, and :vimdoctor explain finite actions, bindings, protected shortcuts, and settings warnings",
    examples: [":actions redo", ":keybindings redo", ":mapcheck ctrl+p", ":vimdoctor"],
    limits: ["no full command palette", "no .vimrc", "no Vimscript"],
    docsAnchor: "runtime-help:customization-diagnostics",
    specAnchor: "openspec/specs/vim-customization-diagnostics/spec.md",
    testAnchors: ["test/customization.test.ts", "test/modal.test.ts"],
  },
  {
    id: "transforms",
    category: "transforms",
    topics: ["transforms", "transform", "quote", "reflow", "fence", "bulletize"],
    summary:
      "prompt transforms are finite Ex commands for quoting, bulletizing, fencing, indenting, dedenting, and prose reflow",
    examples: [":quote", ":fence ts", ":reflow 72"],
    limits: ["prompt-local", "configurable command names only", "no arbitrary Ex grammar"],
    docsAnchor: "runtime-help:prompt-transforms",
    specAnchor: "openspec/specs/vim-ex-command-line/spec.md",
    testAnchors: ["test/modal.test.ts", "test/config.test.ts"],
  },
  {
    id: "marks",
    category: "marks",
    topics: ["marks", "mark", "jump"],
    summary:
      "marks are prompt-local in-memory slots set and jumped inside the current editor session",
    examples: ["ma", "`a", "'a"],
    limits: ["no persistent marks", "no file marks", "slots are configurable"],
    docsAnchor: "runtime-help:marks",
    specAnchor: "openspec/specs/vim-marks/spec.md",
    testAnchors: ["test/modal.test.ts", "test/config.test.ts"],
  },
  {
    id: "macros",
    category: "macros",
    topics: ["macros", "macro", "record", "replay"],
    summary: "macros record and replay prompt-local input sequences with bounded replay steps",
    examples: ["qa...q", "@a"],
    limits: ["in-memory only", "bounded replay", "slots are configurable"],
    docsAnchor: "runtime-help:macros",
    specAnchor: "openspec/specs/vim-macro-recording/spec.md",
    testAnchors: ["test/modal.test.ts", "test/config.test.ts"],
  },
  {
    id: "settings",
    category: "settings",
    topics: ["settings", "config", "piVimMode", "options"],
    summary:
      "piVimMode settings control start mode, cursor, keymap, UI including workbench rows, search, feedback, macros, marks, structures, and transforms",
    examples: ["piVimMode.preset", "piVimMode.keymap", "piVimMode.ui.workbench.reservedRows"],
    limits: ["field-by-field validation", "invalid fields warn", "valid siblings are preserved"],
    docsAnchor: "runtime-help:settings",
    specAnchor: "openspec/specs/pi-vimmode-documentation/spec.md",
    testAnchors: ["test/config.test.ts"],
  },
] as const satisfies readonly RuntimeHelpEntry[];

export function runtimeHelpEntries(_context?: RuntimeHelpContext): readonly RuntimeHelpEntry[] {
  return ENTRIES;
}

export function runtimeHelpMessage(topic: string | undefined, context: RuntimeHelpContext): string {
  const query = topic?.trim();
  if (!query) {
    return "help: :help <topic>, :features [query], :keybindings [query], :vimmode inspect, :messages, :actions, :keymap, :mapcheck, :vimdoctor";
  }
  const wantsDiagnosticActions = ["actions", "action", "diagnostics", "diagnostic"].includes(
    query.toLowerCase(),
  );
  const entry = findEntry(query);
  if (entry && !wantsDiagnosticActions) return compactEntry(entry, context);
  const diagnostic = searchDiagnosticActions(query)[0];
  if (diagnostic) return diagnosticActionMessage(diagnostic);
  if (!entry) return `help: no match for ${query}`;
  return compactEntry(entry, context);
}

export function runtimeMessagesMessage(messages: readonly { text: string }[] | undefined): string {
  if (!messages || messages.length === 0) return "messages: none retained";
  const latest = messages.at(-1)!;
  return `messages: ${messages.length} retained; latest: ${latest.text}`;
}

export function runtimeFeaturesMessage(
  query: string | undefined,
  context: RuntimeHelpContext,
): string {
  const needle = query?.trim();
  if (!needle) {
    return "features: modes, motions, editing, search, Ex commands, transforms, registers, marks, macros, keybindings, diagnostics, runtime help, settings, Pi shortcuts; :features <query>";
  }
  const recipe = actionKeybindingRecipeMessage(needle);
  if (recipe) return recipe;
  const state = effectiveStateMessage(needle, context);
  if (state) return state;
  const action = actionFeatureMessage(needle, context);
  if (action) return action;
  const protectedShortcut = protectedShortcutForKey(needle);
  if (protectedShortcut) return mapcheckMessage(keymapForOptions(context.options), needle);
  const entry = findEntry(needle);
  if (entry) return compactEntry(entry, context);
  return `features: no match for ${needle}`;
}

function findEntry(query: string): RuntimeHelpEntry | undefined {
  const needle = query.toLowerCase();
  const exact = ENTRIES.find(
    (entry) =>
      entry.id === needle ||
      entry.category === needle ||
      (entry.topics as readonly string[]).includes(needle),
  );
  if (exact) return exact;
  return ENTRIES.find((entry) => {
    const haystack = [entry.id, entry.category, ...entry.topics, entry.summary, ...entry.examples]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

function compactEntry(entry: RuntimeHelpEntry, _context: RuntimeHelpContext): string {
  const limit = entry.limits[0] ? ` limit: ${entry.limits.join(", ")}` : "";
  return `${entry.id}: ${entry.summary}; examples ${entry.examples.join(", ")};${limit}`;
}

function actionFeatureMessage(query: string, context: RuntimeHelpContext): string | undefined {
  const options = context.options;
  const keymap = keymapForOptions(options);
  const transforms = promptTransformsForOptions(options);
  const macros = macrosForOptions(options);
  const marks = marksForOptions(options);
  const action = searchActions(keymap, query, transforms, macros, marks)[0];
  return action ? actionsMessage(keymap, query, transforms, macros, marks) : undefined;
}

function effectiveStateMessage(query: string, context: RuntimeHelpContext): string | undefined {
  const needle = query.toLowerCase();
  const options = context.options;
  const macros = macrosForOptions(options);
  const marks = marksForOptions(options);
  const transforms = promptTransformsForOptions(options);
  if (needle.includes("nohlsearch") || needle === "noh") {
    return ":noh/:nohlsearch supported; clears visible prompt search highlights; preserves n/N repeat-search state";
  }
  if (needle.includes("macro")) {
    return macros.enabled ? `macros enabled; slots ${macros.slots.join(",")}` : "macros disabled";
  }
  if (needle.includes("mark")) {
    return marks.enabled ? `marks enabled; slots ${marks.slots.join(",")}` : "marks disabled";
  }
  if (needle.includes("workbench") || needle.includes("reservedrows")) {
    return `workbench reservedRows=${options.ui?.workbench.reservedRows ?? 0}`;
  }
  if (needle === "reflow" && transforms.actions.reflow === false) return "reflow disabled";
  if (needle === "quote" && transforms.actions.quote !== false) {
    return `prompt.transform.quote ${transforms.commands.quote.map((name) => `:${name}`).join(",")}`;
  }
  return undefined;
}
