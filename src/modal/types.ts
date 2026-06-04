import type {
  CursorStyle,
  EditResult,
  LineRange,
  PendingOperator,
  Position,
  StartupMode,
  ResolvedVimEditorOptions,
  VimMode,
  VimCommandAction,
  VimMotionAction,
  VimMotionOperatorAction,
  VimOperatorAction,
  VimRegister,
  VimTextObject,
} from "../types.ts";

export type ModalOptions = ResolvedVimEditorOptions;

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

export type SearchDirection = "forward" | "backward";

export type PendingSearchTarget = {
  query: string;
  direction: SearchDirection;
  operator?: VimOperatorAction;
};

export type SearchState = {
  query: string;
  direction: SearchDirection;
};

export type SearchHighlightState = {
  query: string;
  current: Position;
};

export type PendingExCommand = {
  command: string;
  sourceMode: Extract<VimMode, "normal" | "visual" | "visualLine" | "visualBlock">;
  visualAnchor?: Position;
  visualCursor?: Position;
  visualRange?: LineRange;
};

export type ExMessage = {
  kind: "error" | "success";
  text: string;
};

export type RepeatableChange =
  | { type: "command"; command: VimCommandAction; count?: number; char?: string }
  | { type: "lineCommand"; operator: VimOperatorAction; count?: number }
  | {
      type: "operatorMotion";
      operator: VimMotionOperatorAction;
      motion: VimMotionAction;
      count?: number;
    }
  | {
      type: "operatorTextObject";
      operator: VimMotionOperatorAction;
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
  pendingSearch?: PendingSearchTarget;
  pendingEx?: PendingExCommand;
  exMessage?: ExMessage;
  lastCharSearch?: CharSearchState;
  lastSearch?: SearchState;
  searchHighlight?: SearchHighlightState;
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
