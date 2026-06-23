import type { CaseTransformAction } from "../buffer.ts";
import type { VimMode, VimOperatorAction } from "../types.ts";
import type { EditorSnapshot, ModalOptions, ModalState, ModalUpdate } from "./types.ts";

import {
  deleteBlockRange,
  deleteLineRange,
  deleteRange,
  insertBlockText,
  replaceLineRangeWithRegister,
  replaceVisualRangeChars,
  shiftLineRange,
  transformCaseVisualRange,
  yankVisualSelection,
} from "../buffer.ts";
import {
  delegate,
  editState,
  editStateAndEffects,
  invalidate,
  isDelegatedResetKey,
  isProtectedPiDelegateKey,
  keyMatches,
  keySequence,
  modeUpdate,
  resetAndDelegate,
  shiftActionForOperator,
  withEffects,
} from "./core.ts";
import { applyRegisterWrite, registerToRead } from "./registers.ts";

export type VisualKind = "char" | "line" | "block";

export function visualKindForMode(mode: VimMode): VisualKind {
  if (mode === "visualLine") return "line";
  if (mode === "visualBlock") return "block";
  return "char";
}

function isVisualMode(mode: VimMode): mode is "visual" | "visualLine" | "visualBlock" {
  return mode === "visual" || mode === "visualLine" || mode === "visualBlock";
}

function visualLineRange(anchor: EditorSnapshot["cursor"], cursor: EditorSnapshot["cursor"]) {
  return {
    startLine: Math.min(anchor.line, cursor.line),
    endLine: Math.max(anchor.line, cursor.line),
  };
}

function shiftVisualSelection(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  action: "indent" | "dedent",
  depth = 1,
): ModalUpdate {
  if (!state.visualAnchor) return modeUpdate(state, "normal", options);
  const shiftResult = shiftLineRange(
    snapshot.text,
    visualLineRange(state.visualAnchor, snapshot.cursor),
    action,
    snapshot.cursor,
    depth,
  );
  if (!shiftResult.ok) return modeUpdate(state, "normal", options);
  const result = shiftResult.edit;
  return captureBeforeVisualExit(
    state,
    snapshot,
    modeUpdate(editState(state, result), "normal", options, [{ type: "edit", result }]),
  );
}

export function applyVisualOperator(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  kind: VisualKind,
  operator: VimOperatorAction,
  count = 1,
): ModalUpdate {
  const shiftAction = shiftActionForOperator(operator);
  if (shiftAction) return shiftVisualSelection(state, snapshot, options, shiftAction, count);
  if (operator === "yank") {
    if (!state.visualAnchor) return modeUpdate(state, "normal", options);
    return yankVisualUpdate(state, snapshot, options, kind);
  }
  if (operator === "change") return deleteVisualSelection(state, snapshot, options, "insert", kind);
  return deleteVisualSelection(state, snapshot, options, "normal", kind);
}

export function yankVisualUpdate(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  kind: VisualKind,
): ModalUpdate {
  if (!state.visualAnchor) return modeUpdate(state, "normal", options);
  const register = yankVisualSelection(snapshot.text, state.visualAnchor, snapshot.cursor, kind);
  const written = applyRegisterWrite(state, register);
  return captureBeforeVisualExit(
    state,
    snapshot,
    modeUpdate(written.state, "normal", options, written.effects),
  );
}

export function deleteVisualSelection(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  nextMode: VimMode,
  kind: VisualKind,
): ModalUpdate {
  if (!state.visualAnchor) return modeUpdate(state, nextMode, options);
  const result =
    kind === "line"
      ? deleteLineRange(snapshot.text, state.visualAnchor, snapshot.cursor)
      : kind === "block"
        ? deleteBlockRange(snapshot.text, state.visualAnchor, snapshot.cursor)
        : deleteRange(snapshot.text, state.visualAnchor, snapshot.cursor);
  const written = editStateAndEffects(state, result);
  return captureBeforeVisualExit(
    state,
    snapshot,
    modeUpdate(written.state, nextMode, options, [{ type: "edit", result }, ...written.effects]),
  );
}

export function transformVisualSelection(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  kind: VisualKind,
  action: CaseTransformAction,
): ModalUpdate {
  if (!state.visualAnchor) return modeUpdate(state, "normal", options);
  const result = transformCaseVisualRange(
    snapshot.text,
    state.visualAnchor,
    snapshot.cursor,
    kind,
    action,
  );
  return captureBeforeVisualExit(
    state,
    snapshot,
    modeUpdate(editState(state, result), "normal", options, [{ type: "edit", result }]),
  );
}

export function toggleVisualSelection(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  kind: VisualKind,
): ModalUpdate {
  return transformVisualSelection(state, snapshot, options, kind, "toggleCase");
}

export function replaceVisualSelection(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  kind: VisualKind,
  char: string,
): ModalUpdate {
  if (!state.visualAnchor) return modeUpdate(state, "normal", options);
  const result = replaceVisualRangeChars(
    snapshot.text,
    state.visualAnchor,
    snapshot.cursor,
    kind,
    char,
  );
  return captureBeforeVisualExit(
    state,
    snapshot,
    modeUpdate(editState(state, result), "normal", options, [{ type: "edit", result }]),
  );
}

