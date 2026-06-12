import { matchesKey, parseKey } from "@earendil-works/pi-tui";

import type { VimDiagnostics, VimOperatorAction } from "../types.ts";
import type {
  EditorSnapshot,
  ModalEffect,
  ModalOptions,
  ModalState,
  ModalUpdate,
} from "./types.ts";

import {
  deleteLineMarkRange,
  deleteMarkRange,
  exactMarkPosition,
  lineMarkPosition,
  yankLineMarkRange,
  yankMarkRange,
} from "../buffer.ts";
import {
  countForPendingSequence,
  isMacroControlKey,
  operatorActionForSequence,
  resolveMacroCommand,
  resolveNormalCommand,
} from "../commands.ts";
import { keymapForOptions, macrosForOptions, marksForOptions } from "../config.ts";
import { protectedShortcutForKey } from "../customization.ts";
import { scrollHelpPopup } from "../read-only-popup.ts";
import { applyPromptTransformAction, applyVisualPromptTransformAction } from "./actions.ts";
import {
  clearCommandPending,
  clearExMessage,
  clearHelpPopup,
  clearPending,
  delegate,
  editState,
  invalidate,
  isDelegatedResetKey,
  isProtectedPiDelegateKey,
  keySequence,
  modeUpdate,
  resetAndDelegate,
  withEffects,
  withNoopFeedback,
  yankUpdate,
} from "./core.ts";
import { exDisplay, handlePendingExInput, startVisualExCommandUpdate } from "./ex-command-line.ts";
import {
  appendRecordedInput,
  clearPendingMacro,
  playMacroUpdate,
  shouldRecordInput,
  startMacroRecording,
  stopMacroRecording,
} from "./macros.ts";
import {
  clearMarkTarget,
  localMarkPosition,
  markSlotForKey,
  pendingMarkDisplay,
  pendingMarkTarget,
  setLocalMark,
} from "./marks.ts";
import {
  applyCommand,
  applyLineCommand,
  applyOperatorCharSearch,
  applyOperatorCharSearchRepeat,
  applyOperatorMotion,
  applyOperatorTextObject,
  moveUpdate,
} from "./normal.ts";
import { clearRegisterTarget, isRegisterPrefixKey, registerTargetForKey } from "./registers.ts";
import {
  handlePendingSearchInput,
  pendingSearchDisplay,
  repeatSearch,
  startSearchUpdate,
} from "./search.ts";
import { transitionMode } from "./state.ts";
import {
  applyVisualOperator,
  deleteVisualSelection,
  handleBlockInsertInput,
  pasteVisualLineSelection,
  replaceVisualSelection,
  startBlockInsert,
  toggleVisualSelection,
  visualKindForMode,
} from "./visual.ts";

function protectedShortcutMessage(data: string): string {
  const key = parseKey(data) ?? data;
  const shortcut = protectedShortcutForKey(key);
  return shortcut
    ? `${shortcut.key} protected for ${shortcut.reason}`
    : "protected Pi shortcut delegated";
}

function delegateProtectedShortcut(
  state: ModalState,
  options: ModalOptions,
  input: string,
): ModalUpdate {
  const cleared = clearPending(state);
  const next = withNoopFeedback(cleared, options, protectedShortcutMessage(input));
  return withEffects(next, [{ type: "delegate", input }, { type: "invalidate" }]);
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
  if (isProtectedPiDelegateKey(data)) return delegateProtectedShortcut(state, options, data);

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
  if (pendingResult.type === "action") {
    if (state.pendingRegister) return invalidate(clearPending(state));
    return applyPromptTransformAction(state, snapshot, options, pendingResult);
  }
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
  if (pendingResult.type === "operatorCharSearch") {
    return applyOperatorCharSearch(
      state,
      snapshot,
      pendingResult.operator,
      pendingResult.command,
      pendingResult.char,
      options,
      pendingResult.count,
    );
  }
  if (pendingResult.type === "operatorCharSearchRepeat") {
    return applyOperatorCharSearchRepeat(
      state,
      snapshot,
      pendingResult.operator,
      pendingResult.reverse,
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
  if (pendingResult.type === "invalid") {
    return invalidate(withNoopFeedback(clearPending(state), options, "invalid Vim key sequence"));
  }

  if (state.pendingRegister) return invalidate(clearPending(state));
  return invalidate(withNoopFeedback(state, options, `unmapped key: ${key}`));
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
  if (isProtectedPiDelegateKey(data)) return delegateProtectedShortcut(state, options, data);

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
  if (result.type === "action") {
    if (state.pendingRegister) return invalidate(clearPending(state));
    return applyVisualPromptTransformAction(state, snapshot, options, result);
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

function handleHelpPopupInput(state: ModalState, options: ModalOptions, data: string): ModalUpdate {
  if (matchesKey(data, "escape")) return invalidate(clearHelpPopup(state));
  if (isDelegatedResetKey(data)) return resetAndDelegate(state, options, data);
  if (isProtectedPiDelegateKey(data)) return delegateProtectedShortcut(state, options, data);

  if (!state.helpPopup) return invalidate(state);
  if (matchesKey(data, "down")) {
    return invalidate({ ...state, helpPopup: scrollHelpPopup(state.helpPopup, 1) });
  }
  if (matchesKey(data, "up")) {
    return invalidate({ ...state, helpPopup: scrollHelpPopup(state.helpPopup, -1) });
  }

  const key = keySequence(data);
  if (key === "j") return invalidate({ ...state, helpPopup: scrollHelpPopup(state.helpPopup, 1) });
  if (key === "k") return invalidate({ ...state, helpPopup: scrollHelpPopup(state.helpPopup, -1) });
  if (key === "g")
    return invalidate({ ...state, helpPopup: { ...state.helpPopup, scrollOffset: 0 } });
  if (key === "G") {
    return invalidate({
      ...state,
      helpPopup: scrollHelpPopup(state.helpPopup, state.helpPopup.lines.length),
    });
  }

  return invalidate(state);
}

function routeModalInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
  diagnostics: VimDiagnostics,
): ModalUpdate {
  const routedState = state.exMessage && !state.pendingEx ? clearExMessage(state) : state;
  if (routedState.helpPopup) return handleHelpPopupInput(routedState, options, data);
  if (routedState.pendingEx)
    return handlePendingExInput(routedState, snapshot, options, data, diagnostics);
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

export function modalPendingDisplay(state: ModalState): string | undefined {
  return (
    exDisplay(state.pendingEx) ??
    pendingSearchDisplay(state.pendingSearch) ??
    pendingMarkDisplay(state.pendingMark)
  );
}

export function handleModalInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
  diagnostics: VimDiagnostics = { warnings: [] },
): ModalUpdate {
  const update = routeModalInput(state, snapshot, options, data, diagnostics);
  if (!state.recordingSlot || !shouldRecordInput(state, snapshot, update, options, data))
    return update;
  return {
    ...update,
    state: appendRecordedInput(update.state, state.recordingSlot, data),
  };
}
