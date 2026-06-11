import type { ExMessage, EditorSnapshot, ModalState } from "./modal/types.ts";
import type { ResolvedVimEditorOptions, VimDiagnostics } from "./types.ts";

import { ACTION_KEYBINDING_RECIPES } from "./action-keybinding-recipes.ts";
import {
  keymapForOptions,
  macrosForOptions,
  marksForOptions,
  promptTransformsForOptions,
} from "./config.ts";
import {
  actionsMessage,
  doctorMessage,
  keybindingCatalogLines,
  keybindingDetailLines,
  keymapMessage,
  mapcheckMessage,
} from "./customization.ts";
import { runtimeMessagesMessage, vimmodeInspectMessage } from "./modal/inspect.ts";
import { runtimeFeaturesMessage, runtimeHelpMessage } from "./runtime-help.ts";

export const HELP_POPUP_BODY_ROWS = 10;

export type ReadOnlyPopupSource =
  | "help"
  | "features"
  | "keybindings"
  | "actions"
  | "keymap"
  | "mapcheck"
  | "vimdoctor"
  | "messages"
  | "inspect";

export type ReadOnlyPopup = {
  title: string;
  lines: readonly string[];
  source: ReadOnlyPopupSource;
  query?: string;
  docsAnchor: string;
  scrollOffset: number;
};

export type HelpPopup = ReadOnlyPopup;

export type RuntimeHelpPopupCommand = {
  command: "help" | "features" | "messages";
  query?: string;
};

export type DiagnosticPopupCommand = {
  command: "vimdoctor" | "keymap" | "mapcheck" | "actions";
  query?: string;
};

export type InspectPopupInput = {
  state: ModalState;
  snapshot: EditorSnapshot;
  options: ResolvedVimEditorOptions;
  diagnostics?: VimDiagnostics;
};

