import type { ResolvedVimEditorOptions } from "./types.ts";

import { ACTION_KEYBINDING_RECIPES } from "./action-keybinding-recipes.ts";
import { keymapForOptions } from "./config.ts";

export const HELP_POPUP_BODY_ROWS = 10;

export type HelpPopup = {
  title: string;
  lines: readonly string[];
  source: "features";
  query: "keybindings";
  docsAnchor: "runtime-help:keybinding-discovery-popup";
  scrollOffset: number;
};

export function isKeybindingDiscoveryPopupQuery(command: string, query?: string): boolean {
  return command === "features" && query?.trim().toLowerCase() === "keybindings";
}

export function keybindingDiscoveryPopup(options: ResolvedVimEditorOptions): HelpPopup {
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

export function scrollHelpPopup(popup: HelpPopup, delta: number): HelpPopup {
  const maxOffset = Math.max(0, popup.lines.length - HELP_POPUP_BODY_ROWS);
  const scrollOffset = Math.max(0, Math.min(maxOffset, popup.scrollOffset + delta));
  return scrollOffset === popup.scrollOffset ? popup : { ...popup, scrollOffset };
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
