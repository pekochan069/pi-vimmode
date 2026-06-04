import { decodeKittyPrintable, matchesKey, parseKey } from "@earendil-works/pi-tui";

import type {
  EditResult,
  VimCommandAction,
  VimMode,
  VimMotion,
  VimMotionAction,
  VimMotionOperatorAction,
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
  SearchHistoryEntry,
} from "./types.ts";

import {
  adjustNumberAtOrAfterCursor,
  applyPromptTransform,
  changeLine,
  deleteBlockRange,
  deleteByMotion,
  deleteCharAt,
  deleteLine,
  deleteTextObject,
  findCharOnLine,
  compileRegexSearchMatcher,
  findSearchMatchWithMatcher,
  deleteSearchMatchRange,
  deleteExLineRange,
  deleteLineMarkRange,
  deleteLineRange,
  deleteMarkRange,
  deleteRange,
  exactMarkPosition,
  insertBlockText,
  joinExLineRange,
  joinLineWithNext,
  moveExLineRange,
  navigateBuffer,
  openLineAbove,
  openLineBelow,
  lineMarkPosition,
  pasteRegister,
  pasteRegisterBefore,
  putExRegisterAfterRange,
  copyExLineRange,
  replaceLineRangeWithRegister,
  replaceVisualRangeChars,
  replaceCharAt,
  substituteCharAt,
  shiftLineRange,
  shiftLinesFromCursor,
  substituteLineRangeLiteral,
  substituteLineRangeRegex,
  toggleCaseAt,
  toggleCaseVisualRange,
  wordEndPosition,
  yankByMotion,
  yankExLineRange,
  yankLine,
  yankLineCount,
  yankLineMarkRange,
  yankMarkRange,
  yankSearchMatchRange,
  yankTextObject,
  yankVisualSelection,
} from "../buffer.ts";
import {
  countForPendingSequence,
  isMacroControlKey,
  operatorActionForSequence,
  resolveMacroCommand,
  resolveNormalCommand,
  semanticMotionToLegacy,
} from "../commands.ts";
import {
  keymapForOptions,
  macrosForOptions,
  marksForOptions,
  promptStructuresForOptions,
  promptTransformsForOptions,
  searchForOptions,
} from "../config.ts";
import { parseExCommand } from "../ex.ts";
import {
  clearMarkTarget,
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

const PROTECTED_PI_DELEGATE_KEYS = [
  "tab",
  "shift+enter",
  "ctrl+d",
  "ctrl+l",
  "ctrl+p",
  "shift+ctrl+p",
  "ctrl+shift+p",
  "ctrl+t",
  "shift+tab",
] as const;

function isProtectedPiDelegateKey(data: string): boolean {
  return PROTECTED_PI_DELEGATE_KEYS.some((key) => matchesKey(data, key));
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

function delegateProtectedShortcut(state: ModalState, input: string): ModalUpdate {
  return withEffects(clearPending(state), [{ type: "delegate", input }, { type: "invalidate" }]);
}

function clearSearchHighlight(state: ModalState): ModalState {
  const { searchHighlight: _searchHighlight, ...rest } = state;
  return rest;
}

function clearExMessage(state: ModalState): ModalState {
  const { exMessage: _exMessage, ...rest } = state;
  return rest;
}

function clearPendingEx(state: ModalState): ModalState {
  const { pendingEx: _pendingEx, ...rest } = state;
  return rest;
}

function withSearchHighlight(
  state: ModalState,
  options: ModalOptions,
  query: string,
  current: EditorSnapshot["cursor"],
): ModalState {
  return searchForOptions(options).highlight
    ? { ...state, searchHighlight: { query, current } }
    : state;
}

function clearCommandPending(state: ModalState): ModalState {
  const {
    pending: _pending,
    pendingMacro: _pendingMacro,
    pendingMark: _pendingMark,
    pendingSearch: _pendingSearch,
    pendingEx: _pendingEx,
    exMessage: _exMessage,
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
  const nextState = result.changed ? clearSearchHighlight(state) : state;
  return writeRegisters(nextState, result.register);
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
  if (operator === "change") return transitionMode(edited, "insert", options, effects);
  return withEffects(edited, effects);
}

function shiftActionForOperator(operator: VimOperatorAction): "indent" | "dedent" | undefined {
  if (operator === "indent") return "indent";
  if (operator === "dedent") return "dedent";
  return undefined;
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
      return withEffects(nextState, [{ type: "adapterCommand", command: "redo" }]);
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
    ...clearPending(clearRegisterTarget(state)),
    pendingSearch: { query: "", direction, operator },
  });
}

function pendingSearchDisplay(target: PendingSearchTarget | undefined): string | undefined {
  if (!target) return undefined;
  return `${target.direction === "backward" ? "?" : "/"}${target.query}`;
}

const SEARCH_HISTORY_LIMIT = 50;

type ResolvedSearchQuery = {
  query: string;
  matcherMode: "literal" | "regex";
  matcher: { mode: "literal"; query: string } | { mode: "regex"; query: string; regex: RegExp };
};

function resolveSearchQuery(
  rawQuery: string,
  previous: ModalState["lastSearch"],
): { ok: true; value?: ResolvedSearchQuery } | { ok: false; message: string } {
  if (rawQuery.length === 0) {
    if (!previous) return { ok: true };
    const matcherMode = previous.matcherMode ?? "literal";
    if (matcherMode === "regex") {
      const compiled = compileRegexSearchMatcher(previous.query);
      return compiled.ok
        ? { ok: true, value: { query: previous.query, matcherMode, matcher: compiled.matcher } }
        : compiled;
    }
    return {
      ok: true,
      value: {
        query: previous.query,
        matcherMode,
        matcher: { mode: "literal", query: previous.query },
      },
    };
  }

  if (rawQuery.startsWith("\\r")) {
    const query = rawQuery.slice(2);
    if (query.length === 0) return { ok: true };
    const compiled = compileRegexSearchMatcher(query);
    return compiled.ok
      ? { ok: true, value: { query, matcherMode: "regex", matcher: compiled.matcher } }
      : compiled;
  }

  return {
    ok: true,
    value: {
      query: rawQuery,
      matcherMode: "literal",
      matcher: { mode: "literal", query: rawQuery },
    },
  };
}

function addSearchHistory(
  history: readonly SearchHistoryEntry[] | undefined,
  entry: SearchHistoryEntry,
): SearchHistoryEntry[] {
  const current = history ?? [];
  const deduped = current.filter(
    (item) => item.query !== entry.query || item.matcherMode !== entry.matcherMode,
  );
  return [...deduped, entry].slice(-SEARCH_HISTORY_LIMIT);
}

function completeSearch(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  search: PendingSearchTarget,
): ModalUpdate {
  const resolved = resolveSearchQuery(search.query, state.lastSearch);
  const baseState = clearPending(state);
  if (!resolved.ok)
    return invalidate({ ...baseState, exMessage: { kind: "error", text: resolved.message } });
  if (!resolved.value) return invalidate(baseState);

  const target = findSearchMatchWithMatcher(
    snapshot.text,
    snapshot.cursor,
    resolved.value.matcher,
    search.direction,
  );
  if (!target) return invalidate(baseState);

  const searchState = {
    query: resolved.value.query,
    direction: search.direction,
    matcherMode: resolved.value.matcherMode,
  };
  const searchHistory = addSearchHistory(state.searchHistory, {
    query: resolved.value.query,
    matcherMode: resolved.value.matcherMode,
  });
  const searchedState = { ...baseState, lastSearch: searchState, searchHistory };
  if (search.operator) {
    if (search.operator === "yank") {
      const register = yankSearchMatchRange(snapshot.text, snapshot.cursor, target);
      return yankUpdate(
        withSearchHighlight(searchedState, options, resolved.value.query, target.position),
        register,
      );
    }

    const result = deleteSearchMatchRange(snapshot.text, snapshot.cursor, target);
    const edited = clearSearchHighlight(editState(searchedState, result));
    const effects: ModalEffect[] = [{ type: "edit", result }];
    if (search.operator === "change") return transitionMode(edited, "insert", options, effects);
    return withEffects(edited, effects);
  }

  return withEffects(
    withSearchHighlight(searchedState, options, resolved.value.query, target.position),
    [{ type: "restoreCursor", position: target.position }, { type: "invalidate" }],
  );
}

function repeatSearch(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  reverse: boolean,
): ModalUpdate {
  if (!state.lastSearch) return invalidate(clearCommandPending(state));
  const direction = reverse
    ? oppositeSearchDirection(state.lastSearch.direction)
    : state.lastSearch.direction;
  const resolved = resolveSearchQuery(
    state.lastSearch.matcherMode === "regex"
      ? `\\r${state.lastSearch.query}`
      : state.lastSearch.query,
    state.lastSearch,
  );
  if (!resolved.ok || !resolved.value) return invalidate(clearCommandPending(state));
  const target = findSearchMatchWithMatcher(
    snapshot.text,
    snapshot.cursor,
    resolved.value.matcher,
    direction,
  );
  if (!target) return invalidate(clearCommandPending(state));
  return withEffects(
    withSearchHighlight(
      clearCommandPending(state),
      options,
      state.lastSearch.query,
      target.position,
    ),
    [{ type: "restoreCursor", position: target.position }, { type: "invalidate" }],
  );
}

function historyText(entry: SearchHistoryEntry): string {
  return entry.matcherMode === "regex" ? `\\r${entry.query}` : entry.query;
}

function navigateSearchHistory(
  state: ModalState,
  search: PendingSearchTarget,
  direction: "previous" | "next",
): ModalState {
  const history = state.searchHistory ?? [];
  if (history.length === 0) return state;
  const draft = search.historyDraft ?? search.query;
  const currentIndex = search.historyIndex;
  const nextIndex =
    direction === "previous"
      ? Math.max(0, currentIndex === undefined ? history.length - 1 : currentIndex - 1)
      : currentIndex === undefined
        ? undefined
        : currentIndex + 1;
  if (nextIndex === undefined) return state;
  if (nextIndex >= history.length) {
    return {
      ...state,
      pendingSearch: { ...search, query: draft, historyIndex: undefined, historyDraft: undefined },
    };
  }
  const entry = history[nextIndex];
  if (!entry) return state;
  return {
    ...state,
    pendingSearch: {
      ...search,
      query: historyText(entry),
      historyIndex: nextIndex,
      historyDraft: draft,
    },
  };
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
    return invalidate(
      searchForOptions(options).clearOnCancel ? clearSearchHighlight(cleared) : cleared,
    );
  }
  if (matchesKey(data, "ctrl+c") || matchesKey(data, "ctrl+g"))
    return resetAndDelegate(state, options, data);
  if (matchesKey(data, "enter") || matchesKey(data, "return")) {
    return completeSearch(state, snapshot, options, search);
  }
  if (matchesKey(data, "backspace")) {
    if (search.query.length === 0) return invalidate(state);
    return invalidate({
      ...state,
      pendingSearch: {
        ...search,
        query: search.query.slice(0, -1),
        historyIndex: undefined,
        historyDraft: undefined,
      },
    });
  }
  if (matchesKey(data, "up")) return invalidate(navigateSearchHistory(state, search, "previous"));
  if (matchesKey(data, "down")) return invalidate(navigateSearchHistory(state, search, "next"));

  const key = keySequence(data);
  if (!key || key.length !== 1) return invalidate(state);
  return invalidate({
    ...state,
    pendingSearch: {
      ...search,
      query: search.query + key,
      historyIndex: undefined,
      historyDraft: undefined,
    },
  });
}

