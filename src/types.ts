export type VimMode = "insert" | "normal" | "visual" | "visualLine";

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
  | "deleteChar"
  | "deleteToLineEnd"
  | "changeToLineEnd"
  | "yankLine"
  | "joinLine"
  | "pasteAfter"
  | "pasteBefore"
  | "undo";

export type VimStatusItem = "mode" | "pendingOperator" | "selection" | "cursorPosition";

export type VimKeymapOptions = {
  operators: Record<VimOperatorAction, readonly string[]>;
  motions: Record<VimMotionAction, readonly string[]>;
  commands: Record<VimCommandAction, readonly string[]>;
  operatorMotions: Record<VimOperatorAction, readonly VimMotionAction[]>;
};

export type ResolvedVimKeymap = VimKeymapOptions;

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

export type VimEditorOptions = {
  startMode: StartupMode;
  cursor: CursorStyles;
  keymap?: ResolvedVimKeymap;
  ui?: ResolvedVimUi;
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

export type VimMotion = "w" | "b" | "0" | "^" | "$";

export type PendingOperator = string;

export type NormalCommand = "dd" | "cc" | "yy" | "gg";

export type CommandResult =
  | { type: "pending"; operator: PendingOperator }
  | { type: "command"; command: NormalCommand }
  | { type: "operatorMotion"; operator: VimOperator; motion: VimMotion }
  | { type: "invalid" }
  | { type: "none" };
