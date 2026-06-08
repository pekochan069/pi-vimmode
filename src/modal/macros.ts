import type { MacroSlot, ModalOptions, ModalState, ModalUpdate, EditorSnapshot } from "./types.ts";

import { isMacroControlKey } from "../commands.ts";
import { keymapForOptions, macrosForOptions } from "../config.ts";
import { invalidate, isDelegatedResetKey, keyMatches, keySequence, withEffects } from "./core.ts";

export function macroTokens(state: Pick<ModalState, "macros">, slot: MacroSlot): readonly string[] {
  return state.macros?.[slot] ?? [];
}

export function macroSummary(
  state: Pick<ModalState, "macros" | "recordingSlot" | "lastPlayedMacro">,
): string {
  const slots = Object.keys(state.macros ?? {}).sort();
  const recording = state.recordingSlot ? ` recording=${state.recordingSlot}` : "";
  const last = state.lastPlayedMacro ? ` last=${state.lastPlayedMacro}` : "";
  return `${slots.length} slots${recording}${last}`;
}

export function clearPendingMacro(state: ModalState): ModalState {
  const { pendingMacro: _pendingMacro, ...rest } = state;
  return rest;
}

export function startMacroRecording(state: ModalState, slot: string): ModalUpdate {
  return invalidate({
    ...clearPendingMacro(state),
    macros: { ...state.macros, [slot]: [] },
    recordingSlot: slot,
  });
}

export function stopMacroRecording(state: ModalState): ModalUpdate {
  return invalidate({ ...clearPendingMacro(state), recordingSlot: undefined });
}

export function playMacroUpdate(
  state: ModalState,
  slot: string,
  options: ModalOptions,
): ModalUpdate {
  const inputs = macroTokens(state, slot).slice(0, macrosForOptions(options).maxReplaySteps);
  if (inputs.length === 0) return invalidate(clearPendingMacro(state));
  return withEffects({ ...clearPendingMacro(state), lastPlayedMacro: slot }, [
    { type: "playMacro", slot, inputs },
  ]);
}

export function appendRecordedInput(state: ModalState, slot: string, input: string): ModalState {
  return {
    ...state,
    macros: {
      ...state.macros,
      [slot]: [...(state.macros?.[slot] ?? []), input],
    },
  };
}

export function clearInvalidMacroPending(state: ModalState): ModalState {
  return clearPendingMacro(state);
}

export function shouldRecordInput(
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
  if (state.mode === "insert" && keyMatches(data, "escape") && snapshot.isAutocompleteOpen) {
    return false;
  }
  if (update.effects.some((effect) => effect.type === "playMacro")) return false;
  if (update.effects.some((effect) => effect.type === "delegate") && state.mode !== "insert") {
    return false;
  }
  return true;
}
