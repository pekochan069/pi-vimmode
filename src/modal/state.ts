import type { StartupMode, VimEditorOptions, VimMode } from "../types.ts";
import type { ModalEffect, ModalState, ModalUpdate } from "./types.ts";

import { cursorStyleForMode } from "../config.ts";

export function createModalState(mode: StartupMode): ModalState {
  return { mode };
}

export function resetTransientState(state: ModalState, mode: VimMode): ModalState {
  const nextState: ModalState = { mode };
  if (state.register) nextState.register = state.register;
  if (state.namedRegisters) nextState.namedRegisters = state.namedRegisters;
  if (state.macros) nextState.macros = state.macros;
  if (state.recordingSlot) nextState.recordingSlot = state.recordingSlot;
  if (state.lastPlayedMacro) nextState.lastPlayedMacro = state.lastPlayedMacro;
  if (state.marks) nextState.marks = state.marks;
  if (state.lastCharSearch) nextState.lastCharSearch = state.lastCharSearch;
  if (state.lastRepeatableChange) nextState.lastRepeatableChange = state.lastRepeatableChange;
  return nextState;
}

export function transitionMode(
  state: ModalState,
  mode: VimMode,
  options: VimEditorOptions,
  extraEffects: ModalEffect[] = [],
): ModalUpdate {
  const nextState = resetTransientState(state, mode);
  return {
    state: nextState,
    effects: [
      ...extraEffects,
      { type: "terminalCursor", style: cursorStyleForMode(options, mode) },
      { type: "invalidate" },
    ],
  };
}
