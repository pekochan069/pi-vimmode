import type {
  CommandResult,
  NormalCommand,
  PendingOperator,
  VimMotion,
  VimOperator,
} from "./types.ts";

const VIM_OPERATORS = new Set<string>(["d", "c", "y"]);
const OPERATOR_MOTIONS = new Set<string>(["w", "b", "0", "^", "$"]);

function isVimOperator(key: string): key is VimOperator {
  return VIM_OPERATORS.has(key);
}

function isVimMotion(key: string): key is VimMotion {
  return OPERATOR_MOTIONS.has(key);
}

function lineCommandFor(operator: VimOperator): NormalCommand {
  if (operator === "d") return "dd";
  if (operator === "c") return "cc";
  return "yy";
}

export function parseNormalCommand(key: string, pending?: PendingOperator): CommandResult {
  if (pending) {
    if (pending === "g") {
      if (key === "g") return { type: "command", command: "gg" };
      return { type: "invalid" };
    }

    if (key === pending) return { type: "command", command: lineCommandFor(pending) };
    if (isVimMotion(key)) return { type: "operatorMotion", operator: pending, motion: key };
    return { type: "invalid" };
  }

  if (key === "g") return { type: "pending", operator: "g" };
  if (isVimOperator(key)) return { type: "pending", operator: key };
  return { type: "none" };
}

export function isPendingOperatorKey(key: string): key is PendingOperator {
  return key === "d" || key === "c" || key === "y" || key === "g";
}