function exLineRange(anchor: EditorSnapshot["cursor"], active: EditorSnapshot["cursor"]) {
  return {
    startLine: Math.min(anchor.line, active.line),
    endLine: Math.max(anchor.line, active.line),
  };
}

function startExCommandUpdate(state: ModalState, snapshot: EditorSnapshot, count = 1): ModalUpdate {
  const command =
    count > 1
      ? `${snapshot.cursor.line + 1},${Math.min(snapshot.lines.length - 1, snapshot.cursor.line + count - 1) + 1}`
      : "";
  return invalidate({
    ...clearPending(state),
    pendingEx: { command, sourceMode: "normal" },
  });
}

function startVisualExCommandUpdate(state: ModalState, snapshot: EditorSnapshot): ModalUpdate {
  if (!state.visualAnchor) return invalidate(state);
  return invalidate({
    ...clearPending(state),
    mode: state.mode,
    visualAnchor: state.visualAnchor,
    pendingEx: {
      command: "'<,'>",
      sourceMode: state.mode as "visual" | "visualLine" | "visualBlock",
      visualAnchor: state.visualAnchor,
      visualCursor: snapshot.cursor,
      visualRange: exLineRange(state.visualAnchor, snapshot.cursor),
    },
  });
}

const EX_HISTORY_LIMIT = 50;

