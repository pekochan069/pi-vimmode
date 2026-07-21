import type { ReadOnlyPopup } from "../read-only-popup.ts";
import type {
  CursorStyle,
  EditResult,
  LineRange,
  PendingOperator,
  Position,
  TextRange,
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
import type { PendingWorkbench } from "./workbench.ts";

export type ModalOptions = ResolvedVimEditorOptions;

export type EditorSnapshot = {
  text: string;
  lines: string[];
  cursor: Position;
  isAutocompleteOpen?: boolean;
  isMacroReplaying?: boolean;
  isRedoAvailable?: boolean;
  terminalRows?: number;
};

export type MacroSlot = string;
export type MacroStore = Partial<Record<MacroSlot, readonly string[]>>;
export type PendingMacroTarget = "record" | "play";

export type RegisterSlot = string;
export type ClipboardRegisterSlot = "+" | "*";
export type RegisterStore = Partial<Record<RegisterSlot, VimRegister>>;
export type ClipboardRegisterStore = Partial<Record<ClipboardRegisterSlot, VimRegister>>;
export type ActiveRegisterTarget =
  | { kind: "named"; slot: RegisterSlot; append: boolean }
  | { kind: "unnamed" }
  | { kind: "blackHole" }
  | { kind: "clipboard"; slot: ClipboardRegisterSlot };
export type PendingRegisterTarget = ActiveRegisterTarget | "awaitingSlot";

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
export type SearchMatcherMode = "literal" | "regex";

export type PendingSearchTarget = {
  query: string;
  direction: SearchDirection;
  operator?: VimOperatorAction;
  historyIndex?: number;
  historyDraft?: string;
};

export type SearchState = {
  query: string;
  direction: SearchDirection;
  matcherMode?: SearchMatcherMode;
};

export type SearchHistoryEntry = {
  query: string;
  matcherMode: SearchMatcherMode;
};

export type SearchHighlightState = {
  query: string;
  current: Position;
  matcherMode?: SearchMatcherMode;
};

export type LastExSubstitution = {
  command: string;
  pattern: string;
  replacement: string;
  global: boolean;
  ignoreCase: boolean;
  matcherMode: "literal" | "regex";
};

export type ExSubstitutionPreview = {
  command: string;
  matches: number;
  ranges: TextRange[];
  edit: EditResult;
  message: string;
  repeatSource?: LastExSubstitution;
};

export type PendingExCommand = {
  command: string;
  cursor?: number;
  sourceMode: Extract<VimMode, "normal" | "visual" | "visualLine" | "visualBlock">;
  visualAnchor?: Position;
  visualCursor?: Position;
  visualRange?: LineRange;
  preview?: ExSubstitutionPreview;
  historyIndex?: number;
  historyDraft?: string;
  selectedSuggestion?: number;
};

export type ExMessage = {
  kind: "error" | "success" | "info";
  text: string;
};

export type RepeatableChange =
  | { type: "command"; command: VimCommandAction; count?: number; char?: string }
  | { type: "lineCommand"; operator: VimOperatorAction; count?: number }
  | {
      type: "operatorCharSearch";
      operator: VimMotionOperatorAction;
      command: Extract<
        VimCommandAction,
        "findCharForward" | "findCharBackward" | "tillCharForward" | "tillCharBackward"
      >;
      char: string;
      count?: number;
    }
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
  clipboardRegisters?: ClipboardRegisterStore;
  pendingRegister?: PendingRegisterTarget;
  marks?: MarkStore;
  pendingMark?: PendingMarkTarget;
  pendingWorkbench?: PendingWorkbench;
  pendingSearch?: PendingSearchTarget;
  pendingEx?: PendingExCommand;
  pendingInsertEscape?: string;
  pendingInsertEscapeInputs?: readonly string[];
  exHistory?: string[];
  lastExSubstitution?: LastExSubstitution;
  exMessage?: ExMessage;
  helpPopup?: ReadOnlyPopup;
  messageHistory?: ExMessage[];
  lastCharSearch?: CharSearchState;
  lastSearch?: SearchState;
  searchHistory?: SearchHistoryEntry[];
  searchHighlight?: SearchHighlightState;
  lastRepeatableChange?: RepeatableChange;
  lastVisualSelection?: {
    mode: "visual" | "visualLine" | "visualBlock";
    anchor: Position;
    cursor: Position;
    text: string;
  };
  pendingEasymotion?:
    | { kind: "char" }
    | {
        kind: "highlight";
        targets: { label: string; line: number; character: number }[];
      }
    | { kind: "jump"; targets: { label: string; line: number; character: number }[]; char: string };
};

export type FastInsertDelegateContext = {
  isAutocompleteOpen?: boolean;
  isMacroReplaying?: boolean;
  escape?: readonly string[];
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
  | "undo"
  | "redo";

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
  | { type: "openReadOnlyPopup"; popup: ReadOnlyPopup }
  | { type: "copyClipboard"; register: ClipboardRegisterSlot; text: string }
  | {
      type: "readClipboard";
      register: ClipboardRegisterSlot;
      placement: "after" | "before";
      fallback?: VimRegister;
    }
  | { type: "invalidate" }
  | { type: "terminalCursor"; style: CursorStyle }
  | { type: "shutdown" };

export type ModalUpdate = {
  state: ModalState;
  effects: ModalEffect[];
};

export type ModeTransitionTarget = VimMode | StartupMode;
