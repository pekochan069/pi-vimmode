import type {
  CommandResult,
  NormalCommand,
  PendingOperator,
  ResolvedVimKeymap,
  VimCommandAction,
  VimMotion,
  VimMotionAction,
  VimOperator,
  VimOperatorAction,
} from "./types.ts";

import { DEFAULT_VIM_KEYMAP } from "./config.ts";

const LEGACY_VIM_OPERATORS = new Set<string>(["d", "c", "y"]);
const LEGACY_OPERATOR_MOTIONS = new Set<string>(["w", "b", "0", "^", "$"]);
const OPERATOR_MOTION_SEPARATOR = "\u0000motion\u0000";
const OPERATOR_LINE_SEPARATOR = "\u0000line\u0000";

export type SemanticCommandResult =
  | { type: "pending"; pending: string }
  | { type: "motion"; motion: VimMotionAction }
  | { type: "command"; command: VimCommandAction }
  | { type: "lineCommand"; operator: VimOperatorAction }
  | { type: "operatorMotion"; operator: VimOperatorAction; motion: VimMotionAction }
  | { type: "invalid" }
  | { type: "none" };

type Binding =
  | { sequence: string; kind: "operator"; operator: VimOperatorAction }
  | { sequence: string; kind: "motion"; motion: VimMotionAction }
  | { sequence: string; kind: "command"; command: VimCommandAction };

type EncodedOperatorMotionPending = {
  type: "operatorMotion";
  operatorSequence: string;
  motionPrefix: string;
};

type EncodedOperatorLinePending = {
  type: "operatorLine";
  operatorSequence: string;
  repeatPrefix: string;
};

const LEGACY_OPERATOR_TO_ACTION: Record<VimOperator, VimOperatorAction> = {
  d: "delete",
  c: "change",
  y: "yank",
};
const ACTION_TO_LEGACY_OPERATOR: Record<VimOperatorAction, VimOperator> = {
  delete: "d",
  change: "c",
  yank: "y",
};
const LEGACY_MOTION_TO_ACTION: Record<VimMotion, VimMotionAction> = {
  w: "wordForward",
  b: "wordBackward",
  "0": "lineStart",
  "^": "firstNonBlank",
  $: "lineEnd",
};
const ACTION_TO_LEGACY_MOTION: Partial<Record<VimMotionAction, VimMotion>> = {
  wordForward: "w",
  wordBackward: "b",
  lineStart: "0",
  firstNonBlank: "^",
  lineEnd: "$",
};

function isLegacyVimOperator(key: string): key is VimOperator {
  return LEGACY_VIM_OPERATORS.has(key);
}

function isLegacyVimMotion(key: string): key is VimMotion {
  return LEGACY_OPERATOR_MOTIONS.has(key);
}

function lineCommandFor(operator: VimOperator): NormalCommand {
  if (operator === "d") return "dd";
  if (operator === "c") return "cc";
  return "yy";
}

function bindingsFor(keymap: ResolvedVimKeymap): Binding[] {
  const bindings: Binding[] = [];
  for (const [operator, sequences] of Object.entries(keymap.operators) as [
    VimOperatorAction,
    readonly string[],
  ][]) {
    for (const sequence of sequences) bindings.push({ sequence, kind: "operator", operator });
  }
  for (const [motion, sequences] of Object.entries(keymap.motions) as [
    VimMotionAction,
    readonly string[],
  ][]) {
    for (const sequence of sequences) bindings.push({ sequence, kind: "motion", motion });
  }
  for (const [command, sequences] of Object.entries(keymap.commands) as [
    VimCommandAction,
    readonly string[],
  ][]) {
    for (const sequence of sequences) bindings.push({ sequence, kind: "command", command });
  }
  return bindings;
}

function exactBinding(sequence: string, keymap: ResolvedVimKeymap): Binding | undefined {
  return bindingsFor(keymap).find((binding) => binding.sequence === sequence);
}

function hasLongerPrefix(sequence: string, keymap: ResolvedVimKeymap): boolean {
  return bindingsFor(keymap).some(
    (binding) => binding.sequence.startsWith(sequence) && binding.sequence.length > sequence.length,
  );
}

