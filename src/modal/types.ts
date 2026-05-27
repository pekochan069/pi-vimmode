import type {
  CursorStyle,
  EditResult,
  PendingOperator,
  Position,
  StartupMode,
  VimEditorOptions,
  VimMode,
  VimRegister,
} from "../types.ts";

export type ModalOptions = VimEditorOptions;

export type EditorSnapshot = {
  text: string;
  lines: string[];
  cursor: Position;
  isAutocompleteOpen?: boolean;
};

export type ModalState = {
  mode: VimMode;
  visualAnchor?: Position;
  register?: VimRegister;
  pending?: PendingOperator;
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
  | { type: "invalidate" }
  | { type: "terminalCursor"; style: CursorStyle };

export type ModalUpdate = {
  state: ModalState;
  effects: ModalEffect[];
};

export type ModeTransitionTarget = VimMode | StartupMode;
