import { describe, expect, test } from "bun:test";

import { isPendingOperatorKey, parseNormalCommand, resolveNormalCommand } from "../src/commands.ts";
import { DEFAULT_VIM_KEYMAP } from "../src/config.ts";

const operatorMotions = ["w", "b", "0", "^", "$"] as const;

describe("normal command parser", () => {
  test("creates pending state for operators and g prefix", () => {
    expect(parseNormalCommand("d")).toEqual({ type: "pending", operator: "d" });
    expect(parseNormalCommand("c")).toEqual({ type: "pending", operator: "c" });
    expect(parseNormalCommand("y")).toEqual({ type: "pending", operator: "y" });
    expect(parseNormalCommand("g")).toEqual({ type: "pending", operator: "g" });
  });

  test("resolves doubled line commands and gg", () => {
    expect(parseNormalCommand("d", "d")).toEqual({ type: "command", command: "dd" });
    expect(parseNormalCommand("c", "c")).toEqual({ type: "command", command: "cc" });
    expect(parseNormalCommand("y", "y")).toEqual({ type: "command", command: "yy" });
    expect(parseNormalCommand("g", "g")).toEqual({ type: "command", command: "gg" });
  });

  test("resolves operator motions", () => {
    for (const operator of ["d", "c", "y"] as const) {
      for (const motion of operatorMotions) {
        expect(parseNormalCommand(motion, operator)).toEqual({
          type: "operatorMotion",
          operator,
          motion,
        });
      }
    }
  });

  test("invalid pending key clears state", () => {
    expect(parseNormalCommand("x", "d")).toEqual({ type: "invalid" });
    expect(parseNormalCommand("p", "c")).toEqual({ type: "invalid" });
    expect(parseNormalCommand("d", "y")).toEqual({ type: "invalid" });
    expect(parseNormalCommand("x", "g")).toEqual({ type: "invalid" });
  });

  test("non-command key is not parsed", () => {
    expect(parseNormalCommand("x")).toEqual({ type: "none" });
  });

  test("pending key type guard", () => {
    expect(isPendingOperatorKey("d")).toBe(true);
    expect(isPendingOperatorKey("c")).toBe(true);
    expect(isPendingOperatorKey("y")).toBe(true);
    expect(isPendingOperatorKey("g")).toBe(true);
    expect(isPendingOperatorKey("x")).toBe(false);
  });

  test("resolves configured semantic operators, motions, and commands", () => {
    const keymap = {
      ...DEFAULT_VIM_KEYMAP,
      operators: { ...DEFAULT_VIM_KEYMAP.operators, delete: ["q"] },
      motions: { ...DEFAULT_VIM_KEYMAP.motions, wordForward: ["e"] },
      commands: { ...DEFAULT_VIM_KEYMAP.commands, openLineBelow: ["n"], visualBlock: ["ctrl+v"] },
    };

    expect(resolveNormalCommand("q", undefined, keymap)).toEqual({
      type: "pending",
      pending: "q",
    });
    expect(resolveNormalCommand("e", "q", keymap)).toEqual({
      type: "operatorMotion",
      operator: "delete",
      motion: "wordForward",
    });
    expect(resolveNormalCommand("n", undefined, keymap)).toEqual({
      type: "command",
      command: "openLineBelow",
    });
    expect(resolveNormalCommand("ctrl+v", undefined, keymap)).toEqual({
      type: "command",
      command: "visualBlock",
    });
  });

  test("resolves finite multi-key sequences and invalid pending prefixes", () => {
    expect(resolveNormalCommand("g", undefined, DEFAULT_VIM_KEYMAP)).toEqual({
      type: "pending",
      pending: "g",
    });
    expect(resolveNormalCommand("g", "g", DEFAULT_VIM_KEYMAP)).toEqual({
      type: "motion",
      motion: "bufferStart",
    });
    expect(resolveNormalCommand("x", "g", DEFAULT_VIM_KEYMAP)).toEqual({ type: "invalid" });
  });

  test("resolves multi-key operators and operator motions", () => {
    const keymap = {
      ...DEFAULT_VIM_KEYMAP,
      operators: { ...DEFAULT_VIM_KEYMAP.operators, delete: ["qq"] },
      motions: { ...DEFAULT_VIM_KEYMAP.motions, wordForward: ["ef"] },
    };

    const pendingOperatorPrefix = resolveNormalCommand("q", undefined, keymap);
    expect(pendingOperatorPrefix).toEqual({ type: "pending", pending: "q" });
    const pendingOperator = resolveNormalCommand("q", "q", keymap);
    expect(pendingOperator).toEqual({ type: "pending", pending: "qq" });

    const pendingMotion = resolveNormalCommand("e", "qq", keymap);
    expect(pendingMotion.type).toBe("pending");
    expect(
      resolveNormalCommand(
        "f",
        pendingMotion.type === "pending" ? pendingMotion.pending : "",
        keymap,
      ),
    ).toEqual({
      type: "operatorMotion",
      operator: "delete",
      motion: "wordForward",
    });

    const pendingRepeat = resolveNormalCommand("q", "qq", keymap);
    expect(pendingRepeat.type).toBe("pending");
    expect(
      resolveNormalCommand(
        "q",
        pendingRepeat.type === "pending" ? pendingRepeat.pending : "",
        keymap,
      ),
    ).toEqual({
      type: "lineCommand",
      operator: "delete",
    });
  });
});
