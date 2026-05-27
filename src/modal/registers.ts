import type { VimRegister } from "../types.ts";
import type { ModalState, PendingRegisterTarget } from "./types.ts";

export function isRegisterPrefixKey(key: string): boolean {
  return key === '"';
}

export function registerTargetForKey(
  key: string,
): Exclude<PendingRegisterTarget, "awaitingSlot"> | undefined {
  if (!/^[A-Za-z]$/.test(key)) return undefined;
  return { slot: key.toLowerCase(), append: key >= "A" && key <= "Z" };
}

function activeTarget(
  target: PendingRegisterTarget | undefined,
): Exclude<PendingRegisterTarget, "awaitingSlot"> | undefined {
  return typeof target === "object" ? target : undefined;
}

export function appendRegister(previous: VimRegister | undefined, next: VimRegister): VimRegister {
  if (!previous || previous.text.length === 0) return next;
  if (next.text.length === 0) return previous;
  if (previous.type === "char" && next.type === "char") {
    return { type: "char", text: previous.text + next.text };
  }
  return { type: "line", text: [previous.text, next.text].filter(Boolean).join("\n") };
}

export function clearRegisterTarget(state: ModalState): ModalState {
  const { pendingRegister: _pendingRegister, ...rest } = state;
  return rest;
}

export function writeRegisters(state: ModalState, register: VimRegister | undefined): ModalState {
  const target = activeTarget(state.pendingRegister);
  const base = clearRegisterTarget(state);
  if (!register) return base;

  const nextState: ModalState = { ...base, register };
  if (!target) return nextState;

  const current = state.namedRegisters?.[target.slot];
  return {
    ...nextState,
    namedRegisters: {
      ...state.namedRegisters,
      [target.slot]: target.append ? appendRegister(current, register) : register,
    },
  };
}

export function registerToRead(state: ModalState): VimRegister | undefined {
  const target = activeTarget(state.pendingRegister);
  return target ? state.namedRegisters?.[target.slot] : state.register;
}
