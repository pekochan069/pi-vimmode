import type { StartupMode, ResolvedVimEditorOptions, VimMode } from "../types.ts";
import type { ModalEffect, ModalState, ModalUpdate } from "./types.ts";

import { cursorStyleForMode, searchForOptions } from "../config.ts";

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
  if (state.lastSearch) nextState.lastSearch = state.lastSearch;
  if (state.searchHighlight) nextState.searchHighlight = state.searchHighlight;
  if (state.messageHistory) nextState.messageHistory = state.messageHistory;
  if (state.lastExSubstitution) nextState.lastExSubstitution = state.lastExSubstitution;
  if (state.lastRepeatableChange) nextState.lastRepeatableChange = state.lastRepeatableChange;
  return nextState;
}

function clearHighlightsForMode(
  state: ModalState,
  mode: VimMode,
  options: ResolvedVimEditorOptions,
): ModalState {
  if (mode !== "insert" || !searchForOptions(options).clearOnInsert) return state;
  const { searchHighlight: _searchHighlight, ...rest } = state;
  return rest;
}

export function transitionMode(
  state: ModalState,
  mode: VimMode,
  options: ResolvedVimEditorOptions,
  extraEffects: ModalEffect[] = [],
): ModalUpdate {
  const nextState = clearHighlightsForMode(resetTransientState(state, mode), mode, options);
  return {
    state: nextState,
    effects: [
      ...extraEffects,
      { type: "terminalCursor", style: cursorStyleForMode(options, mode) },
      { type: "invalidate" },
    ],
  };
}