export const READ_ONLY_POPUP_COMMANDS = [
  {
    command: ":help",
    parserExample: "help",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":help <topic>",
    parserExample: "help search",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":features",
    parserExample: "features",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":features <query>",
    parserExample: "features redo",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":keybindings",
    parserExample: "keybindings",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":keybindings <query>",
    parserExample: "keybindings redo",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":actions",
    parserExample: "actions",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":actions <query>",
    parserExample: "actions redo",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":keymap",
    parserExample: "keymap",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":keymap <action>",
    parserExample: "keymap redo",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":mapcheck <key>",
    parserExample: "mapcheck ctrl+p",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":messages",
    parserExample: "messages",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":vimmode inspect",
    parserExample: "vimmode inspect",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":vimdoctor",
    parserExample: "vimdoctor",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
] as const;

export function isKeybindingDiscoveryPopupQuery(command: string, query?: string): boolean {
  return command === "features" && query?.trim().toLowerCase() === "keybindings";
}

export function keybindingDiscoveryPopup(options: ResolvedVimEditorOptions): ReadOnlyPopup {
  return {
    title: "Keybinding discovery",
    source: "features",
    query: "keybindings",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
    scrollOffset: 0,
    lines: [
      "Source-backed prompt transform keybinding recipes and presets.",
      "Settings: piVimMode.keymap.actions, piVimMode.keymap.actionPresets.",
      ...compactRecipeLines(),
      ...recipeLines(),
      ...acceptedBindingLines(options),
      "Diagnostics: use :actions <query>, :keymap <action>, :mapcheck <key>.",
      "Boundaries: opt-in only; no defaults; no plugin API; no diagnostic/help keybinding dispatch.",
      "Non-goals: no runtime :map; no runtime :action; no command palette; no Vim help pager.",
    ],
  };
}

export function keybindingsPopup(
  options: ResolvedVimEditorOptions,
  diagnostics: VimDiagnostics = { warnings: [] },
  query?: string,
): ReadOnlyPopup {
  const keymap = keymapForOptions(options);
  const context = {
    keymap,
    promptTransforms: promptTransformsForOptions(options),
    macros: macrosForOptions(options),
    marks: marksForOptions(options),
    warnings: diagnostics.warnings,
  };
  const trimmedQuery = query?.trim();
  return {
    title: trimmedQuery ? `:keybindings ${trimmedQuery}` : ":keybindings",
    source: "keybindings",
    query: trimmedQuery || undefined,
    docsAnchor: "runtime-help:keybinding-discovery-popup",
    scrollOffset: 0,
    lines: trimmedQuery
      ? keybindingDetailLines(context, trimmedQuery)
      : keybindingCatalogLines(context),
  };
}

export function runtimeHelpPopup(
  command: RuntimeHelpPopupCommand,
  options: ResolvedVimEditorOptions,
  diagnostics: VimDiagnostics = { warnings: [] },
  messages?: readonly ExMessage[],
): ReadOnlyPopup {
  if (isKeybindingDiscoveryPopupQuery(command.command, command.query)) {
    return keybindingDiscoveryPopup(options);
  }
  const context = { options, diagnostics };
  const message =
    command.command === "help"
      ? runtimeHelpMessage(command.query, context)
      : command.command === "features"
        ? runtimeFeaturesMessage(command.query, context)
        : runtimeMessagesMessage(messages);
  return popupFromMessage({
    title: command.query ? `:${command.command} ${command.query}` : `:${command.command}`,
    source: command.command,
    query: command.query,
    docsAnchor: runtimeHelpDocsAnchor(command.command),
    message,
  });
}

export function diagnosticPopup(
  command: DiagnosticPopupCommand,
  options: ResolvedVimEditorOptions,
  diagnostics: VimDiagnostics = { warnings: [] },
): ReadOnlyPopup {
  const keymap = keymapForOptions(options);
  const transforms = promptTransformsForOptions(options);
  const macros = macrosForOptions(options);
  const marks = marksForOptions(options);
  const message =
    command.command === "vimdoctor"
      ? doctorMessage(options, diagnostics)
      : command.command === "keymap"
        ? keymapMessage(keymap, command.query, transforms, macros, marks)
        : command.command === "mapcheck"
          ? mapcheckMessage(keymap, command.query ?? "", diagnostics.warnings)
          : actionsMessage(keymap, command.query, transforms, macros, marks);
  return popupFromMessage({
    title: command.query ? `:${command.command} ${command.query}` : `:${command.command}`,
    source: command.command,
    query: command.query,
    docsAnchor: "runtime-help:customization-diagnostics",
    message,
  });
}

export function inspectPopup(input: InspectPopupInput): ReadOnlyPopup {
  return popupFromMessage({
    title: ":vimmode inspect",
    source: "inspect",
    docsAnchor: "runtime-help:runtime-help",
    message: vimmodeInspectMessage(input),
  });
}

export function scrollHelpPopup(popup: ReadOnlyPopup, delta: number): ReadOnlyPopup {
  const maxOffset = Math.max(0, popup.lines.length - HELP_POPUP_BODY_ROWS);
  const scrollOffset = Math.max(0, Math.min(maxOffset, popup.scrollOffset + delta));
  return scrollOffset === popup.scrollOffset ? popup : { ...popup, scrollOffset };
}

function popupFromMessage(input: {
  title: string;
  source: ReadOnlyPopupSource;
  query?: string;
  docsAnchor: string;
  message: string;
}): ReadOnlyPopup {
  return {
    title: input.title,
    source: input.source,
    query: input.query,
    docsAnchor: input.docsAnchor,
    scrollOffset: 0,
    lines: splitPopupMessage(input.message),
  };
}

function splitPopupMessage(message: string): string[] {
  const lines = message
    .split(/\n|;\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? lines : ["(no output)"];
}

function runtimeHelpDocsAnchor(command: RuntimeHelpPopupCommand["command"]): string {
  return command === "messages" ? "runtime-help:runtime-help" : "runtime-help:runtime-help";
}

function compactRecipeLines(): string[] {
  const recipe = ACTION_KEYBINDING_RECIPES[0];
  if (!recipe) return [];
  return [formatBindings(recipe.expected)];
}

function recipeLines(): string[] {
  return ACTION_KEYBINDING_RECIPES.map(
    (recipe) => `Recipe/preset ${recipe.id} (${recipe.title}): ${formatBindings(recipe.expected)}`,
  );
}

function formatBindings(bindings: (typeof ACTION_KEYBINDING_RECIPES)[number]["expected"]): string {
  return bindings.map((binding) => `${binding.actionId}=${binding.key}`).join(", ");
}

function acceptedBindingLines(options: ResolvedVimEditorOptions): string[] {
  const accepted = keymapForOptions(options).actions.accepted;
  if (accepted.length === 0) return ["accepted bindings: none configured."];
  return [
    "accepted bindings:",
    ...accepted.map((binding) => `${binding.actionId} -> ${binding.key}`),
  ];
}
