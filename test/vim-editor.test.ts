import { visibleWidth } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, test } from "bun:test";

import type { ModalState } from "../src/modal/types.ts";
import type { ResolvedVimEditorOptions, VimDiagnostics, VimMode } from "../src/types.ts";

import { setClipboardTextReaderForTesting } from "../src/clipboard.ts";
import { createVimConfigPlan, DEFAULT_VIM_OPTIONS, resolveVimOptions } from "../src/config.ts";
import { SEARCH_CURRENT_START, SEARCH_START } from "../src/render.ts";
import { fitStatusBorder, VimEditor } from "../src/vim-editor.ts";

function ctrlVVisualBlockOptions(startMode: "insert" | "normal" = "insert") {
  return resolveVimOptions({
    piVimMode: {
      startMode,
      keymap: {
        commands: { visualBlock: ["ctrl+v"] },
        allowProtectedOverrides: ["ctrl+v"],
      },
    },
  }).options;
}

function createEditor(
  options: ResolvedVimEditorOptions = DEFAULT_VIM_OPTIONS,
  diagnostics: VimDiagnostics = { warnings: [] },
  initialHardwareCursorVisible = false,
  terminalSize: { rows?: number; columns?: number } = {},
  vimOptions?: { onShutdown?: () => void },
) {
  const writes: string[] = [];
  const hardwareCursorChanges: boolean[] = [];
  const overlays: Array<{ component: any; options: any; hidden: boolean }> = [];
  let hardwareCursorVisible = initialHardwareCursorVisible;
  let renderRequests = 0;
  const tui = {
    terminal: {
      rows: terminalSize.rows ?? 24,
      columns: terminalSize.columns,
      write: (data: string) => writes.push(data),
    },
    requestRender() {
      renderRequests += 1;
    },
    showOverlay(component: any, options: any) {
      const entry = { component, options, hidden: false };
      overlays.push(entry);
      return {
        hide() {
          entry.hidden = true;
        },
        setHidden(hidden: boolean) {
          entry.hidden = hidden;
        },
        isHidden() {
          return entry.hidden;
        },
        focus() {},
        unfocus() {},
        isFocused() {
          return !entry.hidden;
        },
      };
    },
    getShowHardwareCursor() {
      return hardwareCursorVisible;
    },
    setShowHardwareCursor(visible: boolean) {
      hardwareCursorVisible = visible;
      hardwareCursorChanges.push(visible);
    },
  } as any;
  const theme = {
    borderColor: (text: string) => text,
    selectList: {
      selectedText: (text: string) => text,
      description: (text: string) => text,
      noMatch: (text: string) => text,
      scrollInfo: (text: string) => text,
    },
  } as any;
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
    editor: new VimEditor(tui, theme, keybindings, options, diagnostics, vimOptions),
    writes,
    hardwareCursorChanges,
    overlays,
    getHardwareCursorVisible: () => hardwareCursorVisible,
    getRenderRequests: () => renderRequests,
  };
}

function expectRenderedWidth(lines: string[], width: number) {
  for (const line of lines) expect(visibleWidth(line)).toBeLessThanOrEqual(width);
}

function firstRenderedPromptRow(lines: string[]): string | undefined {
  return lines.find((line) => line.includes("row-"));
}

async function flushAutocomplete() {
  await Promise.resolve();
  await Promise.resolve();
}

function installAutocomplete(editor: VimEditor, values: readonly string[], maxVisible?: number) {
  editor.setAutocompleteProvider({
    async getSuggestions(lines: string[], cursorLine: number, cursorCol: number) {
      const line = lines[cursorLine] ?? "";
      return {
        prefix: line.slice(0, cursorCol),
        items: values.map((value) => ({ value, label: value })),
      };
    },
    applyCompletion(
      lines: string[],
      cursorLine: number,
      cursorCol: number,
      item: { value: string },
    ) {
      const next = [...lines];
      next[cursorLine] = item.value;
      return { lines: next, cursorLine, cursorCol: item.value.length };
    },
  });
  if (maxVisible !== undefined) editor.setAutocompleteMaxVisible(maxVisible);
}

function typeKeys(editor: Pick<VimEditor, "handleInput">, keys: readonly string[]) {
  for (const key of keys) editor.handleInput(key);
}

const ctrlJ = "\u001b[106;5u";
const superJ = "\u001b[106;9u";

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

type ReconfigureTestInternal = {
  modalState: ModalState;
  redoStack: Array<{ text: string; cursor: { line: number; col: number } }>;
};

const RECONFIGURE_TRANSIENT_FIELDS = [
  "recordingSlot",
  "pending",
  "pendingMacro",
  "pendingRegister",
  "pendingMark",
  "pendingSearch",
  "pendingEx",
  "pendingInsertEscape",
  "pendingInsertEscapeInputs",
  "pendingWorkbench",
  "pendingEasymotion",
] as const;

function seedReconfigureState(editor: VimEditor): ReconfigureTestInternal {
  editor.setText("one\ntwo");
  typeKeys(editor, ["g", "g", "v", "j"]);
  const internal = editor as unknown as ReconfigureTestInternal;
  internal.modalState = {
    ...internal.modalState,
    register: { type: "char", text: "unnamed" },
    namedRegisters: { a: { type: "line", text: "named\n" } },
    clipboardRegisters: { "+": { type: "char", text: "clipboard" } },
    macros: { q: ["i", "x", "escape"] },
    recordingSlot: "q",
    lastPlayedMacro: "q",
    marks: { a: { line: 1, col: 2 } },
    searchHistory: [{ query: "two", matcherMode: "literal" }],
    exHistory: ["messages"],
    lastVisualSelection: {
      mode: "visual",
      anchor: { line: 99, col: 99 },
      cursor: { line: 0, col: 99 },
      text: "one\ntwo",
    },
    pending: "2d",
    pendingMacro: "play",
    pendingRegister: "awaitingSlot",
    pendingMark: { kind: "set" },
    pendingSearch: { query: "stale", direction: "forward" },
    pendingEx: { command: "stale", sourceMode: "visual" },
    pendingInsertEscape: "j",
    pendingInsertEscapeInputs: ["j"],
    pendingWorkbench: { kind: "ex", prefix: ":", text: "stale", sourceMode: "visual" },
    pendingEasymotion: {
      kind: "highlight",
      targets: [{ label: "a", line: 0, character: 0, original: "o" }],
      originalText: "one\ntwo",
    },
  };
  editor.setText("ane\ntwo");
  internal.redoStack.push({ text: "redo", cursor: { line: 0, col: 4 } });
  return internal;
}

