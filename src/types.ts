import type { BindablePromptTransformActionId } from "./prompt-transform-actions.ts";

export type VimMode = "insert" | "normal" | "visual" | "visualLine" | "visualBlock";

export type StartupMode = Extract<VimMode, "insert" | "normal">;

export type CursorStyle = "block" | "bar" | "underline";

export type CursorStyles = Record<VimMode, CursorStyle>;

export type VimPreset = "minimal" | "prompt-safe" | "vim-heavy";

export type VimNoopFeedback = "off" | "status";

export type VimFeedbackOptions = {
  noop: VimNoopFeedback;
};

export type VimDiagnostics = {
  warnings: readonly string[];
};

export type VimMotionOperatorAction =
  | "delete"
  | "change"
  | "yank"
  | "lowercase"
  | "uppercase"
  | "toggleCase";
export type VimOperatorAction = VimMotionOperatorAction | "indent" | "dedent";

export type VimMotionAction =
  | "left"
  | "down"
  | "up"
  | "right"
  | "wordForward"
  | "wordBackward"
  | "wordEnd"
  | "wordForwardBig"
  | "wordBackwardBig"
  | "wordEndBig"
  | "wordPreviousEnd"
  | "wordPreviousEndBig"
  | "lineStart"
  | "lineEnd"
  | "firstNonBlank"
  | "bufferStart"
  | "bufferEnd"
  | "matchingPair"
  | "halfPageDown"
  | "halfPageUp"
  | "paragraphBackward"
  | "paragraphForward";

export type VimCommandAction =
  | "insertBefore"
  | "insertAfter"
  | "insertLineStart"
  | "insertLineEnd"
  | "openLineBelow"
  | "openLineAbove"
  | "visualChar"
  | "visualLine"
  | "visualBlock"
  | "deleteChar"
  | "deleteCharBefore"
  | "deleteToLineEnd"
  | "changeToLineEnd"
  | "yankLine"
  | "joinLine"
  | "pasteAfter"
  | "pasteBefore"
  | "incrementNumber"
  | "decrementNumber"
  | "toggleCase"
  | "replaceChar"
  | "substituteChar"
  | "substituteLine"
  | "findCharForward"
  | "findCharBackward"
  | "tillCharForward"
  | "tillCharBackward"
  | "repeatCharSearch"
  | "repeatCharSearchReverse"
  | "startSearch"
  | "startSearchBackward"
  | "repeatSearch"
  | "repeatSearchReverse"
  | "searchWordForward"
  | "searchWordBackward"
  | "startExCommand"
  | "repeatChange"
  | "undo"
  | "redo"
  | "showKeybindings"
  | "reselectVisual";

export type VimTextObjectKind = "inner" | "around";

export type PromptStructureTarget =
  | "codeFence"
  | "headingSection"
  | "listItem"
  | "tag"
  | "errorBlock";

export type VimTextObjectTarget =
  | "word"
  | "singleQuote"
  | "doubleQuote"
  | "paren"
  | "bracket"
  | "brace"
  | "paragraph"
  | PromptStructureTarget;

export type VimTextObject = {
  kind: VimTextObjectKind;
  target: VimTextObjectTarget;
};

export type VimStatusItem = "mode" | "pendingOperator" | "selection" | "cursorPosition";

export type VimMacroKeymapOptions = {
  record?: readonly string[];
  play?: readonly string[];
};

export type VimMarkKeymapOptions = {
  set?: readonly string[];
  jumpExact?: readonly string[];
  jumpLine?: readonly string[];
};

export type VimTextObjectKeymapOptions = {
  kinds?: Partial<Record<VimTextObjectKind, readonly string[]>>;
  targets?: Partial<Record<VimTextObjectTarget, readonly string[]>>;
};

export type VimActionBindingMode = Extract<
  VimMode,
  "normal" | "visual" | "visualLine" | "visualBlock"
>;

export type VimActionKeyBindingEntry =
  | string
  | {
      key: string;
      args?: Readonly<Record<string, unknown>>;
      modes?: readonly VimActionBindingMode[];
    };

