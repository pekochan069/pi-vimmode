import { describe, expect, test } from "bun:test";
import { isPendingOperatorKey, parseNormalCommand } from "../src/commands.ts";

describe("normal command parser", () => {
	test("creates pending operator for d and y", () => {
		expect(parseNormalCommand("d")).toEqual({ type: "pending", operator: "d" });
		expect(parseNormalCommand("y")).toEqual({ type: "pending", operator: "y" });
	});

	test("resolves dd and yy", () => {
		expect(parseNormalCommand("d", "d")).toEqual({ type: "command", command: "dd" });
		expect(parseNormalCommand("y", "y")).toEqual({ type: "command", command: "yy" });
	});

	test("invalid pending key clears state", () => {
		expect(parseNormalCommand("x", "d")).toEqual({ type: "invalid" });
		expect(parseNormalCommand("d", "y")).toEqual({ type: "invalid" });
	});

	test("non-operator key is not a command", () => {
		expect(parseNormalCommand("x")).toEqual({ type: "none" });
	});

	test("operator type guard", () => {
		expect(isPendingOperatorKey("d")).toBe(true);
		expect(isPendingOperatorKey("y")).toBe(true);
		expect(isPendingOperatorKey("x")).toBe(false);
	});
});
