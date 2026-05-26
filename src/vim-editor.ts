import {
	CustomEditor,
	type KeybindingsManager,
} from "@earendil-works/pi-coding-agent";
import {
	decodeKittyPrintable,
	matchesKey,
	truncateToWidth,
	visibleWidth,
	type EditorTheme,
	type TUI,
} from "@earendil-works/pi-tui";
import {
	clampPosition,
	deleteCharAt,
	deleteLine,
	deleteRange,
	pasteRegister,
	selectionText,
	visualSelectionSummary,
	yankLine,
} from "./buffer.ts";
import { parseNormalCommand } from "./commands.ts";
import type { EditResult, PendingOperator, Position, VimMode, VimRegister } from "./types.ts";

const KEY = {
	left: "\x1b[D",
	right: "\x1b[C",
	up: "\x1b[A",
	down: "\x1b[B",
	lineStart: "\x01",
	lineEnd: "\x05",
	wordLeft: "\x1bb",
	wordRight: "\x1bf",
	undo: "\x1f",
} as const;

function printableKey(data: string): string | undefined {
	return decodeKittyPrintable(data) ?? (data.length === 1 && data.charCodeAt(0) >= 32 ? data : undefined);
}

function isDelegatedResetKey(data: string): boolean {
	return matchesKey(data, "enter") || matchesKey(data, "ctrl+c") || matchesKey(data, "ctrl+g");
}

export function fitStatusBorder(
	left: string,
	right: string,
	width: number,
	border: (text: string) => string = (text) => text,
): string {
	if (width <= 0) return "";
	if (width === 1) return border("─");

	let leftText = left;
	let rightText = right;
	const fixedWidth = 2;
	const minimumGap = 1;

	while (visibleWidth(rightText) > 0 && fixedWidth + visibleWidth(leftText) + visibleWidth(rightText) + minimumGap > width) {
		rightText = truncateToWidth(rightText, Math.max(0, visibleWidth(rightText) - 1), "");
	}

	while (visibleWidth(leftText) > 1 && fixedWidth + visibleWidth(leftText) + visibleWidth(rightText) + minimumGap > width) {
		leftText = truncateToWidth(leftText, Math.max(1, visibleWidth(leftText) - 1), "");
	}

	const gapWidth = Math.max(0, width - fixedWidth - visibleWidth(leftText) - visibleWidth(rightText));
	return `${border("─")}${leftText}${border("─".repeat(gapWidth))}${rightText}${border("─")}`;
}

export class VimEditor extends CustomEditor {
	private mode: VimMode = "insert";
	private visualAnchor: Position | undefined;
	private register: VimRegister | undefined;
	private pending: PendingOperator | undefined;

	constructor(tui: TUI, theme: EditorTheme, keybindings: KeybindingsManager) {
		super(tui, theme, keybindings);
	}

	getVimMode(): VimMode {
		return this.mode;
	}

	getRegister(): VimRegister | undefined {
		return this.register;
	}

	getPendingOperator(): PendingOperator | undefined {
		return this.pending;
	}

	override handleInput(data: string): void {
		if (this.mode === "insert") {
			this.handleInsertInput(data);
			return;
		}

		if (this.mode === "visual") {
			this.handleVisualInput(data);
			return;
		}

		this.handleNormalInput(data);
	}

	override render(width: number): string[] {
		const lines = super.render(width);
		if (lines.length === 0 || width <= 0) return lines;

		const last = lines.length - 1;
		const label = this.modeLabel(width);
		const pending = this.pending ? ` ${this.pending}…` : "";
		const left = ` ${label}${pending} `;
		const right = this.visualStatus(width);
		lines[last] = fitStatusBorder(left, right, width, this.borderColor);
		return lines;
	}

	private handleInsertInput(data: string): void {
		if (matchesKey(data, "escape")) {
			if (this.isShowingAutocomplete()) {
				super.handleInput(data);
				return;
			}
			this.enterNormalMode();
			return;
		}

		super.handleInput(data);
	}

	private handleNormalInput(data: string): void {
		if (matchesKey(data, "escape")) {
			this.pending = undefined;
			super.handleInput(data);
			this.invalidate();
			return;
		}

		if (isDelegatedResetKey(data)) {
			this.resetTransientState("insert");
			super.handleInput(data);
			return;
		}

		const key = printableKey(data);
		if (!key) {
			this.pending = undefined;
			super.handleInput(data);
			this.invalidate();
			return;
		}

		const pendingResult = parseNormalCommand(key, this.pending);
		if (pendingResult.type === "pending") {
			this.pending = pendingResult.operator;
			this.invalidate();
			return;
		}
		if (pendingResult.type === "command") {
			this.pending = undefined;
			if (pendingResult.command === "dd") this.deleteCurrentLine();
			if (pendingResult.command === "yy") this.yankCurrentLine();
			this.invalidate();
			return;
		}
		if (pendingResult.type === "invalid") {
			this.pending = undefined;
			this.invalidate();
			return;
		}

		this.handleNormalPrintable(key);
	}