function addExHistory(history: readonly string[] | undefined, command: string): string[] {
  if (command.length === 0) return [...(history ?? [])];
  const deduped = (history ?? []).filter((entry) => entry !== command);
  return [...deduped, command].slice(-EX_HISTORY_LIMIT);
}

function finishExState(state: ModalState, kind?: "error" | "success", text?: string): ModalState {
  const pendingEx = state.pendingEx;
  const nextHistory =
    kind === "success" && pendingEx
      ? addExHistory(state.exHistory, pendingEx.command)
      : state.exHistory;
  const base: ModalState = {
    ...clearPendingEx(state),
    mode: "normal",
    visualAnchor: undefined,
    exHistory: nextHistory,
  };
  if (pendingEx?.sourceMode !== "normal") {
    base.mode = "normal";
  }
  return kind && text ? { ...base, exMessage: { kind, text } } : base;
}

function cancelExCommand(state: ModalState): ModalUpdate {
  const pendingEx = state.pendingEx;
  if (!pendingEx) return invalidate(state);
  if (pendingEx.sourceMode === "normal")
    return invalidate({ ...clearPendingEx(state), mode: "normal" });
  return withEffects(
    {
      ...clearPendingEx(state),
      mode: pendingEx.sourceMode,
      visualAnchor: pendingEx.visualAnchor,
    },
    [
      ...(pendingEx.visualCursor
        ? [{ type: "restoreCursor" as const, position: pendingEx.visualCursor }]
        : []),
      { type: "invalidate" },
    ],
  );
}

