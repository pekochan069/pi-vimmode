import type { StartupMode, VimEditorOptions, VimMode } from "../types.ts";
import type { ModalEffect, ModalState, ModalUpdate } from "./types.ts";

import { cursorStyleForMode } from "../config.ts";

export function createModalState(mode: StartupMode): ModalState {
  return { mode };
}

export function resetTransientState(state: ModalState, mode: VimMode): ModalState {
  return {
    mode,
    register: state.register,
  };
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
