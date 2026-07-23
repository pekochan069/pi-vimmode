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

const SORTED_NAMED_TERMINAL_KEYS = [...NAMED_TERMINAL_KEYS].sort(
  (left, right) => right.length - left.length,
);
export const MAPPING_TOKEN_SEPARATOR = "\u0000";

export function displayMappingSequence(sequence: string): string {
  return sequence.replaceAll(MAPPING_TOKEN_SEPARATOR, "");
}

export function encodeMappingTokens(tokens: readonly string[]): string {
  if (tokens.length <= 1) return tokens[0] ?? "";
  const raw = tokens.join("");
  const hasAmbiguousTerminalSpelling = tokens.some((_, index) => {
    const suffix = tokens.slice(index).join("");
    return (
      SORTED_NAMED_TERMINAL_KEYS.some((key) => suffix.startsWith(key)) ||
      /^(?:(?:shift|ctrl|alt|super)\+)+/.test(suffix)
    );
  });
  return tokens.some((token) => [...token].length !== 1) || hasAmbiguousTerminalSpelling
    ? tokens.join(MAPPING_TOKEN_SEPARATOR)
    : raw;
}

function mappingTokenLengthAt(sequence: string, offset: number): number | undefined {
  const rest = sequence.slice(offset);
  const modifiers = /^(?:(?:shift|ctrl|alt|super)\+)+/.exec(rest)?.[0] ?? "";
  const keyAndRest = rest.slice(modifiers.length);
  if (!keyAndRest) return undefined;
  const namedKey = SORTED_NAMED_TERMINAL_KEYS.find((key) => keyAndRest.startsWith(key));
  const functionKey = /^f\d+/.exec(keyAndRest)?.[0];
  const key = namedKey ?? functionKey ?? [...keyAndRest][0];
  return key ? modifiers.length + key.length : undefined;
}

export function appendMappingToken(
  prefix: string,
  key: string,
  candidates: readonly string[],
): string {
  if (!prefix) return key;
  const separated = `${prefix}${MAPPING_TOKEN_SEPARATOR}${key}`;
  return candidates.some(
    (candidate) =>
      candidate === separated || mappingSequencePrefixes(candidate).includes(separated),
  )
    ? separated
    : `${prefix}${key}`;
}

export function mappingSequencePrefixes(sequence: string): string[] {
  if (sequence.includes(MAPPING_TOKEN_SEPARATOR)) {
    const tokens = sequence.split(MAPPING_TOKEN_SEPARATOR);
    return tokens.slice(1).map((_, index) => encodeMappingTokens(tokens.slice(0, index + 1)));
  }

  const prefixes: string[] = [];
  let offset = 0;
  while (offset < sequence.length) {
    const tokenLength = mappingTokenLengthAt(sequence, offset);
    if (!tokenLength) break;
    offset += tokenLength;
    if (offset < sequence.length) prefixes.push(sequence.slice(0, offset));
  }
  return prefixes;
}

export function isAtomicMappingSequence(sequence: string): boolean {
  return (
    (/^(?:(?:shift|ctrl|alt|super)\+)+/.test(sequence) &&
      mappingTokenLengthAt(sequence, 0) === sequence.length) ||
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

const OPERATOR_PENDING_SCOPES = [...NORMAL_AND_VISUAL_SCOPES, "operatorPending"] as const;
const COMMAND_SCOPES: Readonly<Record<string, readonly VimMappingScope[]>> = {
  insertLineStart: ["normal", "visualBlock"],
  insertLineEnd: ["normal", "visualBlock"],
  pasteAfter: ["normal", "visualLine"],
};

function commandScopes(action: string): readonly VimMappingScope[] {
  return (
    COMMAND_SCOPES[action] ?? (VISUAL_COMMANDS.has(action) ? NORMAL_AND_VISUAL_SCOPES : ["normal"])
  );
}

function motionScopes(action: string): readonly VimMappingScope[] {
  return ["halfPageDown", "halfPageUp"].includes(action)
    ? NORMAL_AND_VISUAL_SCOPES
    : OPERATOR_PENDING_SCOPES;
}

const FAMILY_SCOPES: Readonly<Partial<Record<VimMappingFamily, readonly VimMappingScope[]>>> = {
  operator: NORMAL_AND_VISUAL_SCOPES,
  macro: ["normal"],
  insert: ["insert"],
  textObjectKind: ["operatorPending"],
  textObjectTarget: ["operatorPending"],
  "textObject.kind": ["operatorPending"],
  "textObject.target": ["operatorPending"],
};

export function mappingScopesForKeymapEntry(
  family: VimMappingFamily,
  action: string,
): readonly VimMappingScope[] {
  if (family === "motion") return motionScopes(action);
  if (family === "command") return commandScopes(action);
  if (family === "mark") return action === "set" ? ["normal"] : OPERATOR_PENDING_SCOPES;
  return FAMILY_SCOPES[family]!;
}