export type VimActionKeymapOptions = Partial<
  Record<BindablePromptTransformActionId, readonly VimActionKeyBindingEntry[]>
>;

export type VimKeySequenceRemap = {
  key: string;
  inputs: readonly string[];
  modes?: readonly VimActionBindingMode[];
};

export type VimKeySequenceRemapOptions = {
  accepted: readonly VimKeySequenceRemap[];
};

export type VimInsertKeymapOptions = {
  openLineBelow?: readonly string[];
  openLineAbove?: readonly string[];
  deleteWordBackward?: readonly string[];
  deleteWordForward?: readonly string[];
  deleteLineBackward?: readonly string[];
  deleteLineForward?: readonly string[];
  moveWordBackward?: readonly string[];
  moveWordForward?: readonly string[];
  moveLineStart?: readonly string[];
  moveLineEnd?: readonly string[];
};

export type VimInsertAction = keyof VimInsertKeymapOptions;

export type VimActionKeybindingPreset = "paragraph-editing" | "markdown-wrapping";

export type VimKeymapOptions = {
  escape?: readonly string[];
  operators?: Partial<Record<VimOperatorAction, readonly string[]>>;
  motions?: Partial<Record<VimMotionAction, readonly string[]>>;
  commands?: Partial<Record<VimCommandAction, readonly string[]>>;
  macros?: VimMacroKeymapOptions;
  marks?: VimMarkKeymapOptions;
  textObjects?: VimTextObjectKeymapOptions;
  operatorMotions?: Partial<Record<VimMotionOperatorAction, readonly VimMotionAction[]>>;
  insert?: VimInsertKeymapOptions;
  actionPresets?: readonly VimActionKeybindingPreset[];
  actions?: VimActionKeymapOptions;
  remaps?: VimKeySequenceRemapOptions;
  allowProtectedOverrides?: readonly string[];
};

export type ResolvedVimMacroKeymap = Required<VimMacroKeymapOptions>;
export type ResolvedVimMarkKeymap = Required<VimMarkKeymapOptions>;
export type ResolvedVimTextObjectKeymap = {
  kinds: Record<VimTextObjectKind, readonly string[]>;
  targets: Record<VimTextObjectTarget, readonly string[]>;
};

export type ResolvedVimActionBinding = {
  key: string;
  actionId: BindablePromptTransformActionId;
  args: PromptTransform;
  modes?: readonly VimActionBindingMode[];
};

export type ResolvedVimActionKeymap = {
  accepted: readonly ResolvedVimActionBinding[];
};

export type ResolvedVimInsertKeymap = {
  openLineBelow: readonly string[];
  openLineAbove: readonly string[];
  deleteWordBackward: readonly string[];
  deleteWordForward: readonly string[];
  deleteLineBackward: readonly string[];
  deleteLineForward: readonly string[];
  moveWordBackward: readonly string[];
  moveWordForward: readonly string[];
  moveLineStart: readonly string[];
  moveLineEnd: readonly string[];
};

export type ResolvedVimKeymap = {
  escape: readonly string[];
  operators: Record<VimOperatorAction, readonly string[]>;
  motions: Record<VimMotionAction, readonly string[]>;
  commands: Record<VimCommandAction, readonly string[]>;
  macros: ResolvedVimMacroKeymap;
  marks: ResolvedVimMarkKeymap;
  textObjects: ResolvedVimTextObjectKeymap;
  operatorMotions: Record<VimMotionOperatorAction, readonly VimMotionAction[]>;
  insert: ResolvedVimInsertKeymap;
  actions: ResolvedVimActionKeymap;
  remaps: VimKeySequenceRemapOptions;
};

export type VimSearchOptions = {
  highlight: boolean;
  highlightCurrent: boolean;
  clearOnCancel: boolean;
  clearOnInsert: boolean;
  maxHighlights: number;
};

export type ResolvedVimSearch = VimSearchOptions;

export type VimUiOptions = {
  status: {
    enabled: boolean;
    items: readonly VimStatusItem[];
  };
  mode: {
    enabled: boolean;
    labels: Record<VimMode, string>;
    narrowLabels: Record<VimMode, string>;
  };
  selection: {
    enabled: boolean;
    previewMaxChars: number;
  };
  cursorPosition: {
    enabled: boolean;
    base: 0 | 1;
    format: string;
  };
  workbench: {
    reservedRows: number;
  };
};

