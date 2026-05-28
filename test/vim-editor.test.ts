import { visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, test } from "bun:test";

import type { ResolvedVimEditorOptions, VimMode } from "../src/types.ts";

import { DEFAULT_VIM_OPTIONS } from "../src/config.ts";
import { SEARCH_CURRENT_START, SEARCH_START } from "../src/render.ts";
import { fitStatusBorder, VimEditor } from "../src/vim-editor.ts";

function createEditor(options: ResolvedVimEditorOptions = DEFAULT_VIM_OPTIONS) {
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

function typeKeys(editor: VimEditor, keys: readonly string[]) {
  for (const key of keys) editor.handleInput(key);
}

function expectEditorState(
  editor: VimEditor,
  expected: {
    text?: string;
    cursor?: { line: number; col: number };
    mode?: VimMode;
    pending?: string;
  },
) {
  if (expected.text !== undefined) expect(editor.getText()).toBe(expected.text);
  if (expected.cursor) expect(editor.getCursor()).toEqual(expected.cursor);
  if (expected.mode) expect(editor.getVimMode()).toBe(expected.mode);
  if (expected.pending !== undefined) expect(editor.getPendingOperator()).toBe(expected.pending);
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

  test("renders active and transient Ex rows width-safely below prompt", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    const baseline = editor.render(20);
    editor.handleInput(":");
    typeKeys(editor, ["%", "s", "/", "x", "/", "y", "/", "g"]);
    const active = editor.render(20);
    expect(active.length).toBe(baseline.length + 1);
    expect(active.at(-1)).toContain(":%s/x/y/g");
    expectRenderedWidth(active, 20);

    editor.handleInput("\r");
    const message = editor.render(20);
    expect(message.at(-1)).toContain("Pattern not found: x");
    expectRenderedWidth(message, 20);
  });

  test("Ex row composes with visual selection and search highlights", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("one old\ntwo old");
    editor.handleInput("/");
    typeKeys(editor, ["o", "l", "d", "\r"]);
    editor.handleInput(":");
    expect(editor.render(40).join("\n")).toContain(SEARCH_START);
    editor.handleInput("\x1b");

    editor.handleInput("V");
    editor.handleInput("j");
    editor.handleInput(":");
    const visualEx = editor.render(40).join("\n");
    expect(visualEx).toContain("\u001b[7m");
    expect(visualEx).toContain(":'<,'>");
  });

  test("renders configured mode labels", () => {
    const { editor } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
      ui: {
        ...DEFAULT_VIM_OPTIONS.ui!,
        mode: {
          ...DEFAULT_VIM_OPTIONS.ui!.mode,
          labels: { ...DEFAULT_VIM_OPTIONS.ui!.mode.labels, normal: "COMMAND" },
          narrowLabels: { ...DEFAULT_VIM_OPTIONS.ui!.mode.narrowLabels, normal: "C" },
        },
      },
    });

    expect(editor.render(40).join("\n")).toContain("COMMAND");
    expect(editor.render(8).join("\n")).toContain("C");
  });

  test("renders configured cursor position status", () => {
    const { editor } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
      ui: {
        ...DEFAULT_VIM_OPTIONS.ui!,
        status: { enabled: true, items: ["mode", "cursorPosition"] },
        cursorPosition: { enabled: true, base: 1, format: "L{line}:C{column}" },
      },
    });
    editor.setText("one\ntwo");
    editor.handleInput("G");

    const lines = editor.render(40);
    expect(lines.join("\n")).toContain("L2:C4");
    expectRenderedWidth(lines, 40);
  });

  test("normal mode ignores unmapped printable keys", () => {
    const { editor } = createEditor();
    editor.handleInput("a");
    editor.handleInput("\x1b");
    editor.handleInput("z");
    expect(editor.getText()).toBe("a");
  });

  test("records and replays a macro through the editor path", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.handleInput("q");
    editor.handleInput("a");
    expect(editor.render(40).join("\n")).toContain("REC a");
    editor.handleInput("i");
    editor.handleInput("X");
    editor.handleInput("\x1b");
    editor.handleInput("q");

    editor.setText("");
    editor.handleInput("@");
    editor.handleInput("a");
    expect(editor.getText()).toBe("X");
    expect(editor.getVimMode()).toBe("normal");

    editor.handleInput("@");
    editor.handleInput("@");
    expect(editor.getText()).toBe("XX");
  });

  test("macro playback missing slot is a no-op", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("abc");
    editor.handleInput("@");
    editor.handleInput("a");
    expect(editor.getText()).toBe("abc");
    expect(editor.getVimMode()).toBe("normal");
  });

  test("macro slots stay separate from named edit registers", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.handleInput("q");
    editor.handleInput("a");
    editor.handleInput("i");
    editor.handleInput("X");
    editor.handleInput("\x1b");
    editor.handleInput("q");

    editor.setText("ab");
    editor.handleInput("g");
    editor.handleInput("g");
    editor.handleInput('"');
    editor.handleInput("a");
    editor.handleInput("x");
    expect(editor.getNamedRegister("a")).toEqual({ type: "char", text: "a" });

    editor.setText("");
    editor.handleInput("@");
    editor.handleInput("a");
    expect(editor.getText()).toBe("X");

    editor.handleInput('"');
    editor.handleInput("a");
    editor.handleInput("p");
    expect(editor.getText()).toBe("Xa");
  });

  test("macro keys and behavior are configurable", () => {
    const { editor } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
      keymap: {
        ...DEFAULT_VIM_OPTIONS.keymap!,
        macros: { record: ["m"], play: ["r"] },
      },
      macros: { enabled: true, slots: ["x"], maxReplaySteps: 2 },
    });

    editor.handleInput("m");
    editor.handleInput("x");
    editor.handleInput("i");
    editor.handleInput("A");
    editor.handleInput("B");
    editor.handleInput("\x1b");
    editor.handleInput("m");
    editor.setText("");
    editor.handleInput("r");
    editor.handleInput("x");
    expect(editor.getText()).toBe("A");
  });

  test("normal mode searches prompt text and repeats matches", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("one two one");
    typeKeys(editor, ["g", "g", "/", "o", "n", "e", "\r"]);
    expectEditorState(editor, { text: "one two one", cursor: { line: 0, col: 8 }, mode: "normal" });
    expect(editor.render(20).join("\n")).toContain(SEARCH_CURRENT_START);
    expect(editor.render(20).join("\n")).toContain(SEARCH_START);

    editor.handleInput("n");
    expect(editor.getCursor()).toEqual({ line: 0, col: 0 });
    editor.handleInput("N");
    expect(editor.getCursor()).toEqual({ line: 0, col: 8 });
  });

  test("search highlight rendering can be disabled", () => {
    const { editor } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
      search: {
        highlight: false,
        highlightCurrent: true,
        clearOnCancel: true,
        clearOnInsert: true,
        maxHighlights: 200,
      },
    });
    editor.setText("one two one");
    typeKeys(editor, ["g", "g", "/", "o", "n", "e", "\r"]);
    expect(editor.getCursor()).toEqual({ line: 0, col: 8 });
    expect(editor.render(20).join("\n")).not.toContain(SEARCH_START);
  });

  test("normal search can cancel and insert slash remains delegated", () => {
    const { editor } = createEditor();
    editor.handleInput("/");
    expect(editor.getText()).toBe("/");
    editor.handleInput("\x1b");
    editor.handleInput("/");
    editor.handleInput("z");
    editor.handleInput("\x1b");
    expectEditorState(editor, { text: "/", cursor: { line: 0, col: 1 }, mode: "normal" });
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

  test("mark keys and behavior are configurable", () => {
    const { editor } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
      keymap: {
        ...DEFAULT_VIM_OPTIONS.keymap!,
        marks: { set: ["s"], jumpExact: ["e"], jumpLine: ["l"] },
      },
      marks: { enabled: true, slots: ["x"] },
    });

    editor.setText("one\n  two");
    typeKeys(editor, ["G", "m", "x"]);
    expect(editor.getMark("x")).toBeUndefined();

    editor.handleInput("s");
    expect(editor.getPendingOperator()).toBe("m");
    editor.handleInput("x");
    expect(editor.getMark("x")).toEqual({ line: 1, col: 5 });

    typeKeys(editor, ["g", "g", "e", "x"]);
    expect(editor.getCursor()).toEqual({ line: 1, col: 5 });

    typeKeys(editor, ["g", "g", "l", "x"]);
    expect(editor.getCursor()).toEqual({ line: 1, col: 2 });
  });

  test("VimEditor honors disabled mark configuration", () => {
    const { editor } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
      marks: { enabled: false, slots: ["a"] },
    });

    editor.setText("one\n  two");
    typeKeys(editor, ["G", "m"]);
    expectEditorState(editor, {
      text: "one\n  two",
      cursor: { line: 1, col: 5 },
      mode: "normal",
    });
    expect(editor.getPendingOperator()).toBeUndefined();

    expect(editor.getMark("a")).toBeUndefined();
    editor.handleInput("`");
    expect(editor.getPendingOperator()).toBeUndefined();
    expectEditorState(editor, {
      text: "one\n  two",
      cursor: { line: 1, col: 5 },
      mode: "normal",
    });
  });

  test("VimEditor honors restricted mark slots", () => {
    const { editor } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
      marks: { enabled: true, slots: ["x"] },
    });

    editor.setText("one\n  two");
    typeKeys(editor, ["G", "m", "a"]);
    expect(editor.getMark("a")).toBeUndefined();
    expect(editor.getPendingOperator()).toBeUndefined();

    typeKeys(editor, ["m", "x", "g", "g"]);
    expect(editor.getMark("x")).toEqual({ line: 1, col: 5 });
    expect(editor.getCursor()).toEqual({ line: 0, col: 0 });

    typeKeys(editor, ["`", "a"]);
    expect(editor.getCursor()).toEqual({ line: 0, col: 0 });

    typeKeys(editor, ["`", "x"]);
    expect(editor.getCursor()).toEqual({ line: 1, col: 5 });
  });

  test("local marks persist in editor session and restore cursor", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("one\n  two");
    editor.handleInput("G");
    editor.handleInput("m");
    expect(editor.getPendingOperator()).toBe("m");
    editor.handleInput("a");
    expect(editor.getMark("a")).toEqual({ line: 1, col: 5 });

    editor.handleInput("g");
    editor.handleInput("g");
    expect(editor.getCursor()).toEqual({ line: 0, col: 0 });
    editor.handleInput("`");
    editor.handleInput("a");
    expect(editor.getCursor()).toEqual({ line: 1, col: 5 });

    editor.handleInput("g");
    editor.handleInput("g");
    editor.handleInput("'");
    editor.handleInput("a");
    expect(editor.getCursor()).toEqual({ line: 1, col: 2 });
  });

  test("named registers persist in editor session and stay separate from unnamed register", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("one\ntwo");
    editor.handleInput("g");
    editor.handleInput("g");
    editor.handleInput('"');
    editor.handleInput("a");
    editor.handleInput("y");
    editor.handleInput("y");
    expect(editor.getNamedRegister("a")).toEqual({ type: "line", text: "one" });

    editor.handleInput("j");
    editor.handleInput("y");
    editor.handleInput("y");
    expect(editor.getRegister()).toEqual({ type: "line", text: "two" });
    expect(editor.getNamedRegister("a")).toEqual({ type: "line", text: "one" });

    editor.handleInput('"');
    editor.handleInput("a");
    editor.handleInput("p");
    expect(editor.getText()).toBe("one\ntwo\none");
  });

  test("configured Ex keymap enters Ex from normal and delegates in insert", () => {
    const { editor } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
      keymap: {
        ...DEFAULT_VIM_OPTIONS.keymap!,
        commands: {
          ...DEFAULT_VIM_OPTIONS.keymap!.commands,
          repeatCharSearch: [],
          startExCommand: [";"],
        },
      },
    });
    editor.handleInput(";");
    expect(editor.getPendingOperator()).toBe(":");
    editor.handleInput("\x1b");
    editor.handleInput("i");
    editor.handleInput(":");
    expect(editor.getText()).toBe(":");
  });

  test("macro records and replays Ex substitutions and cancellation", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("old\nold");
    typeKeys(editor, [
      "q",
      "a",
      ":",
      "%",
      "s",
      "/",
      "o",
      "l",
      "d",
      "/",
      "n",
      "e",
      "w",
      "/",
      "\r",
      "q",
    ]);
    expect(editor.getText()).toBe("new\nnew");
    editor.setText("old\nold");
    typeKeys(editor, ["@", "a"]);
    expect(editor.getText()).toBe("new\nnew");

    typeKeys(editor, [
      "q",
      "b",
      ":",
      "s",
      "/",
      "n",
      "e",
      "w",
      "/",
      "b",
      "a",
      "d",
      "/",
      "\x1b",
      "q",
    ]);
    typeKeys(editor, ["@", "b"]);
    expect(editor.getText()).toBe("new\nnew");
  });

  test("macro replay continues after Ex errors", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("old");
    typeKeys(editor, [
      "q",
      "a",
      ":",
      "s",
      "/",
      "m",
      "i",
      "s",
      "s",
      "i",
      "n",
      "g",
      "/",
      "n",
      "e",
      "w",
      "/",
      "\r",
      "A",
      "!",
      "\x1b",
      "q",
    ]);
    editor.setText("old");
    typeKeys(editor, ["@", "a"]);
    expect(editor.getText()).toBe("old!");
  });

  test("normal mode uses configured keymap through the editor", () => {
    const { editor } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
      keymap: {
        ...DEFAULT_VIM_OPTIONS.keymap!,
        operators: { ...DEFAULT_VIM_OPTIONS.keymap!.operators, delete: ["z"] },
        motions: { ...DEFAULT_VIM_OPTIONS.keymap!.motions, wordForward: ["e"] },
        commands: { ...DEFAULT_VIM_OPTIONS.keymap!.commands, visualBlock: ["B"] },
      },
    });
    editor.setText("hello world");
    editor.handleInput("g");
    editor.handleInput("g");
    editor.handleInput("z");
    editor.handleInput("e");
    expect(editor.getText()).toBe("world");
    expect(editor.getRegister()).toEqual({ type: "char", text: "hello " });
    editor.handleInput("B");
    expect(editor.getVimMode()).toBe("visualBlock");
  });

  test("normal mode supports extended navigation", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("  one\ntwo");

    editor.handleInput("g");
    editor.handleInput("g");
    expect(editor.getCursor()).toEqual({ line: 0, col: 0 });

    editor.handleInput("G");
    expect(editor.getCursor()).toEqual({ line: 1, col: 3 });

    editor.handleInput("g");
    editor.handleInput("g");
    editor.handleInput("^");
    expect(editor.getCursor()).toEqual({ line: 0, col: 2 });

    editor.handleInput("0");
    editor.handleInput("_");
    expect(editor.getCursor()).toEqual({ line: 0, col: 2 });
  });

  test("normal percent jumps to matching pair", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("call(a, [b])");
    editor.handleInput("g");
    editor.handleInput("g");

    editor.handleInput("%");
    expect(editor.getCursor()).toEqual({ line: 0, col: 11 });

    editor.handleInput("%");
    expect(editor.getCursor()).toEqual({ line: 0, col: 4 });
  });

  test("normal o and O open lines and enter insert", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("one\ntwo");
    editor.handleInput("g");
    editor.handleInput("g");
    editor.handleInput("o");
    expect(editor.getText()).toBe("one\n\ntwo");
    expect(editor.getCursor()).toEqual({ line: 1, col: 0 });
    expect(editor.getVimMode()).toBe("insert");

    const other = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" }).editor;
    other.setText("one\ntwo");
    other.handleInput("O");
    expect(other.getText()).toBe("one\n\ntwo");
    expect(other.getCursor()).toEqual({ line: 1, col: 0 });
    expect(other.getVimMode()).toBe("insert");
  });

  test("normal operator motions delete change and yank ranges", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("hello world");
    editor.handleInput("g");
    editor.handleInput("g");
    editor.handleInput("d");
    editor.handleInput("w");
    expect(editor.getText()).toBe("world");
    expect(editor.getRegister()).toEqual({ type: "char", text: "hello " });

    const changer = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" }).editor;
    changer.setText("hello world");
    changer.handleInput("g");
    changer.handleInput("g");
    changer.handleInput("c");
    changer.handleInput("w");
    expect(changer.getText()).toBe("world");
    expect(changer.getRegister()).toEqual({ type: "char", text: "hello " });
    expect(changer.getVimMode()).toBe("insert");

    const yanker = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" }).editor;
    yanker.setText("hello");
    yanker.handleInput("g");
    yanker.handleInput("g");
    yanker.handleInput("y");
    yanker.handleInput("$");
    expect(yanker.getText()).toBe("hello");
    expect(yanker.getRegister()).toEqual({ type: "char", text: "hello" });
  });

  test("normal line aliases, join, and paste-before work", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("one\ntwo");
    editor.handleInput("g");
    editor.handleInput("g");
    editor.handleInput("Y");
    expect(editor.getRegister()).toEqual({ type: "line", text: "one" });
    editor.handleInput("G");
    editor.handleInput("P");
    expect(editor.getText()).toBe("one\none\ntwo");
    expect(editor.getCursor()).toEqual({ line: 1, col: 0 });

    const joiner = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" }).editor;
    joiner.setText("one\n  two");
    joiner.handleInput("g");
    joiner.handleInput("g");
    joiner.handleInput("J");
    expect(joiner.getText()).toBe("one two");

    const changer = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" }).editor;
    changer.setText("one\ntwo");
    changer.handleInput("c");
    changer.handleInput("c");
    expect(changer.getText()).toBe("one\n");
    expect(changer.getRegister()).toEqual({ type: "line", text: "two" });
    expect(changer.getVimMode()).toBe("insert");
  });

  test("D and C operate to line end", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("hello");
    editor.handleInput("g");
    editor.handleInput("g");
    editor.handleInput("D");
    expect(editor.getText()).toBe("");
    expect(editor.getRegister()).toEqual({ type: "char", text: "hello" });

    const changer = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" }).editor;
    changer.setText("hello");
    changer.handleInput("g");
    changer.handleInput("g");
    changer.handleInput("C");
    expect(changer.getText()).toBe("");
    expect(changer.getRegister()).toEqual({ type: "char", text: "hello" });
    expect(changer.getVimMode()).toBe("insert");
  });

  test("invalid pending normal command clears without editing", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("abc");
    editor.handleInput("d");
    expect(editor.getPendingOperator()).toBe("d");
    editor.handleInput("q");
    expect(editor.getPendingOperator()).toBeUndefined();
    expect(editor.getText()).toBe("abc");
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
    editor.handleInput("\x16");
    expect(editor.getVimMode()).toBe("visualBlock");
    editor.handleInput("v");
    expect(editor.getVimMode()).toBe("visual");
  });

  test("visual block delete changes rectangular text and renders V-BLOCK status", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("abcd\nefgh");
    editor.handleInput("g");
    editor.handleInput("g");
    editor.handleInput("l");
    editor.handleInput("\x16");
    editor.handleInput("j");
    editor.handleInput("l");
    expect(editor.getVimMode()).toBe("visualBlock");
    expect(editor.render(40).join("\n")).toContain("V-BLOCK");
    editor.handleInput("d");
    expect(editor.getVimMode()).toBe("normal");
    expect(editor.getText()).toBe("ad\neh");
    expect(editor.getRegister()).toEqual({ type: "char", text: "bc\nfg" });
  });

  test("visual block I inserts typed text across selected lines on escape", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("abcd\nefgh");
    editor.handleInput("g");
    editor.handleInput("g");
    editor.handleInput("l");
    editor.handleInput("\x16");
    editor.handleInput("j");
    editor.handleInput("l");
    editor.handleInput("I");
    expect(editor.getVimMode()).toBe("insert");
    editor.handleInput("X");
    expect(editor.getText()).toBe("aXbcd\nefgh");
    editor.handleInput("\x1b");
    expect(editor.getVimMode()).toBe("normal");
    expect(editor.getText()).toBe("aXbcd\neXfgh");
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

  test("visual line paste replaces selected lines with the register", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("one\ntwo\nthree");
    editor.handleInput("g");
    editor.handleInput("g");
    editor.handleInput("Y");
    expect(editor.getRegister()).toEqual({ type: "line", text: "one" });

    editor.handleInput("G");
    editor.handleInput("V");
    editor.handleInput("p");

    expect(editor.getVimMode()).toBe("normal");
    expect(editor.getText()).toBe("one\ntwo\none");
    expect(editor.getRegister()).toEqual({ type: "line", text: "three" });
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
      cursor: {
        insert: "bar",
        normal: "underline",
        visual: "block",
        visualLine: "bar",
        visualBlock: "block",
      },
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
