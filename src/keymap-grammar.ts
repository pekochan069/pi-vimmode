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

export function grammarEntriesForKeymap(keymap: ResolvedVimKeymap): KeymapGrammarEntry[] {
  const entries: KeymapGrammarEntry[] = [];
  for (const [id, sequences] of Object.entries(keymap.operators) as [
    VimOperatorAction,
    readonly string[],
  ][]) {
    for (const sequence of sequences)
      entries.push({ family: "operator", id, sequence, label: `operators.${id}` });
  }
  for (const [id, sequences] of Object.entries(keymap.motions) as [
    VimMotionAction,
    readonly string[],
  ][]) {
    for (const sequence of sequences)
      entries.push({ family: "motion", id, sequence, label: `motions.${id}` });
  }
  for (const [id, sequences] of Object.entries(keymap.commands) as [
    VimCommandAction,
    readonly string[],
  ][]) {
    for (const sequence of sequences)
      entries.push({ family: "command", id, sequence, label: `commands.${id}` });
  }
  for (const [id, sequences] of Object.entries(keymap.macros)) {
    for (const sequence of sequences)
      entries.push({ family: "macro", id, sequence, label: `macros.${id}` });
  }
  for (const [id, sequences] of Object.entries(keymap.marks)) {
    for (const sequence of sequences)
      entries.push({ family: "mark", id, sequence, label: `marks.${id}` });
  }
  for (const [id, sequences] of Object.entries(keymap.textObjects.kinds) as [
    VimTextObjectKind,
    readonly string[],
  ][]) {
    for (const sequence of sequences)
      entries.push({ family: "textObjectKind", id, sequence, label: `textObjects.kinds.${id}` });
  }
  for (const [id, sequences] of Object.entries(keymap.textObjects.targets) as [
    VimTextObjectTarget,
    readonly string[],
  ][]) {
    for (const sequence of sequences)
      entries.push({
        family: "textObjectTarget",
        id,
        sequence,
        label: `textObjects.targets.${id}`,
      });
  }
  return entries;
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
