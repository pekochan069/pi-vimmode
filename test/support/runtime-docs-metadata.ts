import type { ActionKeybindingRecipe } from "../../src/action-keybinding-recipes.ts";
import type { DiagnosticActionEntry } from "../../src/diagnostic-actions.ts";
export type DocsDriftMetadata = {
  docsAnchor: string;
  specAnchor: string;
  testAnchors: readonly string[];
};

export type DiagnosticActionDocsMetadata = DocsDriftMetadata & {
  id: DiagnosticActionEntry["id"];
};

export type PopupCommandDocsMetadata = {
  command: string;
  parserExample: string;
  docsAnchor: string;
};

export type ActionRecipeDocsMetadata = {
  id: ActionKeybindingRecipe["id"];
  docsAnchor: string;
  presetDocsAnchor: string;
};

export const DIAGNOSTIC_ACTION_DOCS_METADATA = [
  "vimmode.doctor",
  "vimmode.actions",
  "vimmode.keymap",
  "vimmode.keybindings",
  "vimmode.mapcheck",
  "vimmode.help",
  "vimmode.features",
  "vimmode.messages",
  "vimmode.inspect",
].map((id) => ({
  id,
  docsAnchor: `diagnostic-actions:${id}`,
  specAnchor: "openspec/specs/vim-customization-diagnostics/spec.md",
  testAnchors: ["test/diagnostic-actions.test.ts"],
})) as readonly DiagnosticActionDocsMetadata[];

export const POPUP_COMMAND_DOCS_METADATA = [
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
] as const satisfies readonly PopupCommandDocsMetadata[];

export const ACTION_RECIPE_DOCS_METADATA = [
  {
    id: "paragraph-editing",
    docsAnchor: "action-keybinding-recipe:paragraph-editing",
    presetDocsAnchor: "action-keybinding-preset:paragraph-editing",
  },
  {
    id: "markdown-wrapping",
    docsAnchor: "action-keybinding-recipe:markdown-wrapping",
    presetDocsAnchor: "action-keybinding-preset:markdown-wrapping",
  },
] as const satisfies readonly ActionRecipeDocsMetadata[];
