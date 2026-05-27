import { decodeKittyPrintable, matchesKey, parseKey } from "@earendil-works/pi-tui";

import type {
  EditResult,
  VimCommandAction,
  VimMode,
  VimMotion,
  VimMotionAction,
  VimOperatorAction,
  VimRegister,
} from "../types.ts";
import type {
  AdapterCommand,
  EditorSnapshot,
  ModalEffect,
  ModalOptions,
  ModalState,
  ModalUpdate,
} from "./types.ts";

import {
  changeLine,
  deleteBlockRange,
  deleteByMotion,
  deleteCharAt,
  deleteLine,
  deleteLineRange,
  deleteRange,
  insertBlockText,
  joinLineWithNext,
  navigateBuffer,
  openLineAbove,
  openLineBelow,
  pasteRegister,
  pasteRegisterBefore,
  replaceLineRangeWithRegister,
  yankByMotion,
  yankLine,
  yankVisualSelection,
} from "../buffer.ts";
import {
  isMacroControlKey,
  operatorActionForSequence,
  resolveMacroCommand,
  resolveNormalCommand,
  semanticMotionToLegacy,
} from "../commands.ts";
import { keymapForOptions, macrosForOptions } from "../config.ts";
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

function clearPending(state: ModalState): ModalState {
  return { ...state, pending: undefined, pendingMacro: undefined };
}

function clearPendingMacro(state: ModalState): ModalState {
  return { ...state, pendingMacro: undefined };
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
  return result.register ? { ...state, register: result.register } : state;
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
      state: { ...state, mode, pending: undefined },
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

function moveEffectFor(motion: VimMotionAction, snapshot: EditorSnapshot): ModalEffect | undefined {
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
): ModalUpdate {
  const effect = moveEffectFor(motion, snapshot);
  return withEffects(state, effect ? [effect, { type: "invalidate" }] : [{ type: "invalidate" }]);
}

function yankUpdate(state: ModalState, register: VimRegister | undefined): ModalUpdate {
  return invalidate(register ? { ...state, register } : state);
}

function operatorMotionKey(motion: VimMotionAction): VimMotion | undefined {
  return semanticMotionToLegacy(motion);
}

function applyOperatorMotion(
  state: ModalState,
  snapshot: EditorSnapshot,
  operator: VimOperatorAction,
  motion: VimMotionAction,
  options: ModalOptions,
): ModalUpdate {
  const legacyMotion = operatorMotionKey(motion);
  const baseState = clearPending(state);
  if (!legacyMotion) return invalidate(baseState);
  if (operator === "yank") {
    return yankUpdate(baseState, yankByMotion(snapshot.text, snapshot.cursor, legacyMotion));
  }

  const result = deleteByMotion(snapshot.text, snapshot.cursor, legacyMotion);
  const edited = editState(baseState, result);
  const effects: ModalEffect[] = [{ type: "edit", result }];
  if (operator === "change") return transitionMode(edited, "insert", options, effects);
  return withEffects(edited, effects);
}

function applyLineCommand(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  operator: VimOperatorAction,
): ModalUpdate {
  const nextState = clearPending(state);
  if (operator === "delete")
    return editUpdate(nextState, deleteLine(snapshot.text, snapshot.cursor));
  if (operator === "change") {
    const result = changeLine(snapshot.text, snapshot.cursor);
    return modeUpdate(editState(nextState, result), "insert", options, [{ type: "edit", result }]);
  }
  return yankUpdate(nextState, yankLine(snapshot.text, snapshot.cursor));
}

function applyCommand(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  command: VimCommandAction,
): ModalUpdate {
  const nextState = clearPending(state);
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
    case "deleteChar":
      return editUpdate(nextState, deleteCharAt(snapshot.text, snapshot.cursor));
    case "deleteToLineEnd":
      return editUpdate(nextState, deleteByMotion(snapshot.text, snapshot.cursor, "$"));
    case "changeToLineEnd": {
      const result = deleteByMotion(snapshot.text, snapshot.cursor, "$");
      return modeUpdate(editState(nextState, result), "insert", options, [
        { type: "edit", result },
      ]);
    }
    case "yankLine":
      return yankUpdate(nextState, yankLine(snapshot.text, snapshot.cursor));
    case "joinLine":
      return editUpdate(nextState, joinLineWithNext(snapshot.text, snapshot.cursor));
    case "pasteAfter":
      return editUpdate(nextState, pasteRegister(snapshot.text, snapshot.cursor, state.register));
    case "pasteBefore":
      return editUpdate(
        nextState,
        pasteRegisterBefore(snapshot.text, snapshot.cursor, state.register),
      );
    case "undo":
      return withEffects(nextState, [{ type: "adapterCommand", command: "undo" }]);
  }
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

  if (!state.pending) {
    const keymap = keymapForOptions(options);
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
  }

  const pendingResult = resolveNormalCommand(key, state.pending, keymapForOptions(options));
  if (pendingResult.type === "pending")
    return invalidate({ ...state, pending: pendingResult.pending });
  if (pendingResult.type === "motion")
    return moveUpdate(clearPending(state), pendingResult.motion, snapshot);
  if (pendingResult.type === "command")
    return applyCommand(state, snapshot, options, pendingResult.command);
  if (pendingResult.type === "lineCommand") {
    return applyLineCommand(state, snapshot, options, pendingResult.operator);
  }
  if (pendingResult.type === "operatorMotion") {
    return applyOperatorMotion(
      state,
      snapshot,
      pendingResult.operator,
      pendingResult.motion,
      options,
    );
  }
  if (pendingResult.type === "invalid") return invalidate(clearPending(state));

  return invalidate(state);
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

  const keymap = keymapForOptions(options);
  const result = resolveNormalCommand(key, state.pending, keymap);
  if (result.type === "motion") return moveUpdate(state, result.motion, snapshot);
  if (result.type === "command") {
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
      return invalidate(state);
    }
  }
  if (result.type === "pending") {
    const operator = operatorActionForSequence(result.pending, keymap);
    if (operator)
      return applyVisualOperator(state, snapshot, options, visualKindForMode(state.mode), operator);
    return invalidate({ ...state, pending: result.pending });
  }
  if (result.type === "invalid") return invalidate(clearPending(state));

  return invalidate(state);
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
  const nextState = register ? { ...state, register } : state;
  return modeUpdate(nextState, "normal", options);
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
    state.register,
  );
  return modeUpdate(editState(state, result), "normal", options, [{ type: "edit", result }]);
}

function routeModalInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
): ModalUpdate {
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