export function pendingDisplay(pending: string | undefined): string | undefined {
  if (!pending) return undefined;
  const operatorMotion = decodeOperatorMotionPending(pending);
  if (operatorMotion) return `${operatorMotion.operatorSequence}${operatorMotion.motionPrefix}`;
  const operatorLine = decodeOperatorLinePending(pending);
  if (operatorLine) return `${operatorLine.operatorSequence}${operatorLine.repeatPrefix}`;
  return pending;
}

function encodeOperatorMotionPending(operatorSequence: string, motionPrefix: string): string {
  return `${operatorSequence}${OPERATOR_MOTION_SEPARATOR}${motionPrefix}`;
}

function encodeOperatorLinePending(operatorSequence: string, repeatPrefix: string): string {
  return `${operatorSequence}${OPERATOR_LINE_SEPARATOR}${repeatPrefix}`;
}

function decodeOperatorMotionPending(pending: string): EncodedOperatorMotionPending | undefined {
  const parts = pending.split(OPERATOR_MOTION_SEPARATOR);
  if (parts.length !== 2) return undefined;
  return { type: "operatorMotion", operatorSequence: parts[0] ?? "", motionPrefix: parts[1] ?? "" };
}

function decodeOperatorLinePending(pending: string): EncodedOperatorLinePending | undefined {
  const parts = pending.split(OPERATOR_LINE_SEPARATOR);
  if (parts.length !== 2) return undefined;
  return { type: "operatorLine", operatorSequence: parts[0] ?? "", repeatPrefix: parts[1] ?? "" };
}

export function operatorActionForSequence(
  sequence: string | undefined,
  keymap: ResolvedVimKeymap = DEFAULT_VIM_KEYMAP,
): VimOperatorAction | undefined {
  if (!sequence) return undefined;
  const binding = exactBinding(sequence, keymap);
  return binding?.kind === "operator" ? binding.operator : undefined;
}

function motionForSequence(
  sequence: string,
  keymap: ResolvedVimKeymap,
): VimMotionAction | undefined {
  const binding = exactBinding(sequence, keymap);
  return binding?.kind === "motion" ? binding.motion : undefined;
}

function hasMotionPrefix(sequence: string, keymap: ResolvedVimKeymap): boolean {
  return Object.values(keymap.motions).some((sequences) =>
    sequences.some(
      (motionSequence) =>
        motionSequence.startsWith(sequence) && motionSequence.length > sequence.length,
    ),
  );
}

function hasOperatorPrefix(
  sequence: string,
  keymap: ResolvedVimKeymap,
  operator: VimOperatorAction,
): boolean {
  return keymap.operators[operator].some(
    (operatorSequence) =>
      operatorSequence.startsWith(sequence) && operatorSequence.length > sequence.length,
  );
}

function operatorSequenceMatches(
  sequence: string,
  keymap: ResolvedVimKeymap,
  operator: VimOperatorAction,
): boolean {
  return keymap.operators[operator].includes(sequence);
}

function resolveOperatorMotionPending(
  pending: EncodedOperatorMotionPending,
  key: string,
  keymap: ResolvedVimKeymap,
): SemanticCommandResult {
  const operator = operatorActionForSequence(pending.operatorSequence, keymap);
  if (!operator) return { type: "invalid" };
  const motionSequence = pending.motionPrefix + key;
  const motion = motionForSequence(motionSequence, keymap);
  if (motion && keymap.operatorMotions[operator].includes(motion)) {
    return { type: "operatorMotion", operator, motion };
  }
  if (hasMotionPrefix(motionSequence, keymap)) {
    return {
      type: "pending",
      pending: encodeOperatorMotionPending(pending.operatorSequence, motionSequence),
    };
  }
  return { type: "invalid" };
}

function resolveOperatorLinePending(
  pending: EncodedOperatorLinePending,
  key: string,
  keymap: ResolvedVimKeymap,
): SemanticCommandResult {
  const operator = operatorActionForSequence(pending.operatorSequence, keymap);
  if (!operator) return { type: "invalid" };
  const repeatSequence = pending.repeatPrefix + key;
  if (operatorSequenceMatches(repeatSequence, keymap, operator)) {
    return { type: "lineCommand", operator };
  }
  if (hasOperatorPrefix(repeatSequence, keymap, operator)) {
    return {
      type: "pending",
      pending: encodeOperatorLinePending(pending.operatorSequence, repeatSequence),
    };
  }
  return { type: "invalid" };
}

