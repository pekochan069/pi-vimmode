import type {
  VimCommandAction,
  VimMotion,
  VimMotionAction,
  VimMotionOperatorAction,
  VimOperatorAction,
  VimTextObject,
} from "../types.ts";
import type {
  AdapterCommand,
  EditorSnapshot,
  ModalEffect,
  ModalOptions,
  ModalState,
  ModalUpdate,
  RepeatableChange,
} from "./types.ts";

import {
  adjustNumberAtOrAfterCursor,
  changeLine,
  deleteByMotion,
  deleteCharAt,
  deleteLine,
  deleteTextObject,
  findCharOnLine,
  joinLineWithNext,
  navigateBuffer,
  openLineAbove,
  openLineBelow,
  pasteRegister,
  pasteRegisterBefore,
  replaceCharAt,
  shiftLinesFromCursor,
  substituteCharAt,
  toggleCaseAt,
  wordEndPosition,
  yankByMotion,
  yankLine,
  yankLineCount,
  yankTextObject,
} from "../buffer.ts";
import { semanticMotionToLegacy } from "../commands.ts";
import { promptStructuresForOptions } from "../config.ts";
import {
  clearCommandPending,
  clearPending,
  editState,
  editUpdate,
  invalidate,
  modeUpdate,
  shiftActionForOperator,
  withEffects,
  withNoopFeedback,
  yankUpdate,
} from "./core.ts";
import { startExCommandUpdate } from "./ex-command-line.ts";
import { clearRegisterTarget, registerToRead } from "./registers.ts";
import { repeatSearch, startSearchUpdate } from "./search.ts";

export function normalDispatchSummary(state: ModalState): string {
  const pending = state.pending ? ` pending=${state.pending}` : "";
  const register = state.pendingRegister ? " register-pending" : "";
  const mark = state.pendingMark ? " mark-pending" : "";
  return `normal${pending}${register}${mark}`;
}

export function isNormalDispatchState(state: ModalState): boolean {
  return state.mode === "normal" && !state.pendingEx && !state.pendingSearch;
}

function moveEffectFor(
  motion: VimMotionAction,
  snapshot: EditorSnapshot,
  count = 1,
): ModalEffect | undefined {
  const adapterCommands: Partial<Record<VimMotionAction, AdapterCommand>> = {
    left: "left",
    down: "down",
    up: "up",
    right: "right",
    lineStart: "lineStart",
    lineEnd: "lineEnd",
    wordForward: "wordRight",
    wordBackward: "wordLeft",
  };
  const command = adapterCommands[motion];
  if (command) return { type: "adapterCommand", command };
  if (motion === "wordEnd") {
    return {
      type: "restoreCursor",
      position: wordEndPosition(snapshot.text, snapshot.cursor, count),
    };
  }
  if (motion === "bufferStart") {
    return {
      type: "restoreCursor",
      position: navigateBuffer(snapshot.text, snapshot.cursor, "start"),
    };
  }
  if (motion === "bufferEnd") {
    return {
      type: "restoreCursor",
      position: navigateBuffer(snapshot.text, snapshot.cursor, "end"),
    };
  }
  if (motion === "firstNonBlank") {
    return {
      type: "restoreCursor",
      position: navigateBuffer(snapshot.text, snapshot.cursor, "firstNonBlank"),
    };
  }
  if (motion === "matchingPair") {
    const target = navigateBuffer(snapshot.text, snapshot.cursor, "matchingPair");
    return target ? { type: "restoreCursor", position: target } : undefined;
  }
}

export function moveUpdate(
  state: ModalState,
  motion: VimMotionAction,
  snapshot: EditorSnapshot,
  count = 1,
): ModalUpdate {
  const effect = moveEffectFor(motion, snapshot, count);
  if (!effect) return withEffects(state, [{ type: "invalidate" }]);
  if (effect.type === "adapterCommand" && count > 1) {
    return withEffects(state, [
      ...Array.from({ length: count }, () => effect),
      { type: "invalidate" },
    ]);
  }
  return withEffects(state, [effect, { type: "invalidate" }]);
}

function operatorMotionKey(motion: VimMotionAction): VimMotion | undefined {
  return semanticMotionToLegacy(motion);
}

function withRepeatableChange(
  state: ModalState,
  change: RepeatableChange,
  changed: boolean,
): ModalState {
  return changed ? { ...state, lastRepeatableChange: change } : state;
}

