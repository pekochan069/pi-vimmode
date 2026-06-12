import type { VimRegister } from "../types.ts";
import type {
  ActiveRegisterTarget,
  ModalEffect,
  ModalState,
  PendingRegisterTarget,
} from "./types.ts";

export function isRegisterPrefixKey(key: string): boolean {
  return key === '"';
}

export function registerTargetForKey(key: string): ActiveRegisterTarget | undefined {
  if (/^[A-Za-z]$/.test(key)) {
    return { kind: "named", slot: key.toLowerCase(), append: key >= "A" && key <= "Z" };
  }
  if (key === '"') return { kind: "unnamed" };
  if (key === "_") return { kind: "blackHole" };
  if (key === "+" || key === "*") return { kind: "clipboard", slot: key };
  return undefined;
}

function activeTarget(target: PendingRegisterTarget | undefined): ActiveRegisterTarget | undefined {
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

function writeNamedRegister(
  state: ModalState,
  target: Extract<ActiveRegisterTarget, { kind: "named" }>,
  register: VimRegister,
): ModalState {
  const current = state.namedRegisters?.[target.slot];
  return {
    ...state,
    namedRegisters: {
      ...state.namedRegisters,
      [target.slot]: target.append ? appendRegister(current, register) : register,
    },
  };
}

export function applyRegisterWrite(
  state: ModalState,
  register: VimRegister | undefined,
): { state: ModalState; effects: ModalEffect[] } {
  const target = activeTarget(state.pendingRegister);
  const base = clearRegisterTarget(state);
  if (!register) return { state: base, effects: [] };
  if (target?.kind === "blackHole") return { state: base, effects: [] };

  let nextState: ModalState = { ...base, register };
  if (!target || target.kind === "unnamed") return { state: nextState, effects: [] };
  if (target.kind === "named") {
    return { state: writeNamedRegister(nextState, target, register), effects: [] };
  }

  nextState = {
    ...nextState,
    clipboardRegisters: {
      ...state.clipboardRegisters,
      [target.slot]: register,
    },
  };
  return {
    state: nextState,
    effects: [{ type: "copyClipboard", register: target.slot, text: register.text }],
  };
}

export function writeRegisters(state: ModalState, register: VimRegister | undefined): ModalState {
  return applyRegisterWrite(state, register).state;
}

export function clipboardTargetToRead(
  state: ModalState,
): Extract<ActiveRegisterTarget, { kind: "clipboard" }> | undefined {
  const target = activeTarget(state.pendingRegister);
  return target?.kind === "clipboard" ? target : undefined;
}

export function registerToRead(state: ModalState): VimRegister | undefined {
  const target = activeTarget(state.pendingRegister);
  if (!target || target.kind === "unnamed") return state.register;
  if (target.kind === "named") return state.namedRegisters?.[target.slot];
  if (target.kind === "clipboard") return state.clipboardRegisters?.[target.slot];
  return undefined;
}
