import type {
  ResolvedVimKeymap,
  VimCommandAction,
  VimMarkKeymapOptions,
  VimMotionAction,
  VimOperatorAction,
  VimTextObjectKind,
  VimTextObjectTarget,
} from "./types.ts";

type KeymapDescriptor = {
  defaults: readonly string[];
  legacy?: string;
};

type OperatorDescriptor = KeymapDescriptor & {
  motionOperator?: boolean;
};

type CommandDescriptor = KeymapDescriptor & {
  charArgument?: boolean;
  operatorCharSearch?: boolean;
  repeatCharSearch?: boolean;
  searchDirection?: "forward" | "backward";
};

export const KEYMAP_OPERATOR_DESCRIPTORS = {
  delete: { defaults: ["d"], legacy: "d", motionOperator: true },
  change: { defaults: ["c"], legacy: "c", motionOperator: true },
  yank: { defaults: ["y"], legacy: "y", motionOperator: true },
  lowercase: { defaults: ["gu"], motionOperator: true },
  uppercase: { defaults: ["gU"], motionOperator: true },
  toggleCase: { defaults: ["g~"], motionOperator: true },
  indent: { defaults: [">"] },
  dedent: { defaults: ["<"] },
} as const satisfies Record<VimOperatorAction, OperatorDescriptor>;

export const KEYMAP_MOTION_DESCRIPTORS = {
  left: { defaults: ["h"], legacy: "h" },
  down: { defaults: ["j"], legacy: "j" },
  up: { defaults: ["k"], legacy: "k" },
  right: { defaults: ["l"], legacy: "l" },
  wordForward: { defaults: ["w"], legacy: "w" },
  wordBackward: { defaults: ["b"], legacy: "b" },
  wordEnd: { defaults: ["e"], legacy: "e" },
  wordForwardBig: { defaults: ["W"], legacy: "W" },
  wordBackwardBig: { defaults: ["B"], legacy: "B" },
  wordEndBig: { defaults: ["E"], legacy: "E" },
  wordPreviousEnd: { defaults: ["ge"], legacy: "ge" },
  wordPreviousEndBig: { defaults: ["gE"], legacy: "gE" },
  lineStart: { defaults: ["0"], legacy: "0" },
  lineEnd: { defaults: ["$"], legacy: "$" },
  firstNonBlank: { defaults: ["^", "_"], legacy: "^" },
  bufferStart: { defaults: ["gg"], legacy: "gg" },
  bufferEnd: { defaults: ["G"], legacy: "G" },
  matchingPair: { defaults: ["%"], legacy: "%" },
  halfPageDown: { defaults: ["ctrl+d"] },
  halfPageUp: { defaults: ["ctrl+u"] },
  paragraphBackward: { defaults: ["{"], legacy: "{" },
  paragraphForward: { defaults: ["}"], legacy: "}" },
} as const satisfies Record<VimMotionAction, KeymapDescriptor>;

export const KEYMAP_MACRO_DESCRIPTORS = {
  record: { defaults: ["q"] },
  play: { defaults: ["@"] },
} as const satisfies Record<keyof ResolvedVimKeymap["macros"], KeymapDescriptor>;

export const KEYMAP_MARK_DESCRIPTORS = {
  set: { defaults: ["m"] },
  jumpExact: { defaults: ["`"] },
  jumpLine: { defaults: ["'"] },
} as const satisfies Record<keyof VimMarkKeymapOptions, KeymapDescriptor>;

export const KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS = {
  inner: { defaults: ["i"] },
  around: { defaults: ["a"] },
} as const satisfies Record<VimTextObjectKind, KeymapDescriptor>;

export const KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS = {
  word: { defaults: ["w"] },
  singleQuote: { defaults: ["'"] },
  doubleQuote: { defaults: ['"'] },
  paren: { defaults: ["(", ")"] },
  bracket: { defaults: ["[", "]"] },
  brace: { defaults: ["{", "}"] },
  paragraph: { defaults: ["p"] },
  codeFence: { defaults: ["f"] },
  headingSection: { defaults: ["h"] },
  listItem: { defaults: ["l"] },
  tag: { defaults: ["t"] },
  errorBlock: { defaults: ["e"] },
} as const satisfies Record<VimTextObjectTarget, KeymapDescriptor>;

