import type { Position, VimOperatorAction } from "../types.ts";
import type { MarkSlot, ModalState, PendingMarkTarget } from "./types.ts";

export function isMarkSetPrefixKey(key: string): boolean {
  return key === "m";
}

export function isExactMarkJumpPrefixKey(key: string): boolean {
  return key === "`";
}

export function isLineMarkJumpPrefixKey(key: string): boolean {
  return key === "'";
}

export function markSlotForKey(key: string): MarkSlot | undefined {
  return /^[a-z]$/.test(key) ? key : undefined;
}

export function pendingMarkDisplay(target: PendingMarkTarget | undefined): string | undefined {
  if (!target) return undefined;
  const prefix = target.kind === "set" ? "m" : target.kind === "jumpExact" ? "`" : "'";
  return target.operator ? `${target.operatorKey}${prefix}` : prefix;
}

export function clearMarkTarget(state: ModalState): ModalState {
  const { pendingMark: _pendingMark, ...rest } = state;
  return rest;
}

export function setLocalMark(state: ModalState, slot: MarkSlot, position: Position): ModalState {
  return {
    ...clearMarkTarget(state),
    marks: {
      ...state.marks,
      [slot]: position,
    },
  };
}

export function localMarkPosition(state: ModalState, slot: MarkSlot): Position | undefined {
  return state.marks?.[slot];
}

export function pendingMarkTarget(
  kind: PendingMarkTarget["kind"],
  operator?: VimOperatorAction,
  operatorKey?: string,
): PendingMarkTarget {
  return operator ? { kind, operator, operatorKey: operatorKey ?? operator[0] ?? "" } : { kind };
}
