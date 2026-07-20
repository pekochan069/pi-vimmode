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

export function isAtomicMappingSequence(sequence: string): boolean {
  return (
    /^(?:ctrl|alt|shift|super)\+/.test(sequence) ||
    NAMED_TERMINAL_KEYS.has(sequence) ||
    /^f\d+$/.test(sequence)
  );
}

export function mappingSequencesOverlap(left: string, right: string): boolean {
  if (left === right) return true;
  if (isAtomicMappingSequence(left) || isAtomicMappingSequence(right)) return false;
  return left.startsWith(right) || right.startsWith(left);
}

const VISUAL_SCOPES = ["visual", "visualLine", "visualBlock"] as const;
const NORMAL_AND_VISUAL_SCOPES = ["normal", ...VISUAL_SCOPES] as const;

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
  if (family === "command" || family === "macro") return ["normal"];
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
