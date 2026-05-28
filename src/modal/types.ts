import type {
  CursorStyle,
  EditResult,
  PendingOperator,
  Position,
  StartupMode,
  VimEditorOptions,
  VimMode,
  VimCommandAction,
  VimMotionAction,
  VimOperatorAction,
  VimRegister,
  VimTextObject,
} from "../types.ts";

export type ModalOptions = VimEditorOptions;

export type EditorSnapshot = {
  text: string;
  lines: string[];
  cursor: Position;
  isAutocompleteOpen?: boolean;
  isMacroReplaying?: boolean;
};

export type MacroSlot = string;
export type MacroStore = Partial<Record<MacroSlot, readonly string[]>>;
export type PendingMacroTarget = "record" | "play";

export type RegisterSlot = string;
export type RegisterStore = Partial<Record<RegisterSlot, VimRegister>>;
export type PendingRegisterTarget = { slot: RegisterSlot; append: boolean } | "awaitingSlot";

export type MarkSlot = string;
export type MarkStore = Partial<Record<MarkSlot, Position>>;
export type PendingMarkTarget = {
  kind: "set" | "jumpExact" | "jumpLine";
  operator?: VimOperatorAction;
  operatorKey?: string;
};

export type BlockInsertState = {
  anchor: Position;
  active: Position;
  placement: "start" | "end";
  previewLine: number;
  text: string;
};

export type CharSearchState = {
  command: "findCharForward" | "findCharBackward" | "tillCharForward" | "tillCharBackward";
  target: string;
};

export type RepeatableChange =
  | { type: "command"; command: VimCommandAction; count?: number; char?: string }
  | { type: "operatorMotion"; operator: VimOperatorAction; motion: VimMotionAction; count?: number }
  | {
      type: "operatorTextObject";
      operator: VimOperatorAction;
      textObject: VimTextObject;
      count?: number;
    };

export type ModalState = {
  mode: VimMode;
  visualAnchor?: Position;
  register?: VimRegister;
  pending?: PendingOperator;
  blockInsert?: BlockInsertState;
  macros?: MacroStore;
  recordingSlot?: MacroSlot;
  lastPlayedMacro?: MacroSlot;
  pendingMacro?: PendingMacroTarget;
  namedRegisters?: RegisterStore;
  pendingRegister?: PendingRegisterTarget;
  marks?: MarkStore;
  pendingMark?: PendingMarkTarget;
  lastCharSearch?: CharSearchState;
  lastRepeatableChange?: RepeatableChange;
};

export type AdapterCommand =
  | "left"
  | "right"
  | "up"
  | "down"
  | "lineStart"
  | "lineEnd"
  | "wordLeft"
  | "wordRight"
  | "undo";

/**
 * Modal effects are adapter-applied intents. Modal code owns Vim semantics;
 * `VimEditor` owns Pi calls such as `super.handleInput`, `setText`, render
 * invalidation, cursor restoration, and terminal writes.
 */
export type ModalEffect =
  | { type: "delegate"; input: string }
  | { type: "adapterCommand"; command: AdapterCommand }
  | { type: "edit"; result: EditResult }
  | { type: "restoreCursor"; position: Position }
  | { type: "playMacro"; slot: MacroSlot; inputs: readonly string[] }
  | { type: "invalidate" }
  | { type: "terminalCursor"; style: CursorStyle };

export type ModalUpdate = {
  state: ModalState;
  effects: ModalEffect[];
};

export type ModeTransitionTarget = VimMode | StartupMode;