function substitutionMessage(matches: number): string {
  return `${matches} ${matches === 1 ? "substitution" : "substitutions"}`;
}

function lineMessage(lines: number, verb: string): string {
  return `${lines} ${lines === 1 ? "line" : "lines"} ${verb}`;
}

function finishExEdit(
  state: ModalState,
  result: { edit: EditResult; lines: number },
  message: string,
  register?: VimRegister,
): ModalUpdate {
  const base = result.edit.changed ? clearSearchHighlight(state) : state;
  const next = register ? { ...base, register } : base;
  const finished = finishExState(next, "success", message);
  const effects: ModalEffect[] = result.edit.changed
    ? [{ type: "edit", result: result.edit }]
    : [{ type: "invalidate" }];
  return withEffects(finished, effects);
}

function executeExCommand(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
): ModalUpdate {
  const pendingEx = state.pendingEx;
  if (!pendingEx) return invalidate(state);
  const parsed = parseExCommand(pendingEx.command, {
    lineCount: snapshot.lines.length,
    cursorLine: snapshot.cursor.line,
    visualRange: pendingEx.visualRange,
    promptTransforms: promptTransformsForOptions(options),
  });
  if (parsed.type === "empty") return invalidate(finishExState(state));
  if (parsed.type === "error") return invalidate(finishExState(state, "error", parsed.message));

  if (parsed.type === "substitute") {
    if (pendingEx.preview?.command === pendingEx.command) {
      const result = pendingEx.preview;
      const finished = finishExState(
        result.edit.changed ? clearSearchHighlight(state) : state,
        "success",
        substitutionMessage(result.matches),
      );
      const effects: ModalEffect[] = result.edit.changed
        ? [{ type: "edit", result: result.edit }]
        : [{ type: "invalidate" }];
      return withEffects(finished, effects);
    }

    const optionsForSubstitution = {
      range: parsed.range,
      pattern: parsed.pattern,
      replacement: parsed.replacement,
      global: parsed.global,
      ignoreCase: parsed.ignoreCase,
      originalCursor: snapshot.cursor,
    };
    const result =
      parsed.matcherMode === "regex"
        ? substituteLineRangeRegex(snapshot.text, optionsForSubstitution)
        : {
            ok: true as const,
            ...substituteLineRangeLiteral(snapshot.text, optionsForSubstitution),
          };
    if (!result.ok) return invalidate(finishExState(state, "error", result.message));
    if (result.matches === 0) {
      return invalidate(finishExState(state, "error", `Pattern not found: ${parsed.pattern}`));
    }

    const message = `${result.matches} ${result.matches === 1 ? "match" : "matches"} found; Enter applies, Esc cancels`;
    return invalidate({
      ...state,
      pendingEx: {
        ...pendingEx,
        preview: {
          command: pendingEx.command,
          matches: result.matches,
          ranges: result.ranges,
          edit: result.edit,
          message,
        },
      },
    });
  }

  if (parsed.type === "nohlsearch") {
    return invalidate(finishExState(clearSearchHighlight(state)));
  }

  if (parsed.type === "transform") {
    const result = applyPromptTransform(
      snapshot.text,
      parsed.range,
      parsed.transform,
      snapshot.cursor,
    );
    if (!result.ok) return invalidate(finishExState(state, "error", result.message));
    return finishExEdit(state, result, lineMessage(result.lines, "transformed"));
  }

  if (parsed.type === "yank") {
    const result = yankExLineRange(snapshot.text, parsed.range);
    return invalidate(
      finishExState(
        { ...state, register: result.register },
        "success",
        lineMessage(result.lines, "yanked"),
      ),
    );
  }

  if (parsed.type === "delete") {
    const result = deleteExLineRange(snapshot.text, parsed.range);
    if (!result.ok) return invalidate(finishExState(state, "error", result.message));
    return finishExEdit(state, result, lineMessage(result.lines, "deleted"), result.edit.register);
  }

  if (parsed.type === "put") {
    const result = putExRegisterAfterRange(snapshot.text, parsed.range, state.register);
    if (!result.ok) return invalidate(finishExState(state, "error", result.message));
    return finishExEdit(state, result, lineMessage(result.lines, "put"));
  }

  if (parsed.type === "copy") {
    const result = copyExLineRange(snapshot.text, parsed.range, parsed.destination);
    if (!result.ok) return invalidate(finishExState(state, "error", result.message));
    return finishExEdit(state, result, lineMessage(result.lines, "copied"));
  }

  if (parsed.type === "move") {
    const result = moveExLineRange(snapshot.text, parsed.range, parsed.destination);
    if (!result.ok) return invalidate(finishExState(state, "error", result.message));
    return finishExEdit(state, result, lineMessage(result.lines, "moved"));
  }

  const result = joinExLineRange(snapshot.text, parsed.range, parsed.rangeExplicit);
  if (!result.ok) return invalidate(finishExState(state, "error", result.message));
  return finishExEdit(state, result, lineMessage(result.lines, "joined"));
}