export function applyOperatorMotion(
  state: ModalState,
  snapshot: EditorSnapshot,
  operator: VimMotionOperatorAction,
  motion: VimMotionAction,
  options: ModalOptions,
  count = 1,
  recordRepeat = true,
): ModalUpdate {
  const legacyMotion = operatorMotionKey(motion);
  const baseState = clearCommandPending(state);
  if (!legacyMotion) return invalidate(clearPending(state));
  if (operator === "yank") {
    return yankUpdate(baseState, yankByMotion(snapshot.text, snapshot.cursor, legacyMotion, count));
  }

  const result = deleteByMotion(snapshot.text, snapshot.cursor, legacyMotion, count);
  let edited = editState(baseState, result);
  if (recordRepeat) {
    edited = withRepeatableChange(
      edited,
      { type: "operatorMotion", operator, motion, count },
      result.changed,
    );
  }
  const effects: ModalEffect[] = [{ type: "edit", result }];
  if (operator === "change") return modeUpdate(edited, "insert", options, effects);
  return withEffects(edited, effects);
}

export function applyLineCommand(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  operator: VimOperatorAction,
  count = 1,
  recordRepeat = true,
): ModalUpdate {
  const nextState = clearCommandPending(state);
  const shiftAction = shiftActionForOperator(operator);
  if (shiftAction) {
    const shiftResult = shiftLinesFromCursor(snapshot.text, snapshot.cursor, count, shiftAction);
    if (!shiftResult.ok) return invalidate(nextState);
    const result = shiftResult.edit;
    let edited = editState(nextState, result);
    if (recordRepeat)
      edited = withRepeatableChange(
        edited,
        { type: "lineCommand", operator, count },
        result.changed,
      );
    return withEffects(
      edited,
      result.changed ? [{ type: "edit", result }] : [{ type: "invalidate" }],
    );
  }
  if (operator === "delete") {
    const result = deleteLine(snapshot.text, snapshot.cursor, count);
    let edited = editState(nextState, result);
    if (recordRepeat)
      edited = withRepeatableChange(
        edited,
        { type: "lineCommand", operator, count },
        result.changed,
      );
    return withEffects(edited, [{ type: "edit", result }]);
  }
  if (operator === "change") {
    const result = changeLine(snapshot.text, snapshot.cursor, count);
    let edited = editState(nextState, result);
    if (recordRepeat)
      edited = withRepeatableChange(
        edited,
        { type: "lineCommand", operator, count },
        result.changed,
      );
    return modeUpdate(edited, "insert", options, [{ type: "edit", result }]);
  }
  return yankUpdate(
    nextState,
    count > 1
      ? yankLineCount(snapshot.text, snapshot.cursor, count)
      : yankLine(snapshot.text, snapshot.cursor),
  );
}

