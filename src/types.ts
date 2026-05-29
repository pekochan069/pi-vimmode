export type VimMode = "insert" | "normal" | "visual" | "visualLine" | "visualBlock";

export type StartupMode = Extract<VimMode, "insert" | "normal">;

export type CursorStyle = "block" | "bar" | "underline";

export type CursorStyles = Record<VimMode, CursorStyle>;

export type VimOperatorAction = "delete" | "change" | "yank";

export type VimMotionAction =
  | "left"
  | "down"
  | "up"
  | "right"
  | "wordForward"
  | "wordBackward"
  | "wordEnd"
  | "lineStart"
  | "lineEnd"
  | "firstNonBlank"
  | "bufferStart"
  | "bufferEnd"
  | "matchingPair";

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
  | "repeatSearch"
  | "repeatSearchReverse"
  | "startExCommand"
  | "repeatChange"
  | "undo";

export type VimTextObjectKind = "inner" | "around";

export type VimTextObjectTarget =
  | "word"
  | "singleQuote"
  | "doubleQuote"
  | "paren"
  | "bracket"
  | "brace";

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

export type VimKeymapOptions = {
  operators?: Partial<Record<VimOperatorAction, readonly string[]>>;
  motions?: Partial<Record<VimMotionAction, readonly string[]>>;
  commands?: Partial<Record<VimCommandAction, readonly string[]>>;
  macros?: VimMacroKeymapOptions;
  marks?: VimMarkKeymapOptions;
  operatorMotions?: Partial<Record<VimOperatorAction, readonly VimMotionAction[]>>;
};

export type ResolvedVimMacroKeymap = Required<VimMacroKeymapOptions>;
export type ResolvedVimMarkKeymap = Required<VimMarkKeymapOptions>;

export type ResolvedVimKeymap = {
  operators: Record<VimOperatorAction, readonly string[]>;
  motions: Record<VimMotionAction, readonly string[]>;
  commands: Record<VimCommandAction, readonly string[]>;
  macros: ResolvedVimMacroKeymap;
  marks: ResolvedVimMarkKeymap;
  operatorMotions: Record<VimOperatorAction, readonly VimMotionAction[]>;
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
};

export type ResolvedVimUi = VimUiOptions;

export type VimMacroOptions = {
  enabled: boolean;
  slots: readonly string[];
  maxReplaySteps: number;
};

export type ResolvedVimMacros = VimMacroOptions;

export type VimMarkOptions = {
  enabled: boolean;
  slots: readonly string[];
};

export type ResolvedVimMarks = VimMarkOptions;

export type VimEditorOptions = {
  startMode?: StartupMode;
  cursor?: Partial<CursorStyles>;
  keymap?: VimKeymapOptions;
  ui?: Partial<ResolvedVimUi>;
  macros?: Partial<ResolvedVimMacros>;
  marks?: Partial<ResolvedVimMarks>;
  search?: Partial<ResolvedVimSearch>;
};

export type ResolvedVimEditorOptions = {
  startMode: StartupMode;
  cursor: CursorStyles;
  keymap?: ResolvedVimKeymap;
  ui?: ResolvedVimUi;
  macros?: ResolvedVimMacros;
  marks?: ResolvedVimMarks;
  search?: ResolvedVimSearch;
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

export type VimOperator = "d" | "c" | "y";

export type VimMotion = "w" | "b" | "e" | "0" | "^" | "$";

export type PendingOperator = string;

export type NormalCommand = "dd" | "cc" | "yy" | "gg";

export type CommandResult =
  | { type: "pending"; operator: PendingOperator }
  | { type: "command"; command: NormalCommand }
  | { type: "operatorMotion"; operator: VimOperator; motion: VimMotion }
  | { type: "invalid" }
  | { type: "none" };
