import type {
  ResolvedVimKeymap,
  VimCommandAction,
  VimMotionAction,
  VimOperatorAction,
  VimTextObjectKind,
  VimTextObjectTarget,
} from "./types.ts";

export type GrammarBinding = { sequence: string; label: string };

export type KeymapGrammarEntry =
  | { family: "operator"; id: VimOperatorAction; sequence: string; label: string }
  | { family: "motion"; id: VimMotionAction; sequence: string; label: string }
  | { family: "command"; id: VimCommandAction; sequence: string; label: string }
  | { family: "macro"; id: string; sequence: string; label: string }
  | { family: "mark"; id: string; sequence: string; label: string }
  | { family: "textObjectKind"; id: VimTextObjectKind; sequence: string; label: string }
  | { family: "textObjectTarget"; id: VimTextObjectTarget; sequence: string; label: string };

function grammarEntries<Family extends KeymapGrammarEntry["family"]>(
  family: Family,
  prefix: string,
  mappings: Readonly<Record<string, readonly string[]>>,
): Extract<KeymapGrammarEntry, { family: Family }>[] {
  return Object.entries(mappings).flatMap(([id, sequences]) =>
    sequences.map(
      (sequence) =>
        ({ family, id, sequence, label: `${prefix}.${id}` }) as Extract<
          KeymapGrammarEntry,
          { family: Family }
        >,
    ),
  );
}

export function grammarEntriesForKeymap(keymap: ResolvedVimKeymap): KeymapGrammarEntry[] {
  return [
    ...grammarEntries("operator", "operators", keymap.operators),
    ...grammarEntries("motion", "motions", keymap.motions),
    ...grammarEntries("command", "commands", keymap.commands),
    ...grammarEntries("macro", "macros", keymap.macros),
    ...grammarEntries("mark", "marks", keymap.marks),
    ...grammarEntries("textObjectKind", "textObjects.kinds", keymap.textObjects.kinds),
    ...grammarEntries("textObjectTarget", "textObjects.targets", keymap.textObjects.targets),
  ];
}

export function grammarBindingsForKeymap(keymap: ResolvedVimKeymap): GrammarBinding[] {
  return grammarEntriesForKeymap(keymap).map(({ sequence, label }) => ({ sequence, label }));
}

export function grammarConflictForActionKey(
  key: string,
  grammarBindings: readonly GrammarBinding[],
): string | undefined {
  const exact = grammarBindings.find((binding) => binding.sequence === key);
  if (exact) return `conflicts with ${exact.label}`;
  const prefix = grammarBindings.find((binding) => {
    if (key.includes("+") || binding.sequence.includes("+")) return false;
    return key.startsWith(binding.sequence) || binding.sequence.startsWith(key);
  });
  return prefix ? `prefix-shadow conflict with ${prefix.label}` : undefined;
}