export function applyCommand(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  command: VimCommandAction,
  count = 1,
  char?: string,
  recordRepeat = true,
): ModalUpdate {
  const nextState = clearCommandPending(state);
  const registerAware = [
    "deleteChar",
    "deleteToLineEnd",
    "changeToLineEnd",
    "yankLine",
    "pasteAfter",
    "pasteBefore",
  ].includes(command);
  if (state.pendingRegister && !registerAware) return invalidate(clearPending(state));

  switch (command) {
    case "insertBefore":
      return modeUpdate(nextState, "insert", options);
    case "insertAfter":
      return modeUpdate(nextState, "insert", options, [
        { type: "adapterCommand", command: "right" },
        { type: "invalidate" },
      ]);
    case "insertLineStart":
      return modeUpdate(nextState, "insert", options, [
        { type: "adapterCommand", command: "lineStart" },
        { type: "invalidate" },
      ]);
    case "insertLineEnd":
      return modeUpdate(nextState, "insert", options, [
        { type: "adapterCommand", command: "lineEnd" },
        { type: "invalidate" },
      ]);
    case "openLineBelow": {
      const result = openLineBelow(snapshot.text, snapshot.cursor);
      return modeUpdate(editState(nextState, result), "insert", options, [
        { type: "edit", result },
      ]);
    }
    case "openLineAbove": {
      const result = openLineAbove(snapshot.text, snapshot.cursor);
      return modeUpdate(editState(nextState, result), "insert", options, [
        { type: "edit", result },
      ]);
    }
    case "visualChar":
      return modeUpdate({ ...nextState, visualAnchor: snapshot.cursor }, "visual", options);
    case "visualLine":
      return modeUpdate({ ...nextState, visualAnchor: snapshot.cursor }, "visualLine", options);
    case "visualBlock":
      return modeUpdate({ ...nextState, visualAnchor: snapshot.cursor }, "visualBlock", options);
    case "deleteChar": {
      const result = deleteCharAt(snapshot.text, snapshot.cursor, count);
      let edited = editState(nextState, result);
      if (recordRepeat)
        edited = withRepeatableChange(edited, { type: "command", command, count }, result.changed);
      return withEffects(edited, [{ type: "edit", result }]);
    }
    case "deleteToLineEnd": {
      const result = deleteByMotion(snapshot.text, snapshot.cursor, "$", count);
      let edited = editState(nextState, result);
      if (recordRepeat)
        edited = withRepeatableChange(edited, { type: "command", command, count }, result.changed);
      return withEffects(edited, [{ type: "edit", result }]);
    }
    case "changeToLineEnd": {
      const result = deleteByMotion(snapshot.text, snapshot.cursor, "$", count);
      let edited = editState(nextState, result);
      if (recordRepeat)
        edited = withRepeatableChange(edited, { type: "command", command, count }, result.changed);
      return modeUpdate(edited, "insert", options, [{ type: "edit", result }]);
    }
    case "yankLine":
      return yankUpdate(
        nextState,
        count > 1
          ? yankLineCount(snapshot.text, snapshot.cursor, count)
          : yankLine(snapshot.text, snapshot.cursor),
      );
    case "joinLine":
      return editUpdate(nextState, joinLineWithNext(snapshot.text, snapshot.cursor));
    case "pasteAfter":
      return editUpdate(
        clearRegisterTarget(nextState),
        pasteRegister(snapshot.text, snapshot.cursor, registerToRead(state)),
      );
    case "pasteBefore":
      return editUpdate(
        clearRegisterTarget(nextState),
        pasteRegisterBefore(snapshot.text, snapshot.cursor, registerToRead(state)),
      );
    case "incrementNumber":
    case "decrementNumber": {
      const delta = (command === "incrementNumber" ? 1 : -1) * Math.max(1, count);
      const result = adjustNumberAtOrAfterCursor(snapshot.text, snapshot.cursor, delta);
      let edited = editState(nextState, result);
      if (recordRepeat)
        edited = withRepeatableChange(edited, { type: "command", command, count }, result.changed);
      return withEffects(edited, [{ type: "edit", result }]);
    }
    case "toggleCase": {
      const result = toggleCaseAt(snapshot.text, snapshot.cursor, count);
      let edited = editState(nextState, result);
      if (recordRepeat)
        edited = withRepeatableChange(edited, { type: "command", command, count }, result.changed);
      return withEffects(edited, [{ type: "edit", result }]);
    }
    case "replaceChar": {
      const result = replaceCharAt(snapshot.text, snapshot.cursor, char ?? "", count);
      let edited = editState(nextState, result);
      if (recordRepeat)
        edited = withRepeatableChange(
          edited,
          { type: "command", command, count, char },
          result.changed,
        );
      return withEffects(edited, [{ type: "edit", result }]);
    }
    case "substituteChar": {
      const result = substituteCharAt(snapshot.text, snapshot.cursor, count);
      let edited = editState(nextState, result);
      if (recordRepeat)
        edited = withRepeatableChange(edited, { type: "command", command, count }, result.changed);
      return modeUpdate(edited, "insert", options, [{ type: "edit", result }]);
    }
    case "substituteLine": {
      const result = changeLine(snapshot.text, snapshot.cursor, count);
      let edited = editState(nextState, result);
      if (recordRepeat)
        edited = withRepeatableChange(edited, { type: "command", command, count }, result.changed);
      return modeUpdate(edited, "insert", options, [{ type: "edit", result }]);
    }
    case "findCharForward":
    case "findCharBackward":
    case "tillCharForward":
    case "tillCharBackward":
      return applyCharSearch(nextState, snapshot, command, char ?? "", count);
    case "repeatCharSearch":
      return repeatCharSearch(nextState, snapshot, false, count);
    case "repeatCharSearchReverse":
      return repeatCharSearch(nextState, snapshot, true, count);
    case "startSearch":
      return startSearchUpdate(nextState);
    case "startSearchBackward":
      return startSearchUpdate(nextState, "backward");
    case "repeatSearch":
      return repeatSearch(nextState, snapshot, options, false);
    case "repeatSearchReverse":
      return repeatSearch(nextState, snapshot, options, true);
    case "startExCommand":
      return startExCommandUpdate(nextState, snapshot, count);
    case "repeatChange":
      return repeatChange(state, snapshot, options);
    case "undo":
      return withEffects(nextState, [{ type: "adapterCommand", command: "undo" }]);
    case "redo":
      return snapshot.isRedoAvailable
        ? withEffects(nextState, [{ type: "adapterCommand", command: "redo" }])
        : invalidate(withNoopFeedback(nextState, options, "redo stack empty"));
  }
}

