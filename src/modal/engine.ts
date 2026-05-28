import { decodeKittyPrintable, matchesKey, parseKey } from "@earendil-works/pi-tui";

import type {
  EditResult,
  VimCommandAction,
  VimMode,
  VimMotion,
  VimMotionAction,
  VimOperatorAction,
  VimRegister,
  VimTextObject,
} from "../types.ts";
import type {
  AdapterCommand,
  EditorSnapshot,
  ModalEffect,
  ModalOptions,
  ModalState,
  ModalUpdate,
  PendingSearchTarget,
  RepeatableChange,
} from "./types.ts";

import {
  adjustNumberAtOrAfterCursor,
  changeLine,
  deleteBlockRange,
  deleteByMotion,
  deleteCharAt,
  deleteLine,
  deleteTextObject,
  findCharOnLine,
  findSearchMatch,
  deleteSearchRange,
  deleteLineMarkRange,
  deleteLineRange,
  deleteMarkRange,
  deleteRange,
  exactMarkPosition,
  insertBlockText,
  joinLineWithNext,
  navigateBuffer,
  openLineAbove,
  openLineBelow,
  lineMarkPosition,
  pasteRegister,
  pasteRegisterBefore,
  replaceLineRangeWithRegister,
  replaceVisualRangeChars,
  replaceCharAt,
  substituteCharAt,
  wordEndPosition,
  yankByMotion,
  yankLine,
  yankLineCount,
  yankLineMarkRange,
  yankMarkRange,
  yankSearchRange,
  yankTextObject,
  yankVisualSelection,
} from "../buffer.ts";
import {
  isMacroControlKey,
  operatorActionForSequence,
  resolveMacroCommand,
  resolveNormalCommand,
  semanticMotionToLegacy,
} from "../commands.ts";
import { keymapForOptions, macrosForOptions, marksForOptions, searchForOptions } from "../config.ts";
import {
  clearMarkTarget,
  isExactMarkJumpPrefixKey,
  isLineMarkJumpPrefixKey,
  isMarkSetPrefixKey,
  localMarkPosition,
  markSlotForKey,
  pendingMarkDisplay,
  pendingMarkTarget,
  setLocalMark,
} from "./marks.ts";
import {
  clearRegisterTarget,
  isRegisterPrefixKey,
  registerTargetForKey,
  registerToRead,
  writeRegisters,
} from "./registers.ts";
import { resetTransientState, transitionMode } from "./state.ts";

function keySequence(data: string): string | undefined {
  return (
    decodeKittyPrintable(data) ??
    (data.length === 1 && data.charCodeAt(0) >= 32 ? data : undefined) ??
    parseKey(data)
  );
}

export function isDelegatedResetKey(data: string): boolean {
  return matchesKey(data, "enter") || matchesKey(data, "ctrl+c") || matchesKey(data, "ctrl+g");
}

function withEffects(state: ModalState, effects: ModalEffect[]): ModalUpdate {
  return { state, effects };
}

function invalidate(state: ModalState): ModalUpdate {
  return withEffects(state, [{ type: "invalidate" }]);
}

function delegate(state: ModalState, input: string): ModalUpdate {
  return withEffects(state, [{ type: "delegate", input }]);
}

function clearSearchHighlight(state: ModalState): ModalState {
  const { searchHighlight: _searchHighlight, ...rest } = state;
  return rest;
}

function withSearchHighlight(
  state: ModalState,
  options: ModalOptions,
  query: string,
  current: EditorSnapshot["cursor"],
): ModalState {
  return searchForOptions(options).highlight ? { ...state, searchHighlight: { query, current } } : state;
}

function clearCommandPending(state: ModalState): ModalState {
  const {
    pending: _pending,
    pendingMacro: _pendingMacro,
    pendingMark: _pendingMark,
    pendingSearch: _pendingSearch,
    ...rest
  } = state;
  return rest;
}

function clearPending(state: ModalState): ModalState {
  return clearMarkTarget(clearRegisterTarget(clearCommandPending(state)));
}

