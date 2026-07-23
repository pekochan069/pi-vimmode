import type { StartupMode, ResolvedVimEditorOptions, VimMode } from "../types.ts";
import type { ModalEffect, ModalState, ModalUpdate } from "./types.ts";

import { cursorStyleForMode, searchForOptions } from "../config.ts";

export function createModalState(mode: StartupMode): ModalState {
  return { mode };
}

export function resetTransientState(state: ModalState, mode: VimMode): ModalState {
  const persistent = {
    register: state.register,
    namedRegisters: state.namedRegisters,
    clipboardRegisters: state.clipboardRegisters,
    macros: state.macros,
    recordingSlot: state.recordingSlot,
    lastPlayedMacro: state.lastPlayedMacro,
    marks: state.marks,
    lastCharSearch: state.lastCharSearch,
    lastSearch: state.lastSearch,
    searchHistory: state.searchHistory,
    searchHighlight: state.searchHighlight,
    messageHistory: state.messageHistory,
    exHistory: state.exHistory,
    lastExSubstitution: state.lastExSubstitution,
    lastRepeatableChange: state.lastRepeatableChange,
    lastVisualSelection: state.lastVisualSelection,
  };
  return { mode, ...Object.fromEntries(Object.entries(persistent).filter(([, value]) => value)) };
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