function charSearchKind(command: VimCommandAction) {
  if (command === "findCharBackward") return "findBackward" as const;
  if (command === "tillCharForward") return "tillForward" as const;
  if (command === "tillCharBackward") return "tillBackward" as const;
  return "findForward" as const;
}

function oppositeCharSearch(command: VimCommandAction): VimCommandAction {
  if (command === "findCharForward") return "findCharBackward";
  if (command === "findCharBackward") return "findCharForward";
  if (command === "tillCharForward") return "tillCharBackward";
  if (command === "tillCharBackward") return "tillCharForward";
  return command;
}

function applyCharSearch(
  state: ModalState,
  snapshot: EditorSnapshot,
  command: VimCommandAction,
  target: string,
  count = 1,
): ModalUpdate {
  const position = findCharOnLine(
    snapshot.text,
    snapshot.cursor,
    charSearchKind(command),
    target,
    count,
  );
  if (!position) return invalidate(state);
  return withEffects(
    {
      ...state,
      lastCharSearch: {
        command: command as
          | "findCharForward"
          | "findCharBackward"
          | "tillCharForward"
          | "tillCharBackward",
        target,
      },
    },
    [{ type: "restoreCursor", position }, { type: "invalidate" }],
  );
}

function repeatCharSearch(
  state: ModalState,
  snapshot: EditorSnapshot,
  reverse: boolean,
  count = 1,
): ModalUpdate {
  if (!state.lastCharSearch) return invalidate(state);
  const command = reverse
    ? oppositeCharSearch(state.lastCharSearch.command)
    : state.lastCharSearch.command;
  return applyCharSearch(state, snapshot, command, state.lastCharSearch.target, count);
}

export function applyOperatorTextObject(
  state: ModalState,
  snapshot: EditorSnapshot,
  operator: VimMotionOperatorAction,
  textObject: VimTextObject,
  options: ModalOptions,
  count = 1,
  recordRepeat = true,
): ModalUpdate {
  const baseState = clearCommandPending(state);
  const promptStructures = promptStructuresForOptions(options);
  if (operator === "yank")
    return yankUpdate(
      baseState,
      yankTextObject(snapshot.text, snapshot.cursor, textObject, promptStructures),
    );
  const result = deleteTextObject(snapshot.text, snapshot.cursor, textObject, promptStructures);
  let edited = editState(baseState, result);
  if (recordRepeat) {
    edited = withRepeatableChange(
      edited,
      { type: "operatorTextObject", operator, textObject, count },
      result.changed,
    );
  }
  const effects: ModalEffect[] = [{ type: "edit", result }];
  if (operator === "change") return modeUpdate(edited, "insert", options, effects);
  return withEffects(edited, effects);
}

export function repeatChange(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
): ModalUpdate {
  const change = state.lastRepeatableChange;
  if (!change) return invalidate(clearCommandPending(state));
  if (change.type === "command") {
    return applyCommand(state, snapshot, options, change.command, change.count, change.char, false);
  }
  if (change.type === "lineCommand") {
    return applyLineCommand(state, snapshot, options, change.operator, change.count, false);
  }
  if (change.type === "operatorMotion") {
    return applyOperatorMotion(
      state,
      snapshot,
      change.operator,
      change.motion,
      options,
      change.count,
      false,
    );
  }
  return applyOperatorTextObject(
    state,
    snapshot,
    change.operator,
    change.textObject,
    options,
    change.count,
    false,
  );
}