function clearPendingMacro(state: ModalState): ModalState {
  const { pendingMacro: _pendingMacro, ...rest } = state;
  return rest;
}

function macroTokens(state: ModalState, slot: string): readonly string[] {
  return state.macros?.[slot] ?? [];
}

function startMacroRecording(state: ModalState, slot: string): ModalUpdate {
  return invalidate({
    ...clearPendingMacro(state),
    macros: { ...state.macros, [slot]: [] },
    recordingSlot: slot,
  });
}

function stopMacroRecording(state: ModalState): ModalUpdate {
  return invalidate({ ...clearPendingMacro(state), recordingSlot: undefined });
}

function playMacroUpdate(state: ModalState, slot: string, options: ModalOptions): ModalUpdate {
  const inputs = macroTokens(state, slot).slice(0, macrosForOptions(options).maxReplaySteps);
  if (inputs.length === 0) return invalidate(clearPendingMacro(state));
  return withEffects({ ...clearPendingMacro(state), lastPlayedMacro: slot }, [
    { type: "playMacro", slot, inputs },
  ]);
}

function appendRecordedInput(state: ModalState, slot: string, input: string): ModalState {
  return {
    ...state,
    macros: {
      ...state.macros,
      [slot]: [...(state.macros?.[slot] ?? []), input],
    },
  };
}

function editState(state: ModalState, result: EditResult): ModalState {
  return writeRegisters(state, result.register);
}

function editUpdate(state: ModalState, result: EditResult): ModalUpdate {
  return withEffects(editState(state, result), [{ type: "edit", result }]);
}

function modeUpdate(
  state: ModalState,
  mode: VimMode,
  options: ModalOptions,
  extraEffects: ModalEffect[] = [],
): ModalUpdate {
  if (mode === "visual" || mode === "visualLine" || mode === "visualBlock") {
    return {
      state: {
        ...state,
        mode,
        pending: undefined,
        pendingMacro: undefined,
        pendingRegister: undefined,
        pendingMark: undefined,
      },
      effects: [
        ...extraEffects,
        { type: "terminalCursor", style: options.cursor[mode] },
        { type: "invalidate" },
      ],
    };
  }

  return transitionMode(state, mode, options, extraEffects);
}