function clearExPreview(pendingEx: NonNullable<ModalState["pendingEx"]>) {
  const { preview: _preview, ...rest } = pendingEx;
  return rest;
}

function navigateExHistory(
  state: ModalState,
  pendingEx: NonNullable<ModalState["pendingEx"]>,
  direction: "previous" | "next",
): ModalState {
  const history = state.exHistory ?? [];
  if (history.length === 0) return state;
  const draft = pendingEx.historyDraft ?? pendingEx.command;
  const currentIndex = pendingEx.historyIndex;
  const nextIndex =
    direction === "previous"
      ? Math.max(0, currentIndex === undefined ? history.length - 1 : currentIndex - 1)
      : currentIndex === undefined
        ? undefined
        : currentIndex + 1;
  if (nextIndex === undefined) return state;
  if (nextIndex >= history.length) {
    return {
      ...state,
      pendingEx: {
        ...clearExPreview(pendingEx),
        command: draft,
        historyIndex: undefined,
        historyDraft: undefined,
      },
    };
  }
  return {
    ...state,
    pendingEx: {
      ...clearExPreview(pendingEx),
      command: history[nextIndex] ?? draft,
      historyIndex: nextIndex,
      historyDraft: draft,
    },
  };
}

function handlePendingExInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
): ModalUpdate {
  const pendingEx = state.pendingEx;
  if (!pendingEx) return invalidate(state);
  if (matchesKey(data, "escape")) return cancelExCommand(state);
  if (matchesKey(data, "ctrl+c") || matchesKey(data, "ctrl+g"))
    return resetAndDelegate(state, options, data);
  if (matchesKey(data, "enter") || matchesKey(data, "return"))
    return executeExCommand(state, snapshot, options);
  if (matchesKey(data, "backspace")) {
    if (pendingEx.command.length === 0) return invalidate(state);
    return invalidate({
      ...state,
      pendingEx: {
        ...clearExPreview(pendingEx),
        command: pendingEx.command.slice(0, -1),
        historyIndex: undefined,
        historyDraft: undefined,
      },
    });
  }
  if (matchesKey(data, "up")) return invalidate(navigateExHistory(state, pendingEx, "previous"));
  if (matchesKey(data, "down")) return invalidate(navigateExHistory(state, pendingEx, "next"));

  const key = keySequence(data);
  if (!key || key.length !== 1) return invalidate(state);
  return invalidate({
    ...state,
    pendingEx: {
      ...clearExPreview(pendingEx),
      command: pendingEx.command + key,
      historyIndex: undefined,
      historyDraft: undefined,
    },
  });
}