export type ResolvedVimUi = VimUiOptions;

export type VimMacroOptions = {
  enabled: boolean;
  slots: readonly string[];
  maxReplaySteps: number;
};

export type ResolvedVimMacros = VimMacroOptions;

export type VimExCommandOptions = {
  autocomplete: boolean;
};

export type ResolvedVimExCommand = VimExCommandOptions;

export type VimMarkOptions = {
  enabled: boolean;
  slots: readonly string[];
};

export type ResolvedVimMarks = VimMarkOptions;

export type VimPromptStructureOptions = {
  enabled: boolean;
  targets: Record<PromptStructureTarget, boolean>;
};

export type ResolvedVimPromptStructures = VimPromptStructureOptions;

export type VimPromptTransformOptions = {
  enabled: boolean;
  actions: Record<PromptTransformAction, boolean>;
  commands: Record<PromptTransformAction, readonly string[]>;
};

export type ResolvedVimPromptTransforms = VimPromptTransformOptions;

export type VimPromptStructureEditorOptions = {
  enabled?: boolean;
  targets?: Partial<Record<PromptStructureTarget, boolean>>;
};

export type VimPromptTransformEditorOptions = {
  enabled?: boolean;
  actions?: Partial<Record<PromptTransformAction, boolean>>;
  commands?: Partial<Record<PromptTransformAction, readonly string[]>>;
};

export type VimEditorOptions = {
  preset?: VimPreset;
  startMode?: StartupMode;
  cursor?: Partial<CursorStyles>;
  keymap?: VimKeymapOptions;
  ui?: Partial<ResolvedVimUi>;
  macros?: Partial<ResolvedVimMacros>;
  marks?: Partial<ResolvedVimMarks>;
  search?: Partial<ResolvedVimSearch>;
  feedback?: Partial<VimFeedbackOptions>;
  promptStructures?: VimPromptStructureEditorOptions;
  promptTransforms?: VimPromptTransformEditorOptions;
};

export type ResolvedVimEditorOptions = {
  preset?: VimPreset;
  startMode: StartupMode;
  cursor: CursorStyles;
  keymap?: ResolvedVimKeymap;
  ui?: ResolvedVimUi;
  macros?: ResolvedVimMacros;
  marks?: ResolvedVimMarks;
  search?: ResolvedVimSearch;
  exCommand?: ResolvedVimExCommand;
  feedback?: VimFeedbackOptions;
  promptStructures?: ResolvedVimPromptStructures;
  promptTransforms?: ResolvedVimPromptTransforms;
};

export type Position = {
  line: number;
  col: number;
};

export type TextRange = {
  start: Position;
  end: Position;
};

export type LineRange = {
  startLine: number;
  endLine: number;
};

export type RegisterType = "char" | "line";

export type VimRegister = {
  type: RegisterType;
  text: string;
};

export type EditResult = {
  text: string;
  cursor: Position;
  register?: VimRegister;
  changed: boolean;
};

export type PromptTransformAction =
  | "quote"
  | "unquote"
  | "bulletize"
  | "fence"
  | "indent"
  | "dedent"
  | "reflow";

export type PromptTransform = {
  action: PromptTransformAction;
  language?: string;
  width?: number;
};

export type VimOperator = "d" | "c" | "y";

export type VimMotion =
  | "h"
  | "j"
  | "k"
  | "l"
  | "w"
  | "b"
  | "e"
  | "W"
  | "B"
  | "E"
  | "ge"
  | "gE"
  | "0"
  | "^"
  | "$"
  | "gg"
  | "G"
  | "%"
  | "{"
  | "}";

export type PendingOperator = string;

export type NormalCommand = "dd" | "cc" | "yy" | "gg";

export type CommandResult =
  | { type: "pending"; operator: PendingOperator }
  | { type: "command"; command: NormalCommand }
  | { type: "operatorMotion"; operator: VimOperator; motion: VimMotion }
  | { type: "invalid" }
  | { type: "none" };
