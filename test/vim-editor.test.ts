import { visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, test } from "bun:test";

import type { VimEditorOptions } from "../src/types.ts";

import { DEFAULT_VIM_OPTIONS } from "../src/config.ts";
import { fitStatusBorder, VimEditor } from "../src/vim-editor.ts";

function createEditor(options: VimEditorOptions = DEFAULT_VIM_OPTIONS) {
  const writes: string[] = [];
  const tui = {
    terminal: { rows: 24, write: (data: string) => writes.push(data) },
    requestRender() {},
  } as any;
  const theme = { borderColor: (text: string) => text, selectList: {} } as any;
  const keybindings = {
    matches() {
      return false;
    },
    getKeys() {
      return [];
    },
    getDefinition() {
      return { defaultKeys: [] };
    },
    getConflicts() {
      return [];
    },
  } as any;
  return { editor: new VimEditor(tui, theme, keybindings, options), writes };
}

function expectRenderedWidth(lines: string[], width: number) {
  for (const line of lines) expect(visibleWidth(line)).toBeLessThanOrEqual(width);
}

describe("vim editor integration", () => {
  test("starts insert, inserts text, and escape enters normal", () => {
    const { editor } = createEditor();
    expect(editor.getVimMode()).toBe("insert");
    editor.handleInput("a");
    editor.handleInput("b");
    expect(editor.getText()).toBe("ab");
    editor.handleInput("\x1b");
    expect(editor.getVimMode()).toBe("normal");
  });

  test("can start in configured normal mode", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    expect(editor.getVimMode()).toBe("normal");
    editor.handleInput("q");
    expect(editor.getText()).toBe("");
  });

  test("normal mode ignores unmapped printable keys", () => {
    const { editor } = createEditor();
    editor.handleInput("a");
    editor.handleInput("\x1b");
    editor.handleInput("q");
    expect(editor.getText()).toBe("a");
  });

  test("normal x deletes character under cursor into register", () => {
    const { editor } = createEditor();
    editor.handleInput("a");
    editor.handleInput("b");
    editor.handleInput("\x1b");
    editor.handleInput("h");
    editor.handleInput("x");
    expect(editor.getText()).toBe("a");
    expect(editor.getRegister()).toEqual({ type: "char", text: "b" });
  });

  test("visual delete removes selected text and returns normal", () => {
    const { editor } = createEditor();
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

  test("normal V enters visual line mode and uses V-LINE status", () => {
    const { editor } = createEditor();
    editor.setText("one\ntwo");
    editor.handleInput("\x1b");
    editor.handleInput("V");
    expect(editor.getVimMode()).toBe("visualLine");
    const lines = editor.render(40);
    expect(lines.join("\n")).toContain("V-LINE");
    expectRenderedWidth(lines, 40);
  });

  test("visual line yank and delete use linewise register", () => {
    const { editor } = createEditor();
    editor.setText("one\ntwo\nthree");
    editor.handleInput("\x1b");
    editor.handleInput("V");
    editor.handleInput("k");
    editor.handleInput("y");
    expect(editor.getVimMode()).toBe("normal");
    expect(editor.getRegister()).toEqual({ type: "line", text: "two\nthree" });

    editor.handleInput("j");
    editor.handleInput("V");
    editor.handleInput("d");
    expect(editor.getText()).toBe("one\ntwo");
    expect(editor.getRegister()).toEqual({ type: "line", text: "three" });
  });

  test("visual modes switch kind without dropping mode state", () => {
    const { editor } = createEditor();
    editor.setText("abc\ndef");
    editor.handleInput("\x1b");
    editor.handleInput("v");
    expect(editor.getVimMode()).toBe("visual");
    editor.handleInput("V");
    expect(editor.getVimMode()).toBe("visualLine");
    editor.handleInput("v");
    expect(editor.getVimMode()).toBe("visual");
  });

  test("visual line change removes full lines and enters insert", () => {
    const { editor } = createEditor();
    editor.setText("one\ntwo");
    editor.handleInput("\x1b");
    editor.handleInput("V");
    editor.handleInput("c");
    expect(editor.getVimMode()).toBe("insert");
    expect(editor.getText()).toBe("one");
    expect(editor.getRegister()).toEqual({ type: "line", text: "two" });
  });

  test("visual render highlights selected text", () => {
    const { editor } = createEditor();
    editor.setText("abcd");
    editor.handleInput("\x1b");
    editor.handleInput("h");
    editor.handleInput("v");
    editor.handleInput("l");
    const lines = editor.render(20);
    expect(lines.join("\n")).toContain("\x1b[7m");
    expectRenderedWidth(lines, 20);
  });

  test("configured cursor styles write terminal hints on mode changes", () => {
    const { editor, writes } = createEditor({
      startMode: "insert",
      cursor: { insert: "bar", normal: "underline", visual: "block", visualLine: "bar" },
    });
    expect(writes.at(-1)).toBe("\x1b[6 q");
    editor.handleInput("\x1b");
    expect(writes.at(-1)).toBe("\x1b[4 q");
    editor.handleInput("V");
    expect(writes.at(-1)).toBe("\x1b[6 q");
    editor.resetTerminalCursorStyle();
    expect(writes.at(-1)).toBe("\x1b[0 q");
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