function resolveAfterOperator(
  operatorSequence: string,
  key: string,
  keymap: ResolvedVimKeymap,
): SemanticCommandResult {
  const operator = operatorActionForSequence(operatorSequence, keymap);
  if (!operator) return { type: "invalid" };

  if (operatorSequenceMatches(key, keymap, operator)) return { type: "lineCommand", operator };
  if (hasOperatorPrefix(key, keymap, operator)) {
    return { type: "pending", pending: encodeOperatorLinePending(operatorSequence, key) };
  }

  const motion = motionForSequence(key, keymap);
  if (motion && keymap.operatorMotions[operator].includes(motion)) {
    return { type: "operatorMotion", operator, motion };
  }
  if (hasMotionPrefix(key, keymap)) {
    return { type: "pending", pending: encodeOperatorMotionPending(operatorSequence, key) };
  }
  return { type: "invalid" };
}

export function resolveNormalCommand(
  key: string,
  pending: string | undefined,
  keymap: ResolvedVimKeymap = DEFAULT_VIM_KEYMAP,
): SemanticCommandResult {
  if (pending) {
    const operatorMotion = decodeOperatorMotionPending(pending);
    if (operatorMotion) return resolveOperatorMotionPending(operatorMotion, key, keymap);
    const operatorLine = decodeOperatorLinePending(pending);
    if (operatorLine) return resolveOperatorLinePending(operatorLine, key, keymap);

    const combined = pending + key;
    const combinedBinding = exactBinding(combined, keymap);
    if (combinedBinding?.kind === "motion")
      return { type: "motion", motion: combinedBinding.motion };
    if (combinedBinding?.kind === "command")
      return { type: "command", command: combinedBinding.command };
    if (combinedBinding?.kind === "operator") return { type: "pending", pending: combined };
    if (hasLongerPrefix(combined, keymap)) return { type: "pending", pending: combined };

    const pendingOperator = operatorActionForSequence(pending, keymap);
    if (pendingOperator) return resolveAfterOperator(pending, key, keymap);
    return { type: "invalid" };
  }

  const binding = exactBinding(key, keymap);
  if (binding?.kind === "operator") return { type: "pending", pending: key };
  if (binding?.kind === "motion") return { type: "motion", motion: binding.motion };
  if (binding?.kind === "command") return { type: "command", command: binding.command };
  if (hasLongerPrefix(key, keymap)) return { type: "pending", pending: key };
  return { type: "none" };
}

export function semanticOperatorToLegacy(operator: VimOperatorAction): VimOperator {
  return ACTION_TO_LEGACY_OPERATOR[operator];
}

export function semanticMotionToLegacy(motion: VimMotionAction): VimMotion | undefined {
  return ACTION_TO_LEGACY_MOTION[motion];
}

export function parseNormalCommand(key: string, pending?: PendingOperator): CommandResult {
  const result = resolveNormalCommand(key, pending, DEFAULT_VIM_KEYMAP);
  if (result.type === "pending")
    return { type: "pending", operator: pendingDisplay(result.pending) ?? result.pending };
  if (result.type === "lineCommand")
    return { type: "command", command: lineCommandFor(semanticOperatorToLegacy(result.operator)) };
  if (result.type === "motion" && result.motion === "bufferStart")
    return { type: "command", command: "gg" };
  if (result.type === "operatorMotion") {
    const motion = semanticMotionToLegacy(result.motion);
    if (!motion) return { type: "invalid" };
    return { type: "operatorMotion", operator: semanticOperatorToLegacy(result.operator), motion };
  }
  if (result.type === "invalid") return { type: "invalid" };
  return { type: "none" };
}

export function isPendingOperatorKey(key: string): key is PendingOperator {
  return key === "g" || isLegacyVimOperator(key);
}

export function isDefaultOperatorKey(key: string): key is VimOperator {
  return isLegacyVimOperator(key);
}

export function isDefaultOperatorMotionKey(key: string): key is VimMotion {
  return isLegacyVimMotion(key);
}

export function legacyMotionToSemantic(motion: VimMotion): VimMotionAction {
  return LEGACY_MOTION_TO_ACTION[motion];
}

export function legacyOperatorToSemantic(operator: VimOperator): VimOperatorAction {
  return LEGACY_OPERATOR_TO_ACTION[operator];
}
