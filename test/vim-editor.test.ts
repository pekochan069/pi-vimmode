import { visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, test } from "bun:test";

import type { ResolvedVimEditorOptions, VimDiagnostics, VimMode } from "../src/types.ts";

import { DEFAULT_VIM_OPTIONS } from "../src/config.ts";
import { SEARCH_CURRENT_START, SEARCH_START } from "../src/render.ts";
import { fitStatusBorder, VimEditor } from "../src/vim-editor.ts";

function createEditor(
  options: ResolvedVimEditorOptions = DEFAULT_VIM_OPTIONS,
  diagnostics: VimDiagnostics = { warnings: [] },
) {
  const writes: string[] = [];
  const hardwareCursorChanges: boolean[] = [];
  let hardwareCursorVisible = false;
  const tui = {
    terminal: { rows: 24, write: (data: string) => writes.push(data) },
    requestRender() {},
    getShowHardwareCursor() {
      return hardwareCursorVisible;
    },
    setShowHardwareCursor(visible: boolean) {
      hardwareCursorVisible = visible;
      hardwareCursorChanges.push(visible);
    },
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
  return {
    editor: new VimEditor(tui, theme, keybindings, options, diagnostics),
    writes,
    hardwareCursorChanges,
    getHardwareCursorVisible: () => hardwareCursorVisible,
  };
}

function expectRenderedWidth(lines: string[], width: number) {
  for (const line of lines) expect(visibleWidth(line)).toBeLessThanOrEqual(width);
}

function typeKeys(editor: VimEditor, keys: readonly string[]) {
  for (const key of keys) editor.handleInput(key);
}

function runEx(editor: VimEditor, command: string) {
  editor.handleInput(":");
  for (const char of command) editor.handleInput(char);
  editor.handleInput("\r");
  if (/^\s*(?:%|\d|\.|\$|'|<|>|,)*s(?:ubstitute)?\b/.test(command)) editor.handleInput("\r");
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

  test("diagnostic and feedback info rows render width-safely below prompt", () => {
    const { editor } = createEditor(
      { ...DEFAULT_VIM_OPTIONS, startMode: "normal", feedback: { noop: "status" } },
      {
        warnings: [
          "project settings: piVimMode.keymap.commands.openLineBelow contains protected key ctrl+p",
        ],
      },
    );
    const baseline = editor.render(24);

    runEx(editor, "vimdoctor");
    const doctor = editor.render(24);
    expect(doctor.length).toBe(baseline.length + 1);
    expect(doctor.at(-1)).toContain("vimdoctor: 1 warning");
    expectRenderedWidth(doctor, 24);

    editor.handleInput("z");
    const feedback = editor.render(16);
    expect(feedback.at(-1)).toContain("unmapped key");
    expectRenderedWidth(feedback, 16);
  });

  test("search and substitution preview rows render width-safely below prompt", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    const baseline = editor.render(20);

    editor.handleInput("/");
    typeKeys(editor, ["o", "l", "d"]);
    const search = editor.render(20);
    expect(search.length).toBe(baseline.length + 1);
    expect(search.at(-1)).toContain("/old");
    expectRenderedWidth(search, 20);
    editor.handleInput("\x1b");

    editor.setText("old old");
    editor.handleInput(":");
    typeKeys(editor, ["%", "s", "/", "o", "l", "d", "/", "n", "e", "w", "/", "g", "\r"]);
    const preview = editor.render(80);
    expect(preview.at(-1)).toContain("2 matches found");
    expect(preview.at(-1)).toContain("Enter applies");
    expect(preview.join("\n")).toContain(SEARCH_START);
    expectRenderedWidth(preview, 80);
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

  test("runtime help, inspect, and messages rows render width-safely", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("abc");
    editor.handleInput(":");
    typeKeys(editor, ["s", "/", "m", "i", "s", "s", "i", "n", "g", "/", "x", "/", "\r"]);
    runEx(editor, "vimmode inspect");
    let lines = editor.render(48);
    expect(lines.at(-1)).toContain("inspect: mode=normal");
    expectRenderedWidth(lines, 48);

    editor.handleInput(":");
    typeKeys(editor, ["m", "e", "s", "s", "a", "g", "e", "s", "\r"]);

    lines = editor.render(32);
    expect(lines.at(-1)).toContain("messages: 2 retained");
    expectRenderedWidth(lines, 32);
  });

  test("runtime help row composes with visual selection and search highlights", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("one old\ntwo old");
    editor.handleInput("/");
    typeKeys(editor, ["o", "l", "d", "\r"]);
    runEx(editor, "help search");
    const searchHelp = editor.render(60).join("\n");
    expect(searchHelp).toContain(SEARCH_START);
    expect(searchHelp).toContain("prompt search");

    editor.handleInput("V");
    editor.handleInput("j");
    editor.handleInput(":");
    typeKeys(editor, ["\b", "\b", "\b", "\b", "\b", "h", "e", "l", "p", "\r"]);
    const visualHelp = editor.render(60).join("\n");
    expect(visualHelp).toContain("\u001b[7m");
    expect(visualHelp).toContain("help:");
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

  test("insert render avoids combining bar overlay at wrap boundary", () => {
    const { editor } = createEditor();
    editor.focused = true;
    for (const char of "abcdefghij") editor.handleInput(char);
    const lines = editor.render(10);
    expect(lines.join("\n")).not.toContain("\u20d2");
    expectRenderedWidth(lines, 10);
  });

  test("visual mode toggles selected case and returns normal", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("aBc");
    editor.handleInput("0");
    editor.handleInput("v");
    editor.handleInput("l");
    editor.handleInput("~");
    expectEditorState(editor, { text: "Abc", cursor: { line: 0, col: 0 }, mode: "normal" });
  });

  test("normal mode toggles case while insert mode keeps literal tilde", () => {
    const { editor } = createEditor();
    editor.handleInput("a");
    editor.handleInput("~");
    expect(editor.getText()).toBe("a~");

    editor.handleInput("B");
    editor.handleInput("c");
    editor.handleInput("\x1b");
    editor.handleInput("0");
    editor.handleInput("2");
    editor.handleInput("~");
    expectEditorState(editor, { text: "A~Bc", cursor: { line: 0, col: 1 }, mode: "normal" });

    editor.setText("123");
    editor.handleInput("0");
    editor.handleInput("3");
    editor.handleInput("~");
    expectEditorState(editor, { text: "123", cursor: { line: 0, col: 2 }, mode: "normal" });
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

  test("honors prompt-native structure and transform config through live editor", () => {
    const { editor } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
      promptStructures: {
        ...DEFAULT_VIM_OPTIONS.promptStructures!,
        targets: { ...DEFAULT_VIM_OPTIONS.promptStructures!.targets, codeFence: false },
      },
      promptTransforms: {
        ...DEFAULT_VIM_OPTIONS.promptTransforms!,
        actions: { ...DEFAULT_VIM_OPTIONS.promptTransforms!.actions, reflow: false },
        commands: { ...DEFAULT_VIM_OPTIONS.promptTransforms!.commands, quote: ["qte"] },
      },
    });

    editor.setText("```ts\nconst x = 1;\n```\nplain words here");
    typeKeys(editor, ["g", "g", "j", "d", "i", "f"]);
    expect(editor.getText()).toBe("```ts\nconst x = 1;\n```\nplain words here");

    runEx(editor, "quote");
    expect(editor.getText()).toBe("```ts\nconst x = 1;\n```\nplain words here");

    typeKeys(editor, ["g", "g"]);
    runEx(editor, "qte");
    expect(editor.getText()).toBe("> ```ts\nconst x = 1;\n```\nplain words here");

    runEx(editor, "4reflow 10");
    expect(editor.getText()).toBe("> ```ts\nconst x = 1;\n```\nplain words here");
  });

  test("executes finite Ex line commands and aliases from normal mode", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("one\ntwo\nthree\nfour");

    runEx(editor, "2,3copy$");
    expect(editor.getText()).toBe("one\ntwo\nthree\nfour\ntwo\nthree");
    expect(editor.render(80).join("\n")).toContain("2 lines copied");

    runEx(editor, "5,6m0");
    expect(editor.getText()).toBe("two\nthree\none\ntwo\nthree\nfour");
    expect(editor.render(80).join("\n")).toContain("2 lines moved");

    runEx(editor, "%j");
    expect(editor.getText()).toBe("two three one two three four");
    expect(editor.render(80).join("\n")).toContain("6 lines joined");

    editor.setText("one\ntwo\nthree");
    runEx(editor, "2y");
    expect(editor.getRegister()).toEqual({ type: "line", text: "two" });
    expect(editor.render(80).join("\n")).toContain("1 line yanked");

    runEx(editor, "1pu");
    expect(editor.getText()).toBe("one\ntwo\ntwo\nthree");
    expect(editor.render(80).join("\n")).toContain("1 line put");

    runEx(editor, "2d");
    expect(editor.getText()).toBe("one\ntwo\nthree");
    expect(editor.getRegister()).toEqual({ type: "line", text: "two" });
    expect(editor.render(80).join("\n")).toContain("1 line deleted");
  });

  test("Ex line commands preserve bounded side effects", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("alpha\nbeta\ngamma");
    typeKeys(editor, ["g", "g", '"', "a", "y", "y"]);
    expect(editor.getNamedRegister("a")).toEqual({ type: "line", text: "alpha" });

    runEx(editor, "2delete");
    expect(editor.getText()).toBe("alpha\ngamma");
    expect(editor.getRegister()).toEqual({ type: "line", text: "beta" });
    expect(editor.getNamedRegister("a")).toEqual({ type: "line", text: "alpha" });

    editor.setText("abc\ndef");
    editor.handleInput("g");
    editor.handleInput("g");
    editor.handleInput("x");
    expect(editor.getText()).toBe("bc\ndef");
    runEx(editor, "2delete");
    editor.handleInput(".");
    expect(editor.getText()).toBe("c");
  });

  test("Ex visual delete and nohlsearch interact with selection and search highlights", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("one\ntwo\nthree");
    editor.handleInput("g");
    editor.handleInput("g");
    editor.handleInput("V");
    editor.handleInput("j");
    editor.handleInput(":");
    typeKeys(editor, ["d", "e", "l", "e", "t", "e", "\r"]);
    expect(editor.getText()).toBe("three");
    expect(editor.getRegister()).toEqual({ type: "line", text: "one\ntwo" });

    editor.setText("foo bar foo");
    editor.handleInput("g");
    editor.handleInput("g");
    typeKeys(editor, ["/", "f", "o", "o", "\r"]);
    expect(editor.render(80).join("\n")).toContain(SEARCH_START);
    runEx(editor, "noh");
    expect(editor.render(80).join("\n")).not.toContain(SEARCH_START);
    editor.handleInput("n");
    expect(editor.getCursor()).toEqual({ line: 0, col: 0 });

    typeKeys(editor, ["/", "f", "o", "o", "\r"]);
    expect(editor.render(80).join("\n")).toContain(SEARCH_START);
    runEx(editor, "delete");
    expect(editor.render(80).join("\n")).not.toContain(SEARCH_START);
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

  test("normal mode redo restores undone prompt edit and can be undone again", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("abc");
    typeKeys(editor, ["g", "g", "l", "x"]);
    expectEditorState(editor, { text: "ac", cursor: { line: 0, col: 1 }, mode: "normal" });

    editor.handleInput("u");
    expectEditorState(editor, { text: "abc", cursor: { line: 0, col: 1 }, mode: "normal" });

    editor.handleInput("\x12");
    expectEditorState(editor, { text: "ac", cursor: { line: 0, col: 1 }, mode: "normal" });
    expect(editor.getRegister()).toEqual({ type: "char", text: "b" });

    editor.handleInput("u");
    expectEditorState(editor, { text: "abc", cursor: { line: 0, col: 1 }, mode: "normal" });
  });

  test("normal mode redo no-ops without state, survives movement, and clears after new edit", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("abc");
    editor.handleInput("\x12");
    expectEditorState(editor, { text: "abc", cursor: { line: 0, col: 3 }, mode: "normal" });

    typeKeys(editor, ["g", "g", "x", "u", "l", "\x12"]);
    expectEditorState(editor, { text: "bc", cursor: { line: 0, col: 0 }, mode: "normal" });

    editor.setText("abc");
    typeKeys(editor, ["g", "g", "x", "u", "l", "x", "\x12"]);
    expectEditorState(editor, { text: "ac", cursor: { line: 0, col: 1 }, mode: "normal" });
  });

  test("redo does not resurrect cleared search highlights", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("foo foo");
    typeKeys(editor, ["g", "g", "/", "f", "o", "o", "\r"]);
    expect(editor.render(80).join("\n")).toContain(SEARCH_START);

    typeKeys(editor, ["x", "u", "\x12"]);
    expect(editor.getText()).toBe("foo oo");
    expect(editor.render(80).join("\n")).not.toContain(SEARCH_START);
  });

  test("configured redo key survives live editor keymap cloning", () => {
    const { editor } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
      keymap: {
        ...DEFAULT_VIM_OPTIONS.keymap!,
        commands: { ...DEFAULT_VIM_OPTIONS.keymap!.commands, redo: ["R"] },
      },
    });
    editor.setText("abc");
    typeKeys(editor, ["g", "g", "x", "u", "R"]);
    expectEditorState(editor, { text: "bc", cursor: { line: 0, col: 0 }, mode: "normal" });
  });

  test("redo preserves modal side-effect state", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("one\ntwo");
    typeKeys(editor, ["g", "g", '"', "a", "y", "y", "m", "b"]);
    expect(editor.getNamedRegister("a")).toEqual({ type: "line", text: "one" });
    expect(editor.getMark("b")).toEqual({ line: 0, col: 0 });

    typeKeys(editor, ["j", "x", "u", "\x12"]);
    expectEditorState(editor, { text: "one\nwo", cursor: { line: 1, col: 0 }, mode: "normal" });
    expect(editor.getNamedRegister("a")).toEqual({ type: "line", text: "one" });
    expect(editor.getMark("b")).toEqual({ line: 0, col: 0 });
    expect(editor.getRegister()).toEqual({ type: "char", text: "t" });
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

  test("configured shift operators survive live editor keymap cloning", () => {
    const { editor } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
      keymap: {
        ...DEFAULT_VIM_OPTIONS.keymap!,
        operators: {
          ...DEFAULT_VIM_OPTIONS.keymap!.operators,
          indent: ["]"],
          dedent: ["["],
        },
      },
    });

    editor.setText("one\n  two");
    typeKeys(editor, ["g", "g", "]", "]"]);
    expectEditorState(editor, {
      text: "  one\n  two",
      cursor: { line: 0, col: 0 },
      mode: "normal",
    });

    editor.handleInput("V");
    editor.handleInput("j");
    editor.handleInput("[");
    expectEditorState(editor, { text: "one\ntwo", cursor: { line: 1, col: 0 }, mode: "normal" });
  });

  test("default shift operators and existing editor behavior remain compatible", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("one\ntwo");
    typeKeys(editor, ["g", "g", ">", ">", "j", "."]);
    expect(editor.getText()).toBe("  one\n  two");

    runEx(editor, "%dedent");
    expect(editor.getText()).toBe("one\ntwo");

    typeKeys(editor, ["g", "g", "d", "w"]);
    expect(editor.getText()).toBe("two");

    editor.handleInput("i");
    editor.handleInput("<");
    editor.handleInput(">");
    expect(editor.getText()).toBe("<>two");
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
    const { editor, writes, hardwareCursorChanges, getHardwareCursorVisible } = createEditor({
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
    expect(getHardwareCursorVisible()).toBe(true);
    editor.handleInput("\x1b");
    expect(writes.at(-1)).toBe("\x1b[4 q");
    expect(getHardwareCursorVisible()).toBe(false);
    editor.handleInput("V");
    expect(writes.at(-1)).toBe("\x1b[6 q");
    expect(getHardwareCursorVisible()).toBe(true);
    editor.resetTerminalCursorStyle();
    expect(writes.at(-1)).toBe("\x1b[0 q");
    expect(getHardwareCursorVisible()).toBe(false);
    expect(hardwareCursorChanges).toEqual([true, false, true, false]);
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
