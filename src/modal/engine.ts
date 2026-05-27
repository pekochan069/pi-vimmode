import { decodeKittyPrintable, matchesKey } from "@earendil-works/pi-tui";

import type { EditResult, VimMode, VimMotion, VimOperator, VimRegister } from "../types.ts";
import type {
  AdapterCommand,
  EditorSnapshot,
  ModalEffect,
  ModalOptions,
  ModalState,
  ModalUpdate,
} from "./types.ts";

import {
  bufferEndPosition,
  bufferStartPosition,
  changeLine,
  deleteByMotion,
  deleteCharAt,
  deleteLine,
  deleteLineRange,
  deleteRange,
  firstNonBlankPosition,
  joinLineWithNext,
  matchingPairPosition,
  openLineAbove,
  openLineBelow,
  pasteRegister,
  pasteRegisterBefore,
  selectionText,
  yankByMotion,
  yankLine,
  yankLineRange,
} from "../buffer.ts";
import { parseNormalCommand } from "../commands.ts";
import { resetTransientState, transitionMode } from "./state.ts";

export type VimMoveKey =
  | "h"
  | "j"
  | "k"
  | "l"
  | "0"
  | "$"
  | "w"
  | "b"
  | "gg"
  | "G"
  | "^"
  | "_"
  | "%";