function applyOperatorTextObject(
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

  if (isDelegatedResetKey(data)) return resetAndDelegate(state, options, data);
  if (isProtectedPiDelegateKey(data)) return delegate(state, data);

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
  if (!operator && keymap.set.includes(key)) return pendingMarkTarget("set");
  if (keymap.jumpExact.includes(key)) {
    return pendingMarkTarget("jumpExact", operator, operatorKey);
  }
  if (keymap.jumpLine.includes(key)) {
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
  if (isProtectedPiDelegateKey(data)) return delegateProtectedShortcut(state, data);

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
    const searchCommand = resolveNormalCommand(key, undefined, keymap);
    if (searchCommand.type === "command" && searchCommand.command === "startSearch") {
      return startSearchUpdate(state, "forward", pendingOperator);
    }
    if (searchCommand.type === "command" && searchCommand.command === "startSearchBackward") {
      return startSearchUpdate(state, "backward", pendingOperator);
    }
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
  if (pendingResult.type === "operatorSearch") {
    return startSearchUpdate(state, pendingResult.direction, pendingResult.operator);
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
  if (isProtectedPiDelegateKey(data)) return delegateProtectedShortcut(state, data);

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
    if (result.command === "startSearchBackward") return startSearchUpdate(state, "backward");
    if (result.command === "startExCommand") return startVisualExCommandUpdate(state, snapshot);
    if (result.command === "repeatSearch") return repeatSearch(state, snapshot, options, false);
    if (result.command === "repeatSearchReverse")
      return repeatSearch(state, snapshot, options, true);

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
    if (result.command === "toggleCase") {
      return toggleVisualSelection(state, snapshot, options, visualKindForMode(state.mode));
    }
    if (result.command === "pasteAfter") {
      if (state.mode === "visualLine") return pasteVisualLineSelection(state, snapshot, options);
      return invalidate(state.pendingRegister ? clearPending(state) : state);
    }
  }
  if (result.type === "pending") {
    const operator = operatorActionForSequence(result.pending, keymap);
    if (operator)
      return applyVisualOperator(
        state,
        snapshot,
        options,
        visualKindForMode(state.mode),
        operator,
        countForPendingSequence(result.pending),
      );
    if (state.pendingRegister) return invalidate(clearPending(state));
    return invalidate({ ...state, pending: result.pending });
  }
  if (result.type === "invalid") return invalidate(clearPending(state));

  return invalidate(state.pendingRegister ? clearPending(state) : state);
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
  return modeUpdate(editState(state, result), "normal", options, [{ type: "edit", result }]);
}

function applyVisualOperator(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  kind: "char" | "line" | "block",
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

function toggleVisualSelection(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  kind: "char" | "line" | "block",
): ModalUpdate {
  if (!state.visualAnchor) return modeUpdate(state, "normal", options);
  const result = toggleCaseVisualRange(snapshot.text, state.visualAnchor, snapshot.cursor, kind);
  return modeUpdate(editState(state, result), "normal", options, [{ type: "edit", result }]);
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
  const routedState = state.exMessage && !state.pendingEx ? clearExMessage(state) : state;
  if (routedState.pendingEx) return handlePendingExInput(routedState, snapshot, options, data);
  if (routedState.pendingSearch)
    return handlePendingSearchInput(routedState, snapshot, options, data);
  if (routedState.mode === "insert") return handleInsertInput(routedState, snapshot, options, data);
  if (
    routedState.mode === "visual" ||
    routedState.mode === "visualLine" ||
    routedState.mode === "visualBlock"
  ) {
    return handleVisualInput(routedState, snapshot, options, data);
  }
  return handleNormalInput(routedState, snapshot, options, data);
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
  if (!state.pendingEx && isDelegatedResetKey(data)) return false;

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
  return state.pendingEx
    ? `:${state.pendingEx.command}`
    : (pendingSearchDisplay(state.pendingSearch) ?? pendingMarkDisplay(state.pendingMark));
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
