import type {
  ResolvedVimActionBinding,
  VimActionKeymapOptions,
  VimActionKeyBindingEntry,
} from "./types.ts";

export type ActionKeybindingRecipeBinding = {
  actionId: keyof VimActionKeymapOptions;
  key: string;
  entry: VimActionKeyBindingEntry;
  args?: ResolvedVimActionBinding["args"];
};

export type ActionKeybindingRecipe = {
  id: string;
  title: string;
  docsAnchor: string;
  summary: string;
  actions: VimActionKeymapOptions;
  expected: readonly ResolvedVimActionBinding[];
};

export const ACTION_KEYBINDING_RECIPES = [
  {
    id: "paragraph-editing",
    title: "paragraph editing",
    docsAnchor: "action-keybinding-recipe:paragraph-editing",
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
    docsAnchor: "action-keybinding-recipe:markdown-wrapping",
    summary: "wrap prompt lines with quote/unquote and code fences",
    actions: {
      "prompt.transform.fence": [{ key: "gT", args: { language: "ts" } }],
      "prompt.transform.quote": ["g>"],
      "prompt.transform.unquote": ["g<"],
    },
    expected: [
      {
        key: "gT",
        actionId: "prompt.transform.fence",
        args: { action: "fence", language: "ts" },
      },
      { key: "g>", actionId: "prompt.transform.quote", args: { action: "quote" } },
      { key: "g<", actionId: "prompt.transform.unquote", args: { action: "unquote" } },
    ],
  },
] as const satisfies readonly ActionKeybindingRecipe[];

export function actionKeybindingRecipeMessage(query: string): string | undefined {
  const needle = query.trim().toLowerCase();
  if (!isRecipeQuery(needle)) return undefined;
  const matchingRecipes = ACTION_KEYBINDING_RECIPES.filter(
    (recipe) =>
      needle === "keybindings" ||
      needle === "action keybindings" ||
      recipe.id.includes(needle.replaceAll(" ", "-")) ||
      recipe.title.includes(needle),
  );
  if (matchingRecipes.length === 0) return undefined;
  const recipeText = matchingRecipes.map(compactRecipe).join("; ");
  return `action keybinding recipes for piVimMode.keymap.actions (opt-in snippets, no defaults/plugin API): ${recipeText}`;
}

function isRecipeQuery(needle: string): boolean {
  return (
    needle === "keybindings" ||
    needle === "action keybindings" ||
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
  return `${recipe.title}: ${bindings}`;
}
