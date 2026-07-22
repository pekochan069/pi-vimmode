declare const vimActionDescriptor: unique symbol;

export type VimConfig = (vim: VimConfigApi) => void | Promise<void>;

export type VimPreset = "minimal" | "prompt-safe" | "vim-heavy";
export type VimMode = "insert" | "normal" | "visual" | "visualLine" | "visualBlock";
export type VimStartupMode = "insert" | "normal";
export type VimCursorStyle = "block" | "bar" | "underline";
export type VimStatusPosition = "left" | "right";
export type VimStatusItem = "mode" | "pendingOperator" | "selection" | "cursorPosition";
export type VimNoopFeedback = "off" | "status";
export type VimPromptStructureTarget =
  | "codeFence"
  | "headingSection"
  | "listItem"
  | "tag"
  | "errorBlock";
export type VimPromptTransformAction =
  | "quote"
  | "unquote"
  | "bulletize"
  | "fence"
  | "indent"
  | "dedent"
  | "reflow";
export type VimPromptTransformActionId = `prompt.transform.${VimPromptTransformAction}`;

export type VimOperatorAction =
  | "delete"
  | "change"
  | "yank"
  | "lowercase"
  | "uppercase"
  | "toggleCase"
  | "indent"
  | "dedent";
export type VimMotionOperatorAction =
  | "delete"
  | "change"
  | "yank"
  | "lowercase"
  | "uppercase"
  | "toggleCase";
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
  | "reselectVisual"
  | "easymotion";
export type VimMacroAction = "record" | "play";
export type VimMarkAction = "set" | "jumpExact" | "jumpLine";
export type VimInsertAction =
  | "openLineBelow"
  | "openLineAbove"
  | "deleteWordBackward"
  | "deleteWordForward"
  | "deleteLineBackward"
  | "deleteLineForward"
  | "moveWordBackward"
  | "moveWordForward"
  | "moveLineStart"
  | "moveLineEnd";
export type VimTextObjectKind = "inner" | "around";
export type VimTextObjectTarget =
  | "word"
  | "singleQuote"
  | "doubleQuote"
  | "paren"
  | "bracket"
  | "brace"
  | "paragraph"
  | VimPromptStructureTarget;

export type VimFiniteActionId =
  | "escape"
  | `operator.${VimOperatorAction}`
  | `motion.${VimMotionAction}`
  | `command.${VimCommandAction}`
  | `macro.${VimMacroAction}`
  | `mark.${VimMarkAction}`
  | `insert.${VimInsertAction}`
  | `textObject.kind.${VimTextObjectKind}`
  | `textObject.target.${VimTextObjectTarget}`
  | VimPromptTransformActionId;

export type VimActionDescriptor = {
  readonly [vimActionDescriptor]: true;
};

export type VimModeAlias =
  | "i"
  | "insert"
  | "n"
  | "normal"
  | "v"
  | "x"
  | "visual"
  | "visualLine"
  | "visualBlock"
  | "o"
  | "operatorPending"
  | "operator-pending";
export type VimMappingMode = VimModeAlias;
export type VimModeInput = VimModeAlias | readonly VimModeInput[];
export type VimActionBindingMode = "normal" | "visual" | "visualLine" | "visualBlock";

export type VimKeymapMappingOptions = {
  allowProtected?: boolean;
  desc?: string;
};
export type VimKeymapOptions = VimKeymapMappingOptions;
export type VimKeymapRightHandSide = VimActionDescriptor | string | null;

export type VimActionFactory = () => VimActionDescriptor;
export type VimOptionalArgsActionFactory<Args extends object> = (
  args?: Args,
) => VimActionDescriptor;