export function pasteVisualLineSelection(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
): ModalUpdate {
  if (!state.visualAnchor) return modeUpdate(state, "normal", options);
  const result = replaceLineRangeWithRegister(
    snapshot.text,
    state.visualAnchor,
    snapshot.cursor,
    registerToRead(state),
  );
  return captureBeforeVisualExit(
    state,
    snapshot,
    modeUpdate(editState(state, result), "normal", options, [{ type: "edit", result }]),
  );
}

export function startBlockInsert(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  placement: "start" | "end",
): ModalUpdate {
  if (!state.visualAnchor) return modeUpdate(state, "normal", options);
  const previewLine = Math.min(state.visualAnchor.line, snapshot.cursor.line);
  const startCol = Math.min(state.visualAnchor.col, snapshot.cursor.col);
  const endCol = Math.max(state.visualAnchor.col, snapshot.cursor.col);
  const previewCol = placement === "start" ? startCol : endCol + 1;
  const captured = captureVisualSelection(state, snapshot);
  return withEffects(
    {
      ...captured,
      mode: "insert",
      pending: undefined,
      pendingMacro: undefined,
      pendingRegister: undefined,
      pendingMark: undefined,
      visualAnchor: undefined,
      blockInsert: {
        anchor: state.visualAnchor,
        active: snapshot.cursor,
        placement,
        previewLine,
        text: "",
      },
    },
    [
      { type: "restoreCursor", position: { line: previewLine, col: previewCol } },
      { type: "terminalCursor", style: options.cursor.insert },
      { type: "invalidate" },
    ],
  );
}

export function handleBlockInsertInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
): ModalUpdate {
  if (!state.blockInsert) return modeUpdate(state, "normal", options);
  if (keyMatches(data, "escape")) {
    const result = insertBlockText(
      snapshot.text,
      state.blockInsert.anchor,
      state.blockInsert.active,
      state.blockInsert.text,
      state.blockInsert.placement,
      state.blockInsert.previewLine,
    );
    const nextState = { ...state, blockInsert: undefined, visualAnchor: undefined };
    return modeUpdate(editState(nextState, result), "normal", options, [{ type: "edit", result }]);
  }

  if (isDelegatedResetKey(data)) return resetAndDelegate(state, options, data);
  if (isProtectedPiDelegateKey(data)) return delegate(state, data);

  if (keyMatches(data, "backspace")) {
    if (state.blockInsert.text.length === 0) return invalidate(state);
    return withEffects(
      {
        ...state,
        blockInsert: { ...state.blockInsert, text: state.blockInsert.text.slice(0, -1) },
      },
      [{ type: "delegate", input: data }, { type: "invalidate" }],
    );
  }

  const key = keySequence(data);
  if (!key || key.length !== 1) return invalidate(state);
  return withEffects(
    {
      ...state,
      blockInsert: { ...state.blockInsert, text: state.blockInsert.text + key },
    },
    [{ type: "delegate", input: data }, { type: "invalidate" }],
  );
}

function captureVisualSelection(state: ModalState, snapshot: EditorSnapshot): ModalState {
  if (!isVisualMode(state.mode) || !state.visualAnchor) return state;
  return {
    ...state,
    lastVisualSelection: {
      mode: state.mode,
      anchor: state.visualAnchor,
      cursor: snapshot.cursor,
      text: snapshot.text,
    },
  };
}

function isValidVisualSelection(
  last: NonNullable<ModalState["lastVisualSelection"]>,
  snapshot: EditorSnapshot,
): boolean {
  if (last.text !== snapshot.text) return false;
  const { anchor, cursor } = last;
  const lineCount = snapshot.lines.length;
  if (anchor.line < 0 || anchor.line >= lineCount) return false;
  if (cursor.line < 0 || cursor.line >= lineCount) return false;
  const anchorLine = snapshot.lines[anchor.line] ?? "";
  const cursorLine = snapshot.lines[cursor.line] ?? "";
  if (anchor.col < 0 || anchor.col > anchorLine.length) return false;
  if (cursor.col < 0 || cursor.col > cursorLine.length) return false;
  return true;
}

export function reselectVisualUpdate(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
): ModalUpdate {
  const last = state.lastVisualSelection;
  if (!last || !isValidVisualSelection(last, snapshot)) {
    return invalidate(state);
  }
  return {
    state: {
      ...state,
      mode: last.mode,
      visualAnchor: last.anchor,
      pending: undefined,
      pendingMacro: undefined,
      pendingRegister: undefined,
      pendingMark: undefined,
    },
    effects: [
      { type: "restoreCursor", position: last.cursor },
      { type: "terminalCursor", style: options.cursor[last.mode] },
      { type: "invalidate" },
    ],
  };
}

export function captureBeforeVisualExit(
  state: ModalState,
  snapshot: EditorSnapshot,
  update: ModalUpdate,
): ModalUpdate {
  if (!isVisualMode(state.mode)) return update;
  const captured = captureVisualSelection(state, snapshot);
  return {
    ...update,
    state: { ...update.state, lastVisualSelection: captured.lastVisualSelection },
  };
}
