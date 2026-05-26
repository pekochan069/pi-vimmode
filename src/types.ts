export type VimMode = "insert" | "normal" | "visual";

export type Position = {
	line: number;
	col: number;
};

export type TextRange = {
	start: Position;
	end: Position;
};

export type RegisterType = "char" | "line";

export type VimRegister = {
	type: RegisterType;
	text: string;
};

export type EditResult = {
	text: string;
	cursor: Position;
	register?: VimRegister;
	changed: boolean;
};

export type PendingOperator = "d" | "y";

export type CommandResult =
	| { type: "pending"; operator: PendingOperator }
	| { type: "command"; command: "dd" | "yy" }
	| { type: "invalid" }
	| { type: "none" };