function printableKey(data: string): string | undefined {
  return (
    decodeKittyPrintable(data) ?? (data.length === 1 && data.charCodeAt(0) >= 32 ? data : undefined)
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
  return { ...state, pending: undefined };
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
  if (mode === "visual" || mode === "visualLine") {
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

function moveEffectFor(key: VimMoveKey, snapshot: EditorSnapshot): ModalEffect | undefined {
  const adapterCommands: Partial<Record<VimMoveKey, AdapterCommand>> = {
    h: "left",
    j: "down",
    k: "up",
    l: "right",
    "0": "lineStart",
    $: "lineEnd",
    w: "wordRight",
    b: "wordLeft",
  };
  const command = adapterCommands[key];
  if (command) return { type: "adapterCommand", command };
  if (key === "gg") return { type: "restoreCursor", position: bufferStartPosition() };
  if (key === "G") return { type: "restoreCursor", position: bufferEndPosition(snapshot.text) };
  if (key === "^" || key === "_") {
    return {
      type: "restoreCursor",
      position: firstNonBlankPosition(snapshot.text, snapshot.cursor),
    };
  }
  if (key === "%") {
    const target = matchingPairPosition(snapshot.text, snapshot.cursor);
    return target ? { type: "restoreCursor", position: target } : undefined;
  }
}

function moveUpdate(state: ModalState, key: VimMoveKey, snapshot: EditorSnapshot): ModalUpdate {
  const effect = moveEffectFor(key, snapshot);
  return withEffects(state, effect ? [effect, { type: "invalidate" }] : [{ type: "invalidate" }]);
}

function yankUpdate(state: ModalState, register: VimRegister | undefined): ModalUpdate {
  return invalidate(register ? { ...state, register } : state);
}

function applyOperatorMotion(
  state: ModalState,
  snapshot: EditorSnapshot,
  operator: VimOperator,
  motion: VimMotion,
  options: ModalOptions,
): ModalUpdate {
  const baseState = clearPending(state);
  if (operator === "y") {
    return yankUpdate(baseState, yankByMotion(snapshot.text, snapshot.cursor, motion));
  }

  const edited = editState(baseState, deleteByMotion(snapshot.text, snapshot.cursor, motion));
  const effects: ModalEffect[] = [
    { type: "edit", result: deleteByMotion(snapshot.text, snapshot.cursor, motion) },
  ];
  if (operator === "c") {
    const transitioned = transitionMode(edited, "insert", options, effects);
    return transitioned;
  }
  return withEffects(edited, effects);
}

function handleNormalPrintable(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  key: string,
): ModalUpdate {
  switch (key) {
    case "h":
    case "j":
    case "k":
    case "l":
    case "0":
    case "$":
    case "w":
    case "b":
    case "G":
    case "^":
    case "_":
    case "%":
      return moveUpdate(state, key, snapshot);
    case "i":
      return modeUpdate(state, "insert", options);
    case "a":
      return modeUpdate(state, "insert", options, [
        { type: "adapterCommand", command: "right" },
        { type: "invalidate" },
      ]);
    case "I":
      return modeUpdate(state, "insert", options, [
        { type: "adapterCommand", command: "lineStart" },
        { type: "invalidate" },
      ]);
    case "A":
      return modeUpdate(state, "insert", options, [
        { type: "adapterCommand", command: "lineEnd" },
        { type: "invalidate" },
      ]);
    case "o":
      return modeUpdate(
        editState(state, openLineBelow(snapshot.text, snapshot.cursor)),
        "insert",
        options,
        [{ type: "edit", result: openLineBelow(snapshot.text, snapshot.cursor) }],
      );
    case "O":
      return modeUpdate(
        editState(state, openLineAbove(snapshot.text, snapshot.cursor)),
        "insert",
        options,
        [{ type: "edit", result: openLineAbove(snapshot.text, snapshot.cursor) }],
      );
    case "v":
      return modeUpdate({ ...state, visualAnchor: snapshot.cursor }, "visual", options);
    case "V":
      return modeUpdate({ ...state, visualAnchor: snapshot.cursor }, "visualLine", options);
    case "x":
      return editUpdate(state, deleteCharAt(snapshot.text, snapshot.cursor));
    case "D":
      return editUpdate(state, deleteByMotion(snapshot.text, snapshot.cursor, "$"));
    case "C": {
      const result = deleteByMotion(snapshot.text, snapshot.cursor, "$");
      return modeUpdate(editState(state, result), "insert", options, [{ type: "edit", result }]);
    }
    case "Y":
      return yankUpdate(state, yankLine(snapshot.text, snapshot.cursor));
    case "J":
      return editUpdate(state, joinLineWithNext(snapshot.text, snapshot.cursor));
    case "p":
      return editUpdate(state, pasteRegister(snapshot.text, snapshot.cursor, state.register));
    case "P":
      return editUpdate(state, pasteRegisterBefore(snapshot.text, snapshot.cursor, state.register));
    case "u":
      return withEffects(state, [{ type: "adapterCommand", command: "undo" }]);
  }

  return invalidate(state);
}

function handleInsertInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
): ModalUpdate {
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

  const key = printableKey(data);
  if (!key) {
    const nextState = clearPending(state);
    return withEffects(nextState, [{ type: "delegate", input: data }, { type: "invalidate" }]);
  }

  const pendingResult = parseNormalCommand(key, state.pending);
  if (pendingResult.type === "pending") {
    return invalidate({ ...state, pending: pendingResult.operator });
  }
  if (pendingResult.type === "command") {
    const nextState = clearPending(state);
    if (pendingResult.command === "dd")
      return editUpdate(nextState, deleteLine(snapshot.text, snapshot.cursor));
    if (pendingResult.command === "cc") {
      const result = changeLine(snapshot.text, snapshot.cursor);
      return modeUpdate(editState(nextState, result), "insert", options, [
        { type: "edit", result },
      ]);
    }
    if (pendingResult.command === "yy")
      return yankUpdate(nextState, yankLine(snapshot.text, snapshot.cursor));
    return moveUpdate(nextState, "gg", snapshot);
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

  return handleNormalPrintable(state, snapshot, options, key);
}

function handleVisualInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
  linewise: boolean,
): ModalUpdate {
  if (matchesKey(data, "escape")) return modeUpdate(state, "normal", options);
  if (isDelegatedResetKey(data)) return resetAndDelegate(state, options, data);

  const key = printableKey(data);
  if (!key) return delegate(state, data);

  switch (key) {
    case "h":
    case "j":
    case "k":
    case "l":
    case "0":
    case "$":
    case "w":
    case "b":
      return moveUpdate(state, key, snapshot);
    case "V":
      return linewise ? invalidate(state) : modeUpdate(state, "visualLine", options);
    case "v":
      return linewise ? modeUpdate(state, "visual", options) : invalidate(state);
    case "y":
      if (!state.visualAnchor) return modeUpdate(state, "normal", options);
      return yankVisualSelection(state, snapshot, options, linewise);
    case "d":
    case "x":
      return deleteVisualSelection(state, snapshot, options, "normal", linewise);
    case "c":
      return deleteVisualSelection(state, snapshot, options, "insert", linewise);
  }

  return invalidate(state);
}

function yankVisualSelection(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  linewise: boolean,
): ModalUpdate {
  if (!state.visualAnchor) return modeUpdate(state, "normal", options);
  if (linewise) {
    return modeUpdate(
      { ...state, register: yankLineRange(snapshot.text, state.visualAnchor, snapshot.cursor) },
      "normal",
      options,
    );
  }

  const selected = selectionText(snapshot.text, state.visualAnchor, snapshot.cursor);
  const nextState =
    selected.length > 0 ? { ...state, register: { type: "char" as const, text: selected } } : state;
  return modeUpdate(nextState, "normal", options);
}

function deleteVisualSelection(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  nextMode: VimMode,
  linewise: boolean,
): ModalUpdate {
  if (!state.visualAnchor) return modeUpdate(state, nextMode, options);
  const result = linewise
    ? deleteLineRange(snapshot.text, state.visualAnchor, snapshot.cursor)
    : deleteRange(snapshot.text, state.visualAnchor, snapshot.cursor);
  return modeUpdate(editState(state, result), nextMode, options, [{ type: "edit", result }]);
}

export function handleModalInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
): ModalUpdate {
  if (state.mode === "insert") return handleInsertInput(state, snapshot, options, data);
  if (state.mode === "visual") return handleVisualInput(state, snapshot, options, data, false);
  if (state.mode === "visualLine") return handleVisualInput(state, snapshot, options, data, true);
  return handleNormalInput(state, snapshot, options, data);
}
