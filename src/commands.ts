import type { CommandResult, PendingOperator } from "./types.ts";

export function parseNormalCommand(key: string, pending?: PendingOperator): CommandResult {
	if (pending) {
		if (pending === "d" && key === "d") return { type: "command", command: "dd" };
		if (pending === "y" && key === "y") return { type: "command", command: "yy" };
		return { type: "invalid" };
	}

	if (key === "d" || key === "y") return { type: "pending", operator: key };
	return { type: "none" };
}

export function isPendingOperatorKey(key: string): key is PendingOperator {
	return key === "d" || key === "y";
}
