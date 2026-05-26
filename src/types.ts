export type VimMode = "insert" | "normal" | "visual" | "visualLine";

export type StartupMode = Extract<VimMode, "insert" | "normal">;

export type CursorStyle = "block" | "bar" | "underline";

export type CursorStyles = Record<VimMode, CursorStyle>;

export type VimEditorOptions = {
  startMode: StartupMode;
  cursor: CursorStyles;
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

export type PendingOperator = "d" | "y";

export type CommandResult =
  | { type: "pending"; operator: PendingOperator }
  | { type: "command"; command: "dd" | "yy" }
  | { type: "invalid" }
  | { type: "none" };