function expectReconfiguredDurableState(internal: ReconfigureTestInternal) {
  expect(internal.modalState).toMatchObject({
    register: { type: "char", text: "unnamed" },
    namedRegisters: { a: { type: "line", text: "named\n" } },
    clipboardRegisters: { "+": { type: "char", text: "clipboard" } },
    macros: { q: ["i", "x", "escape"] },
    lastPlayedMacro: "q",
    marks: { a: { line: 1, col: 2 } },
    searchHistory: [{ query: "two", matcherMode: "literal" }],
    exHistory: ["messages"],
    visualAnchor: { line: 0, col: 0 },
    lastVisualSelection: {
      anchor: { line: 1, col: 3 },
      cursor: { line: 0, col: 3 },
    },
  });
  for (const field of RECONFIGURE_TRANSIENT_FIELDS) {
    expect(internal.modalState[field]).toBeUndefined();
  }
  expect(internal.redoStack).toEqual([{ text: "redo", cursor: { line: 0, col: 4 } }]);
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

  test("entering visual mode keeps long-prompt viewport stable", () => {
    const { editor } = createEditor(
      { ...DEFAULT_VIM_OPTIONS, startMode: "normal" },
      { warnings: [] },
      false,
      {
        rows: 20,
      },
    );
    editor.setText(Array.from({ length: 10 }, (_, index) => `row-${index + 1}`).join("\n"));
    editor.render(20);
    typeKeys(editor, ["g", "g"]);
    editor.render(20);
    for (const key of ["j", "j", "j"]) {
      editor.handleInput(key);
      editor.render(20);
    }
    const normalTop = firstRenderedPromptRow(editor.render(20));

    editor.handleInput("v");
    const visualLines = editor.render(20);

    expect(editor.getVimMode()).toBe("visual");
    expect(firstRenderedPromptRow(visualLines)).toBe(normalTop);
    expectRenderedWidth(visualLines, 20);
  });

  test("visual down movement inside viewport does not scroll long prompt", () => {
    const { editor } = createEditor(
      { ...DEFAULT_VIM_OPTIONS, startMode: "normal" },
      { warnings: [] },
      false,
      {
        rows: 20,
      },
    );
    editor.setText(Array.from({ length: 10 }, (_, index) => `row-${index + 1}`).join("\n"));
    editor.render(20);
    typeKeys(editor, ["g", "g"]);
    editor.render(20);
    for (const key of ["j", "j"]) {
      editor.handleInput(key);
      editor.render(20);
    }
    editor.handleInput("v");
    const visualTop = firstRenderedPromptRow(editor.render(20));

    editor.handleInput("j");
    const movedLines = editor.render(20);

    expect(editor.getCursor()).toEqual({ line: 3, col: 0 });
    expect(firstRenderedPromptRow(movedLines)).toBe(visualTop);
    expectRenderedWidth(movedLines, 20);
  });

  test("insert mode edits keep long-prompt viewport stable", () => {
    const { editor } = createEditor(
      { ...DEFAULT_VIM_OPTIONS, startMode: "normal" },
      { warnings: [] },
      false,
      {
        rows: 20,
      },
    );
    editor.setText(Array.from({ length: 10 }, (_, index) => `row-${index + 1}`).join("\n"));
    editor.render(20);
    typeKeys(editor, ["g", "g", "j", "j", "j"]);
    const normalTop = firstRenderedPromptRow(editor.render(20));

    editor.handleInput("i");
    const insertLines = editor.render(20);

    expect(editor.getVimMode()).toBe("insert");
    expect(firstRenderedPromptRow(insertLines)).toBe(normalTop);
    expectRenderedWidth(insertLines, 20);

    editor.handleInput("x");
    expect(editor.getText()).toContain("xrow-4");
    const changedLines = editor.render(20);
    expect(firstRenderedPromptRow(changedLines)).toBe(normalTop);
  });

  test("constructor clones caller-owned nested keymap options", () => {
    const options = structuredClone(
      resolveVimOptions({
        piVimMode: {
          startMode: "normal",
          leader: ",",
          keymap: { escape: ["<D-j>"], commands: { openLineBelow: ["<leader>k"] } },
        },
      }).options,
    );
    const { editor } = createEditor(options);
    options.leader = ";";
    options.keymap!.leader = ";";
    (options.keymap!.escape as unknown as string[]).splice(0, 1, "ctrl+x");
    (options.keymap!.commands.openLineBelow as unknown as string[]).splice(0, 1, ";k");

    editor.setText("one\ntwo");
    typeKeys(editor, ["g", "g", ",", "k"]);

    expect(editor.getText()).toBe("one\n\ntwo");
    expect(editor.getVimMode()).toBe("insert");
    editor.handleInput(superJ);
    expectEditorState(editor, { text: "one\n\ntwo", mode: "normal" });
  });

  test("live editor honors configured case operator keymap", () => {
    const options = resolveVimOptions({
      piVimMode: { startMode: "normal", keymap: { operators: { lowercase: ["zu"] } } },
    }).options;
    const { editor } = createEditor(options);

    editor.setText("AbC Def");
    typeKeys(editor, ["g", "g", "z", "u", "w"]);

    expect(editor.getText()).toBe("abc Def");
    expect(editor.getCursor()).toEqual({ line: 0, col: 0 });
    expect(editor.getVimMode()).toBe("normal");
  });

  test("reconfigure applies new keymaps immediately while clearing pending grammar", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    const options = resolveVimOptions({
      piVimMode: { startMode: "insert", keymap: { commands: { openLineBelow: [",k"] } } },
    }).options;

    editor.setText("one\ntwo");
    editor.handleInput("d");
    expect(editor.getPendingOperator()).toBe("d");

    editor.reconfigure(createVimConfigPlan(options, []), { warnings: ["reloaded"] });
    expectEditorState(editor, { text: "one\ntwo", mode: "normal", pending: undefined });
    typeKeys(editor, ["g", "g", ",", "k"]);

    expect(editor.getText()).toBe("one\n\ntwo");
    expect(editor.getVimMode()).toBe("insert");
  });

  test("reconfigure preserves durable state and clears transient grammar", () => {
    const { editor, writes, getRenderRequests } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
    });
    const internal = seedReconfigureState(editor);
    const beforeCursor = editor.getCursor();
    const renderRequests = getRenderRequests();
    const plan = createVimConfigPlan(
      resolveVimOptions({
        piVimMode: {
          cursor: { visual: "underline" },
          keymap: { commands: { openLineBelow: [",k"] } },
        },
      }).options,
      [],
    );

    editor.reconfigure(plan, { warnings: ["reloaded"] });

    expectEditorState(editor, { text: "one\ntwo", cursor: beforeCursor, mode: "visual" });
    expectReconfiguredDurableState(internal);
    expect(writes.at(-1)).toBe("\x1b[4 q");
    expect(getRenderRequests()).toBeGreaterThan(renderRequests);
  });

  test("reconfigure removes EasyMotion labels without adding undo history", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("one");
    typeKeys(editor, ["g", "g", "i", "X", "\x1b"]);
    const internal = editor as unknown as { modalState: ModalState };
    internal.modalState.pendingEasymotion = {
      kind: "highlight",
      targets: [{ label: "a", line: 0, character: 1, original: "o" }],
      originalText: "Xone",
    };
    editor.setText("Xane");

    editor.reconfigure(createVimConfigPlan(DEFAULT_VIM_OPTIONS, []), { warnings: [] });
    expect(editor.getText()).toBe("Xone");
    editor.handleInput("u");

    expect(editor.getText()).toBe("one");
  });

  test("reconfigure preserves undo and redo behavior", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("draft");
    typeKeys(editor, ["g", "g", "i", "x", "\x1b", "u"]);
    expect(editor.getText()).toBe("draft");

    editor.reconfigure(createVimConfigPlan(DEFAULT_VIM_OPTIONS, []), { warnings: [] });
    editor.handleInput("\x12");

    expect(editor.getText()).toBe("xdraft");
    editor.handleInput("u");
    expect(editor.getText()).toBe("draft");
  });

  test("diagnostics-only update preserves editor state", () => {
    const { editor, overlays } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("draft");
    typeKeys(editor, ["g", "g", "l"]);
    const before = {
      text: editor.getText(),
      cursor: editor.getCursor(),
      mode: editor.getVimMode(),
    };

    editor.updateDiagnostics({ warnings: ["fatal reload"] });

    expectEditorState(editor, before);
    runEx(editor, "vimdoctor");
    expect(overlays.at(-1)?.component.render(64).join("\n")).toContain("fatal reload");
  });

  test("plain insert text uses fast path without full snapshot", () => {
    const { editor } = createEditor();
    (editor as unknown as { getLines: () => string[] }).getLines = () => {
      throw new Error("snapshot should not be constructed for safe insert text");
    };

    editor.handleInput("a");
    expect(editor.getText()).toBe("a");
  });

  test("insert escape stays on modal path and exits insert mode", () => {
    const { editor } = createEditor();
    editor.handleInput("a");
    editor.handleInput("\x1b");
    expectEditorState(editor, { text: "a", mode: "normal" });
  });

  test("configured super+j insert escape exits insert without inserting alias", () => {
    const options = resolveVimOptions({
      piVimMode: { keymap: { escape: ["<D-j>"] } },
    }).options;
    const { editor } = createEditor(options);

    editor.handleInput("a");
    editor.handleInput(superJ);

    expectEditorState(editor, { text: "a", mode: "normal" });
  });

  test("configured super+j insert escape exits visual mode", () => {
    const options = resolveVimOptions({
      piVimMode: { startMode: "normal", keymap: { escape: ["<D-j>"] } },
    }).options;
    const { editor } = createEditor(options);

    editor.setText("abc");
    editor.handleInput("v");
    expect(editor.getVimMode()).toBe("visual");
    editor.handleInput(superJ);

    expectEditorState(editor, { text: "abc", mode: "normal" });
    expect(
      (editor as unknown as { modalState: ModalState }).modalState.visualAnchor,
    ).toBeUndefined();
  });

  test("configured ctrl+j insert escape exits insert when sent as enhanced keyboard input", () => {
    const options = resolveVimOptions({
      piVimMode: { keymap: { escape: ["<C-j>"] } },
    }).options;
    const { editor } = createEditor(options);

    editor.handleInput("x");
    editor.handleInput(ctrlJ);

    expectEditorState(editor, { text: "x", mode: "normal" });
  });

  test("raw text insert escape config is ignored by live editor", () => {
    const options = resolveVimOptions({ piVimMode: { keymap: { escape: ["jk"] } } }).options;
    const { editor } = createEditor(options);

    typeKeys(editor, ["j", "k"]);

    expectEditorState(editor, { text: "jk", mode: "insert" });
  });

  test("configured insert escape delegates while autocomplete is open", async () => {
    const options = resolveVimOptions({
      piVimMode: { keymap: { escape: ["<D-j>"] } },
    }).options;
    const { editor } = createEditor(options);
    installAutocomplete(editor, ["/super-j-suggestion"], 1);

    editor.handleInput("/");
    await flushAutocomplete();
    expect(editor.isShowingAutocomplete()).toBe(true);
    editor.handleInput(superJ);

    expect(editor.getVimMode()).toBe("insert");
    expect(
      (editor as unknown as { modalState: ModalState }).modalState.pendingInsertEscape,
    ).toBeUndefined();
  });

  test("macro replay preserves configured insert escape behavior", () => {
    const options = resolveVimOptions({
      piVimMode: { startMode: "normal", keymap: { escape: ["<D-j>"] } },
    }).options;
    const { editor } = createEditor(options);

    typeKeys(editor, ["q", "a", "i", "X", superJ, "q"]);
    expect((editor as unknown as { modalState: ModalState }).modalState.macros?.a).toEqual([
      "i",
      "X",
      superJ,
    ]);

    editor.setText("");
    typeKeys(editor, ["@", "a"]);
    expectEditorState(editor, { text: "X", mode: "normal" });
  });

  test("insert fast path stays disabled while recording and replaying macros", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    typeKeys(editor, ["q", "a", "i", "X", "\x1b", "q"]);
    expect((editor as unknown as { modalState: ModalState }).modalState.macros?.a).toEqual([
      "i",
      "X",
      "\x1b",
    ]);

    editor.setText("");
    typeKeys(editor, ["@", "a"]);
    expectEditorState(editor, { text: "X", mode: "normal" });
  });

  test("transient Ex message clears through modal path while insert text is preserved", () => {
    const { editor } = createEditor();
    (editor as unknown as { modalState: ModalState }).modalState = {
      mode: "insert",
      exMessage: { kind: "info", text: "done" },
    };

    editor.handleInput("a");
    expect(editor.getText()).toBe("a");
    expect((editor as unknown as { modalState: ModalState }).modalState.exMessage).toBeUndefined();
  });

  test("fast-path insert text clears redo history after text changes", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("abc");
    typeKeys(editor, ["g", "g", "x", "u", "i"]);
    expect(editor.getText()).toBe("abc");

    editor.handleInput("z");
    expect(editor.getText()).toBe("zabc");
    typeKeys(editor, ["\x1b", "\x12"]);
    expect(editor.getText()).toBe("zabc");
  });

  test("search highlight state uses modal fallback before insert delegation", () => {
    const { editor } = createEditor();
    const state = (editor as unknown as { modalState: ModalState }).modalState;
    (editor as unknown as { modalState: ModalState }).modalState = {
      ...state,
      mode: "insert",
      searchHighlight: { query: "a", current: { line: 0, col: 0 } },
    };
    let snapshotReads = 0;
    const originalGetLines = editor.getLines.bind(editor);
    (editor as unknown as { getLines: () => string[] }).getLines = () => {
      snapshotReads += 1;
      return originalGetLines();
    };

    editor.handleInput("a");
    expect(editor.getText()).toBe("a");
    expect(snapshotReads).toBeGreaterThan(0);
    expect((editor as unknown as { modalState: ModalState }).modalState.searchHighlight).toEqual({
      query: "a",
      current: { line: 0, col: 0 },
    });
  });

  test("can start in configured normal mode", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    expect(editor.getVimMode()).toBe("normal");
    editor.handleInput("q");
    expect(editor.getText()).toBe("");
  });

  test("insert autocomplete with one visible row keeps completion and INSERT status visible", async () => {
    const { editor } = createEditor();
    installAutocomplete(editor, ["/one"], 1);

    editor.handleInput("/");
    await flushAutocomplete();
    const lines = editor.render(40);
    const rendered = lines.join("\n");

    expect(editor.isShowingAutocomplete()).toBe(true);
    expect(rendered).toContain("/one");
    expect(rendered).toContain("INSERT");
    expect(lines.at(-2)).toContain("/one");
    expect(lines.at(-1)).toContain("INSERT");
  });

  test("insert autocomplete with multiple visible rows keeps every completion row", async () => {
    const { editor } = createEditor();
    installAutocomplete(editor, ["/alpha", "/bravo", "/charlie"], 3);

    editor.handleInput("/");
    await flushAutocomplete();
    const lines = editor.render(48);
    const rendered = lines.join("\n");

    expect(rendered).toContain("/alpha");
    expect(rendered).toContain("/bravo");
    expect(rendered).toContain("/charlie");
    expect(rendered).toContain("INSERT");
  });

  test("insert autocomplete render stays width-safe at narrow terminal width", async () => {
    const { editor } = createEditor();
    installAutocomplete(editor, ["/very-long-completion-value"], 1);

    editor.handleInput("/");
    await flushAutocomplete();
    expectRenderedWidth(editor.render(12), 12);
  });

  test("disabled mode feedback does not hide autocomplete rows", async () => {
    const { editor } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      ui: {
        ...DEFAULT_VIM_OPTIONS.ui!,
        mode: { ...DEFAULT_VIM_OPTIONS.ui!.mode, enabled: false },
      },
    });
    installAutocomplete(editor, ["/hidden-mode"], 1);

    editor.handleInput("/");
    await flushAutocomplete();
    const rendered = editor.render(40).join("\n");

    expect(rendered).toContain("/hidden-mode");
    expect(rendered).not.toContain("INSERT");
  });

  test("autocomplete-open render keeps workbench rows for search and Ex states", async () => {
    const cases: Array<{ state: Partial<ModalState>; expected: string }> = [
      { state: { pendingSearch: { direction: "forward", query: "abc" } }, expected: "/abc" },
      { state: { pendingSearch: { direction: "backward", query: "abc" } }, expected: "?abc" },
      { state: { pendingEx: { command: "set", sourceMode: "normal" } }, expected: ":set" },
      { state: { exMessage: { kind: "info", text: "done" } }, expected: "done" },
    ];

    for (const item of cases) {
      const { editor } = createEditor();
      installAutocomplete(editor, ["/workbench-row"], 1);
      editor.handleInput("/");
      await flushAutocomplete();
      const state = (editor as unknown as { modalState: ModalState }).modalState;
      (editor as unknown as { modalState: ModalState }).modalState = { ...state, ...item.state };

      const lines = editor.render(44);
      const rendered = lines.join("\n");
      expect(rendered).toContain("/workbench-row");
      expect(rendered).toContain("INSERT");
      expect(lines.some((line) => line.includes(item.expected))).toBe(true);
      expectRenderedWidth(lines, 44);
    }
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

  test("diagnostic popups and feedback info rows render width-safely", () => {
    const { editor, overlays } = createEditor(
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
    const overlayText = overlays.at(-1)?.component.render(64).join("\n") ?? "";
    expect(doctor.length).toBe(baseline.length);
    expect(doctor.join("\n")).not.toContain("vimdoctor: 1 warning");
    expect(overlayText).toContain(":vimdoctor");
    expect(overlayText).toContain("vimdoctor: 1 warning");
    expectRenderedWidth(doctor, 24);

    editor.handleInput("z");
    const feedback = editor.render(16);
    expect(feedback.at(-1)).toContain("unmapped key");
    expectRenderedWidth(feedback, 16);
  });

  test("reserved workbench rows render idle and active width-safely", () => {
    const { editor } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
      ui: {
        ...DEFAULT_VIM_OPTIONS.ui!,
        workbench: { reservedRows: 2 },
      },
    });
    const unreserved = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" }).editor.render(
      20,
    );
    const baseline = editor.render(20);
    expect(baseline.length).toBe(unreserved.length + 2);
    expect(baseline.slice(-2)).toEqual([" ".repeat(20), " ".repeat(20)]);
    expectRenderedWidth(baseline, 20);

    editor.handleInput(":");
    typeKeys(editor, ["h", "e", "l", "p"]);
    const active = editor.render(20);
    expect(active.length).toBe(baseline.length + 2);
    expect(active.at(-3)).toContain(":help");
    expect(active.at(-2)).toContain("help");
    expect(active.at(-1)).toContain("(1/1)");
    expectRenderedWidth(active, 20);
  });

  test("renders Ex command suggestions width-safely and reserves viewport rows", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    const baseline = editor.render(20);

    editor.handleInput(":");
    typeKeys(editor, ["m", "a"]);
    const active = editor.render(20);

    expect(active.length).toBe(baseline.length + 3);
    expect(active.at(-3)).toContain(":ma");
    expect(active.at(-2)).toContain("mapcheck");
    expect(active.at(-1)).toContain("(");
    expectRenderedWidth(active, 20);

    editor.handleInput("");
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

  test("keybinding discovery popup renders as real overlay panel", () => {
    const { editor, overlays } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    const baseline = editor.render(32);

    runEx(editor, "features keybindings");
    const editorLines = editor.render(32);
    const editorText = editorLines.join("\n");
    const overlay = overlays.at(-1);
    const overlayLines = overlay?.component.render(64) ?? [];
    const overlayText = overlayLines.join("\n");

    expect(overlay).toBeDefined();
    expect(overlay?.hidden).toBe(false);
    expect(overlay?.options).toMatchObject({ anchor: "center", width: "90%", maxHeight: "90%" });
    expect(editorLines.length).toBe(baseline.length);
    expect(editorText).not.toContain("Keybinding discovery");
    expect(overlayText).toContain("╭");
    expect(overlayText).toContain("Keybinding discovery");
    expect(overlayText).toContain("1-9/9");
    expect(overlayText).toContain("│ Source-backed");
    expect(overlayText).toContain("j/k ↑/↓ scroll");
    expect(overlayText).toContain("Esc close");
    expect(overlayText).not.toContain("↓1");
    expect(overlayText).not.toContain("…");
    expectRenderedWidth(overlayLines, 64);
  });

  test("dedicated keybindings command renders as real overlay panel", () => {
    const { editor, overlays } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    const baseline = editor.render(32);

    runEx(editor, "keybindings");
    const editorLines = editor.render(32);
    const editorText = editorLines.join("\n");
    const overlay = overlays.at(-1);
    const overlayLines = overlay?.component.render(72) ?? [];
    const overlayText = overlayLines.join("\n");

    expect(overlay).toBeDefined();
    expect(overlay?.hidden).toBe(false);
    expect(overlay?.options).toMatchObject({ anchor: "center", width: "90%", maxHeight: "90%" });
    expect(editorLines.length).toBe(baseline.length);
    expect(editorText).not.toContain("Effective pi-vimmode keybindings");
    expect(overlayText).toContain(":keybindings");
    expect(overlayText).not.toContain("Effective pi-vimmode keybindings");
    expect(overlayText).toContain("Key            Mode        Action");
    expect(overlayText).toContain("j/k ↑/↓ scroll");
    expectRenderedWidth(overlayLines, 72);
  });

  test("configured showKeybindings key renders same overlay shell", () => {
    const { editor, overlays } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
      keymap: {
        ...DEFAULT_VIM_OPTIONS.keymap!,
        commands: { ...DEFAULT_VIM_OPTIONS.keymap!.commands, showKeybindings: ["gk"] },
      },
    });

    typeKeys(editor, ["g", "k"]);
    const overlay = overlays.at(-1);
    const overlayText = overlay?.component.render(72).join("\n") ?? "";

    expect(overlay).toBeDefined();
    expect(overlay?.options).toMatchObject({ anchor: "center", width: "90%", maxHeight: "90%" });
    expect(overlayText).toContain(":keybindings");
    expect(overlayText).not.toContain("Effective pi-vimmode keybindings");
    expect(overlayText).toContain("Key            Mode        Action");
  });

  test("keybinding discovery overlay scroll reveals hidden bounded rows", () => {
    const options: ResolvedVimEditorOptions = {
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
      keymap: {
        ...DEFAULT_VIM_OPTIONS.keymap!,
        actions: {
          accepted: Array.from({ length: 8 }, (_, index) => ({
            key: `g${index}`,
            actionId: "prompt.transform.quote",
            args: { action: "quote" },
          })),
        },
      },
    };
    const { editor, overlays } = createEditor(options);

    runEx(editor, "features keybindings");
    const overlay = overlays.at(-1)?.component;
    expect(overlay).toBeDefined();
    const initial = overlay.render(80).join("\n");
    expect(initial).toContain("1-10/");
    expect(initial).toContain("Source-backed");
    expect(initial).not.toContain("prompt.transform.quote -> g7");

    typeKeys(overlay, ["j", "j", "j", "j", "j", "j"]);
    const scrolled = overlay.render(80).join("\n");
    expect(scrolled).toContain("7-16/");
    expect(scrolled).toContain("prompt.transform.quote -> g7");
    expect(scrolled).toContain("↑");
    expect(scrolled).not.toContain("Source-backed");
    expectRenderedWidth(overlay.render(80), 80);

    overlay.handleInput("k");
    expect(overlay.render(80).join("\n")).toContain("6-15/");
  });

  test("runtime help uses generic read-only popup", () => {
    const { editor, overlays } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    const baseline = editor.render(48);

    runEx(editor, "help search");
    let lines = editor.render(48);
    let overlayText = overlays.at(-1)?.component.render(64).join("\n") ?? "";
    expect(lines.length).toBe(baseline.length);
    expect(lines.join("\n")).not.toContain("prompt search");
    expect(overlayText).toContain(":help search");
    expect(overlayText).toContain("prompt search");

    runEx(editor, "features redo");
    lines = editor.render(48);
    overlayText = overlays.at(-1)?.component.render(64).join("\n") ?? "";
    expect(lines.length).toBe(baseline.length);
    expect(lines.join("\n")).not.toContain("command.redo");
    expect(overlayText).toContain(":features redo");
    expect(overlayText).toContain("command.redo");
  });

  test("representative read-only Ex commands open live popups", () => {
    const { editor, overlays } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    const cases = [
      ["help search", ":help search", "prompt search"],
      ["features redo", ":features redo", "command.redo"],
      ["actions redo", ":actions redo", "command.redo"],
      ["keymap redo", ":keymap redo", "command.redo"],
      ["mapcheck ctrl+p", ":mapcheck ctrl+p", "protected"],
      ["vimdoctor", ":vimdoctor", "vimdoctor: ok"],
      ["messages", ":messages", "messages:"],
      ["vimmode inspect", ":vimmode inspect", "inspect:"],
    ] as const;

    for (const [command, title, body] of cases) {
      runEx(editor, command);
      const overlayText = overlays.at(-1)?.component.render(72).join("\n") ?? "";
      expect(overlayText).toContain(title);
      expect(overlayText).toContain(body);
    }
  });

  test("runtime help, inspect, and messages popups render width-safely", () => {
    const { editor, overlays } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("abc");
    editor.handleInput(":");
    typeKeys(editor, ["s", "/", "m", "i", "s", "s", "i", "n", "g", "/", "x", "/", "\r"]);
    runEx(editor, "vimmode inspect");
    let lines = editor.render(48);
    let overlayLines = overlays.at(-1)?.component.render(48) ?? [];
    expect(lines.join("\n")).not.toContain("inspect: mode=normal");
    expect(overlayLines.join("\n")).toContain("inspect: mode=normal");
    expectRenderedWidth(lines, 48);
    expectRenderedWidth(overlayLines, 48);

    editor.handleInput(":");
    typeKeys(editor, ["m", "e", "s", "s", "a", "g", "e", "s", "\r"]);

    lines = editor.render(32);
    overlayLines = overlays.at(-1)?.component.render(48) ?? [];
    expect(lines.join("\n")).not.toContain("messages: 1 retained");
    expect(overlayLines.join("\n")).toContain("messages: 1 retained");
    expectRenderedWidth(lines, 32);
    expectRenderedWidth(overlayLines, 48);
  });

  test("runtime help popup composes with visual selection and search highlights", () => {
    const { editor, overlays } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("one old\ntwo old");
    editor.handleInput("/");
    typeKeys(editor, ["o", "l", "d", "\r"]);
    runEx(editor, "help search");
    const searchHelp = editor.render(60).join("\n");
    let overlayText = overlays.at(-1)?.component.render(64).join("\n") ?? "";
    expect(searchHelp).toContain(SEARCH_START);
    expect(searchHelp).not.toContain("prompt search");
    expect(overlayText).toContain("prompt search");

    editor.handleInput("V");
    editor.handleInput("j");
    editor.handleInput(":");
    typeKeys(editor, ["\b", "\b", "\b", "\b", "\b", "h", "e", "l", "p", "\r"]);
    const visualHelp = editor.render(60).join("\n");
    overlayText = overlays.at(-1)?.component.render(64).join("\n") ?? "";
    expect(visualHelp).toContain("\u001b[7m");
    expect(visualHelp).not.toContain("help:");
    expect(overlayText).toContain("help:");
  });

  test("read-only popup local controls and too-small fallback stay prompt-safe", () => {
    const { editor, overlays } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("abc");
    runEx(editor, "help search");
    const overlay = overlays.at(-1);
    expect(overlay?.hidden).toBe(false);
    overlay?.component.handleInput("\x03");
    expect(overlay?.hidden).toBe(true);
    expect(editor.getText()).toBe("abc");
    expect(editor.getCursor()).toEqual({ line: 0, col: 3 });

    const small = createEditor(
      { ...DEFAULT_VIM_OPTIONS, startMode: "normal" },
      { warnings: [] },
      false,
      { columns: 40, rows: 10 },
    );
    const baseline = small.editor.render(40);
    runEx(small.editor, "help search");
    const fallback = small.editor.render(40);
    expect(small.overlays).toHaveLength(0);
    expect(fallback.length).toBe(baseline.length + 1);
    expect(fallback.at(-1)).toContain("Read-only popup unavailable");
    expect(small.editor.getText()).toBe("");
    expect(small.editor.getCursor()).toEqual({ line: 0, col: 0 });
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

  test("renders and clones a right-positioned status group", () => {
    const options = structuredClone(
      resolveVimOptions({
        piVimMode: {
          startMode: "normal",
          ui: {
            status: { position: "right" },
            mode: { labels: { normal: "COMMAND" } },
          },
        },
      }).options,
    );
    const { editor } = createEditor(options);
    options.ui!.status.position = "left";

    const status = editor.render(30).at(-1) ?? "";
    expect(status.startsWith("──")).toBe(true);
    expect(status.endsWith(" COMMAND 1:1 ─")).toBe(true);
    expect(visibleWidth(status)).toBe(30);
  });

  test("renders configured cursor position status", () => {
    const { editor } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
      ui: {
        ...DEFAULT_VIM_OPTIONS.ui!,
        status: { enabled: true, position: "left", items: ["mode", "cursorPosition"] },
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

  test("insert after keeps wrapped logical line before following blank line", () => {
    const { editor } = createEditor(
      { ...DEFAULT_VIM_OPTIONS, startMode: "normal" },
      { warnings: [] },
      false,
      { rows: 10 },
    );
    const line = "a".repeat(200);
    editor.setText(`${line}\n`);
    editor.render(20);
    editor.handleInput("k");
    editor.handleInput("$");
    editor.render(20);

    expect(editor.getCursor()).toEqual({ line: 0, col: line.length });

    editor.handleInput("a");
    editor.handleInput("X");

    expectEditorState(editor, {
      text: `${line}X\n`,
      cursor: { line: 0, col: line.length + 1 },
      mode: "insert",
    });
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

  test("normal X deletes character before cursor into register", () => {
    const { editor } = createEditor();
    editor.handleInput("a");
    editor.handleInput("b");
    editor.handleInput("c");
    editor.handleInput("\x1b");
    editor.handleInput("X");
    expect(editor.getText()).toBe("ab");
    expect(editor.getCursor()).toEqual({ line: 0, col: 2 });
    expect(editor.getRegister()).toEqual({ type: "char", text: "c" });
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

  test("VimEditor honors configured WORD and previous-end motion keymap", () => {
    const options = resolveVimOptions({
      piVimMode: {
        startMode: "normal",
        keymap: {
          motions: { wordForwardBig: ["gw"], wordPreviousEnd: ["g-"] },
          operatorMotions: { delete: ["wordForwardBig", "wordPreviousEnd"] },
          commands: { redo: ["U"], showKeybindings: ["gk"] },
          macros: { record: ["q"], play: ["@"] },
          marks: { set: ["m"], jumpExact: ["`"], jumpLine: ["'"] },
        },
      },
    }).options;
    const { editor } = createEditor(options);

    editor.setText("run --foo=bar /tmp/a-b");
    typeKeys(editor, ["g", "g", "g", "w"]);
    expect(editor.getCursor()).toEqual({ line: 0, col: 4 });

    editor.setText("alpha beta.gamma /tmp/file");
    typeKeys(editor, ["g", "g", "g", "w", "g", "w", "g", "-"]);
    expect(editor.getCursor()).toEqual({ line: 0, col: 15 });

    editor.setText("run --foo=bar /tmp/a-b");
    typeKeys(editor, ["g", "g", "d", "g", "w"]);
    expect(editor.getText()).toBe("--foo=bar /tmp/a-b");
  });

  test("VimEditor honors default paragraph motions and text objects", () => {
    const { editor } = createEditor({ ...DEFAULT_VIM_OPTIONS, startMode: "normal" });
    editor.setText("alpha\nbeta\n\ngamma\n\ndelta\nepsilon");
    typeKeys(editor, ["g", "g", "}"]);
    expect(editor.getCursor()).toEqual({ line: 3, col: 0 });
    typeKeys(editor, ["{"]);
    expect(editor.getCursor()).toEqual({ line: 0, col: 0 });
    typeKeys(editor, ["d", "}"]);
    expect(editor.getText()).toBe("gamma\n\ndelta\nepsilon");
    typeKeys(editor, ["g", "g", "d", "a", "p"]);
    expect(editor.getText()).toBe("delta\nepsilon");
  });

  test("VimEditor honors configured paragraph motion and text object keys", () => {
    const options = resolveVimOptions({
      piVimMode: {
        startMode: "normal",
        keymap: {
          motions: { paragraphForward: ["P"], paragraphBackward: ["N"] },
          textObjects: { targets: { paragraph: ["g"] } },
          operatorMotions: { delete: ["paragraphForward"] },
        },
      },
    }).options;
    const { editor } = createEditor(options);
    editor.setText("alpha\n\ngamma");
    typeKeys(editor, ["g", "g", "P"]);
    expect(editor.getCursor()).toEqual({ line: 2, col: 0 });
    typeKeys(editor, ["d", "i", "g"]);
    expect(editor.getText()).toBe("alpha\n\n");
  });

  test("VimEditor propagates configured paragraph options without dropping siblings", () => {
    const options = resolveVimOptions({
      piVimMode: {
        startMode: "normal",
        keymap: {
          motions: { paragraphForward: ["]"] },
          commands: { redo: ["U"] },
          macros: { record: ["q"], play: ["@"] },
          marks: { set: ["m"], jumpExact: ["`"], jumpLine: ["'"] },
        },
      },
    }).options;
    const { editor } = createEditor(options);
    expect(options.keymap?.motions.paragraphForward).toEqual(["]"]);
    expect(options.keymap?.commands.redo).toEqual(["U"]);
    editor.setText("one\n\ntwo");
    typeKeys(editor, ["g", "g", "]"]);
    expect(editor.getCursor()).toEqual({ line: 2, col: 0 });
    typeKeys(editor, ["U"]);
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

  test("configured showKeybindings key survives live editor option cloning", () => {
    const { editor, overlays } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
      keymap: {
        ...DEFAULT_VIM_OPTIONS.keymap!,
        operators: { ...DEFAULT_VIM_OPTIONS.keymap!.operators, delete: ["z"] },
        motions: { ...DEFAULT_VIM_OPTIONS.keymap!.motions, wordForward: ["e"] },
        commands: {
          ...DEFAULT_VIM_OPTIONS.keymap!.commands,
          showKeybindings: ["gk"],
          redo: ["R"],
        },
        macros: { ...DEFAULT_VIM_OPTIONS.keymap!.macros, record: ["Q"] },
        marks: { ...DEFAULT_VIM_OPTIONS.keymap!.marks, set: ["M"] },
        actions: { accepted: [] },
      },
    });

    typeKeys(editor, ["g", "k"]);
    expect(overlays.at(-1)?.component.render(80).join("\n")).toContain(":keybindings");
    editor.handleInput("\x1b");

    editor.setText("hello world");
    typeKeys(editor, ["g", "g", "z", "e"]);
    expect(editor.getText()).toBe("world");
    typeKeys(editor, ["Q", "a", "Q"]);
    expect(editor.getVimMode()).toBe("normal");
    editor.handleInput("M");
    editor.handleInput("a");
    expect(editor.getMark("a")).toEqual(editor.getCursor());
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

  test("word search keys survive live editor keymap cloning", () => {
    const { editor } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      startMode: "normal",
      keymap: {
        ...DEFAULT_VIM_OPTIONS.keymap!,
        commands: { ...DEFAULT_VIM_OPTIONS.keymap!.commands, searchWordForward: ["*", "K"] },
      },
    });
    editor.setText("one two one");
    typeKeys(editor, ["g", "g", "*"]);
    expect(editor.getCursor()).toEqual({ line: 0, col: 8 });
    editor.setText("one two one");
    typeKeys(editor, ["g", "g", "K"]);
    expect(editor.getCursor()).toEqual({ line: 0, col: 8 });
    typeKeys(editor, ["#"]);
    expect(editor.getCursor()).toEqual({ line: 0, col: 0 });
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
        commands: { ...DEFAULT_VIM_OPTIONS.keymap!.commands, visualBlock: ["ctrl+v"] },
      },
    });
    editor.setText("hello world");
    editor.handleInput("g");
    editor.handleInput("g");
    editor.handleInput("z");
    editor.handleInput("e");
    expect(editor.getText()).toBe("world");
    expect(editor.getRegister()).toEqual({ type: "char", text: "hello " });
    editor.handleInput("\x16");
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
    const { editor } = createEditor(ctrlVVisualBlockOptions());
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
    const { editor } = createEditor(ctrlVVisualBlockOptions("normal"));
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
    const { editor } = createEditor(ctrlVVisualBlockOptions("normal"));
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

  test("terminal-exit cursor reset skips visibility restoration", () => {
    const { editor, writes, hardwareCursorChanges, getHardwareCursorVisible } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      cursor: { ...DEFAULT_VIM_OPTIONS.cursor, insert: "bar" },
    });

    expect(getHardwareCursorVisible()).toBe(true);
    editor.resetTerminalCursorStyle({ restoreHardwareCursorVisibility: false });

    expect(writes.at(-1)).toBe("\x1b[0 q");
    expect(getHardwareCursorVisible()).toBe(true);
    expect(hardwareCursorChanges).toEqual([true]);
  });

  test("agent busy preserves bar hardware cursor without changing editor state", () => {
    const { editor, writes, hardwareCursorChanges, getHardwareCursorVisible } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      cursor: { ...DEFAULT_VIM_OPTIONS.cursor, insert: "bar" },
    });
    editor.handleInput("a");
    expectEditorState(editor, { text: "a", cursor: { line: 0, col: 1 }, mode: "insert" });
    expect(writes.at(-1)).toBe("\x1b[6 q");
    expect(getHardwareCursorVisible()).toBe(true);

    editor.setAgentBusy(true);

    expectEditorState(editor, { text: "a", cursor: { line: 0, col: 1 }, mode: "insert" });
    expect(editor.getCurrentCursorStyle()).toBe("bar");
    expect(writes.at(-1)).toBe("\x1b[6 q");
    expect(getHardwareCursorVisible()).toBe(true);
    expect(hardwareCursorChanges).toEqual([true]);
  });

  test("agent busy suppresses non-bar cursor and idle preserves original hardware visibility", () => {
    const { editor, writes, hardwareCursorChanges, getHardwareCursorVisible } = createEditor(
      {
        startMode: "insert",
        cursor: {
          ...DEFAULT_VIM_OPTIONS.cursor,
          insert: "bar",
          normal: "underline",
        },
      },
      { warnings: [] },
      true,
    );
    expect(hardwareCursorChanges).toEqual([]);
    editor.handleInput("\x1b");
    expect(writes.at(-1)).toBe("\x1b[4 q");
    expect(getHardwareCursorVisible()).toBe(true);

    editor.setAgentBusy(true);
    expect(getHardwareCursorVisible()).toBe(false);
    expect(writes.at(-1)).toBe("\x1b[4 q");
    editor.setAgentBusy(false);

    expect(editor.getVimMode()).toBe("normal");
    expect(editor.getCurrentCursorStyle()).toBe("underline");
    expect(getHardwareCursorVisible()).toBe(true);
    expect(writes.at(-1)).toBe("\x1b[4 q");
    expect(hardwareCursorChanges).toEqual([false, true]);
  });

  test("cursor reset restores original hardware visibility after busy transitions", () => {
    const { editor, writes, hardwareCursorChanges, getHardwareCursorVisible } = createEditor({
      ...DEFAULT_VIM_OPTIONS,
      cursor: { ...DEFAULT_VIM_OPTIONS.cursor, insert: "bar" },
    });
    editor.setAgentBusy(true);
    editor.setAgentBusy(false);

    editor.resetTerminalCursorStyle();

    expect(writes.at(-1)).toBe("\x1b[0 q");
    expect(getHardwareCursorVisible()).toBe(false);
    expect(hardwareCursorChanges).toEqual([true, false]);
  });
});

describe("status border fitting", () => {
  test("fits normal mode status within width", () => {
    const line = fitStatusBorder(" NORMAL ", " 3 chars ", 30);
    expect(visibleWidth(line)).toBeLessThanOrEqual(30);
    expect(line).toContain("NORMAL");
  });

  test("places right status at the far edge", () => {
    const line = fitStatusBorder(" 1:1 ", " N ", 20);
    expect(line.endsWith(" N ─")).toBe(true);
    expect(visibleWidth(line)).toBe(20);
  });

  test("truncates right content before left content", () => {
    const line = fitStatusBorder(" LEFT ", " MODE ", 8);
    expect(visibleWidth(line)).toBe(8);
    expect(line).toContain("LEFT");
    expect(line).not.toContain("MODE");
  });

  test("handles zero and narrow widths without overflow", () => {
    for (let width = 0; width <= 12; width += 1) {
      expect(visibleWidth(fitStatusBorder(" LEFT ", " RIGHT ", width))).toBe(width);
    }
  });
});

describe("vim editor clipboard register integration", () => {
  afterEach(() => setClipboardTextReaderForTesting(undefined));

  test("clipboard register command updates modal state without breaking editor effects", () => {
    const { editor } = createEditor();
    typeKeys(editor, ["o", "n", "e", "\x1b", '"', "+", "y", "y"]);

    expect(editor.getText()).toBe("one");
    expect(editor.getRegister()).toEqual({ type: "line", text: "one" });
    expect(editor.getClipboardRegister("+")).toEqual({ type: "line", text: "one" });

    typeKeys(editor, ["o", "\x1b"]);
    expect(editor.getText()).toBe("one\n");
  });

  test("clipboard paste reads host clipboard text before prompt-local mirror", async () => {
    setClipboardTextReaderForTesting(async () => "host");
    const { editor } = createEditor();
    typeKeys(editor, ["o", "n", "e", "\x1b", '"', "+", "p"]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(editor.getText()).toBe("onehost");
    expect(editor.getClipboardRegister("+")).toEqual({ type: "char", text: "host" });
  });

  test("clipboard paste falls back to prompt-local mirror on host read failure", async () => {
    setClipboardTextReaderForTesting(async () => {
      throw new Error("no clipboard");
    });
    const { editor } = createEditor();
    typeKeys(editor, ["o", "n", "e", "\x1b", '"', "+", "y", "y", "o", "\x1b", '"', "+", "P"]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(editor.getText()).toBe("one\none\n");
  });
});

describe("VimEditor shutdown wiring", () => {
  const normalOpts = { ...DEFAULT_VIM_OPTIONS, startMode: "normal" as const };

  test(":q requests shutdown through injected callback without editing text", () => {
    let shutdownCalled = false;
    const { editor } = createEditor(
      normalOpts,
      { warnings: [] },
      false,
      {},
      {
        onShutdown: () => {
          shutdownCalled = true;
        },
      },
    );
    editor.setText("hello world");
    runEx(editor, "q");
    expect(shutdownCalled).toBe(true);
    expect(editor.getText()).toBe("hello world");
  });

  test(":quit requests shutdown through injected callback without editing text", () => {
    let shutdownCalled = false;
    const { editor } = createEditor(
      normalOpts,
      { warnings: [] },
      false,
      {},
      {
        onShutdown: () => {
          shutdownCalled = true;
        },
      },
    );
    editor.setText("old text");
    runEx(editor, "quit");
    expect(shutdownCalled).toBe(true);
    expect(editor.getText()).toBe("old text");
  });

  test(":q! is rejected without calling shutdown callback", () => {
    let shutdownCalled = false;
    const { editor } = createEditor(
      normalOpts,
      { warnings: [] },
      false,
      {},
      {
        onShutdown: () => {
          shutdownCalled = true;
        },
      },
    );
    editor.setText("hello");
    runEx(editor, "q!");
    expect(shutdownCalled).toBe(false);
    expect(editor.getText()).toBe("hello");
  });

  test("missing shutdown callback does not throw", () => {
    const { editor } = createEditor(normalOpts);
    editor.setText("hello");
    runEx(editor, "q");
    expect(editor.getText()).toBe("hello");
  });
});