	private handleVisualInput(data: string): void {
		if (matchesKey(data, "escape")) {
			this.enterNormalMode();
			return;
		}

		if (isDelegatedResetKey(data)) {
			this.resetTransientState("insert");
			super.handleInput(data);
			return;
		}

		const key = printableKey(data);
		if (!key) {
			super.handleInput(data);
			return;
		}

		switch (key) {
			case "h":
			case "j":
			case "k":
			case "l":
			case "0":
			case "$":
			case "w":
			case "b":
				this.move(key);
				return;
			case "y":
				this.yankVisualSelection();
				return;
			case "d":
			case "x":
				this.deleteVisualSelection("normal");
				return;
			case "c":
				this.deleteVisualSelection("insert");
				return;
		}

		this.invalidate();
	}

	private handleNormalPrintable(key: string): void {
		switch (key) {
			case "h":
			case "j":
			case "k":
			case "l":
			case "0":
			case "$":
			case "w":
			case "b":
				this.move(key);
				return;
			case "i":
				this.enterInsertMode();
				return;
			case "a":
				this.move("l");
				this.enterInsertMode();
				return;
			case "I":
				this.move("0");
				this.enterInsertMode();
				return;
			case "A":
				this.move("$");
				this.enterInsertMode();
				return;
			case "v":
				this.mode = "visual";
				this.visualAnchor = this.getCursor();
				this.invalidate();
				return;
			case "x":
				this.applyEdit(deleteCharAt(this.getText(), this.getCursor()));
				return;
			case "p":
				this.applyEdit(pasteRegister(this.getText(), this.getCursor(), this.register));
				return;
			case "u":
				super.handleInput(KEY.undo);
				return;
		}

		this.invalidate();
	}

	private move(key: string): void {
		switch (key) {
			case "h":
				super.handleInput(KEY.left);
				break;
			case "j":
				super.handleInput(KEY.down);
				break;
			case "k":
				super.handleInput(KEY.up);
				break;
			case "l":
				super.handleInput(KEY.right);
				break;
			case "0":
				super.handleInput(KEY.lineStart);
				break;
			case "$":
				super.handleInput(KEY.lineEnd);
				break;
			case "w":
				super.handleInput(KEY.wordRight);
				break;
			case "b":
				super.handleInput(KEY.wordLeft);
				break;
		}
		this.invalidate();
	}

	private enterInsertMode(): void {
		this.mode = "insert";
		this.pending = undefined;
		this.visualAnchor = undefined;
		this.invalidate();
	}

	private enterNormalMode(): void {
		this.mode = "normal";
		this.pending = undefined;
		this.visualAnchor = undefined;
		this.invalidate();
	}

	private resetTransientState(mode: VimMode): void {
		this.mode = mode;
		this.pending = undefined;
		this.visualAnchor = undefined;
		this.invalidate();
	}

	private yankCurrentLine(): void {
		this.register = yankLine(this.getText(), this.getCursor());
		this.invalidate();
	}

	private deleteCurrentLine(): void {
		this.applyEdit(deleteLine(this.getText(), this.getCursor()));
	}

	private yankVisualSelection(): void {
		if (!this.visualAnchor) {
			this.enterNormalMode();
			return;
		}
		const selected = selectionText(this.getText(), this.visualAnchor, this.getCursor());
		if (selected.length > 0) this.register = { type: "char", text: selected };
		this.enterNormalMode();
	}

	private deleteVisualSelection(nextMode: VimMode): void {
		if (!this.visualAnchor) {
			this.resetTransientState(nextMode);
			return;
		}
		const result = deleteRange(this.getText(), this.visualAnchor, this.getCursor());
		this.resetTransientState(nextMode);
		this.applyEdit(result);
		this.mode = nextMode;
		this.invalidate();
	}

	private applyEdit(result: EditResult): void {
		if (result.register) this.register = result.register;
		if (!result.changed) {
			this.invalidate();
			return;
		}

		this.setText(result.text);
		this.restoreCursor(result.cursor);
		this.invalidate();
	}

	private restoreCursor(position: Position): void {
		const target = clampPosition(this.getLines(), position);
		const current = this.getCursor();

		if (current.line > target.line) {
			super.handleInput(KEY.lineStart);
			for (let i = current.line; i > target.line; i--) super.handleInput(KEY.up);
		} else if (current.line < target.line) {
			super.handleInput(KEY.lineStart);
			for (let i = current.line; i < target.line; i++) super.handleInput(KEY.down);
		}

		super.handleInput(KEY.lineStart);
		for (let i = 0; i < target.col; i++) super.handleInput(KEY.right);
	}

	private modeLabel(width: number): string {
		const full = this.mode.toUpperCase();
		if (width < full.length + 4) return this.mode[0]?.toUpperCase() ?? "?";
		return full;
	}

	private visualStatus(width: number): string {
		if (this.mode !== "visual" || !this.visualAnchor) return "";
		const summary = visualSelectionSummary(this.getText(), this.visualAnchor, this.getCursor());
		if (width < 20) return ` ${summary.split(" ")[0]} `;
		const selected = selectionText(this.getText(), this.visualAnchor, this.getCursor()).replace(/\n/g, "↵");
		const preview = selected.length > 0 ? ` · ${truncateToWidth(selected, 16, "…")}` : "";
		return ` ${summary}${preview} `;
	}
}
