import { decodeKittyPrintable, matchesKey, parseKey } from "@earendil-works/pi-tui";

import type { EditResult, VimMode, VimOperatorAction, VimRegister } from "../types.ts";
import type {
  EditorSnapshot,
  ExMessage,
  ModalEffect,
  ModalOptions,
  ModalState,
  ModalUpdate,
} from "./types.ts";

import { feedbackForOptions, searchForOptions } from "../config.ts";
import { appendMessageHistory } from "./inspect.ts";
import { clearMarkTarget } from "./marks.ts";
import { applyRegisterWrite, clearRegisterTarget } from "./registers.ts";
import { resetTransientState, transitionMode } from "./state.ts";

export function keySequence(data: string): string | undefined {
  return (
    decodeKittyPrintable(data) ??
    (data.length === 1 && data.charCodeAt(0) >= 32 ? data : undefined) ??
    parseKey(data)
  );
}

export function keyMatches(data: string, key: Parameters<typeof matchesKey>[1]): boolean {
  return matchesKey(data, key);
}

export function parsedKey(data: string): string | undefined {
  return parseKey(data);
}

export function isDelegatedResetKey(data: string): boolean {
  return keyMatches(data, "enter") || keyMatches(data, "ctrl+c") || keyMatches(data, "ctrl+g");
}

const PROTECTED_PI_DELEGATE_KEYS = [
  "tab",
  "shift+enter",
  "ctrl+l",
  "ctrl+p",
  "shift+ctrl+p",
  "ctrl+shift+p",
  "ctrl+t",
  "shift+tab",
] as const;

export function isProtectedPiDelegateKey(data: string): boolean {
  return PROTECTED_PI_DELEGATE_KEYS.some((key) => keyMatches(data, key));
}

export function shiftActionForOperator(
  operator: VimOperatorAction,
): "indent" | "dedent" | undefined {
  if (operator === "indent") return "indent";
  if (operator === "dedent") return "dedent";
  return undefined;
}

export function withEffects(state: ModalState, effects: ModalEffect[]): ModalUpdate {
  return { state, effects };
}

export function invalidate(state: ModalState): ModalUpdate {
  return withEffects(state, [{ type: "invalidate" }]);
}

export function delegate(state: ModalState, input: string): ModalUpdate {
  return withEffects(state, [{ type: "delegate", input }]);
}

export function withRuntimeMessage(
  state: ModalState,
  message: ExMessage,
  retain = true,
): ModalState {
  return {
    ...state,
    exMessage: message,
    ...(retain ? { messageHistory: appendMessageHistory(state.messageHistory, message) } : {}),
  };
}

export function withNoopFeedback(
  state: ModalState,
  options: ModalOptions,
  text: string,
): ModalState {
  return feedbackForOptions(options).noop === "status"
    ? withRuntimeMessage(state, { kind: "info", text })
    : state;
}

export function clearSearchHighlight(state: ModalState): ModalState {
  const { searchHighlight: _searchHighlight, ...rest } = state;
  return rest;
}

export function clearExMessage(state: ModalState): ModalState {
  const { exMessage: _exMessage, ...rest } = state;
  return rest;
}

export function clearHelpPopup(state: ModalState): ModalState {
  const { helpPopup: _helpPopup, ...rest } = state;
  return rest;
}

export function clearPendingEx(state: ModalState): ModalState {
  const { pendingEx: _pendingEx, ...rest } = state;
  return rest;
}

export function withSearchHighlight(
  state: ModalState,
  options: ModalOptions,
  query: string,
  current: EditorSnapshot["cursor"],
): ModalState {
  return searchForOptions(options).highlight
    ? { ...state, searchHighlight: { query, current } }
    : state;
}

export function clearCommandPending(state: ModalState): ModalState {
  const {
    pending: _pending,
    pendingMacro: _pendingMacro,
    pendingMark: _pendingMark,
    pendingSearch: _pendingSearch,
    pendingEx: _pendingEx,
    pendingInsertEscape: _pendingInsertEscape,
    exMessage: _exMessage,
    helpPopup: _helpPopup,
    ...rest
  } = state;
  return rest;
}

export function clearPending(state: ModalState): ModalState {
  return clearMarkTarget(clearRegisterTarget(clearCommandPending(state)));
}

export function editStateAndEffects(
  state: ModalState,
  result: EditResult,
): { state: ModalState; effects: ModalEffect[] } {
  const nextState = result.changed ? clearSearchHighlight(state) : state;
  return applyRegisterWrite(nextState, result.register);
}

export function editState(state: ModalState, result: EditResult): ModalState {
  return editStateAndEffects(state, result).state;
}

export function editUpdate(state: ModalState, result: EditResult): ModalUpdate {
  const written = editStateAndEffects(state, result);
  return withEffects(written.state, [{ type: "edit", result }, ...written.effects]);
}

export function yankUpdate(state: ModalState, register: VimRegister | undefined): ModalUpdate {
  const written = applyRegisterWrite(state, register);
  return withEffects(written.state, [...written.effects, { type: "invalidate" }]);
}

export function modeUpdate(
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

export function resetAndDelegate(
  state: ModalState,
  options: ModalOptions,
  input: string,
): ModalUpdate {
  const reset = resetTransientState(state, options.startMode);
  return withEffects(reset, [
    { type: "terminalCursor", style: options.cursor[options.startMode] },
    { type: "invalidate" },
    { type: "delegate", input },
  ]);
}
