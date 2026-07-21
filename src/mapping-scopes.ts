export const VIM_MAPPING_SCOPES = [
  "normal",
  "visual",
  "visualLine",
  "visualBlock",
  "insert",
  "operatorPending",
] as const;

export type VimMappingScope = (typeof VIM_MAPPING_SCOPES)[number];
export type VimMappingFamily =
  | "operator"
  | "motion"
  | "command"
  | "macro"
  | "mark"
  | "insert"
  | "textObjectKind"
  | "textObjectTarget"
  | "textObject.kind"
  | "textObject.target";

const NAMED_TERMINAL_KEYS = new Set([
  "enter",
  "tab",
  "escape",
  "backspace",
  "delete",
  "home",
  "end",
  "pageup",
  "pagedown",
  "insert",
  "up",
  "down",
  "left",
  "right",
]);

function modifiedKeyTokenLength(sequence: string): number | undefined {
  const modifiers = /^(?:(?:shift|ctrl|alt|super)\+)+/.exec(sequence)?.[0];
  if (!modifiers) return undefined;
  const keyAndRest = sequence.slice(modifiers.length);
  if (!keyAndRest) return undefined;
  const namedKey = [...NAMED_TERMINAL_KEYS]
    .sort((left, right) => right.length - left.length)
    .find((key) => keyAndRest.startsWith(key));
  const functionKey = /^f\d+/.exec(keyAndRest)?.[0];
  const key = namedKey ?? functionKey ?? [...keyAndRest][0];
  return key ? modifiers.length + key.length : undefined;
}

export function mappingSequencePrefixes(sequence: string): string[] {
  const modifiedLength = modifiedKeyTokenLength(sequence);
  if (modifiedLength === sequence.length) return [];
  if (!modifiedLength) {
    if (NAMED_TERMINAL_KEYS.has(sequence) || /^f\d+$/.test(sequence)) return [];
    return Array.from({ length: Math.max(0, sequence.length - 1) }, (_, index) =>
      sequence.slice(0, index + 1),
    );
  }
  const prefixes = [sequence.slice(0, modifiedLength)];
  for (let index = modifiedLength + 1; index < sequence.length; index += 1) {
    prefixes.push(sequence.slice(0, index));
  }
  return prefixes;
}

export function isAtomicMappingSequence(sequence: string): boolean {
  const modifiedLength = modifiedKeyTokenLength(sequence);
  return (
    modifiedLength === sequence.length ||
    NAMED_TERMINAL_KEYS.has(sequence) ||
    /^f\d+$/.test(sequence)
  );
}

export function mappingSequencesOverlap(left: string, right: string): boolean {
  if (left === right) return true;
  return (
    mappingSequencePrefixes(left).includes(right) || mappingSequencePrefixes(right).includes(left)
  );
}

const VISUAL_SCOPES = ["visual", "visualLine", "visualBlock"] as const;
const NORMAL_AND_VISUAL_SCOPES = ["normal", ...VISUAL_SCOPES] as const;
const VISUAL_COMMANDS = new Set([
  "insertLineStart",
  "insertLineEnd",
  "visualChar",
  "visualLine",
  "visualBlock",
  "deleteChar",
  "pasteAfter",
  "toggleCase",
  "replaceChar",
  "startSearch",
  "startSearchBackward",
  "repeatSearch",
  "repeatSearchReverse",
  "startExCommand",
]);

export function mappingScopesForKeymapEntry(
  family: VimMappingFamily,
  action: string,
): readonly VimMappingScope[] {
  if (family === "motion") {
    return action === "halfPageDown" || action === "halfPageUp"
      ? NORMAL_AND_VISUAL_SCOPES
      : [...NORMAL_AND_VISUAL_SCOPES, "operatorPending"];
  }
  if (family === "operator") return NORMAL_AND_VISUAL_SCOPES;
  if (family === "command") {
    if (action === "insertLineStart" || action === "insertLineEnd")
      return ["normal", "visualBlock"];
    if (action === "pasteAfter") return ["normal", "visualLine"];
    return VISUAL_COMMANDS.has(action) ? NORMAL_AND_VISUAL_SCOPES : ["normal"];
  }
  if (family === "macro") return ["normal"];
  if (family === "mark") {
    return action === "set" ? ["normal"] : [...NORMAL_AND_VISUAL_SCOPES, "operatorPending"];
  }
  if (family === "insert") return ["insert"];
  if (
    family === "textObjectKind" ||
    family === "textObjectTarget" ||
    family === "textObject.kind" ||
    family === "textObject.target"
  ) {
    return ["operatorPending"];
  }
  return family satisfies never;
}
