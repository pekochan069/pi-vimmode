import { describe, expect, test } from "bun:test";

import { isPendingOperatorKey, parseNormalCommand } from "../src/commands.ts";

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
});