export const KEYMAP_COMMAND_DESCRIPTORS = {
  insertBefore: { defaults: ["i"] },
  insertAfter: { defaults: ["a"] },
  insertLineStart: { defaults: ["I"] },
  insertLineEnd: { defaults: ["A"] },
  openLineBelow: { defaults: ["o"] },
  openLineAbove: { defaults: ["O"] },
  visualChar: { defaults: ["v"] },
  visualLine: { defaults: ["V"] },
  visualBlock: { defaults: [] },
  deleteChar: { defaults: ["x"] },
  deleteCharBefore: { defaults: ["X"] },
  deleteToLineEnd: { defaults: ["D"] },
  changeToLineEnd: { defaults: ["C"] },
  yankLine: { defaults: ["Y"] },
  joinLine: { defaults: ["J"] },
  pasteAfter: { defaults: ["p"] },
  pasteBefore: { defaults: ["P"] },
  incrementNumber: { defaults: ["ctrl+a"] },
  decrementNumber: { defaults: ["ctrl+x"] },
  toggleCase: { defaults: ["~"] },
  replaceChar: { defaults: ["r"], charArgument: true },
  substituteChar: { defaults: ["s"] },
  substituteLine: { defaults: ["S"] },
  findCharForward: { defaults: ["f"], charArgument: true, operatorCharSearch: true },
  findCharBackward: { defaults: ["F"], charArgument: true, operatorCharSearch: true },
  tillCharForward: { defaults: ["t"], charArgument: true, operatorCharSearch: true },
  tillCharBackward: { defaults: ["T"], charArgument: true, operatorCharSearch: true },
  repeatCharSearch: { defaults: [";"], repeatCharSearch: true },
  repeatCharSearchReverse: { defaults: [","], repeatCharSearch: true },
  startSearch: { defaults: ["/"], searchDirection: "forward" },
  startSearchBackward: { defaults: ["?"], searchDirection: "backward" },
  repeatSearch: { defaults: ["n"] },
  repeatSearchReverse: { defaults: ["N"] },
  searchWordForward: { defaults: ["*"] },
  searchWordBackward: { defaults: ["#"] },
  startExCommand: { defaults: [":"] },
  repeatChange: { defaults: ["."] },
  undo: { defaults: ["u"] },
  redo: { defaults: ["ctrl+r"] },
  showKeybindings: { defaults: [] },
} as const satisfies Record<VimCommandAction, CommandDescriptor>;

export function deriveActionKeys<T extends Record<string, KeymapDescriptor>>(
  descriptors: T,
): Array<keyof T> {
  return Object.keys(descriptors) as Array<keyof T>;
}

export function deriveDefaultKeyBindings<T extends Record<string, KeymapDescriptor>>(
  descriptors: T,
): { [K in keyof T]: string[] } {
  return Object.fromEntries(
    Object.entries(descriptors).map(([action, descriptor]) => [action, [...descriptor.defaults]]),
  ) as { [K in keyof T]: string[] };
}

export function deriveSet<T extends Record<string, KeymapDescriptor>>(descriptors: T): Set<string> {
  return new Set(Object.keys(descriptors));
}

export function deriveLegacyKeyToAction<T extends Record<string, KeymapDescriptor>>(
  descriptors: T,
): Record<string, keyof T> {
  return Object.fromEntries(
    Object.entries(descriptors)
      .filter((entry): entry is [keyof T & string, KeymapDescriptor & { legacy: string }] =>
        Boolean(entry[1].legacy),
      )
      .map(([action, descriptor]) => [descriptor.legacy, action]),
  ) as Record<string, keyof T>;
}

export function deriveLegacyActionToKey<T extends Record<string, KeymapDescriptor>>(
  descriptors: T,
): Partial<Record<keyof T, string>> {
  return Object.fromEntries(
    Object.entries(descriptors)
      .filter((entry): entry is [keyof T & string, KeymapDescriptor & { legacy: string }] =>
        Boolean(entry[1].legacy),
      )
      .map(([action, descriptor]) => [action, descriptor.legacy]),
  ) as Partial<Record<keyof T, string>>;
}

export function deriveActionsWhere<T extends Record<string, KeymapDescriptor>>(
  descriptors: T,
  predicate: (descriptor: T[keyof T], action: keyof T) => boolean,
): Array<keyof T> {
  return deriveActionKeys(descriptors).filter((action) => predicate(descriptors[action], action));
}
