import type {
  ResolvedVimActionBinding,
  VimActionKeymapOptions,
  VimActionKeyBindingEntry,
  VimActionKeybindingPreset,
} from "./types.ts";

export type ActionKeybindingRecipeBinding = {
  actionId: keyof VimActionKeymapOptions;
  key: string;
  entry: VimActionKeyBindingEntry;
  args?: ResolvedVimActionBinding["args"];
};

export type ActionKeybindingRecipe = {
  id: VimActionKeybindingPreset;
  title: string;
  summary: string;
  actions: VimActionKeymapOptions;
  expected: readonly ResolvedVimActionBinding[];
};

export const ACTION_KEYBINDING_RECIPES = [
  {
    id: "paragraph-editing",
    title: "paragraph editing",
    summary: "reflow with gq, quote with g>, and unquote with g<",
    actions: {
      "prompt.transform.reflow": ["gq"],
      "prompt.transform.quote": ["g>"],
      "prompt.transform.unquote": ["g<"],
    },
    expected: [
      { key: "gq", actionId: "prompt.transform.reflow", args: { action: "reflow" } },
      { key: "g>", actionId: "prompt.transform.quote", args: { action: "quote" } },
      { key: "g<", actionId: "prompt.transform.unquote", args: { action: "unquote" } },
    ],
  },
  {
    id: "markdown-wrapping",
    title: "markdown wrapping",
    summary: "wrap prompt lines with quote/unquote and code fences",
    actions: {
      "prompt.transform.fence": ["gT"],
      "prompt.transform.quote": ["g>"],
      "prompt.transform.unquote": ["g<"],
    },
    expected: [
      {
        key: "gT",
        actionId: "prompt.transform.fence",
        args: { action: "fence" },
      },
      { key: "g>", actionId: "prompt.transform.quote", args: { action: "quote" } },
      { key: "g<", actionId: "prompt.transform.unquote", args: { action: "unquote" } },
    ],
  },
] as const satisfies readonly ActionKeybindingRecipe[];

export const ACTION_KEYBINDING_PRESETS = ACTION_KEYBINDING_RECIPES;

export const ACTION_KEYBINDING_PRESET_IDS = ACTION_KEYBINDING_PRESETS.map(
  (preset) => preset.id,
) as readonly VimActionKeybindingPreset[];

export function actionKeybindingPresetActions(
  id: VimActionKeybindingPreset,
): VimActionKeymapOptions {
  return ACTION_KEYBINDING_PRESETS.find((preset) => preset.id === id)!.actions;
}

export function isActionKeybindingPreset(value: string): value is VimActionKeybindingPreset {
  return ACTION_KEYBINDING_PRESET_IDS.includes(value as VimActionKeybindingPreset);
}

export function actionKeybindingRecipeMessage(query: string): string | undefined {
  const needle = query.trim().toLowerCase();
  if (!isRecipeQuery(needle)) return undefined;
  const matchingRecipes = ACTION_KEYBINDING_RECIPES.filter(
    (recipe) =>
      needle === "keybindings" ||
      needle === "action keybindings" ||
      needle === "action presets" ||
      recipe.id.includes(needle.replaceAll(" ", "-")) ||
      recipe.title.includes(needle),
  );
  if (matchingRecipes.length === 0) return undefined;
  const recipeText = matchingRecipes.map(compactRecipe).join("; ");
  return `action keybinding recipes/presets for piVimMode.keymap.actions and piVimMode.keymap.actionPresets (opt-in snippets/bundles, no defaults/plugin API): ${recipeText}`;
}

function isRecipeQuery(needle: string): boolean {
  return (
    needle === "keybindings" ||
    needle === "action keybindings" ||
    needle === "action presets" ||
    needle === "paragraph editing" ||
    needle === "paragraph-editing" ||
    needle === "markdown wrapping" ||
    needle === "markdown-wrapping"
  );
}

function compactRecipe(recipe: ActionKeybindingRecipe): string {
  const bindings = recipe.expected
    .map((binding) => `${binding.actionId}=${binding.key}`)
    .join(", ");
  return `${recipe.id} (${recipe.title}): ${bindings}`;
}