export type VimOperatorActionApi = Record<VimOperatorAction, VimActionFactory>;
export type VimMotionActionApi = Record<VimMotionAction, VimActionFactory>;
export type VimMacroActionApi = Record<VimMacroAction, VimActionFactory>;
export type VimMarkActionApi = Record<VimMarkAction, VimActionFactory>;
export type VimInsertActionApi = Record<VimInsertAction, VimActionFactory>;
export type VimTextObjectKindActionApi = Record<VimTextObjectKind, VimActionFactory>;
export type VimTextObjectTargetActionApi = Record<VimTextObjectTarget, VimActionFactory>;
export type VimEasyMotionActionFactory = VimActionFactory & {
  goToChar: VimActionFactory;
};
export type VimCommandActionApi = {
  [K in VimCommandAction]: K extends "easymotion" ? VimEasyMotionActionFactory : VimActionFactory;
};
export type VimPromptTransformActionApi = {
  [K in VimPromptTransformAction]: K extends "fence"
    ? VimOptionalArgsActionFactory<{ language?: string }>
    : K extends "reflow"
      ? VimOptionalArgsActionFactory<{ width?: number }>
      : VimActionFactory;
};

export type VimActionApi = {
  escape: VimActionFactory;
  operator: VimOperatorActionApi;
  motion: VimMotionActionApi;
  command: VimCommandActionApi;
  macro: VimMacroActionApi;
  mark: VimMarkActionApi;
  insert: VimInsertActionApi;
  textObject: {
    kind: VimTextObjectKindActionApi;
    target: VimTextObjectTargetActionApi;
  };
  prompt: {
    transform: VimPromptTransformActionApi;
  };
};

export type VimPromptApi = {
  quote: VimActionFactory;
  unquote: VimActionFactory;
  bulletize: VimActionFactory;
  fence: VimOptionalArgsActionFactory<{ language?: string }>;
  indent: VimActionFactory;
  dedent: VimActionFactory;
  reflow: VimOptionalArgsActionFactory<{ width?: number }>;
  openLineBelow: VimActionFactory;
  openLineAbove: VimActionFactory;
  deleteWordBackward: VimActionFactory;
  deleteWordForward: VimActionFactory;
  deleteLineBackward: VimActionFactory;
  deleteLineForward: VimActionFactory;
  moveWordBackward: VimActionFactory;
  moveWordForward: VimActionFactory;
  moveLineStart: VimActionFactory;
  moveLineEnd: VimActionFactory;
};

export type VimKeymapApi = {
  actionPresets: readonly ("paragraph-editing" | "markdown-wrapping")[];
  operatorMotions: Partial<Record<VimMotionOperatorAction, readonly VimMotionAction[]>>;
  set(
    mode: VimModeInput,
    lhs: string,
    rhs: VimKeymapRightHandSide,
    options?: VimKeymapMappingOptions,
  ): void;
};

export type VimConfigApi = {
  preset: VimPreset;
  leader: string | null;
  g: {
    mapleader: string | null;
  };
  startMode: VimStartupMode;
  cursor: Record<VimMode, VimCursorStyle>;
  ui: {
    status: {
      enabled: boolean;
      position: VimStatusPosition;
      items: readonly VimStatusItem[];
    };
    mode: {
      enabled: boolean;
      labels: Partial<Record<VimMode, string>>;
      narrowLabels: Partial<Record<VimMode, string>>;
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
  macros: {
    enabled: boolean;
    slots: readonly string[];
    maxReplaySteps: number;
  };
  marks: {
    enabled: boolean;
    slots: readonly string[];
  };
  search: {
    highlight: boolean;
    highlightCurrent: boolean;
    clearOnCancel: boolean;
    clearOnInsert: boolean;
    maxHighlights: number;
  };
  exCommand: {
    autocomplete: boolean;
  };
  feedback: {
    noop: VimNoopFeedback;
  };
  promptStructures: {
    enabled: boolean;
    targets: Partial<Record<VimPromptStructureTarget, boolean>>;
  };
  promptTransforms: {
    enabled: boolean;
    actions: Partial<Record<VimPromptTransformAction, boolean>>;
    commands: Partial<Record<VimPromptTransformAction, readonly string[]>>;
  };
  action: VimActionApi;
  prompt: VimPromptApi;
  keymap: VimKeymapApi;
};
