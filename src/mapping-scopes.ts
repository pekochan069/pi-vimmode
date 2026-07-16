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
    return action === "set"
      ? NORMAL_AND_VISUAL_SCOPES
      : [...NORMAL_AND_VISUAL_SCOPES, "operatorPending"];
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