function resetAndDelegate(state: ModalState, options: ModalOptions, input: string): ModalUpdate {
  const reset = resetTransientState(state, options.startMode);
  return withEffects(reset, [
    { type: "terminalCursor", style: options.cursor[options.startMode] },
    { type: "invalidate" },
    { type: "delegate", input },
  ]);
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

function moveUpdate(
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

function yankUpdate(state: ModalState, register: VimRegister | undefined): ModalUpdate {
  return invalidate(writeRegisters(state, register));
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

function applyOperatorMotion(
  state: ModalState,
  snapshot: EditorSnapshot,
  operator: VimOperatorAction,
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
  if (operator === "change") return transitionMode(edited, "insert", options, effects);
  return withEffects(edited, effects);
}

function applyLineCommand(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  operator: VimOperatorAction,
  count = 1,
  recordRepeat = true,
): ModalUpdate {
  const nextState = clearCommandPending(state);
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

function applyCommand(
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
    case "repeatSearch":
      return repeatSearch(nextState, snapshot, options, false);
    case "repeatSearchReverse":
      return repeatSearch(nextState, snapshot, options, true);
    case "repeatChange":
      return repeatChange(state, snapshot, options);
    case "undo":
      return withEffects(nextState, [{ type: "adapterCommand", command: "undo" }]);
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

function oppositeSearchDirection(direction: "forward" | "backward"): "forward" | "backward" {
  return direction === "forward" ? "backward" : "forward";
}

function startSearchUpdate(
  state: ModalState,
  direction: "forward" | "backward" = "forward",
  operator?: VimOperatorAction,
): ModalUpdate {
  return invalidate({
    ...clearRegisterTarget(state),
    pendingSearch: { query: "", direction, operator },
  });
}

function pendingSearchDisplay(target: PendingSearchTarget | undefined): string | undefined {
  if (!target) return undefined;
  return `/${target.query}`;
}

function completeSearch(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  search: PendingSearchTarget,
): ModalUpdate {
  const query = search.query;
  const baseState = clearPending(state);
  if (query.length === 0) return invalidate(baseState);

  const target = findSearchMatch(snapshot.text, snapshot.cursor, query, search.direction);
  if (!target) return invalidate(baseState);

  const searchState = { query, direction: search.direction };
  if (search.operator) {
    if (search.operator === "yank") {
      const register = yankSearchRange(snapshot.text, snapshot.cursor, target, query);
      return yankUpdate(withSearchHighlight({ ...baseState, lastSearch: searchState }, options, query, target), register);
    }

    const result = deleteSearchRange(snapshot.text, snapshot.cursor, target, query);
    const edited = clearSearchHighlight(editState({ ...baseState, lastSearch: searchState }, result));
    const effects: ModalEffect[] = [{ type: "edit", result }];
    if (search.operator === "change") return transitionMode(edited, "insert", options, effects);
    return withEffects(edited, effects);
  }

  return withEffects(
    withSearchHighlight({ ...baseState, lastSearch: searchState }, options, query, target),
    [{ type: "restoreCursor", position: target }, { type: "invalidate" }],
  );
}

function repeatSearch(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  reverse: boolean,
): ModalUpdate {
  if (!state.lastSearch) return invalidate(clearCommandPending(state));
  const direction = reverse ? oppositeSearchDirection(state.lastSearch.direction) : state.lastSearch.direction;
  const target = findSearchMatch(snapshot.text, snapshot.cursor, state.lastSearch.query, direction);
  if (!target) return invalidate(clearCommandPending(state));
  return withEffects(withSearchHighlight(clearCommandPending(state), options, state.lastSearch.query, target), [
    { type: "restoreCursor", position: target },
    { type: "invalidate" },
  ]);
}

function handlePendingSearchInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
): ModalUpdate {
  const search = state.pendingSearch;
  if (!search) return invalidate(state);
  if (matchesKey(data, "escape")) {
    const cleared = clearPending(state);
    return invalidate(searchForOptions(options).clearOnCancel ? clearSearchHighlight(cleared) : cleared);
  }
  if (matchesKey(data, "enter") || matchesKey(data, "return")) {
    return completeSearch(state, snapshot, options, search);
  }
  if (matchesKey(data, "backspace")) {
    if (search.query.length === 0) return invalidate(state);
    return invalidate({ ...state, pendingSearch: { ...search, query: search.query.slice(0, -1) } });
  }

  const key = keySequence(data);
  if (!key || key.length !== 1) return invalidate(state);
  return invalidate({ ...state, pendingSearch: { ...search, query: search.query + key } });
}

function applyOperatorTextObject(
  state: ModalState,
  snapshot: EditorSnapshot,
  operator: VimOperatorAction,
  textObject: VimTextObject,
  options: ModalOptions,
  count = 1,
  recordRepeat = true,
): ModalUpdate {
  const baseState = clearCommandPending(state);
  if (operator === "yank")
    return yankUpdate(baseState, yankTextObject(snapshot.text, snapshot.cursor, textObject));
  const result = deleteTextObject(snapshot.text, snapshot.cursor, textObject);
  let edited = editState(baseState, result);
  if (recordRepeat) {
    edited = withRepeatableChange(
      edited,
      { type: "operatorTextObject", operator, textObject, count },
      result.changed,
    );
  }
  const effects: ModalEffect[] = [{ type: "edit", result }];
  if (operator === "change") return transitionMode(edited, "insert", options, effects);
  return withEffects(edited, effects);
}

function repeatChange(
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

function handleBlockInsertInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
): ModalUpdate {
  if (!state.blockInsert) return modeUpdate(state, "normal", options);
  if (matchesKey(data, "escape")) {
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

  if (matchesKey(data, "backspace")) {
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

function handleInsertInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
): ModalUpdate {
  if (state.blockInsert) return handleBlockInsertInput(state, snapshot, options, data);

  if (matchesKey(data, "escape")) {
    if (snapshot.isAutocompleteOpen) return delegate(state, data);
    return modeUpdate(state, "normal", options);
  }

  return delegate(state, data);
}

function markJumpTarget(
  state: ModalState,
  snapshot: EditorSnapshot,
  slot: string,
  kind: "jumpExact" | "jumpLine",
) {
  const mark = localMarkPosition(state, slot);
  if (!mark) return undefined;
  return kind === "jumpExact"
    ? exactMarkPosition(snapshot.text, mark)
    : lineMarkPosition(snapshot.text, mark);
}

function jumpToMarkUpdate(
  state: ModalState,
  snapshot: EditorSnapshot,
  slot: string,
  kind: "jumpExact" | "jumpLine",
): ModalUpdate {
  const target = markJumpTarget(state, snapshot, slot, kind);
  const nextState = clearMarkTarget(state);
  return withEffects(
    nextState,
    target
      ? [{ type: "restoreCursor", position: target }, { type: "invalidate" }]
      : [{ type: "invalidate" }],
  );
}

function applyOperatorMarkMotion(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  slot: string,
  kind: "jumpExact" | "jumpLine",
  operator: VimOperatorAction,
): ModalUpdate {
  const target = markJumpTarget(state, snapshot, slot, kind);
  const baseState = clearPending(state);
  if (!target) return invalidate(baseState);

  if (operator === "yank") {
    const register =
      kind === "jumpLine"
        ? yankLineMarkRange(snapshot.text, snapshot.cursor, target)
        : yankMarkRange(snapshot.text, snapshot.cursor, target);
    return yankUpdate(baseState, register);
  }

  const result =
    kind === "jumpLine"
      ? deleteLineMarkRange(snapshot.text, snapshot.cursor, target)
      : deleteMarkRange(snapshot.text, snapshot.cursor, target);
  const edited = editState(baseState, result);
  const effects: ModalEffect[] = [{ type: "edit", result }];
  if (operator === "change") return transitionMode(edited, "insert", options, effects);
  return withEffects(edited, effects);
}

function handlePendingMarkTarget(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  key: string,
): ModalUpdate {
  const target = state.pendingMark;
  if (!target) return invalidate(state);
  const slot = markSlotForKey(key, marksForOptions(options).slots);
  if (!slot) return invalidate(clearPending(state));
  if (target.kind === "set") {
    return invalidate(setLocalMark(state, slot, exactMarkPosition(snapshot.text, snapshot.cursor)));
  }
  if (target.operator) {
    return applyOperatorMarkMotion(state, snapshot, options, slot, target.kind, target.operator);
  }
  return jumpToMarkUpdate(state, snapshot, slot, target.kind);
}

function markPendingForKey(
  key: string,
  options: ModalOptions,
  operator?: VimOperatorAction,
  operatorKey?: string,
) {
  if (!marksForOptions(options).enabled) return undefined;
  const keymap = keymapForOptions(options).marks;
  if (!operator && isMarkSetPrefixKey(key, keymap.set)) return pendingMarkTarget("set");
  if (isExactMarkJumpPrefixKey(key, keymap.jumpExact)) {
    return pendingMarkTarget("jumpExact", operator, operatorKey);
  }
  if (isLineMarkJumpPrefixKey(key, keymap.jumpLine)) {
    return pendingMarkTarget("jumpLine", operator, operatorKey);
  }
  return undefined;
}

function handleNormalInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
): ModalUpdate {
  if (matchesKey(data, "escape")) {
    const nextState = clearPending(state);
    return withEffects(nextState, [{ type: "delegate", input: data }, { type: "invalidate" }]);
  }

  if (isDelegatedResetKey(data)) return resetAndDelegate(state, options, data);
  if (matchesKey(data, "ctrl+v")) {
    return modeUpdate(
      { ...clearPending(state), visualAnchor: snapshot.cursor },
      "visualBlock",
      options,
    );
  }

  const key = keySequence(data);
  if (!key) {
    const nextState = clearPending(state);
    return withEffects(nextState, [{ type: "delegate", input: data }, { type: "invalidate" }]);
  }

  if (state.pendingRegister === "awaitingSlot") {
    const target = registerTargetForKey(key);
    return invalidate(
      target ? { ...clearCommandPending(state), pendingRegister: target } : clearPending(state),
    );
  }
  if (state.pendingMark) return handlePendingMarkTarget(state, snapshot, options, key);
  if (!state.pending && isRegisterPrefixKey(key)) {
    return invalidate({ ...clearPending(state), pendingRegister: "awaitingSlot" });
  }

  const keymap = keymapForOptions(options);
  if (!state.pending && !state.pendingRegister) {
    const macros = macrosForOptions(options);
    if (
      snapshot.isMacroReplaying &&
      (state.pendingMacro || isMacroControlKey(key, keymap.macros.record, keymap.macros.play))
    ) {
      return invalidate(clearPendingMacro(state));
    }
    const macroResult = resolveMacroCommand(key, state.pendingMacro, Boolean(state.recordingSlot), {
      enabled: macros.enabled,
      slots: macros.slots,
      recordKeys: keymap.macros.record,
      playKeys: keymap.macros.play,
    });
    if (macroResult.type === "pendingMacro")
      return invalidate({ ...clearPending(state), pendingMacro: macroResult.target });
    if (macroResult.type === "startRecording") return startMacroRecording(state, macroResult.slot);
    if (macroResult.type === "stopRecording") return stopMacroRecording(state);
    if (macroResult.type === "playMacro") {
      if (snapshot.isMacroReplaying || state.recordingSlot)
        return invalidate(clearPendingMacro(state));
      return playMacroUpdate(state, macroResult.slot, options);
    }
    if (macroResult.type === "repeatMacro") {
      if (snapshot.isMacroReplaying || state.recordingSlot || !state.lastPlayedMacro) {
        return invalidate(clearPendingMacro(state));
      }
      return playMacroUpdate(state, state.lastPlayedMacro, options);
    }
    if (macroResult.type === "invalid") return invalidate(clearPendingMacro(state));

    const markTarget = markPendingForKey(key, options);
    if (markTarget) return invalidate({ ...clearPending(state), pendingMark: markTarget });
  }

  const pendingOperator = operatorActionForSequence(state.pending, keymap);
  if (pendingOperator) {
    if (key === "/") return startSearchUpdate(state, "forward", pendingOperator);
    const markTarget = markPendingForKey(key, options, pendingOperator, state.pending);
    if (markTarget) return invalidate({ ...clearRegisterTarget(state), pendingMark: markTarget });
  }

  const pendingResult = resolveNormalCommand(key, state.pending, keymap);
  if (pendingResult.type === "pending") {
    const operator = operatorActionForSequence(pendingResult.pending, keymap);
    if (state.pendingRegister && !operator) return invalidate(clearPending(state));
    return invalidate({ ...state, pending: pendingResult.pending });
  }
  if (pendingResult.type === "motion") {
    if (state.pendingRegister) return invalidate(clearPending(state));
    return moveUpdate(clearPending(state), pendingResult.motion, snapshot, pendingResult.count);
  }
  if (pendingResult.type === "command")
    return applyCommand(state, snapshot, options, pendingResult.command, pendingResult.count);
  if (pendingResult.type === "charCommand")
    return applyCommand(
      state,
      snapshot,
      options,
      pendingResult.command,
      pendingResult.count,
      pendingResult.char,
    );
  if (pendingResult.type === "lineCommand") {
    return applyLineCommand(state, snapshot, options, pendingResult.operator, pendingResult.count);
  }
  if (pendingResult.type === "operatorMotion") {
    return applyOperatorMotion(
      state,
      snapshot,
      pendingResult.operator,
      pendingResult.motion,
      options,
      pendingResult.count,
    );
  }
  if (pendingResult.type === "operatorTextObject") {
    return applyOperatorTextObject(
      state,
      snapshot,
      pendingResult.operator,
      pendingResult.textObject,
      options,
      pendingResult.count,
    );
  }
  if (pendingResult.type === "invalid") return invalidate(clearPending(state));

  return invalidate(state.pendingRegister ? clearPending(state) : state);
}

function visualKindForMode(mode: VimMode): "char" | "line" | "block" {
  if (mode === "visualLine") return "line";
  if (mode === "visualBlock") return "block";
  return "char";
}

function startBlockInsert(
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
  return withEffects(
    {
      ...state,
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

function handleVisualInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
): ModalUpdate {
  if (matchesKey(data, "escape")) return modeUpdate(state, "normal", options);
  if (isDelegatedResetKey(data)) return resetAndDelegate(state, options, data);
  if (matchesKey(data, "ctrl+v")) {
    return state.mode === "visualBlock"
      ? invalidate(state)
      : modeUpdate(state, "visualBlock", options);
  }

  const key = keySequence(data);
  if (!key) return delegate(state, data);

  if (state.pendingRegister === "awaitingSlot") {
    const target = registerTargetForKey(key);
    return invalidate(
      target ? { ...clearCommandPending(state), pendingRegister: target } : clearPending(state),
    );
  }
  if (state.pendingMark) return handlePendingMarkTarget(state, snapshot, options, key);
  if (!state.pending && isRegisterPrefixKey(key)) {
    return invalidate({ ...clearPending(state), pendingRegister: "awaitingSlot" });
  }
  if (!state.pending && !state.pendingRegister) {
    const markTarget = markPendingForKey(key, options);
    if (markTarget?.kind === "jumpExact" || markTarget?.kind === "jumpLine") {
      return invalidate({ ...clearPending(state), pendingMark: markTarget });
    }
  }

  const keymap = keymapForOptions(options);
  const result = resolveNormalCommand(key, state.pending, keymap);
  if (result.type === "motion") {
    if (state.pendingRegister) return invalidate(clearPending(state));
    return moveUpdate(state, result.motion, snapshot);
  }
  if (result.type === "charCommand") {
    if (state.pendingRegister || result.command !== "replaceChar")
      return invalidate(clearPending(state));
    return replaceVisualSelection(
      state,
      snapshot,
      options,
      visualKindForMode(state.mode),
      result.char,
    );
  }
  if (result.type === "command") {
    const registerAware = result.command === "deleteChar" || result.command === "pasteAfter";
    if (state.pendingRegister && !registerAware) return invalidate(clearPending(state));

    if (result.command === "startSearch") return startSearchUpdate(state);
    if (result.command === "repeatSearch") return repeatSearch(state, snapshot, options, false);
    if (result.command === "repeatSearchReverse") return repeatSearch(state, snapshot, options, true);

    if (result.command === "visualLine") {
      return state.mode === "visualLine"
        ? invalidate(state)
        : modeUpdate(state, "visualLine", options);
    }
    if (result.command === "visualChar") {
      return state.mode === "visual" ? invalidate(state) : modeUpdate(state, "visual", options);
    }
    if (result.command === "visualBlock") {
      return state.mode === "visualBlock"
        ? invalidate(state)
        : modeUpdate(state, "visualBlock", options);
    }
    if (state.mode === "visualBlock" && result.command === "insertLineStart") {
      return startBlockInsert(state, snapshot, options, "start");
    }
    if (state.mode === "visualBlock" && result.command === "insertLineEnd") {
      return startBlockInsert(state, snapshot, options, "end");
    }
    if (result.command === "deleteChar") {
      return deleteVisualSelection(
        state,
        snapshot,
        options,
        "normal",
        visualKindForMode(state.mode),
      );
    }
    if (result.command === "pasteAfter") {
      if (state.mode === "visualLine") return pasteVisualLineSelection(state, snapshot, options);
      return invalidate(state.pendingRegister ? clearPending(state) : state);
    }
  }
  if (result.type === "pending") {
    const operator = operatorActionForSequence(result.pending, keymap);
    if (operator)
      return applyVisualOperator(state, snapshot, options, visualKindForMode(state.mode), operator);
    if (state.pendingRegister) return invalidate(clearPending(state));
    return invalidate({ ...state, pending: result.pending });
  }
  if (result.type === "invalid") return invalidate(clearPending(state));

  return invalidate(state.pendingRegister ? clearPending(state) : state);
}

function applyVisualOperator(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  kind: "char" | "line" | "block",
  operator: VimOperatorAction,
): ModalUpdate {
  if (operator === "yank") {
    if (!state.visualAnchor) return modeUpdate(state, "normal", options);
    return yankVisualUpdate(state, snapshot, options, kind);
  }
  if (operator === "change") return deleteVisualSelection(state, snapshot, options, "insert", kind);
  return deleteVisualSelection(state, snapshot, options, "normal", kind);
}

function yankVisualUpdate(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  kind: "char" | "line" | "block",
): ModalUpdate {
  if (!state.visualAnchor) return modeUpdate(state, "normal", options);
  const register = yankVisualSelection(snapshot.text, state.visualAnchor, snapshot.cursor, kind);
  return modeUpdate(writeRegisters(state, register), "normal", options);
}

function deleteVisualSelection(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  nextMode: VimMode,
  kind: "char" | "line" | "block",
): ModalUpdate {
  if (!state.visualAnchor) return modeUpdate(state, nextMode, options);
  const result =
    kind === "line"
      ? deleteLineRange(snapshot.text, state.visualAnchor, snapshot.cursor)
      : kind === "block"
        ? deleteBlockRange(snapshot.text, state.visualAnchor, snapshot.cursor)
        : deleteRange(snapshot.text, state.visualAnchor, snapshot.cursor);
  return modeUpdate(editState(state, result), nextMode, options, [{ type: "edit", result }]);
}

function replaceVisualSelection(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  kind: "char" | "line" | "block",
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
  return modeUpdate(editState(state, result), "normal", options, [{ type: "edit", result }]);
}

function pasteVisualLineSelection(
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
  return modeUpdate(editState(state, result), "normal", options, [{ type: "edit", result }]);
}

function routeModalInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
): ModalUpdate {
  if (state.pendingSearch) return handlePendingSearchInput(state, snapshot, options, data);
  if (state.mode === "insert") return handleInsertInput(state, snapshot, options, data);
  if (state.mode === "visual" || state.mode === "visualLine" || state.mode === "visualBlock") {
    return handleVisualInput(state, snapshot, options, data);
  }
  return handleNormalInput(state, snapshot, options, data);
}

function shouldRecordInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  update: ModalUpdate,
  options: ModalOptions,
  data: string,
): boolean {
  if (!state.recordingSlot) return false;
  if (snapshot.isMacroReplaying) return false;
  if (isDelegatedResetKey(data)) return false;

  const key = keySequence(data);
  const keymap = keymapForOptions(options);
  if (
    key &&
    state.mode === "normal" &&
    (state.pendingMacro || isMacroControlKey(key, keymap.macros.record, keymap.macros.play))
  )
    return false;
  if (state.mode === "insert" && matchesKey(data, "escape") && snapshot.isAutocompleteOpen) {
    return false;
  }
  if (update.effects.some((effect) => effect.type === "playMacro")) return false;
  if (update.effects.some((effect) => effect.type === "delegate") && state.mode !== "insert") {
    return false;
  }
  return true;
}

export function modalPendingDisplay(state: ModalState): string | undefined {
  return pendingSearchDisplay(state.pendingSearch) ?? pendingMarkDisplay(state.pendingMark);
}

export function handleModalInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
): ModalUpdate {
  const update = routeModalInput(state, snapshot, options, data);
  if (!state.recordingSlot || !shouldRecordInput(state, snapshot, update, options, data))
    return update;
  return {
    ...update,
    state: appendRecordedInput(update.state, state.recordingSlot, data),
  };
}
