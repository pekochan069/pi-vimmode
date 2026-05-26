import { describe, expect, test } from "bun:test";
import { visibleWidth } from "@earendil-works/pi-tui";
import { fitStatusBorder, VimEditor } from "../src/vim-editor.ts";

function createEditor() {
	const tui = { requestRender() {} } as any;
	const theme = { borderColor: (text: string) => text, selectList: {} } as any;
	const keybindings = {
		matches() { return false; },
		getKeys() { return []; },
		getDefinition() { return { defaultKeys: [] }; },
		getConflicts() { return []; },
	} as any;
	return new VimEditor(tui, theme, keybindings);
}

describe("vim editor integration", () => {
	test("starts insert, inserts text, and escape enters normal", () => {
		const editor = createEditor();
		expect(editor.getVimMode()).toBe("insert");
		editor.handleInput("a");
		editor.handleInput("b");
		expect(editor.getText()).toBe("ab");
		editor.handleInput("\x1b");
		expect(editor.getVimMode()).toBe("normal");
	});

	test("normal mode ignores unmapped printable keys", () => {
		const editor = createEditor();
		editor.handleInput("a");
		editor.handleInput("\x1b");
		editor.handleInput("q");
		expect(editor.getText()).toBe("a");
	});

	test("normal x deletes character under cursor into register", () => {
		const editor = createEditor();
		editor.handleInput("a");
		editor.handleInput("b");
		editor.handleInput("\x1b");
		editor.handleInput("h");
		editor.handleInput("x");
		expect(editor.getText()).toBe("a");
		expect(editor.getRegister()).toEqual({ type: "char", text: "b" });
	});

	test("visual delete removes selected text and returns normal", () => {
		const editor = createEditor();
		for (const char of "abcd") editor.handleInput(char);
		editor.handleInput("\x1b");
		editor.handleInput("h");
		editor.handleInput("h");
		editor.handleInput("v");
		editor.handleInput("l");
		editor.handleInput("d");
		expect(editor.getVimMode()).toBe("normal");
		expect(editor.getText()).toBe("ab");
		expect(editor.getRegister()).toEqual({ type: "char", text: "cd" });
	});
});

describe("status border fitting", () => {
	test("fits normal mode status within width", () => {
		const line = fitStatusBorder(" NORMAL ", " 3 chars ", 30);
		expect(visibleWidth(line)).toBeLessThanOrEqual(30);
		expect(line).toContain("NORMAL");
	});

	test("truncates right side before primary mode", () => {
		const line = fitStatusBorder(" N ", " very long visual selection preview ", 10);
		expect(visibleWidth(line)).toBeLessThanOrEqual(10);
		expect(line).toContain("N");
	});

	test("handles extremely narrow widths", () => {
		expect(visibleWidth(fitStatusBorder(" NORMAL ", "", 1))).toBe(1);
		expect(visibleWidth(fitStatusBorder(" NORMAL ", "", 0))).toBe(0);
	});
});
