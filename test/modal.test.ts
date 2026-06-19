import { describe, expect, test } from "bun:test";

import type { ModalEffect, ModalOptions, ModalState } from "../src/modal/types.ts";

import { DEFAULT_VIM_KEYMAP, resolveVimOptions } from "../src/config.ts";
import { canFastDelegateInsertInput, handleModalInput } from "../src/modal/engine.ts";
import { createModalState, resetTransientState, transitionMode } from "../src/modal/state.ts";
import { modalModeLabel, modalStatus, modalVisualStatus } from "../src/modal/view.ts";

const p = (line: number, col: number) => ({ line, col });
const cursor = { line: 0, col: 0 };
const options: ModalOptions = {
  startMode: "insert" as const,
  cursor: {
    insert: "bar" as const,
    normal: "block" as const,
    visual: "block" as const,
    visualLine: "block" as const,
    visualBlock: "block" as const,
  },
};
const snapshot = { text: "abc", lines: ["abc"], cursor };

function applyModalKeys(
  initialState: ModalState,
  initialText: string,
  initialCursor: { line: number; col: number },
  keys: readonly string[],
  modalOptions: ModalOptions = options,
  terminalRows?: number,
) {
  let state = initialState;
  let text = initialText;
  let cursor = initialCursor;

  const effects: ModalEffect[] = [];

  for (const key of keys) {
    const update = handleModalInput(
      state,
      { text, lines: text.split("\n"), cursor, terminalRows },
      modalOptions,
      key,
    );
    state = update.state;
    effects.push(...update.effects);
    for (const effect of update.effects) {
      if (effect.type === "edit") {
        text = effect.result.text;
        cursor = effect.result.cursor;
      }
      if (effect.type === "restoreCursor") cursor = effect.position;
    }
  }

  return { state, text, cursor, effects };
}

describe("modal contracts", () => {
  test("canFastDelegateInsertInput allows only plain insert text with no side state", () => {
    expect(canFastDelegateInsertInput({ mode: "insert" }, "a")).toBe(true);
    expect(canFastDelegateInsertInput({ mode: "insert" }, "é")).toBe(true);

    const unsafeStates: ModalState[] = [
      { mode: "normal" },
      { mode: "insert", visualAnchor: cursor },
      { mode: "insert", pending: "d" },
      {
        mode: "insert",
        blockInsert: {
          anchor: cursor,
          active: cursor,
          placement: "start",
          previewLine: 0,
          text: "",
        },
      },
      { mode: "insert", recordingSlot: "a" },
      { mode: "insert", pendingMacro: "record" },
      { mode: "insert", pendingRegister: "awaitingSlot" },
      { mode: "insert", pendingMark: { kind: "set" } },
      {
        mode: "insert",
        pendingWorkbench: { kind: "search", prefix: "/", text: "", direction: "forward" },
      },
      { mode: "insert", pendingSearch: { query: "", direction: "forward" } },
      { mode: "insert", pendingEx: { command: "", sourceMode: "normal" } },
      { mode: "insert", exMessage: { kind: "info", text: "message" } },
      {
        mode: "insert",
        helpPopup: {
          title: ":help",
          lines: ["help"],
          source: "help",
          scrollOffset: 0,
        },
      },
      { mode: "insert", searchHighlight: { query: "abc", current: cursor } },
    ];

    for (const state of unsafeStates) expect(canFastDelegateInsertInput(state, "a")).toBe(false);
  });

  test("canFastDelegateInsertInput rejects non-text and adapter-owned unsafe context", () => {
    for (const input of ["\x1b", "\r", "\t", "\x7f", "ab", "\u001b[A", "\x03"]) {
      expect(canFastDelegateInsertInput({ mode: "insert" }, input)).toBe(false);
    }
    expect(canFastDelegateInsertInput({ mode: "insert" }, "a", { isAutocompleteOpen: true })).toBe(
      false,
    );
    expect(canFastDelegateInsertInput({ mode: "insert" }, "a", { isMacroReplaying: true })).toBe(
      false,
    );
  });

  test("createModalState starts with configured mode and empty transient state", () => {
    expect(createModalState("normal")).toEqual({ mode: "normal" });
  });

  test("normal mode scroll motions move by half visible prompt page", () => {
    const text = Array.from({ length: 10 }, (_, index) => `line-${index}`).join("\n");
    expect(applyModalKeys({ mode: "normal" }, text, p(1, 4), ["\x04"], options, 20).cursor).toEqual(
      p(4, 4),
    );
    expect(applyModalKeys({ mode: "normal" }, text, p(4, 4), ["\x15"], options, 20).cursor).toEqual(
      p(1, 4),
    );
    expect(
      applyModalKeys({ mode: "normal" }, text, p(1, 4), ["2", "\x04"], options, 20).cursor,
    ).toEqual(p(7, 4));
    expect(
      applyModalKeys({ mode: "normal" }, "abcdef\nx", p(0, 5), ["\x04"], options, 20).cursor,
    ).toEqual(p(1, 1));
  });

  test("visual scroll motions preserve anchor and insert mode delegates", () => {
    const text = "zero\none\ntwo\nthree\nfour";
    const visual = applyModalKeys(
      { mode: "visual", visualAnchor: p(0, 1) },
      text,
      p(0, 1),
      ["\x04"],
      options,
      20,
    );
    expect(visual.state.visualAnchor).toEqual(p(0, 1));
    expect(visual.cursor).toEqual(p(3, 1));

    const insert = applyModalKeys({ mode: "insert" }, text, p(0, 0), ["\x04"], options, 20);
    expect(insert.effects).toContainEqual({ type: "delegate", input: "\x04" });
  });

  test("resetTransientState clears visual and pending state without dropping registers", () => {
    const state: ModalState = {
      mode: "visual",
      pending: "d",
      pendingRegister: { kind: "named", slot: "a", append: false },
      visualAnchor: cursor,
      register: { type: "char", text: "x" },
      namedRegisters: { a: { type: "line", text: "one" } },
      marks: { a: cursor },
      pendingMark: { kind: "jumpExact" },
      lastCharSearch: { command: "findCharForward", target: ":" },
      lastSearch: { query: "two", direction: "forward" },
      lastRepeatableChange: { type: "command", command: "deleteChar" },
    };

    expect(resetTransientState(state, "insert")).toEqual({
      mode: "insert",
      register: { type: "char", text: "x" },
      namedRegisters: { a: { type: "line", text: "one" } },
      marks: { a: cursor },
      lastCharSearch: { command: "findCharForward", target: ":" },
      lastSearch: { query: "two", direction: "forward" },
      lastRepeatableChange: { type: "command", command: "deleteChar" },
    });
  });

  test("transitionMode returns terminal cursor and invalidate effects", () => {
    const result = transitionMode({ mode: "normal" }, "visual", {
      startMode: "insert",
      cursor: {
        insert: "bar",
        normal: "block",
        visual: "underline",
        visualLine: "block",
        visualBlock: "block",
      },
    });

    expect(result.state).toEqual({ mode: "visual" });
    expect(result.effects).toEqual<ModalEffect[]>([
      { type: "terminalCursor", style: "underline" },
      { type: "invalidate" },
    ]);
  });

  test("effect union supports adapter-applied intents", () => {
    const effects: ModalEffect[] = [
      { type: "delegate", input: "\r" },
      { type: "adapterCommand", command: "redo" },
      { type: "edit", result: { text: "x", cursor, changed: true } },
      {
        type: "openReadOnlyPopup",
        popup: {
          title: ":help",
          lines: ["help"],
          source: "help",
          scrollOffset: 0,
        },
      },
      { type: "playMacro", slot: "a", inputs: ["i", "x", "\x1b"] },
      { type: "copyClipboard", register: "+", text: "copied" },
      { type: "readClipboard", register: "+", placement: "after" },
      { type: "invalidate" },
      { type: "terminalCursor", style: "bar" },
    ];

    expect(effects.map((effect) => effect.type)).toEqual([
      "delegate",
      "adapterCommand",
      "edit",
      "openReadOnlyPopup",
      "playMacro",
      "copyClipboard",
      "readClipboard",
      "invalidate",
      "terminalCursor",
    ]);
  });
});

describe("Ex command-line modal behavior", () => {
  test("normal entry opens Ex command-line and cancel closes it", () => {
    const opened = handleModalInput({ mode: "normal" }, snapshot, options, ":");
    expect(opened.state.pendingEx).toMatchObject({ command: "", sourceMode: "normal" });

    const cancelled = handleModalInput(opened.state, snapshot, options, "\x1b");
    expect(cancelled.state.pendingEx).toBeUndefined();
    expect(cancelled.state.mode).toBe("normal");
  });

  test("count before Ex entry prefills a concrete clamped line range", () => {
    const state = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree", p(1, 0), ["3", ":"]).state;
    expect(state.pendingEx).toMatchObject({ command: "2,3", sourceMode: "normal" });
  });

  test("visual entry captures selected lines and cancel restores visual selection", () => {
    const opened = handleModalInput(
      { mode: "visual", visualAnchor: p(0, 1) },
      { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
      options,
      ":",
    );
    expect(opened.state.pendingEx).toMatchObject({
      command: "'<,'>",
      sourceMode: "visual",
      visualAnchor: p(0, 1),
      visualCursor: p(1, 2),
      visualRange: { startLine: 0, endLine: 1 },
    });

    const cancelled = handleModalInput(opened.state, snapshot, options, "\x1b");
    expect(cancelled.state.mode).toBe("visual");
    expect(cancelled.state.visualAnchor).toEqual(p(0, 1));
    expect(cancelled.state.pendingEx).toBeUndefined();
  });

  test("pending Ex command cancels and delegates Ctrl-C/Ctrl-G", () => {
    for (const key of ["\x03", "\x07"]) {
      const update = handleModalInput(
        { mode: "normal", pendingEx: { command: "s/a/b/", sourceMode: "normal" } },
        snapshot,
        options,
        key,
      );
      expect(update.state.pendingEx).toBeUndefined();
      expect(update.state.mode).toBe("insert");
      expect(update.effects).toContainEqual({ type: "delegate", input: key });
    }
  });

  test("Ex input edits command text, executes substitution, and reports success", () => {
    const result = applyModalKeys({ mode: "normal" }, "old old\nold", p(0, 0), [
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
      "g",
      "\r",
      "\r",
    ]);
    expect(result.text).toBe("new new\nnew");
    expect(result.cursor).toEqual(p(0, 0));
    expect(result.state.pendingEx).toBeUndefined();
    expect(result.state.exMessage).toEqual({ kind: "success", text: "3 substitutions" });
  });

  test("diagnostic Ex commands report info without editing state", () => {
    const initial: ModalState = {
      mode: "normal",
      register: { type: "char", text: "saved" },
      marks: { a: p(0, 1) },
      lastSearch: { query: "abc", direction: "forward" },
      searchHighlight: { query: "abc", current: p(0, 0) },
      lastRepeatableChange: { type: "command", command: "deleteChar" },
    };
    const result = applyModalKeys(initial, "abc", p(0, 1), [
      ":",
      "a",
      "c",
      "t",
      "i",
      "o",
      "n",
      "s",
      " ",
      "v",
      "i",
      "m",
      "m",
      "o",
      "d",
      "e",
      ".",
      "h",
      "e",
      "l",
      "p",
      "\r",
    ]);

    expect(result.text).toBe("abc");
    expect(result.cursor).toEqual(p(0, 1));
    expect(result.state.register).toEqual(initial.register);
    expect(result.state.marks).toEqual(initial.marks);
    expect(result.state.lastSearch).toEqual(initial.lastSearch);
    expect(result.state.searchHighlight).toEqual(initial.searchHighlight);
    expect(result.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
    expect(result.state.exMessage).toBeUndefined();
    expect(result.state.helpPopup?.title).toBe(":actions vimmode.help");
    expect(result.state.helpPopup?.lines.join("\n")).toContain("vimmode.help");
  });

  test("visual diagnostic Ex commands preserve visual state", () => {
    const initial: ModalState = { mode: "visual", visualAnchor: p(0, 1) };
    const opened = handleModalInput(
      initial,
      { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
      options,
      ":",
    );
    let state = opened.state;
    for (const key of ["a", "c", "t", "i", "o", "n", "s"]) {
      state = handleModalInput(
        state,
        { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
        options,
        key,
      ).state;
    }
    const result = handleModalInput(
      state,
      { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
      options,
      "\r",
    );

    expect(result.state.mode).toBe("visual");
    expect(result.state.visualAnchor).toEqual(p(0, 1));
    expect(result.effects).toContainEqual({ type: "restoreCursor", position: p(1, 2) });
    expect(result.state.exMessage).toBeUndefined();
    expect(result.state.helpPopup?.title).toBe(":actions");
    expect(result.effects).toContainEqual({
      type: "openReadOnlyPopup",
      popup: result.state.helpPopup!,
    });
  });

  test("keybindings opens catalog popup without editing state", () => {
    const configured = resolveVimOptions({
      piVimMode: { keymap: { actions: { "prompt.transform.reflow": ["gq"] } } },
    }).options;
    const initial: ModalState = {
      mode: "normal",
      register: { type: "char", text: "saved" },
      namedRegisters: { a: { type: "line", text: "line" } },
      marks: { a: p(0, 1) },
      macros: { a: ["x"] },
      lastPlayedMacro: "a",
      lastSearch: { query: "abc", direction: "forward" },
      searchHighlight: { query: "abc", current: p(0, 0) },
      lastRepeatableChange: { type: "command", command: "deleteChar" },
      messageHistory: [{ kind: "info", text: "kept" }],
    };
    const result = applyModalKeys(
      initial,
      "abc",
      p(0, 1),
      [":", "k", "e", "y", "b", "i", "n", "d", "i", "n", "g", "s", "\r"],
      configured,
    );
    const popupText = [
      result.state.helpPopup?.title,
      ...(result.state.helpPopup?.lines ?? []),
    ].join("\n");

    expect(result.text).toBe("abc");
    expect(result.cursor).toEqual(p(0, 1));
    expect(result.state.mode).toBe("normal");
    expect(result.state.exMessage).toBeUndefined();
    expect(result.state.helpPopup?.title).toBe(":keybindings");
    expect(result.state.helpPopup?.source).toBe("keybindings");
    expect(popupText).not.toContain("Effective pi-vimmode keybindings");
    expect(popupText).toContain("Key            Mode        Action");
    expect(popupText).toContain("prompt.transform.reflow");
    expect(popupText).toContain("gq");
    expect(popupText).toContain("no runtime :map");
    expect(result.state.register).toEqual(initial.register);
    expect(result.state.namedRegisters).toEqual(initial.namedRegisters);
    expect(result.state.marks).toEqual(initial.marks);
    expect(result.state.macros).toEqual(initial.macros);
    expect(result.state.lastPlayedMacro).toEqual(initial.lastPlayedMacro);
    expect(result.state.lastSearch).toEqual(initial.lastSearch);
    expect(result.state.searchHighlight).toEqual(initial.searchHighlight);
    expect(result.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
    expect(result.state.messageHistory).toEqual(initial.messageHistory);
  });

  test("keybindings detail popup preserves message history while scrolling and dismissing", () => {
    const initial: ModalState = {
      mode: "normal",
      messageHistory: [{ kind: "info", text: "kept" }],
      lastRepeatableChange: { type: "command", command: "deleteChar" },
    };
    const opened = applyModalKeys(initial, "abc", p(0, 1), [
      ":",
      "k",
      "e",
      "y",
      "b",
      "i",
      "n",
      "d",
      "i",
      "n",
      "g",
      "s",
      " ",
      "r",
      "e",
      "d",
      "o",
      "\r",
    ]);

    expect(opened.state.helpPopup?.title).toBe(":keybindings redo");
    expect(opened.state.helpPopup?.lines.join("\n")).toContain("command.redo");
    expect(opened.state.messageHistory).toEqual(initial.messageHistory);
    const scrolled = applyModalKeys(opened.state, "abc", p(0, 1), ["j", "\x1b"]);
    expect(scrolled.state.helpPopup).toBeUndefined();
    expect(scrolled.state.messageHistory).toEqual(initial.messageHistory);
    expect(scrolled.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
  });

  test("visual keybindings Ex command restores visual source state", () => {
    const opened = handleModalInput(
      { mode: "visualLine", visualAnchor: p(0, 0) },
      { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
      options,
      ":",
    );
    let state = opened.state;
    for (const key of ["k", "e", "y", "b", "i", "n", "d", "i", "n", "g", "s"]) {
      state = handleModalInput(
        state,
        { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
        options,
        key,
      ).state;
    }
    const result = handleModalInput(
      state,
      { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
      options,
      "\r",
    );

    expect(result.state.mode).toBe("visualLine");
    expect(result.state.visualAnchor).toEqual(p(0, 0));
    expect(result.effects).toContainEqual({ type: "restoreCursor", position: p(1, 2) });
    expect(result.state.helpPopup?.title).toBe(":keybindings");
    expect(result.effects).toContainEqual({
      type: "openReadOnlyPopup",
      popup: result.state.helpPopup!,
    });
  });

  test("features keybindings opens popup without editing state", () => {
    const configured = resolveVimOptions({
      piVimMode: { keymap: { actions: { "prompt.transform.reflow": ["gq"] } } },
    }).options;
    const initial: ModalState = {
      mode: "normal",
      register: { type: "char", text: "saved" },
      namedRegisters: { a: { type: "line", text: "line" } },
      marks: { a: p(0, 1) },
      macros: { a: ["x"] },
      lastPlayedMacro: "a",
      lastSearch: { query: "abc", direction: "forward" },
      searchHighlight: { query: "abc", current: p(0, 0) },
      lastRepeatableChange: { type: "command", command: "deleteChar" },
      messageHistory: [{ kind: "info", text: "kept" }],
    };
    const result = applyModalKeys(
      initial,
      "abc",
      p(0, 1),
      [
        ":",
        "f",
        "e",
        "a",
        "t",
        "u",
        "r",
        "e",
        "s",
        " ",
        "k",
        "e",
        "y",
        "b",
        "i",
        "n",
        "d",
        "i",
        "n",
        "g",
        "s",
        "\r",
      ],
      configured,
    );
    const popupText = [
      result.state.helpPopup?.title,
      ...(result.state.helpPopup?.lines ?? []),
    ].join("\n");

    expect(result.text).toBe("abc");
    expect(result.cursor).toEqual(p(0, 1));
    expect(result.state.mode).toBe("normal");
    expect(result.state.exMessage).toBeUndefined();
    expect(result.state.helpPopup?.title).toBe("Keybinding discovery");
    expect(popupText).toContain("paragraph-editing");
    expect(popupText).toContain("markdown-wrapping");
    expect(popupText).toContain("prompt.transform.reflow");
    expect(popupText).toContain("gq");
    expect(popupText).toContain("piVimMode.keymap.actions");
    expect(popupText).toContain("piVimMode.keymap.actionPresets");
    expect(popupText).toContain("opt-in");
    expect(popupText).toContain("no defaults");
    expect(popupText).toContain("no plugin API");
    expect(popupText).toContain("no runtime :map");
    expect(popupText).toContain("no runtime :action");
    expect(popupText).toContain("no command palette");
    expect(popupText).toContain("no Vim help pager");
    expect(result.state.register).toEqual(initial.register);
    expect(result.state.namedRegisters).toEqual(initial.namedRegisters);
    expect(result.state.marks).toEqual(initial.marks);
    expect(result.state.macros).toEqual(initial.macros);
    expect(result.state.lastPlayedMacro).toEqual(initial.lastPlayedMacro);
    expect(result.state.lastSearch).toEqual(initial.lastSearch);
    expect(result.state.searchHighlight).toEqual(initial.searchHighlight);
    expect(result.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
    expect(result.state.messageHistory).toEqual(initial.messageHistory);
  });

  test("popup dismisses with escape without clearing durable state", () => {
    const initial: ModalState = {
      mode: "normal",
      helpPopup: {
        title: "Keybinding discovery",
        lines: ["prompt.transform.reflow -> gq"],
        source: "features",
        query: "keybindings",
        scrollOffset: 0,
      },
      register: { type: "char", text: "saved" },
      marks: { a: p(0, 1) },
      macros: { a: ["x"] },
      searchHighlight: { query: "abc", current: p(0, 0) },
      lastRepeatableChange: { type: "command", command: "deleteChar" },
      messageHistory: [{ kind: "info", text: "kept" }],
    };
    const result = applyModalKeys(initial, "abc", p(0, 1), ["\x1b"]);

    expect(result.text).toBe("abc");
    expect(result.cursor).toEqual(p(0, 1));
    expect(result.state.mode).toBe("normal");
    expect(result.state.helpPopup).toBeUndefined();
    expect(result.state.register).toEqual(initial.register);
    expect(result.state.marks).toEqual(initial.marks);
    expect(result.state.macros).toEqual(initial.macros);
    expect(result.state.searchHighlight).toEqual(initial.searchHighlight);
    expect(result.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
    expect(result.state.messageHistory).toEqual(initial.messageHistory);
  });

  test("popup scroll keys are local and read-only", () => {
    const initial: ModalState = {
      mode: "normal",
      helpPopup: {
        title: "Keybinding discovery",
        lines: [
          "one",
          "two",
          "three",
          "four",
          "five",
          "six",
          "seven",
          "eight",
          "nine",
          "ten",
          "eleven",
          "twelve",
        ],
        source: "features",
        query: "keybindings",
        scrollOffset: 0,
      },
      register: { type: "char", text: "saved" },
      namedRegisters: { a: { type: "line", text: "line" } },
      marks: { a: p(0, 1) },
      macros: { a: ["x"] },
      lastPlayedMacro: "a",
      lastSearch: { query: "abc", direction: "forward" },
      searchHighlight: { query: "abc", current: p(0, 0) },
      lastRepeatableChange: { type: "command", command: "deleteChar" },
      messageHistory: [{ kind: "info", text: "kept" }],
    };

    const result = applyModalKeys(initial, "abc", p(0, 1), ["j", "\x1b[B", "x", "k"]);

    expect(result.text).toBe("abc");
    expect(result.cursor).toEqual(p(0, 1));
    expect(result.state.mode).toBe("normal");
    expect(result.state.helpPopup?.scrollOffset).toBe(1);
    expect(result.state.register).toEqual(initial.register);
    expect(result.state.namedRegisters).toEqual(initial.namedRegisters);
    expect(result.state.marks).toEqual(initial.marks);
    expect(result.state.macros).toEqual(initial.macros);
    expect(result.state.lastPlayedMacro).toEqual(initial.lastPlayedMacro);
    expect(result.state.lastSearch).toEqual(initial.lastSearch);
    expect(result.state.searchHighlight).toEqual(initial.searchHighlight);
    expect(result.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
    expect(result.state.messageHistory).toEqual(initial.messageHistory);

    const clampedTop = applyModalKeys(result.state, "abc", p(0, 1), ["k", "k", "\x1b[A"]);
    expect(clampedTop.state.helpPopup?.scrollOffset).toBe(0);
    const clampedBottom = applyModalKeys(clampedTop.state, "abc", p(0, 1), [
      "j",
      "j",
      "j",
      "j",
      "j",
      "j",
    ]);
    expect(clampedBottom.state.helpPopup?.scrollOffset).toBe(2);
  });

  test("popup scroll and dismissal are excluded from macro recording", () => {
    const initial: ModalState = {
      mode: "normal",
      recordingSlot: "a",
      macros: { a: [] },
      helpPopup: {
        title: "Keybinding discovery",
        lines: [
          "one",
          "two",
          "three",
          "four",
          "five",
          "six",
          "seven",
          "eight",
          "nine",
          "ten",
          "eleven",
          "twelve",
        ],
        source: "features",
        query: "keybindings",
        scrollOffset: 0,
      },
    };

    const scrolled = applyModalKeys(initial, "abc", p(0, 1), ["j", "k", "j"]);
    expect(scrolled.state.helpPopup?.scrollOffset).toBe(1);
    expect(scrolled.state.macros).toEqual({ a: [] });
    expect(scrolled.state.recordingSlot).toBe("a");

    const dismissed = applyModalKeys(scrolled.state, "abc", p(0, 1), ["\x1b"]);
    expect(dismissed.state.helpPopup).toBeUndefined();
    expect(dismissed.state.macros).toEqual({ a: [] });
    expect(dismissed.state.recordingSlot).toBe("a");
  });

  test("runtime help Ex commands report info without editing state", () => {
    const initial: ModalState = {
      mode: "normal",
      register: { type: "char", text: "saved" },
      namedRegisters: { a: { type: "line", text: "line" } },
      marks: { a: p(0, 1) },
      macros: { a: ["x"] },
      lastPlayedMacro: "a",
      lastSearch: { query: "abc", direction: "forward" },
      searchHighlight: { query: "abc", current: p(0, 0) },
      lastRepeatableChange: { type: "command", command: "deleteChar" },
    };
    const result = applyModalKeys(initial, "abc", p(0, 1), [
      ":",
      "f",
      "e",
      "a",
      "t",
      "u",
      "r",
      "e",
      "s",
      " ",
      "v",
      "i",
      "m",
      "m",
      "o",
      "d",
      "e",
      ".",
      "d",
      "o",
      "c",
      "t",
      "o",
      "r",
      "\r",
    ]);

    expect(result.text).toBe("abc");
    expect(result.cursor).toEqual(p(0, 1));
    expect(result.state.register).toEqual(initial.register);
    expect(result.state.namedRegisters).toEqual(initial.namedRegisters);
    expect(result.state.marks).toEqual(initial.marks);
    expect(result.state.macros).toEqual(initial.macros);
    expect(result.state.lastPlayedMacro).toEqual(initial.lastPlayedMacro);
    expect(result.state.lastSearch).toEqual(initial.lastSearch);
    expect(result.state.searchHighlight).toEqual(initial.searchHighlight);
    expect(result.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
    expect(result.state.exMessage).toBeUndefined();
    expect(result.state.helpPopup?.title).toBe(":features vimmode.doctor");
    expect(result.state.helpPopup?.lines.join("\n")).toContain("vimmode.doctor");
  });

  test("visual features keybindings popup restores visual state after marker deletion", () => {
    const opened = handleModalInput(
      { mode: "visual", visualAnchor: p(0, 1) },
      { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
      options,
      ":",
    );
    let state = opened.state;
    for (const _ of ["'", ">", ",", "'", "<"]) {
      state = handleModalInput(
        state,
        { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
        options,
        "\b",
      ).state;
    }
    for (const key of [
      "f",
      "e",
      "a",
      "t",
      "u",
      "r",
      "e",
      "s",
      " ",
      "k",
      "e",
      "y",
      "b",
      "i",
      "n",
      "d",
      "i",
      "n",
      "g",
      "s",
    ]) {
      state = handleModalInput(
        state,
        { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
        options,
        key,
      ).state;
    }
    const result = handleModalInput(
      state,
      { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
      options,
      "\r",
    );

    expect(result.state.mode).toBe("visual");
    expect(result.state.visualAnchor).toEqual(p(0, 1));
    expect(result.effects).toContainEqual({ type: "restoreCursor", position: p(1, 2) });
    expect(result.state.exMessage).toBeUndefined();
    expect(result.state.helpPopup?.title).toBe("Keybinding discovery");
  });

  test("visual runtime help Ex commands preserve visual state after marker deletion", () => {
    const opened = handleModalInput(
      { mode: "visual", visualAnchor: p(0, 1) },
      { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
      options,
      ":",
    );
    let state = opened.state;
    for (const _ of ["'", ">", ",", "'", "<"]) {
      state = handleModalInput(
        state,
        { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
        options,
        "\b",
      ).state;
    }
    for (const key of ["h", "e", "l", "p"]) {
      state = handleModalInput(
        state,
        { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
        options,
        key,
      ).state;
    }
    const result = handleModalInput(
      state,
      { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
      options,
      "\r",
    );

    expect(result.state.mode).toBe("visual");
    expect(result.state.visualAnchor).toEqual(p(0, 1));
    expect(result.effects).toContainEqual({ type: "restoreCursor", position: p(1, 2) });
    expect(result.state.exMessage).toBeUndefined();
    expect(result.state.helpPopup?.title).toBe(":help");
    expect(result.state.helpPopup?.lines.join("\n")).toContain("help:");
  });

  test("no-op feedback is quiet by default and bounded when enabled", () => {
    const quiet = handleModalInput({ mode: "normal" }, snapshot, options, "z");
    expect(quiet.state.exMessage).toBeUndefined();

    const noisy = handleModalInput(
      { mode: "normal" },
      snapshot,
      { ...options, feedback: { noop: "status" } },
      "z",
    );
    expect(noisy.state.exMessage).toEqual({ kind: "info", text: "unmapped key: z" });

    const redo = handleModalInput(
      { mode: "normal" },
      { ...snapshot, isRedoAvailable: false },
      { ...options, feedback: { noop: "status" } },
      "\x12",
    );
    expect(redo.state.exMessage).toEqual({ kind: "info", text: "redo stack empty" });
  });

  test("protected shortcut feedback explains delegation when enabled", () => {
    const update = handleModalInput(
      { mode: "normal", pending: "d" },
      snapshot,
      { ...options, feedback: { noop: "status" } },
      "\x10",
    );

    expect(update.effects).toContainEqual({ type: "delegate", input: "\x10" });
    expect(update.state.pending).toBeUndefined();
    expect(update.state.exMessage?.text).toContain("ctrl+p protected");
  });

  test("vimmode inspect reports bounded read-only state", () => {
    const initial: ModalState = {
      mode: "normal",
      register: { type: "char", text: "secret register payload" },
      namedRegisters: { a: { type: "line", text: "named secret" } },
      marks: { a: p(0, 1) },
      macros: { q: ["i", "x", "\x1b"] },
      lastSearch: { query: "abc", direction: "forward" },
      searchHighlight: { query: "abc", current: p(0, 0) },
      lastRepeatableChange: { type: "command", command: "deleteChar" },
      pendingEx: { command: "vimmode inspect", sourceMode: "normal" },
    };

    const result = handleModalInput(initial, snapshot, options, "\r");

    expect(result.state.mode).toBe("normal");
    expect(result.effects).toEqual([
      { type: "invalidate" },
      { type: "openReadOnlyPopup", popup: result.state.helpPopup! },
    ]);
    expect(result.state.register).toEqual(initial.register);
    expect(result.state.namedRegisters).toEqual(initial.namedRegisters);
    expect(result.state.marks).toEqual(initial.marks);
    expect(result.state.macros).toEqual(initial.macros);
    expect(result.state.lastSearch).toEqual(initial.lastSearch);
    expect(result.state.searchHighlight).toEqual(initial.searchHighlight);
    expect(result.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
    expect(result.state.exMessage).toBeUndefined();
    const popupText = result.state.helpPopup?.lines.join("\n") ?? "";
    expect(result.state.helpPopup?.title).toBe(":vimmode inspect");
    expect(popupText).toContain("inspect: mode=normal");
    expect(popupText).toContain("registers=unnamed-char:23,named-1(a)");
    expect(popupText).not.toContain("secret register payload");
    expect(popupText).not.toContain("named secret");
  });

  test("vimmode inspect from visual Ex restores visual state", () => {
    const result = handleModalInput(
      {
        mode: "visual",
        visualAnchor: p(0, 1),
        pendingEx: {
          command: "vimmode inspect",
          sourceMode: "visual",
          visualAnchor: p(0, 1),
          visualCursor: p(0, 2),
          visualRange: { startLine: 0, endLine: 0 },
        },
      },
      snapshot,
      options,
      "\r",
    );

    expect(result.state.mode).toBe("visual");
    expect(result.state.visualAnchor).toEqual(p(0, 1));
    expect(result.state.pendingEx).toBeUndefined();
    expect(result.state.exMessage).toBeUndefined();
    expect(result.state.helpPopup?.lines.join("\n")).toContain("inspect: mode=visual");
  });

  test("runtime messages are retained with bounded history", () => {
    const empty = handleModalInput(
      { mode: "normal", pendingEx: { command: "messages", sourceMode: "normal" } },
      snapshot,
      options,
      "\r",
    );
    expect(empty.state.exMessage).toBeUndefined();
    expect(empty.state.helpPopup?.title).toBe(":messages");
    expect(empty.state.helpPopup?.lines).toContain("messages: none retained");
    expect(empty.state.messageHistory).toBeUndefined();

    const error = handleModalInput(
      { mode: "normal", pendingEx: { command: "s/missing/new/", sourceMode: "normal" } },
      snapshot,
      options,
      "\r",
    );
    expect(error.state.messageHistory).toEqual([
      { kind: "error", text: "Pattern not found: missing" },
    ]);

    const cleared = handleModalInput(error.state, snapshot, options, ":");
    expect(cleared.state.exMessage).toBeUndefined();
    expect(cleared.state.messageHistory).toEqual(error.state.messageHistory);

    const messages = handleModalInput(
      { ...cleared.state, pendingEx: { command: "messages", sourceMode: "normal" } },
      snapshot,
      options,
      "\r",
    );
    expect(messages.state.exMessage).toBeUndefined();
    expect(messages.state.helpPopup?.lines).toContain("messages: 1 retained");
    expect(messages.state.helpPopup?.lines).toContain("latest: Pattern not found: missing");
    expect(messages.state.messageHistory).toEqual(error.state.messageHistory);
  });

  test("keybinding popup does not pollute retained runtime messages", () => {
    const history = [{ kind: "info" as const, text: "kept" }];
    const popup = handleModalInput(
      {
        mode: "normal",
        messageHistory: history,
        pendingEx: { command: "features keybindings", sourceMode: "normal" },
      },
      snapshot,
      options,
      "\r",
    );
    expect(popup.state.helpPopup?.title).toBe("Keybinding discovery");
    expect(popup.state.messageHistory).toEqual(history);

    const dismissed = handleModalInput(popup.state, snapshot, options, "\x1b");
    expect(dismissed.state.helpPopup).toBeUndefined();
    expect(dismissed.state.messageHistory).toEqual(history);

    const messages = handleModalInput(
      { ...dismissed.state, pendingEx: { command: "messages", sourceMode: "normal" } },
      snapshot,
      options,
      "\r",
    );
    expect(messages.state.exMessage).toBeUndefined();
    expect(messages.state.helpPopup?.lines).toContain("messages: 1 retained");
    expect(messages.state.helpPopup?.lines).toContain("latest: kept");
    expect(messages.state.helpPopup?.lines.join("\n")).not.toContain("Keybinding discovery");
    expect(messages.state.messageHistory).toEqual(history);
  });

  test("message history cap discards oldest entries", () => {
    const history = Array.from({ length: 20 }, (_, index) => ({
      kind: "info" as const,
      text: `old ${index}`,
    }));
    const result = handleModalInput(
      {
        mode: "normal",
        messageHistory: history,
        pendingEx: { command: "s/missing/new/", sourceMode: "normal" },
      },
      snapshot,
      options,
      "\r",
    );

    expect(result.state.messageHistory).toHaveLength(20);
    expect(result.state.messageHistory?.[0]?.text).toBe("old 1");
    expect(result.state.messageHistory?.at(-1)?.text).toBe("Pattern not found: missing");
  });

  test("Ex errors and identical substitutions do not emit edit effects", () => {
    const error = handleModalInput(
      { mode: "normal", pendingEx: { command: "s/missing/new/", sourceMode: "normal" } },
      snapshot,
      options,
      "\r",
    );
    expect(error.effects.some((effect) => effect.type === "edit")).toBe(false);
    expect(error.state.exMessage).toEqual({ kind: "error", text: "Pattern not found: missing" });

    const preview = handleModalInput(
      { mode: "normal", pendingEx: { command: "s/abc/abc/", sourceMode: "normal" } },
      snapshot,
      options,
      "\r",
    );
    expect(preview.effects.some((effect) => effect.type === "edit")).toBe(false);
    expect(preview.state.pendingEx?.preview).toMatchObject({ command: "s/abc/abc/", matches: 1 });

    const identical = handleModalInput(preview.state, snapshot, options, "\r");
    expect(identical.effects.some((effect) => effect.type === "edit")).toBe(false);
    expect(identical.state.exMessage).toEqual({ kind: "success", text: "1 substitution" });
  });

  test("Ex substitution clears search highlights only when text changes and preserves registers/repeat", () => {
    const state: ModalState = {
      mode: "normal",
      register: { type: "char", text: "keep" },
      lastRepeatableChange: { type: "command", command: "deleteChar" },
      searchHighlight: { query: "old", current: p(0, 0) },
      pendingEx: { command: "s/old/new/", sourceMode: "normal" },
    };
    const preview = handleModalInput(state, { text: "old", lines: ["old"], cursor }, options, "\r");
    expect(preview.state.searchHighlight).toEqual({ query: "old", current: p(0, 0) });

    const changed = handleModalInput(
      preview.state,
      { text: "old", lines: ["old"], cursor },
      options,
      "\r",
    );
    expect(changed.state.register).toEqual({ type: "char", text: "keep" });
    expect(changed.state.lastRepeatableChange).toEqual({ type: "command", command: "deleteChar" });
    expect(changed.state.searchHighlight).toBeUndefined();
    expect(changed.state.lastExSubstitution).toMatchObject({
      pattern: "old",
      replacement: "new",
      global: false,
    });
  });

  test("count-only and no-error substitution flags avoid mutation and preserve repeat source", () => {
    const counted = handleModalInput(
      {
        mode: "normal",
        lastExSubstitution: {
          pattern: "old",
          replacement: "new",
          global: true,
          ignoreCase: false,
          matcherMode: "literal",
          command: "%s/old/new/g",
        },
        pendingEx: { command: "%s/foo/bar/gn", sourceMode: "normal" },
      },
      { text: "foo foo", lines: ["foo foo"], cursor },
      options,
      "\r",
    );
    expect(counted.effects.some((effect) => effect.type === "edit")).toBe(false);
    expect(counted.state.pendingEx).toBeUndefined();
    expect(counted.state.exMessage).toEqual({ kind: "success", text: "2 substitutions" });
    expect(counted.state.exHistory).toEqual(["%s/foo/bar/gn"]);
    expect(counted.state.lastExSubstitution?.pattern).toBe("old");

    const noMatch = handleModalInput(
      { mode: "normal", pendingEx: { command: "%s/missing/new/e", sourceMode: "normal" } },
      { text: "foo", lines: ["foo"], cursor },
      options,
      "\r",
    );
    expect(noMatch.state.exMessage).toEqual({ kind: "success", text: "0 substitutions" });
    expect(noMatch.state.pendingEx).toBeUndefined();
  });

  test("repeat substitution previews then applies last applied substitution semantics", () => {
    const applied = applyModalKeys({ mode: "normal" }, "foo foo", p(0, 0), [
      ":",
      "%",
      "s",
      "/",
      "f",
      "o",
      "o",
      "/",
      "b",
      "a",
      "r",
      "/",
      "g",
      "\r",
      "\r",
    ]);
    expect(applied.text).toBe("bar bar");

    const repeatPreview = handleModalInput(
      { ...applied.state, pendingEx: { command: "%&", sourceMode: "normal" } },
      { text: "foo\nfoo", lines: ["foo", "foo"], cursor: p(0, 0) },
      options,
      "\r",
    );
    expect(repeatPreview.state.pendingEx?.preview).toMatchObject({ command: "%&", matches: 2 });

    const repeated = handleModalInput(
      repeatPreview.state,
      { text: "foo\nfoo", lines: ["foo", "foo"], cursor: p(0, 0) },
      options,
      "\r",
    );
    expect(repeated.effects).toContainEqual({
      type: "edit",
      result: { text: "bar\nbar", cursor: p(0, 0), changed: true },
    });
    expect(repeated.state.exMessage).toEqual({ kind: "success", text: "2 substitutions" });
  });

  test("repeat substitution without previous applied substitution is safe", () => {
    const result = handleModalInput(
      { mode: "normal", pendingEx: { command: "&", sourceMode: "normal" } },
      snapshot,
      options,
      "\r",
    );
    expect(result.effects.some((effect) => effect.type === "edit")).toBe(false);
    expect(result.state.exMessage).toEqual({ kind: "error", text: "No previous substitution" });
    expect(result.state.exHistory).toBeUndefined();
  });

  test("Ex history recalls successful commands and skips preview-only failures", () => {
    const substituted = applyModalKeys({ mode: "normal" }, "old old", p(0, 0), [
      ":",
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
      ":",
      "\x1b[A",
      "\r",
    ]);

    expect(substituted.state.pendingEx?.preview).toMatchObject({
      command: "s/old/new/",
      matches: 1,
    });
    expect(substituted.state.exHistory).toEqual(["s/old/new/"]);
  });

  test("Ex offset and semicolon substitution ranges preview and apply", () => {
    const offset = applyModalKeys({ mode: "normal" }, "foo\nfoo\nfoo", p(0, 0), [
      ":",
      "2",
      ",",
      "2",
      "+",
      "1",
      "s",
      "/",
      "f",
      "o",
      "o",
      "/",
      "b",
      "a",
      "r",
      "/",
      "g",
      "\r",
      "\r",
    ]);
    expect(offset.text).toBe("foo\nbar\nbar");
    expect(offset.state.exMessage).toEqual({ kind: "success", text: "2 substitutions" });

    const semicolon = applyModalKeys({ mode: "normal" }, "foo\nfoo\nfoo", p(0, 0), [
      ":",
      "2",
      ";",
      ".",
      "+",
      "1",
      "s",
      "/",
      "f",
      "o",
      "o",
      "/",
      "b",
      "a",
      "z",
      "/",
      "g",
      "\r",
      "\r",
    ]);
    expect(semicolon.text).toBe("foo\nbaz\nbaz");
    expect(semicolon.state.exMessage).toEqual({ kind: "success", text: "2 substitutions" });
  });

  test("Ex register operands read write append and preserve unnamed defaults", () => {
    const deleted = handleModalInput(
      {
        mode: "normal",
        namedRegisters: { b: { type: "line", text: "keep" } },
        pendingEx: { command: "2delete a", sourceMode: "normal" },
      },
      { text: "one\ntwo\nthree", lines: ["one", "two", "three"], cursor: p(1, 0) },
      options,
      "\r",
    );
    expect(deleted.state.register).toEqual({ type: "line", text: "two" });
    expect(deleted.state.namedRegisters?.a).toEqual({ type: "line", text: "two" });
    expect(deleted.state.namedRegisters?.b).toEqual({ type: "line", text: "keep" });

    const yanked = handleModalInput(
      {
        mode: "normal",
        namedRegisters: { a: { type: "line", text: "old" } },
        pendingEx: { command: "%yank A", sourceMode: "normal" },
      },
      { text: "one\ntwo", lines: ["one", "two"], cursor: p(0, 0) },
      options,
      "\r",
    );
    expect(yanked.state.register).toEqual({ type: "line", text: "one\ntwo" });
    expect(yanked.state.namedRegisters?.a).toEqual({ type: "line", text: "old\none\ntwo" });

    const put = handleModalInput(
      {
        mode: "normal",
        register: { type: "line", text: "unnamed" },
        namedRegisters: { a: { type: "line", text: "named" } },
        pendingEx: { command: "put A", sourceMode: "normal" },
      },
      { text: "one", lines: ["one"], cursor: p(0, 0) },
      options,
      "\r",
    );
    expect(put.effects).toContainEqual({
      type: "edit",
      result: { text: "one\nnamed", cursor: p(1, 0), changed: true },
    });
    expect(put.state.namedRegisters?.a).toEqual({ type: "line", text: "named" });
  });

  test("Ex invalid or missing register operands are safe", () => {
    const missing = handleModalInput(
      {
        mode: "normal",
        register: { type: "line", text: "keep" },
        namedRegisters: { a: { type: "line", text: "named" } },
        pendingEx: { command: "put z", sourceMode: "normal" },
      },
      { text: "one", lines: ["one"], cursor: p(0, 0) },
      options,
      "\r",
    );
    expect(missing.effects.some((effect) => effect.type === "edit")).toBe(false);
    expect(missing.state.exMessage).toEqual({ kind: "error", text: "Register is empty" });
    expect(missing.state.register).toEqual({ type: "line", text: "keep" });
    expect(missing.state.namedRegisters?.a).toEqual({ type: "line", text: "named" });

    const invalid = handleModalInput(
      { mode: "normal", pendingEx: { command: 'delete "a', sourceMode: "normal" } },
      { text: "one", lines: ["one"], cursor: p(0, 0) },
      options,
      "\r",
    );
    expect(invalid.state.exMessage).toEqual({ kind: "error", text: "Invalid Ex register operand" });
  });

  test("Ex offset and semicolon line commands preserve bounded side effects", () => {
    const initial: ModalState = {
      mode: "normal",
      register: { type: "char", text: "keep" },
      lastRepeatableChange: { type: "command", command: "deleteChar" },
      searchHighlight: { query: "two", current: p(1, 0) },
    };
    const deleted = applyModalKeys(initial, "one\ntwo\nthree\nfour", p(1, 0), [
      ":",
      ".",
      ",",
      ".",
      "+",
      "1",
      "d",
      "e",
      "l",
      "e",
      "t",
      "e",
      "\r",
    ]);
    expect(deleted.text).toBe("one\nfour");
    expect(deleted.state.register).toEqual({ type: "line", text: "two\nthree" });
    expect(deleted.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
    expect(deleted.state.searchHighlight).toBeUndefined();

    const yanked = applyModalKeys(initial, "one\ntwo\nthree\nfour", p(0, 0), [
      ":",
      "2",
      ";",
      ".",
      "+",
      "1",
      "y",
      "a",
      "n",
      "k",
      "\r",
    ]);
    expect(yanked.text).toBe("one\ntwo\nthree\nfour");
    expect(yanked.state.register).toEqual({ type: "line", text: "two\nthree" });
    expect(yanked.state.searchHighlight).toEqual(initial.searchHighlight);
  });

  test("Ex destination offsets preserve copy, move, and destination zero behavior", () => {
    const copied = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree\nfour", p(0, 0), [
      ":",
      "2",
      "c",
      "o",
      "p",
      "y",
      "$",
      "-",
      "1",
      "\r",
    ]);
    expect(copied.text).toBe("one\ntwo\nthree\ntwo\nfour");

    const moved = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree\nfour", p(0, 0), [
      ":",
      "4",
      "m",
      "o",
      "v",
      "e",
      ".",
      "+",
      "1",
      "\r",
    ]);
    expect(moved.text).toBe("one\ntwo\nfour\nthree");

    const copiedToZero = applyModalKeys({ mode: "normal" }, "one\ntwo", p(0, 0), [
      ":",
      "2",
      "t",
      "0",
      "\r",
    ]);
    expect(copiedToZero.text).toBe("two\none\ntwo");
  });

  test("invalid offset ranges leave state unchanged", () => {
    const initial: ModalState = {
      mode: "normal",
      register: { type: "char", text: "keep" },
      lastRepeatableChange: { type: "command", command: "deleteChar" },
      searchHighlight: { query: "one", current: p(0, 0) },
    };
    const update = applyModalKeys(initial, "one\ntwo", p(0, 0), [
      ":",
      ".",
      "+",
      "1",
      "-",
      "2",
      "d",
      "e",
      "l",
      "e",
      "t",
      "e",
      "\r",
    ]);
    expect(update.text).toBe("one\ntwo");
    expect(update.cursor).toEqual(p(0, 0));
    expect(update.state.register).toEqual(initial.register);
    expect(update.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
    expect(update.state.searchHighlight).toEqual(initial.searchHighlight);
    expect(update.state.exMessage).toEqual({ kind: "error", text: "Invalid Ex range" });
  });

  test("Ex regex substitution previews and applies with literal replacement", () => {
    const result = applyModalKeys({ mode: "normal" }, "TODO FIXME", p(0, 0), [
      ":",
      "%",
      "s",
      "/",
      "T",
      "O",
      "D",
      "O",
      "|",
      "F",
      "I",
      "X",
      "M",
      "E",
      "/",
      "&",
      "-",
      "$",
      "1",
      "-",
      "\\",
      "1",
      "/",
      "g",
      "r",
      "\r",
      "\r",
    ]);

    expect(result.text).toBe("&-$1-\\1 &-$1-\\1");
    expect(result.state.exMessage).toEqual({ kind: "success", text: "2 substitutions" });
  });

  test("editing Ex command clears substitution preview", () => {
    const preview = handleModalInput(
      { mode: "normal", pendingEx: { command: "s/old/new/", sourceMode: "normal" } },
      { text: "old", lines: ["old"], cursor },
      options,
      "\r",
    );
    const edited = handleModalInput(
      preview.state,
      { text: "old", lines: ["old"], cursor },
      options,
      "x",
    );
    expect(edited.state.pendingEx?.command).toBe("s/old/new/x");
    expect(edited.state.pendingEx?.cursor).toBe("s/old/new/x".length);
    expect(edited.state.pendingEx?.preview).toBeUndefined();
  });

  test("Ex command-line cursor edits command text without touching prompt", () => {
    const result = applyModalKeys({ mode: "normal" }, "prompt", p(0, 0), [
      ":",
      "d",
      "e",
      "l",
      "x",
      "e",
      "t",
      "e",
      "\x1b[D",
      "\x1b[D",
      "\x1b[D",
      "\x1b[D",
      "\x1b[3~",
      "\x1b[H",
      "2",
    ]);
    expect(result.text).toBe("prompt");
    expect(result.state.pendingEx?.command).toBe("2delete");
    expect(result.state.pendingEx?.cursor).toBe(1);
  });

  test("Ex command-line word movement and deletion are bounded", () => {
    const state = applyModalKeys({ mode: "normal" }, "prompt", p(0, 0), [
      ":",
      "2",
      ",",
      "4",
      "d",
      "e",
      "l",
      "e",
      "t",
      "e",
      " ",
      "a",
      "\x1bb",
      "\x17",
    ]).state;
    expect(state.pendingEx?.command).toBe("2,4a");
    expect(state.pendingEx?.cursor).toBe(3);
  });

  test("Ex history recall moves command cursor to end", () => {
    const substituted = applyModalKeys({ mode: "normal" }, "old", p(0, 0), [
      ":",
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
      ":",
      "x",
      "\x1b[A",
    ]);
    expect(substituted.state.pendingEx?.command).toBe("s/old/new/");
    expect(substituted.state.pendingEx?.cursor).toBe("s/old/new/".length);
  });

  test("Ex transforms current, explicit, and visual ranges", () => {
    const quoted = applyModalKeys({ mode: "normal" }, "one\ntwo", p(0, 0), [
      ":",
      "q",
      "u",
      "o",
      "t",
      "e",
      "\r",
    ]);
    expect(quoted.text).toBe("> one\ntwo");
    expect(quoted.state.exMessage).toEqual({ kind: "success", text: "1 line transformed" });

    const bulletized = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree", p(0, 0), [
      ":",
      "2",
      ",",
      "3",
      "b",
      "u",
      "l",
      "l",
      "e",
      "t",
      "i",
      "z",
      "e",
      "\r",
    ]);
    expect(bulletized.text).toBe("one\n- two\n- three");

    const fenced = applyModalKeys(
      { mode: "visualLine", visualAnchor: p(0, 0) },
      "const x = 1;\nconst y = 2;",
      p(1, 0),
      [":", "f", "e", "n", "c", "e", " ", "t", "s", "\r"],
    );
    expect(fenced.text).toBe("```ts\nconst x = 1;\nconst y = 2;\n```");
    expect(fenced.state.mode).toBe("normal");
  });

  test("keybound prompt transform actions edit normal ranges silently", () => {
    const actionOptions = resolveVimOptions({
      piVimMode: {
        keymap: {
          actions: {
            "prompt.transform.quote": ["g>"],
            "prompt.transform.bulletize": ["g*"],
            "prompt.transform.fence": [{ key: "gT", args: { language: "ts" } }],
            "prompt.transform.reflow": [{ key: "gq", args: { width: 20 } }],
          },
        },
      },
    }).options;

    const quoted = applyModalKeys(
      { mode: "normal" },
      "one\ntwo",
      p(0, 0),
      ["g", ">"],
      actionOptions,
    );
    expect(quoted.text).toBe("> one\ntwo");
    expect(quoted.state.exMessage).toBeUndefined();

    const bulletized = applyModalKeys(
      { mode: "normal" },
      "one\ntwo\nthree\nfour",
      p(1, 0),
      ["3", "g", "*"],
      actionOptions,
    );
    expect(bulletized.text).toBe("one\n- two\n- three\n- four");

    const fenced = applyModalKeys(
      { mode: "normal" },
      "const x = 1;",
      p(0, 0),
      ["g", "T"],
      actionOptions,
    );
    expect(fenced.text).toBe("```ts\nconst x = 1;\n```");

    const reflowed = applyModalKeys(
      { mode: "normal" },
      "alpha beta gamma delta epsilon",
      p(0, 0),
      ["g", "q"],
      actionOptions,
    );
    expect(reflowed.text).toBe("alpha beta gamma\ndelta epsilon");
  });

  test("keybound prompt transform actions edit visual touched lines", () => {
    const actionOptions = resolveVimOptions({
      piVimMode: { keymap: { actions: { "prompt.transform.quote": ["g>"] } } },
    }).options;

    const visual = applyModalKeys(
      { mode: "visual", visualAnchor: p(0, 1) },
      "one\ntwo\nthree",
      p(1, 1),
      ["g", ">"],
      actionOptions,
    );
    expect(visual.text).toBe("> one\n> two\nthree");
    expect(visual.state.mode).toBe("normal");
    expect(visual.state.visualAnchor).toBeUndefined();

    const visualLine = applyModalKeys(
      { mode: "visualLine", visualAnchor: p(1, 0) },
      "one\ntwo\nthree",
      p(2, 0),
      ["3", "g", ">"],
      actionOptions,
    );
    expect(visualLine.text).toBe("one\n> two\n> three");

    const visualBlock = applyModalKeys(
      { mode: "visualBlock", visualAnchor: p(0, 1) },
      "one\ntwo\nthree",
      p(2, 1),
      ["g", ">"],
      actionOptions,
    );
    expect(visualBlock.text).toBe("> one\n> two\n> three");
  });

  test("keybound prompt transform actions report no-op feedback and skip dot-repeat", () => {
    const actionOptions = resolveVimOptions({
      piVimMode: {
        feedback: { noop: "status" },
        keymap: {
          actions: { "prompt.transform.unquote": ["g<"], "prompt.transform.quote": ["g>"] },
        },
      },
    }).options;

    const unchanged = applyModalKeys({ mode: "normal" }, "one", p(0, 0), ["g", "<"], actionOptions);
    expect(unchanged.text).toBe("one");
    expect(unchanged.state.exMessage).toEqual({
      kind: "info",
      text: "prompt transform made no changes",
    });

    const quoted = applyModalKeys(
      {
        mode: "normal",
        register: { type: "char", text: "x" },
        marks: { a: p(0, 0) },
        searchHighlight: { query: "one", current: p(0, 0) },
        lastSearch: { query: "one", direction: "forward" },
        messageHistory: [{ kind: "info", text: "old" }],
        lastRepeatableChange: { type: "command", command: "deleteChar" },
      },
      "one",
      p(0, 0),
      ["g", ">"],
      actionOptions,
    );
    expect(quoted.text).toBe("> one");
    expect(quoted.state.register).toEqual({ type: "char", text: "x" });
    expect(quoted.state.marks).toEqual({ a: p(0, 0) });
    expect(quoted.state.searchHighlight).toBeUndefined();
    expect(quoted.state.lastSearch).toEqual({ query: "one", direction: "forward" });
    expect(quoted.state.messageHistory).toEqual([{ kind: "info", text: "old" }]);
    expect(quoted.state.lastRepeatableChange).toEqual({ type: "command", command: "deleteChar" });

    const noPreviousRepeat = applyModalKeys(
      { mode: "normal" },
      "one",
      p(0, 0),
      ["g", ">", "."],
      actionOptions,
    );
    expect(noPreviousRepeat.text).toBe("> one");
  });

  test("macro recording captures and replays action key sequences", () => {
    const actionOptions = resolveVimOptions({
      piVimMode: { keymap: { actions: { "prompt.transform.quote": ["g>"] } } },
    }).options;
    const recorded = applyModalKeys(
      { mode: "normal" },
      "one",
      p(0, 0),
      ["q", "a", "g", ">", "q"],
      actionOptions,
    );
    expect(recorded.text).toBe("> one");
    expect(recorded.state.macros?.a).toEqual(["g", ">"]);

    const played = handleModalInput(
      recorded.state,
      { text: "two", lines: ["two"], cursor },
      actionOptions,
      "@",
    );
    const playback = handleModalInput(
      played.state,
      { text: "two", lines: ["two"], cursor },
      actionOptions,
      "a",
    );
    expect(playback.effects).toContainEqual({ type: "playMacro", slot: "a", inputs: ["g", ">"] });
  });

  test("Ex transform argument errors do not edit text", () => {
    const update = handleModalInput(
      { mode: "normal", pendingEx: { command: "reflow wide", sourceMode: "normal" } },
      { text: "alpha beta", lines: ["alpha beta"], cursor },
      options,
      "\r",
    );
    expect(update.effects.some((effect) => effect.type === "edit")).toBe(false);
    expect(update.state.exMessage).toEqual({ kind: "error", text: "Invalid reflow width" });
  });

  test("transient Ex message clears on next handled input", () => {
    const update = handleModalInput(
      { mode: "normal", exMessage: { kind: "error", text: "E" } },
      snapshot,
      options,
      "h",
    );
    expect(update.state.exMessage).toBeUndefined();
  });
});

describe("modal view state", () => {
  test("mode labels shorten at narrow widths", () => {
    expect(modalModeLabel("visualLine", 40)).toBe("V-LINE");
    expect(modalModeLabel("visualLine", 4)).toBe("VL");
  });

  test("visual status summarizes selections without TUI objects", () => {
    expect(
      modalVisualStatus({
        mode: "visual",
        text: "abcd",
        cursor: { line: 0, col: 2 },
        visualAnchor: { line: 0, col: 1 },
        width: 40,
      }),
    ).toContain("2 chars");

    expect(
      modalVisualStatus({
        mode: "visualLine",
        text: "one\ntwo",
        cursor: { line: 1, col: 0 },
        visualAnchor: { line: 0, col: 0 },
        width: 40,
      }),
    ).toContain("2 lines");

    expect(
      modalVisualStatus({
        mode: "visualBlock",
        text: "abcd\nefgh",
        cursor: { line: 1, col: 2 },
        visualAnchor: { line: 0, col: 1 },
        width: 40,
      }),
    ).toContain("2x2 block");
  });

  test("modal status respects UI item config and cursor position format", () => {
    const status = modalStatus({
      mode: "normal",
      text: "one\ntwo",
      cursor: { line: 1, col: 2 },
      width: 40,
      pending: "d",
      ui: {
        status: { enabled: true, items: ["cursorPosition", "mode", "pendingOperator"] },
        mode: {
          enabled: true,
          labels: {
            insert: "INS",
            normal: "CMD",
            visual: "VIS",
            visualLine: "VLN",
            visualBlock: "VBLK",
          },
          narrowLabels: {
            insert: "I",
            normal: "C",
            visual: "V",
            visualLine: "VL",
            visualBlock: "VB",
          },
        },
        selection: { enabled: false, previewMaxChars: 4 },
        cursorPosition: { enabled: true, base: 1, format: "L{line}:C{column}" },
        workbench: { reservedRows: 0 },
      },
    });

    expect(status.left.trim()).toBe("L2:C3 CMD d…");
    expect(status.right).toBe("");
  });

  test("modal status shows active macro recording", () => {
    const status = modalStatus({
      mode: "normal",
      text: "abc",
      cursor,
      width: 40,
      recordingSlot: "a",
    });

    expect(status.left.trim()).toContain("NORMAL REC a");

    const modeHidden = modalStatus({
      mode: "normal",
      text: "abc",
      cursor,
      width: 10,
      recordingSlot: "a",
      ui: {
        status: { enabled: true, items: ["selection"] },
        mode: {
          enabled: false,
          labels: {
            insert: "INSERT",
            normal: "NORMAL",
            visual: "VISUAL",
            visualLine: "V-LINE",
            visualBlock: "V-BLOCK",
          },
          narrowLabels: {
            insert: "I",
            normal: "N",
            visual: "V",
            visualLine: "VL",
            visualBlock: "VB",
          },
        },
        selection: { enabled: true, previewMaxChars: 16 },
        cursorPosition: { enabled: false, base: 1, format: "{line}:{column}" },
        workbench: { reservedRows: 0 },
      },
    });
    expect(modeHidden.left.trim()).toBe("REC a");
  });
});

describe("modal engine", () => {
  test("insert escape enters normal unless autocomplete is open", () => {
    expect(handleModalInput({ mode: "insert" }, snapshot, options, "\x1b")).toEqual({
      state: { mode: "normal" },
      effects: [{ type: "terminalCursor", style: "block" }, { type: "invalidate" }],
    });

    expect(
      handleModalInput(
        { mode: "insert" },
        { ...snapshot, isAutocompleteOpen: true },
        options,
        "\x1b",
      ),
    ).toEqual({ state: { mode: "insert" }, effects: [{ type: "delegate", input: "\x1b" }] });
  });

  test("normal pending command clears on invalid printable key", () => {
    expect(handleModalInput({ mode: "normal", pending: "d" }, snapshot, options, "q")).toEqual({
      state: { mode: "normal" },
      effects: [{ type: "invalidate" }],
    });
  });

  test("normal showKeybindings semantic command opens popup without modal side effects", () => {
    const configured = resolveVimOptions({
      piVimMode: { keymap: { commands: { showKeybindings: ["gk"] } } },
    }).options;
    const initial: ModalState = {
      mode: "normal",
      register: { type: "char", text: "saved" },
      namedRegisters: { a: { type: "line", text: "line" } },
      marks: { a: p(0, 1) },
      macros: { a: ["x"] },
      lastSearch: { query: "abc", direction: "forward" },
      searchHighlight: { query: "abc", current: p(0, 0) },
      lastRepeatableChange: { type: "command", command: "deleteChar" },
      messageHistory: [{ kind: "info", text: "kept" }],
    };
    const result = applyModalKeys(initial, "abc", p(0, 1), ["g", "k"], configured);

    expect(result.text).toBe("abc");
    expect(result.cursor).toEqual(p(0, 1));
    expect(result.state.helpPopup?.title).toBe(":keybindings");
    expect(result.state.helpPopup?.source).toBe("keybindings");
    expect(result.state.helpPopup?.lines.join("\n")).not.toContain(
      "Effective pi-vimmode keybindings",
    );
    expect(result.state.helpPopup?.lines.join("\n")).toContain("Key            Mode        Action");
    expect(result.state.register).toEqual(initial.register);
    expect(result.state.namedRegisters).toEqual(initial.namedRegisters);
    expect(result.state.marks).toEqual(initial.marks);
    expect(result.state.macros).toEqual(initial.macros);
    expect(result.state.lastSearch).toEqual(initial.lastSearch);
    expect(result.state.searchHighlight).toEqual(initial.searchHighlight);
    expect(result.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
    expect(result.state.messageHistory).toEqual(initial.messageHistory);
  });

  test("insert mode delegates configured showKeybindings keys to Pi", () => {
    const configured = resolveVimOptions({
      piVimMode: { keymap: { commands: { showKeybindings: ["gk"] } } },
    }).options;
    const update = handleModalInput({ mode: "insert" }, snapshot, configured, "g");

    expect(update.state.helpPopup).toBeUndefined();
    expect(update.effects).toContainEqual({ type: "delegate", input: "g" });
  });

  test("normal mode emits redo through semantic keymap without modal side effects", () => {
    const state: ModalState = {
      mode: "normal",
      pending: "2\u0000count\u0000",
      register: { type: "char", text: "keep" },
      namedRegisters: { a: { type: "line", text: "named" } },
      marks: { a: p(0, 2) },
      lastRepeatableChange: { type: "command", command: "deleteChar" },
      searchHighlight: { query: "a", current: cursor },
    };

    const update = handleModalInput(state, { ...snapshot, isRedoAvailable: true }, options, "\x12");

    expect(update.state).toEqual({
      mode: "normal",
      register: { type: "char", text: "keep" },
      namedRegisters: { a: { type: "line", text: "named" } },
      marks: { a: p(0, 2) },
      lastRepeatableChange: { type: "command", command: "deleteChar" },
      searchHighlight: { query: "a", current: cursor },
    });
    expect(update.effects).toEqual([{ type: "adapterCommand", command: "redo" }]);
  });

  test("normal mode uses configured semantic keymap", () => {
    const configuredOptions = {
      ...options,
      keymap: {
        ...DEFAULT_VIM_KEYMAP,
        operators: { ...DEFAULT_VIM_KEYMAP.operators, delete: ["z"] },
        motions: { ...DEFAULT_VIM_KEYMAP.motions, wordForward: ["e"] },
        commands: {
          ...DEFAULT_VIM_KEYMAP.commands,
          openLineBelow: ["n"],
          visualBlock: ["alt+x"],
          redo: ["R"],
        },
      },
    };

    expect(handleModalInput({ mode: "normal" }, snapshot, configuredOptions, "z")).toEqual({
      state: { mode: "normal", pending: "z" },
      effects: [{ type: "invalidate" }],
    });

    const deleted = handleModalInput(
      { mode: "normal", pending: "z" },
      { text: "abc def", lines: ["abc def"], cursor },
      configuredOptions,
      "e",
    );
    expect(deleted.state.register).toEqual({ type: "char", text: "abc " });
    expect(deleted.effects[0]).toEqual({
      type: "edit",
      result: {
        text: "def",
        cursor,
        register: { type: "char", text: "abc " },
        changed: true,
      },
    });

    const opened = handleModalInput({ mode: "normal" }, snapshot, configuredOptions, "n");
    expect(opened.state.mode).toBe("insert");
    expect(opened.effects[0]?.type).toBe("edit");

    const visualBlock = handleModalInput({ mode: "normal" }, snapshot, configuredOptions, "\x1bx");
    expect(visualBlock.state).toEqual({ mode: "visualBlock", visualAnchor: cursor });

    const redo = handleModalInput(
      { mode: "normal" },
      { ...snapshot, isRedoAvailable: true },
      configuredOptions,
      "R",
    );
    expect(redo.effects).toEqual([{ type: "adapterCommand", command: "redo" }]);
  });

  test("insert mode delegates Ctrl-R and undo remains unchanged", () => {
    expect(handleModalInput({ mode: "insert" }, snapshot, options, "\x12")).toEqual({
      state: { mode: "insert" },
      effects: [{ type: "delegate", input: "\x12" }],
    });

    expect(handleModalInput({ mode: "normal" }, snapshot, options, "u")).toEqual({
      state: { mode: "normal" },
      effects: [{ type: "adapterCommand", command: "undo" }],
    });
  });

  test("normal edit commands return structural edit effects and register state", () => {
    const result = handleModalInput({ mode: "normal" }, snapshot, options, "x");

    expect(result.state.register).toEqual({ type: "char", text: "a" });
    expect(result.effects).toEqual([
      {
        type: "edit",
        result: {
          text: "bc",
          cursor,
          register: { type: "char", text: "a" },
          changed: true,
        },
      },
    ]);
  });

  test("normal mode supports counts, numeric adjustment, replacement, toggle case, and substitution", () => {
    const counted = handleModalInput({ mode: "normal" }, snapshot, options, "2");
    const deleted = handleModalInput(
      counted.state,
      { text: "abcd", lines: ["abcd"], cursor },
      options,
      "x",
    );
    expect(deleted.effects[0]).toEqual({
      type: "edit",
      result: {
        text: "cd",
        cursor,
        register: { type: "char", text: "ab" },
        changed: true,
      },
    });

    const incremented = handleModalInput(
      { mode: "normal" },
      { text: "v2", lines: ["v2"], cursor },
      options,
      "\x01",
    );
    expect(incremented.effects[0]).toMatchObject({ type: "edit", result: { text: "v3" } });

    const toggled = applyModalKeys({ mode: "normal" }, "aBc", cursor, ["3", "~"]);
    expect(toggled.text).toBe("AbC");
    expect(toggled.cursor).toEqual(p(0, 2));
    expect(toggled.state.mode).toBe("normal");

    const unicodeToggled = applyModalKeys({ mode: "normal" }, "ab😀cd", cursor, ["4", "~"]);
    expect(unicodeToggled.text).toBe("AB😀Cd");
    expect(unicodeToggled.cursor).toEqual(p(0, 4));

    const replacePending = handleModalInput({ mode: "normal" }, snapshot, options, "r");
    const replaced = handleModalInput(replacePending.state, snapshot, options, "z");
    expect(replaced.effects[0]).toMatchObject({ type: "edit", result: { text: "zbc" } });

    const rejected = handleModalInput(replacePending.state, snapshot, options, "\x7f");
    expect(rejected.state.pending).toBeUndefined();
    expect(rejected.effects.some((effect) => effect.type === "edit")).toBe(false);

    const substituted = handleModalInput({ mode: "normal" }, snapshot, options, "s");
    expect(substituted.state.mode).toBe("insert");
    expect(substituted.effects[0]).toMatchObject({ type: "edit", result: { text: "bc" } });
  });

  test("normal mode supports character search repeat and dot repeat", () => {
    const found = handleModalInput(
      { mode: "normal" },
      { text: "a:b:c", lines: ["a:b:c"], cursor },
      options,
      "f",
    );
    const rejected = handleModalInput(
      found.state,
      { text: "a:b:c", lines: ["a:b:c"], cursor },
      options,
      "\x7f",
    );
    expect(rejected.state.pending).toBeUndefined();
    expect(rejected.effects).toEqual([{ type: "invalidate" }]);

    const targeted = handleModalInput(
      found.state,
      { text: "a:b:c", lines: ["a:b:c"], cursor },
      options,
      ":",
    );
    expect(targeted.effects).toEqual([
      { type: "restoreCursor", position: { line: 0, col: 1 } },
      { type: "invalidate" },
    ]);
    const repeated = handleModalInput(
      targeted.state,
      { text: "a:b:c", lines: ["a:b:c"], cursor: { line: 0, col: 1 } },
      options,
      ";",
    );
    expect(repeated.effects[0]).toEqual({ type: "restoreCursor", position: { line: 0, col: 3 } });

    const replacePending = handleModalInput({ mode: "normal" }, snapshot, options, "r");
    const replaced = handleModalInput(replacePending.state, snapshot, options, "z");
    const repeatedChange = handleModalInput(
      replaced.state,
      { text: "zbc", lines: ["zbc"], cursor: { line: 0, col: 1 } },
      options,
      ".",
    );
    expect(repeatedChange.effects[0]).toMatchObject({ type: "edit", result: { text: "zzc" } });

    const toggled = applyModalKeys({ mode: "normal" }, "abCD", cursor, ["2", "~"]);
    const repeatedToggle = applyModalKeys(toggled.state, toggled.text, p(0, 2), ["."]);
    expect(repeatedToggle.text).toBe("ABcd");

    const noOp = applyModalKeys(toggled.state, toggled.text, p(0, 4), ["~"]);
    const preservedRepeat = applyModalKeys(noOp.state, noOp.text, p(0, 2), ["."]);
    expect(preservedRepeat.text).toBe("ABcd");
  });

  test("normal dot repeat applies line delete commands and updates line register", () => {
    const deleted = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree\nfour", cursor, ["d", "d"]);
    expect(deleted.text).toBe("two\nthree\nfour");
    expect(deleted.state.register).toEqual({ type: "line", text: "one" });

    const repeated = applyModalKeys(deleted.state, deleted.text, { line: 1, col: 0 }, ["."]);
    expect(repeated.text).toBe("two\nfour");
    expect(repeated.state.register).toEqual({ type: "line", text: "three" });

    const counted = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree\nfour", cursor, [
      "2",
      "d",
      "d",
    ]);
    const countedRepeat = applyModalKeys(counted.state, counted.text, counted.cursor, ["."]);
    expect(countedRepeat.text).toBe("");
    expect(countedRepeat.state.register).toEqual({ type: "line", text: "three\nfour" });
  });

  test("normal mode supports line shift operators without writing registers", () => {
    const indented = applyModalKeys(
      { mode: "normal", register: { type: "char", text: "keep" } },
      "one\ntwo\nthree",
      p(0, 1),
      [">", ">"],
    );
    expect(indented.text).toBe("  one\ntwo\nthree");
    expect(indented.cursor).toEqual(p(0, 1));
    expect(indented.state.mode).toBe("normal");
    expect(indented.state.register).toEqual({ type: "char", text: "keep" });

    const counted = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree", p(0, 0), ["3", ">", ">"]);
    expect(counted.text).toBe("  one\n  two\n  three");

    const dedented = applyModalKeys({ mode: "normal" }, "  one\n two\nthree", p(0, 2), [
      "2",
      "<",
      "<",
    ]);
    expect(dedented.text).toBe("one\ntwo\nthree");
    expect(dedented.cursor).toEqual(p(0, 2));

    const noOp = applyModalKeys(
      { mode: "normal", register: { type: "line", text: "old" } },
      "one",
      p(0, 0),
      ["<", "<"],
    );
    expect(noOp.text).toBe("one");
    expect(noOp.state.register).toEqual({ type: "line", text: "old" });
  });

  test("normal dot repeat applies line shift commands", () => {
    const shifted = applyModalKeys({ mode: "normal" }, "one\ntwo", cursor, [">", ">"]);
    expect(shifted.text).toBe("  one\ntwo");

    const repeated = applyModalKeys(shifted.state, shifted.text, p(1, 0), ["."]);
    expect(repeated.text).toBe("  one\n  two");

    const counted = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree", cursor, ["2", ">", ">"]);
    const countedRepeat = applyModalKeys(counted.state, counted.text, p(1, 0), ["."]);
    expect(countedRepeat.text).toBe("  one\n    two\n  three");
  });

  test("normal dot repeat applies line change commands and keeps no-ops from replacing repeat", () => {
    const changed = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree", cursor, [
      "c",
      "c",
      "\x1b",
    ]);
    expect(changed.text).toBe("\ntwo\nthree");
    expect(changed.state.mode).toBe("normal");

    const noNumber = applyModalKeys(changed.state, changed.text, { line: 1, col: 0 }, ["\x01"]);
    expect(noNumber.text).toBe("\ntwo\nthree");

    const repeated = applyModalKeys(noNumber.state, noNumber.text, noNumber.cursor, ["."]);
    expect(repeated.text).toBe("\n\nthree");
    expect(repeated.state.mode).toBe("insert");
    expect(repeated.state.register).toEqual({ type: "line", text: "two" });
  });

  test("configured keymaps support operator character search targets", () => {
    const keymapOptions: ModalOptions = {
      ...options,
      keymap: {
        ...DEFAULT_VIM_KEYMAP,
        operators: { ...DEFAULT_VIM_KEYMAP.operators, change: ["zz"], yank: ["xx"] },
        commands: {
          ...DEFAULT_VIM_KEYMAP.commands,
          findCharForward: ["gf"],
          tillCharForward: ["gt"],
        },
      },
    };

    const changed = applyModalKeys(
      { mode: "normal" },
      "ab:c",
      p(0, 0),
      ["z", "z", "g", "t", ":"],
      keymapOptions,
    );
    expect(changed.text).toBe(":c");
    expect(changed.state.mode).toBe("insert");
    expect(changed.state.register).toEqual({ type: "char", text: "ab" });

    const yanked = applyModalKeys(
      { mode: "normal" },
      "a:b:c",
      p(0, 0),
      ["x", "x", "g", "f", ":"],
      keymapOptions,
    );
    expect(yanked.text).toBe("a:b:c");
    expect(yanked.state.register).toEqual({ type: "char", text: "a:" });

    const inserted = handleModalInput(
      { mode: "insert" },
      { text: "a:b", lines: ["a:b"], cursor: p(0, 0) },
      keymapOptions,
      "g",
    );
    expect(inserted.state.mode).toBe("insert");
    expect(inserted.effects).toEqual([{ type: "delegate", input: "g" }]);
  });

  test("normal operators support character search targets", () => {
    const deleted = applyModalKeys({ mode: "normal" }, "a:b:c", p(0, 0), ["d", "f", ":"]);
    expect(deleted.text).toBe("b:c");
    expect(deleted.cursor).toEqual(p(0, 0));
    expect(deleted.state.mode).toBe("normal");
    expect(deleted.state.register).toEqual({ type: "char", text: "a:" });
    expect(deleted.state.lastCharSearch).toEqual({ command: "findCharForward", target: ":" });

    const counted = applyModalKeys({ mode: "normal" }, "a,b,c", p(0, 0), ["d", "2", "f", ","]);
    expect(counted.text).toBe("c");
    expect(counted.state.register).toEqual({ type: "char", text: "a,b," });

    const changed = applyModalKeys({ mode: "normal" }, "a:b:c", p(0, 2), ["c", "F", ":"]);
    expect(changed.text).toBe("a:c");
    expect(changed.cursor).toEqual(p(0, 1));
    expect(changed.state.mode).toBe("insert");
    expect(changed.state.register).toEqual({ type: "char", text: ":b" });

    const changedTill = applyModalKeys({ mode: "normal" }, "foo,bar", p(0, 0), ["c", "t", ","]);
    expect(changedTill.text).toBe(",bar");
    expect(changedTill.cursor).toEqual(p(0, 0));
    expect(changedTill.state.mode).toBe("insert");
    expect(changedTill.state.register).toEqual({ type: "char", text: "foo" });

    const yanked = applyModalKeys({ mode: "normal" }, "a[b]c", p(0, 3), ["y", "T", "["]);
    expect(yanked.text).toBe("a[b]c");
    expect(yanked.cursor).toEqual(p(0, 3));
    expect(yanked.state.register).toEqual({ type: "char", text: "b]" });
    expect(yanked.state.lastRepeatableChange).toBeUndefined();

    const noOp = applyModalKeys(
      { mode: "normal", register: { type: "char", text: "old" } },
      "a:b",
      p(0, 0),
      ["d", "t", ":"],
    );
    expect(noOp.text).toBe("a:b");
    expect(noOp.cursor).toEqual(p(0, 0));
    expect(noOp.state.register).toEqual({ type: "char", text: "old" });
  });

  test("normal dot repeat applies character search operator changes", () => {
    const changed = applyModalKeys({ mode: "normal" }, "a:b c:d", p(0, 0), ["d", "f", ":"]);
    const repeated = applyModalKeys(changed.state, changed.text, p(0, 2), ["."]);
    expect(repeated.text).toBe("b d");
    expect(repeated.state.register).toEqual({ type: "char", text: "c:" });
  });

  test("normal operators support repeated character search targets", () => {
    const searched = applyModalKeys({ mode: "normal" }, "a:b:c", p(0, 0), ["f", ":"]);
    const deleted = applyModalKeys(searched.state, searched.text, p(0, 1), ["d", ";"]);
    expect(deleted.text).toBe("ac");
    expect(deleted.state.register).toEqual({ type: "char", text: ":b:" });

    const reversed = applyModalKeys(searched.state, searched.text, p(0, 3), ["c", ","]);
    expect(reversed.text).toBe("ac");
    expect(reversed.state.mode).toBe("insert");
    expect(reversed.state.register).toEqual({ type: "char", text: ":b:" });
  });

  test("normal mode supports WORD and previous-end motions", () => {
    expect(
      applyModalKeys({ mode: "normal" }, "run --foo=bar /tmp/a-b", p(0, 0), ["W"]).cursor,
    ).toEqual(p(0, 4));
    expect(
      applyModalKeys({ mode: "normal" }, "run --foo=bar /tmp/a-b", p(0, 4), ["E"]).cursor,
    ).toEqual(p(0, 12));
    expect(
      applyModalKeys({ mode: "normal" }, "run --foo=bar /tmp/a-b", p(0, 14), ["B"]).cursor,
    ).toEqual(p(0, 4));
    expect(
      applyModalKeys({ mode: "normal" }, "alpha beta.gamma /tmp/file", p(0, 17), ["g", "e"]).cursor,
    ).toEqual(p(0, 15));
    expect(
      applyModalKeys({ mode: "normal" }, "alpha beta.gamma /tmp/file", p(0, 17), ["2", "g", "E"])
        .cursor,
    ).toEqual(p(0, 4));
  });

  test("visual mode extends selection with WORD and previous-end motions", () => {
    const word = applyModalKeys(
      { mode: "visual", visualAnchor: p(0, 0) },
      "run --foo=bar /tmp/a-b",
      p(0, 0),
      ["W"],
    );
    expect(word.cursor).toEqual(p(0, 4));
    expect(word.state.visualAnchor).toEqual(p(0, 0));

    const previous = applyModalKeys(
      { mode: "visual", visualAnchor: p(0, 17) },
      "alpha beta.gamma /tmp/file",
      p(0, 17),
      ["g", "E"],
    );
    expect(previous.cursor).toEqual(p(0, 15));
    expect(previous.state.visualAnchor).toEqual(p(0, 17));
  });

  test("normal operators support WORD and previous-end motions", () => {
    const deletedWord = applyModalKeys({ mode: "normal" }, "run --foo=bar /tmp/a-b", p(0, 0), [
      "d",
      "W",
    ]);
    expect(deletedWord.text).toBe("--foo=bar /tmp/a-b");
    expect(deletedWord.state.register).toEqual({ type: "char", text: "run " });

    const changedEnd = applyModalKeys({ mode: "normal" }, "run --foo=bar /tmp/a-b", p(0, 4), [
      "c",
      "E",
    ]);
    expect(changedEnd.text).toBe("run  /tmp/a-b");
    expect(changedEnd.state.mode).toBe("insert");
    expect(changedEnd.state.register).toEqual({ type: "char", text: "--foo=bar" });

    const yankedBack = applyModalKeys({ mode: "normal" }, "run --foo=bar /tmp/a-b", p(0, 14), [
      "y",
      "B",
    ]);
    expect(yankedBack.text).toBe("run --foo=bar /tmp/a-b");
    expect(yankedBack.state.register).toEqual({ type: "char", text: "--foo=bar " });

    const previousEnd = applyModalKeys({ mode: "normal" }, "alpha beta.gamma /tmp/file", p(0, 17), [
      "d",
      "g",
      "e",
    ]);
    expect(previousEnd.text).toBe("alpha beta.gamm/tmp/file");
    expect(previousEnd.state.register).toEqual({ type: "char", text: "a " });

    const repeatedChange = applyModalKeys(changedEnd.state, "run next-token", p(0, 4), [
      "\x1b",
      ".",
    ]);
    expect(repeatedChange.text).toBe("run ");
    expect(repeatedChange.state.mode).toBe("insert");
    expect(repeatedChange.state.register).toEqual({ type: "char", text: "next-token" });
  });

  test("normal operators support line, buffer, and matching-pair motions", () => {
    const deletedDown = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree", p(0, 0), ["d", "j"]);
    expect(deletedDown.text).toBe("three");
    expect(deletedDown.state.register).toEqual({ type: "line", text: "one\ntwo" });

    const changedStart = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree", p(1, 0), [
      "c",
      "g",
      "g",
    ]);
    expect(changedStart.text).toBe("three");
    expect(changedStart.state.mode).toBe("insert");
    expect(changedStart.state.register).toEqual({ type: "line", text: "one\ntwo" });

    const yankedEnd = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree", p(1, 0), ["y", "G"]);
    expect(yankedEnd.text).toBe("one\ntwo\nthree");
    expect(yankedEnd.state.register).toEqual({ type: "line", text: "two\nthree" });

    const deletedPair = applyModalKeys({ mode: "normal" }, "a(b)c", p(0, 1), ["d", "%"]);
    expect(deletedPair.text).toBe("ac");
    expect(deletedPair.state.register).toEqual({ type: "char", text: "(b)" });
  });

  test("normal operators support text objects", () => {
    const change = handleModalInput(
      { mode: "normal" },
      { text: "hello world", lines: ["hello world"], cursor: { line: 0, col: 6 } },
      options,
      "c",
    );
    const inner = handleModalInput(
      change.state,
      { text: "hello world", lines: ["hello world"], cursor: { line: 0, col: 6 } },
      options,
      "i",
    );
    const changed = handleModalInput(
      inner.state,
      { text: "hello world", lines: ["hello world"], cursor: { line: 0, col: 6 } },
      options,
      "w",
    );
    expect(changed.state.mode).toBe("insert");
    expect(changed.effects[0]).toMatchObject({ type: "edit", result: { text: "hello " } });
  });

  test("normal operators support prompt-native text objects and repeat", () => {
    const deletedFence = applyModalKeys(
      { mode: "normal" },
      "before\n```\nbody\n```\nafter",
      p(2, 0),
      ["d", "a", "f"],
    );
    expect(deletedFence.text).toBe("before\nafter");
    expect(deletedFence.state.register).toEqual({ type: "char", text: "```\nbody\n```" });

    const changedHeading = applyModalKeys({ mode: "normal" }, "# A\none\n# B\ntwo", p(1, 0), [
      "c",
      "i",
      "h",
    ]);
    expect(changedHeading.text).toBe("# A\n# B\ntwo");
    expect(changedHeading.state.mode).toBe("insert");

    const yankedList = applyModalKeys({ mode: "normal" }, "- one\n  more\n- two", p(1, 2), [
      "y",
      "a",
      "l",
    ]);
    expect(yankedList.text).toBe("- one\n  more\n- two");
    expect(yankedList.state.register).toEqual({ type: "char", text: "- one\n  more" });

    const deletedInnerList = applyModalKeys({ mode: "normal" }, "- one\n- two", p(0, 3), [
      "d",
      "i",
      "l",
    ]);
    expect(deletedInnerList.text).toBe("- \n- two");

    const deletedTag = applyModalKeys({ mode: "normal" }, "<x>body</x>", p(0, 4), ["d", "i", "t"]);
    expect(deletedTag.text).toBe("<x></x>");

    const yankedError = applyModalKeys(
      { mode: "normal" },
      "intro\nTypeError: boom\n    at fn (x.ts:1:1)\noutro",
      p(2, 4),
      ["y", "a", "e"],
    );
    expect(yankedError.state.register).toEqual({
      type: "char",
      text: "TypeError: boom\n    at fn (x.ts:1:1)",
    });

    const missing = applyModalKeys({ mode: "normal" }, "plain", p(0, 0), ["d", "a", "f"]);
    expect(missing.text).toBe("plain");
    expect(missing.state.pending).toBeUndefined();

    const repeated = applyModalKeys(changedHeading.state, changedHeading.text, p(2, 0), [
      "\x1b",
      ".",
    ]);
    expect(repeated.text).toBe("# A\n# B\n");
  });

  test("normal mode supports prompt search and repeat", () => {
    const result = applyModalKeys({ mode: "normal" }, "one two one", p(0, 0), [
      "/",
      "o",
      "n",
      "e",
      "\r",
      "n",
      "N",
    ]);

    expect(result.text).toBe("one two one");
    expect(result.cursor).toEqual(p(0, 8));
    expect(result.state.lastSearch).toEqual({
      query: "one",
      direction: "forward",
      matcherMode: "literal",
    });
    expect(result.state.searchHighlight).toEqual({ query: "one", current: p(0, 8) });
    expect(result.state.pendingSearch).toBeUndefined();
  });

  test("normal mode supports backward prompt search and repeat", () => {
    const result = applyModalKeys({ mode: "normal" }, "one two one", p(0, 8), [
      "?",
      "o",
      "n",
      "e",
      "\r",
      "n",
    ]);

    expect(result.text).toBe("one two one");
    expect(result.cursor).toEqual(p(0, 8));
    expect(result.state.lastSearch).toEqual({
      query: "one",
      direction: "backward",
      matcherMode: "literal",
    });
    expect(result.state.searchHighlight).toEqual({ query: "one", current: p(0, 8) });
    expect(result.state.pendingSearch).toBeUndefined();
  });

  test("backward prompt search displays question prefix while pending", () => {
    const opened = handleModalInput({ mode: "normal" }, snapshot, options, "?");
    expect(opened.state.pendingSearch).toEqual({ query: "", direction: "backward" });
  });

  test("prompt search highlight state honors config and clear events", () => {
    const noHighlight = applyModalKeys(
      { mode: "normal" },
      "one two one",
      p(0, 0),
      ["/", "o", "n", "e", "\r"],
      {
        ...options,
        search: {
          highlight: false,
          highlightCurrent: true,
          clearOnCancel: true,
          clearOnInsert: true,
          maxHighlights: 200,
        },
      },
    );
    expect(noHighlight.state.searchHighlight).toBeUndefined();
    expect(noHighlight.state.lastSearch).toEqual({
      query: "one",
      direction: "forward",
      matcherMode: "literal",
    });

    const highlighted = applyModalKeys({ mode: "normal" }, "one two one", p(0, 0), [
      "/",
      "o",
      "n",
      "e",
      "\r",
    ]);
    expect(highlighted.state.searchHighlight).toEqual({ query: "one", current: p(0, 8) });

    const cancelled = applyModalKeys(highlighted.state, "one two one", p(0, 8), ["/", "x", "\x1b"]);
    expect(cancelled.state.searchHighlight).toBeUndefined();

    const edited = applyModalKeys(highlighted.state, "one two one", p(0, 8), ["x"]);
    expect(edited.text).toBe("one two ne");
    expect(edited.state.searchHighlight).toBeUndefined();

    const insert = applyModalKeys(highlighted.state, "one two one", p(0, 8), ["i"]);
    expect(insert.state.mode).toBe("insert");
    expect(insert.state.searchHighlight).toBeUndefined();

    const preserveOnInsert = applyModalKeys(highlighted.state, "one two one", p(0, 8), ["i"], {
      ...options,
      search: {
        highlight: true,
        highlightCurrent: true,
        clearOnCancel: true,
        clearOnInsert: false,
        maxHighlights: 200,
      },
    });
    expect(preserveOnInsert.state.searchHighlight).toEqual({ query: "one", current: p(0, 8) });
  });

  test("pending prompt search cancels and delegates Ctrl-C/Ctrl-G", () => {
    for (const key of ["\x03", "\x07"]) {
      const update = handleModalInput(
        { mode: "normal", pendingSearch: { query: "one", direction: "forward" } },
        snapshot,
        options,
        key,
      );
      expect(update.state.pendingSearch).toBeUndefined();
      expect(update.state.mode).toBe("insert");
      expect(update.effects).toContainEqual({ type: "delegate", input: key });
    }
  });

  test("empty prompt search recalls previous successful query", () => {
    const result = applyModalKeys({ mode: "normal" }, "one two one", p(0, 0), [
      "/",
      "t",
      "w",
      "o",
      "\r",
      "/",
      "\r",
      "?",
      "\r",
    ]);

    expect(result.cursor).toEqual(p(0, 4));
    expect(result.state.lastSearch).toEqual({
      query: "two",
      direction: "backward",
      matcherMode: "literal",
    });
  });

  test("pending prompt search navigates successful search history", () => {
    const searched = applyModalKeys({ mode: "normal" }, "one two three", p(0, 0), [
      "/",
      "t",
      "w",
      "o",
      "\r",
      "/",
      "t",
      "h",
      "r",
      "e",
      "e",
      "\r",
      "/",
      "\x1b[A",
      "\r",
    ]);

    expect(searched.cursor).toEqual(p(0, 8));
    expect(searched.state.lastSearch).toEqual({
      query: "three",
      direction: "forward",
      matcherMode: "literal",
    });
    expect(searched.state.searchHistory).toEqual([
      { query: "two", matcherMode: "literal" },
      { query: "three", matcherMode: "literal" },
    ]);
  });

  test("prompt search supports explicit bounded regex mode", () => {
    const found = applyModalKeys({ mode: "normal" }, "todo FIXME", p(0, 0), [
      "/",
      "\\",
      "r",
      "T",
      "O",
      "D",
      "O",
      "|",
      "F",
      "I",
      "X",
      "M",
      "E",
      "\r",
    ]);

    expect(found.cursor).toEqual(p(0, 5));
    expect(found.state.lastSearch).toEqual({
      query: "TODO|FIXME",
      direction: "forward",
      matcherMode: "regex",
    });
    expect(found.state.searchHistory).toEqual([{ query: "TODO|FIXME", matcherMode: "regex" }]);

    const literal = applyModalKeys({ mode: "normal" }, "todo TODO|FIXME FIXME", p(0, 0), [
      "/",
      "T",
      "O",
      "D",
      "O",
      "|",
      "F",
      "I",
      "X",
      "M",
      "E",
      "\r",
    ]);
    expect(literal.cursor).toEqual(p(0, 5));
    expect(literal.state.lastSearch).toEqual({
      query: "TODO|FIXME",
      direction: "forward",
      matcherMode: "literal",
    });
  });

  test("invalid regex prompt search is safe", () => {
    const result = applyModalKeys({ mode: "normal" }, "abc", p(0, 0), ["/", "\\", "r", "(", "\r"]);
    expect(result).toMatchObject({
      text: "abc",
      cursor: p(0, 0),
      state: { mode: "normal", exMessage: { kind: "error", text: "Invalid regex pattern" } },
    });
    expect(result.state.lastSearch).toBeUndefined();
    expect(result.state.searchHistory).toBeUndefined();
  });

  test("normal prompt search handles cancellation empty and missing queries safely", () => {
    expect(applyModalKeys({ mode: "normal" }, "abc", p(0, 0), ["/", "x", "\x1b"])).toMatchObject({
      text: "abc",
      cursor: p(0, 0),
      state: { mode: "normal" },
    });
    expect(applyModalKeys({ mode: "normal" }, "abc", p(0, 0), ["/", "\r"])).toMatchObject({
      text: "abc",
      cursor: p(0, 0),
      state: { mode: "normal" },
    });
    const missingWithPrevious = applyModalKeys(
      { mode: "normal", searchHighlight: { query: "a", current: p(0, 0) } },
      "abc",
      p(0, 0),
      ["/", "z", "\r"],
    );
    expect(missingWithPrevious).toMatchObject({
      text: "abc",
      cursor: p(0, 0),
      state: { mode: "normal", searchHighlight: { query: "a", current: p(0, 0) } },
    });
  });

  test("visual replace rejects non-printable character arguments", () => {
    const result = applyModalKeys({ mode: "visual", visualAnchor: p(0, 0) }, "abc", p(0, 1), [
      "r",
      "\x7f",
    ]);
    expect(result.text).toBe("abc");
    expect(result.state).toMatchObject({ mode: "visual", visualAnchor: p(0, 0) });
    expect(result.state.pending).toBeUndefined();
  });

  test("visual mode supports backward prompt search motion", () => {
    const result = applyModalKeys(
      { mode: "visual", visualAnchor: p(0, 8) },
      "one two one",
      p(0, 8),
      ["?", "t", "w", "o", "\r"],
    );

    expect(result.cursor).toEqual(p(0, 4));
    expect(result.state).toMatchObject({ mode: "visual", visualAnchor: p(0, 8) });
  });

  test("visual mode supports prompt search motion", () => {
    const result = applyModalKeys(
      { mode: "visual", visualAnchor: p(0, 0) },
      "one two one",
      p(0, 0),
      ["/", "t", "w", "o", "\r"],
    );

    expect(result.cursor).toEqual(p(0, 4));
    expect(result.state).toMatchObject({ mode: "visual", visualAnchor: p(0, 0) });
  });

  test("operators accept prompt search motions", () => {
    expect(
      applyModalKeys({ mode: "normal" }, "one two three", p(0, 0), ["d", "/", "t", "w", "o", "\r"]),
    ).toMatchObject({
      text: " three",
      cursor: p(0, 0),
      state: { mode: "normal", register: { type: "char", text: "one two" } },
    });
    expect(
      applyModalKeys({ mode: "normal" }, "one two three", p(0, 0), ["y", "/", "t", "w", "o", "\r"]),
    ).toMatchObject({
      text: "one two three",
      cursor: p(0, 0),
      state: { mode: "normal", register: { type: "char", text: "one two" } },
    });
    expect(
      applyModalKeys({ mode: "normal" }, "one two three", p(0, 0), ["c", "/", "t", "w", "o", "\r"]),
    ).toMatchObject({
      text: " three",
      cursor: p(0, 0),
      state: { mode: "insert", register: { type: "char", text: "one two" } },
    });
    expect(
      applyModalKeys({ mode: "normal" }, "one two three", p(0, 8), ["d", "?", "t", "w", "o", "\r"]),
    ).toMatchObject({
      text: "one hree",
      cursor: p(0, 4),
      state: { mode: "normal", register: { type: "char", text: "two t" } },
    });
    expect(
      applyModalKeys({ mode: "normal" }, "one two", p(0, 0), ["d", "/", "z", "\r"]),
    ).toMatchObject({
      text: "one two",
      cursor: p(0, 0),
      state: { mode: "normal" },
    });
  });

  test("normal mode sets and jumps to local marks", () => {
    const prefix = handleModalInput({ mode: "normal" }, snapshot, options, "m");
    expect(prefix.state).toEqual({ mode: "normal", pendingMark: { kind: "set" } });
    expect(prefix.effects).toEqual([{ type: "invalidate" }]);

    const marked = handleModalInput(
      prefix.state,
      { text: "one\n  two", lines: ["one", "  two"], cursor: { line: 1, col: 4 } },
      options,
      "a",
    );
    expect(marked.state).toEqual({ mode: "normal", marks: { a: { line: 1, col: 4 } } });

    const exactPrefix = handleModalInput(marked.state, snapshot, options, "`");
    expect(exactPrefix.state).toEqual({
      mode: "normal",
      marks: { a: { line: 1, col: 4 } },
      pendingMark: { kind: "jumpExact" },
    });
    const exactJump = handleModalInput(exactPrefix.state, snapshot, options, "a");
    expect(exactJump.effects).toEqual([
      { type: "restoreCursor", position: { line: 0, col: 3 } },
      { type: "invalidate" },
    ]);

    const linePrefix = handleModalInput(marked.state, snapshot, options, "'");
    const lineJump = handleModalInput(
      linePrefix.state,
      { text: "one\n  two", lines: ["one", "  two"], cursor },
      options,
      "a",
    );
    expect(lineJump.effects).toEqual([
      { type: "restoreCursor", position: { line: 1, col: 2 } },
      { type: "invalidate" },
    ]);
  });

  test("mark prefixes are safe and visible as pending state", () => {
    expect(handleModalInput({ mode: "normal" }, snapshot, options, "m").state).toEqual({
      mode: "normal",
      pendingMark: { kind: "set" },
    });
    expect(
      handleModalInput({ mode: "normal", pendingMark: { kind: "set" } }, snapshot, options, "1"),
    ).toEqual({
      state: { mode: "normal" },
      effects: [{ type: "invalidate" }],
    });
    expect(
      handleModalInput(
        { mode: "normal", pendingMark: { kind: "jumpExact" } },
        snapshot,
        options,
        "z",
      ),
    ).toEqual({ state: { mode: "normal" }, effects: [{ type: "invalidate" }] });
  });

  test("mark behavior is configurable", () => {
    const disabledOptions = { ...options, marks: { enabled: false, slots: ["a"] } };
    expect(handleModalInput({ mode: "normal" }, snapshot, disabledOptions, "m").state).toEqual({
      mode: "normal",
    });

    const restrictedOptions = { ...options, marks: { enabled: true, slots: ["x"] } };
    const restricted = handleModalInput({ mode: "normal" }, snapshot, restrictedOptions, "m");
    expect(restricted.state).toEqual({ mode: "normal", pendingMark: { kind: "set" } });
    expect(handleModalInput(restricted.state, snapshot, restrictedOptions, "a").state).toEqual({
      mode: "normal",
    });
    expect(handleModalInput(restricted.state, snapshot, restrictedOptions, "x").state).toEqual({
      mode: "normal",
      marks: { x: cursor },
    });

    const configuredOptions = {
      ...options,
      keymap: {
        ...DEFAULT_VIM_KEYMAP,
        marks: { set: ["s"], jumpExact: ["e"], jumpLine: ["l"] },
      },
      marks: { enabled: true, slots: ["x"] },
    };
    const setPrefix = handleModalInput({ mode: "normal" }, snapshot, configuredOptions, "s");
    expect(setPrefix.state).toEqual({ mode: "normal", pendingMark: { kind: "set" } });
    const marked = handleModalInput(
      setPrefix.state,
      { text: "abc", lines: ["abc"], cursor: { line: 0, col: 2 } },
      configuredOptions,
      "x",
    );
    const exactPrefix = handleModalInput(marked.state, snapshot, configuredOptions, "e");
    expect(exactPrefix.state.pendingMark).toEqual({ kind: "jumpExact" });
    const exactJump = handleModalInput(exactPrefix.state, snapshot, configuredOptions, "x");
    expect(exactJump.effects).toContainEqual({
      type: "restoreCursor",
      position: { line: 0, col: 2 },
    });

    const operatorPrefix = handleModalInput(
      { mode: "normal", pending: "y", marks: { x: { line: 0, col: 2 } } },
      snapshot,
      configuredOptions,
      "e",
    );
    expect(operatorPrefix.state.pendingMark).toEqual({
      kind: "jumpExact",
      operator: "yank",
      operatorKey: "y",
    });
  });

  test("visual modes jump to local marks while preserving anchors", () => {
    const state: ModalState = {
      mode: "visualBlock",
      visualAnchor: { line: 0, col: 1 },
      marks: { a: { line: 1, col: 3 } },
    };
    const prefix = handleModalInput(
      state,
      { text: "abcd\nefgh", lines: ["abcd", "efgh"], cursor },
      options,
      "`",
    );
    expect(prefix.state).toEqual({ ...state, pendingMark: { kind: "jumpExact" } });
    const jumped = handleModalInput(
      prefix.state,
      { text: "abcd\nefgh", lines: ["abcd", "efgh"], cursor },
      options,
      "a",
    );
    expect(jumped.state).toEqual(state);
    expect(jumped.effects).toEqual([
      { type: "restoreCursor", position: { line: 1, col: 3 } },
      { type: "invalidate" },
    ]);
  });

  test("operators accept mark motions", () => {
    const state: ModalState = { mode: "normal", pending: "y", marks: { a: { line: 0, col: 3 } } };
    const prefix = handleModalInput(
      state,
      { text: "hello", lines: ["hello"], cursor: { line: 0, col: 1 } },
      options,
      "`",
    );
    expect(prefix.state).toEqual({
      mode: "normal",
      pending: "y",
      marks: { a: { line: 0, col: 3 } },
      pendingMark: { kind: "jumpExact", operator: "yank", operatorKey: "y" },
    });
    const yanked = handleModalInput(
      prefix.state,
      { text: "hello", lines: ["hello"], cursor: { line: 0, col: 1 } },
      options,
      "a",
    );
    expect(yanked.state).toEqual({
      mode: "normal",
      marks: { a: { line: 0, col: 3 } },
      register: { type: "char", text: "ell" },
    });

    const deleted = handleModalInput(
      {
        mode: "normal",
        pendingMark: { kind: "jumpLine", operator: "delete", operatorKey: "d" },
        marks: { a: { line: 2, col: 3 } },
      },
      { text: "one\ntwo\nthree", lines: ["one", "two", "three"], cursor: { line: 1, col: 1 } },
      options,
      "a",
    );
    expect(deleted.effects[0]).toEqual({
      type: "edit",
      result: {
        text: "one",
        cursor: { line: 0, col: 0 },
        register: { type: "line", text: "two\nthree" },
        changed: true,
      },
    });
  });

  test("normal named register prefix yanks current line", () => {
    const prefix = handleModalInput({ mode: "normal" }, snapshot, options, '"');
    expect(prefix.state).toEqual({ mode: "normal", pendingRegister: "awaitingSlot" });

    const targeted = handleModalInput(prefix.state, snapshot, options, "a");
    expect(targeted.state).toEqual({
      mode: "normal",
      pendingRegister: { kind: "named", slot: "a", append: false },
    });

    const pending = handleModalInput(targeted.state, snapshot, options, "y");
    expect(pending.state).toEqual({
      mode: "normal",
      pending: "y",
      pendingRegister: { kind: "named", slot: "a", append: false },
    });

    const yanked = handleModalInput(pending.state, snapshot, options, "y");
    expect(yanked.state).toEqual({
      mode: "normal",
      register: { type: "line", text: "abc" },
      namedRegisters: { a: { type: "line", text: "abc" } },
    });
  });

  test("normal named register prefix writes deletes and operator yanks", () => {
    const deletedLine = handleModalInput(
      {
        mode: "normal",
        pending: "d",
        pendingRegister: { kind: "named", slot: "a", append: false },
      },
      { text: "one\ntwo", lines: ["one", "two"], cursor },
      options,
      "d",
    );
    expect(deletedLine.state.namedRegisters?.a).toEqual({ type: "line", text: "one" });
    expect(deletedLine.state.register).toEqual({ type: "line", text: "one" });

    const deletedChar = handleModalInput(
      { mode: "normal", pendingRegister: { kind: "named", slot: "b", append: false } },
      snapshot,
      options,
      "x",
    );
    expect(deletedChar.state.namedRegisters?.b).toEqual({ type: "char", text: "a" });
    expect(deletedChar.effects[0]).toEqual({
      type: "edit",
      result: { text: "bc", cursor, register: { type: "char", text: "a" }, changed: true },
    });

    const yankedWord = handleModalInput(
      {
        mode: "normal",
        pending: "y",
        pendingRegister: { kind: "named", slot: "c", append: false },
      },
      { text: "abc def", lines: ["abc def"], cursor },
      options,
      "w",
    );
    expect(yankedWord.state.namedRegisters?.c).toEqual({ type: "char", text: "abc " });
    expect(yankedWord.effects).toEqual([{ type: "invalidate" }]);
  });

  test("named register paste reads named target and leaves unnamed paste unchanged", () => {
    const state = {
      mode: "normal" as const,
      register: { type: "char" as const, text: "U" },
      namedRegisters: { a: { type: "char" as const, text: "A" } },
    };

    const namedPaste = handleModalInput(
      { ...state, pendingRegister: { kind: "named", slot: "a", append: false } },
      { text: "xy", lines: ["xy"], cursor: { line: 0, col: 0 } },
      options,
      "p",
    );
    expect(namedPaste.effects[0]).toEqual({
      type: "edit",
      result: { text: "xAy", cursor: { line: 0, col: 1 }, changed: true },
    });

    const unnamedPaste = handleModalInput(
      namedPaste.state,
      { text: "xy", lines: ["xy"], cursor: { line: 0, col: 0 } },
      options,
      "p",
    );
    expect(unnamedPaste.effects[0]).toEqual({
      type: "edit",
      result: { text: "xUy", cursor: { line: 0, col: 1 }, changed: true },
    });
  });

  test("named line register pastes before current line and missing paste no-ops", () => {
    const pasted = handleModalInput(
      {
        mode: "normal",
        register: { type: "line", text: "unnamed" },
        namedRegisters: { a: { type: "line", text: "alpha\nbeta" } },
        pendingRegister: { kind: "named", slot: "a", append: true },
      },
      { text: "one\ntwo", lines: ["one", "two"], cursor: { line: 1, col: 0 } },
      options,
      "P",
    );
    expect(pasted.effects[0]).toEqual({
      type: "edit",
      result: {
        text: "one\nalpha\nbeta\ntwo",
        cursor: { line: 1, col: 0 },
        changed: true,
      },
    });

    const missing = handleModalInput(
      { mode: "normal", pendingRegister: { kind: "named", slot: "z", append: false } },
      snapshot,
      options,
      "p",
    );
    expect(missing.state).toEqual({ mode: "normal" });
    expect(missing.effects[0]).toEqual({
      type: "edit",
      result: { text: "abc", cursor, changed: false },
    });
  });

  test("register prefix target is safe and one-shot", () => {
    const invalid = handleModalInput(
      { mode: "normal", pendingRegister: "awaitingSlot", register: { type: "char", text: "x" } },
      snapshot,
      options,
      "1",
    );
    expect(invalid.state).toEqual({ mode: "normal", register: { type: "char", text: "x" } });

    const unsupported = handleModalInput(
      {
        mode: "normal",
        pendingRegister: { kind: "named", slot: "a", append: false },
        namedRegisters: { a: { type: "line", text: "keep" } },
      },
      snapshot,
      options,
      "q",
    );
    expect(unsupported.state).toEqual({
      mode: "normal",
      namedRegisters: { a: { type: "line", text: "keep" } },
    });

    const appended = handleModalInput(
      {
        mode: "normal",
        pending: "y",
        namedRegisters: { a: { type: "line", text: "one" } },
        pendingRegister: { kind: "named", slot: "a", append: true },
      },
      { text: "two", lines: ["two"], cursor },
      options,
      "y",
    );
    expect(appended.state.namedRegisters?.a).toEqual({ type: "line", text: "one\ntwo" });
    expect(appended.state.register).toEqual({ type: "line", text: "two" });
    expect(appended.state.pendingRegister).toBeUndefined();
  });

  test("normal delegated reset shortcuts return to configured startup mode", () => {
    expect(
      handleModalInput(
        { mode: "visual", pending: "d", visualAnchor: cursor },
        snapshot,
        options,
        "\r",
      ),
    ).toEqual({
      state: { mode: "insert" },
      effects: [
        { type: "terminalCursor", style: "bar" },
        { type: "invalidate" },
        { type: "delegate", input: "\r" },
      ],
    });
  });

  test("protected Pi shortcuts delegate from normal and visual modes", () => {
    const normal = handleModalInput({ mode: "normal", pending: "d" }, snapshot, options, "\x0c");
    expect(normal.state).toEqual({ mode: "normal" });
    expect(normal.effects).toContainEqual({ type: "delegate", input: "\x0c" });

    const ctrlShiftP = handleModalInput(
      { mode: "normal", pending: "d" },
      snapshot,
      options,
      "ctrl+shift+p",
    );
    expect(ctrlShiftP.state).toEqual({ mode: "normal" });
    expect(ctrlShiftP.effects).toContainEqual({ type: "delegate", input: "ctrl+shift+p" });

    const visual = handleModalInput(
      { mode: "visual", pending: "d", visualAnchor: cursor },
      snapshot,
      options,
      "\x14",
    );
    expect(visual.state).toEqual({ mode: "visual", visualAnchor: cursor });
    expect(visual.effects).toContainEqual({ type: "delegate", input: "\x14" });
  });

  test("configured startSearch key starts operator search", () => {
    const configuredOptions = {
      ...options,
      keymap: {
        ...DEFAULT_VIM_KEYMAP,
        commands: { ...DEFAULT_VIM_KEYMAP.commands, startSearch: ["?"] },
      },
    };

    const update = handleModalInput(
      { mode: "normal", pending: "d" },
      snapshot,
      configuredOptions,
      "?",
    );
    expect(update.state.pendingSearch).toEqual({
      query: "",
      direction: "forward",
      operator: "delete",
    });
    expect(update.effects).toEqual([{ type: "invalidate" }]);
  });

  test("configured multi-key startSearch starts operator search", () => {
    const configuredOptions = {
      ...options,
      keymap: {
        ...DEFAULT_VIM_KEYMAP,
        commands: { ...DEFAULT_VIM_KEYMAP.commands, startSearch: ["gs"] },
      },
    };

    const pending = handleModalInput(
      { mode: "normal", pending: "d" },
      snapshot,
      configuredOptions,
      "g",
    );
    expect(pending.state.pending).toBeDefined();

    const update = handleModalInput(pending.state, snapshot, configuredOptions, "s");
    expect(update.state.pending).toBeUndefined();
    expect(update.state.pendingSearch).toEqual({
      query: "",
      direction: "forward",
      operator: "delete",
    });
    expect(update.effects).toEqual([{ type: "invalidate" }]);
  });

  test("visual mode uses configured motion keys", () => {
    const configuredOptions = {
      ...options,
      keymap: {
        ...DEFAULT_VIM_KEYMAP,
        motions: { ...DEFAULT_VIM_KEYMAP.motions, right: ["r"] },
      },
    };

    expect(
      handleModalInput({ mode: "visual", visualAnchor: cursor }, snapshot, configuredOptions, "r")
        .effects,
    ).toEqual([{ type: "adapterCommand", command: "right" }, { type: "invalidate" }]);
  });

  test("visual mode supports configured multi-key motions and operators", () => {
    const configuredOptions = {
      ...options,
      keymap: {
        ...DEFAULT_VIM_KEYMAP,
        operators: { ...DEFAULT_VIM_KEYMAP.operators, yank: ["qq"] },
        motions: { ...DEFAULT_VIM_KEYMAP.motions, right: ["rr"] },
      },
    };

    const pendingMotion = handleModalInput(
      { mode: "visual", visualAnchor: cursor },
      snapshot,
      configuredOptions,
      "r",
    );
    expect(pendingMotion.state.pending).toBe("r");
    expect(handleModalInput(pendingMotion.state, snapshot, configuredOptions, "r").effects).toEqual(
      [{ type: "adapterCommand", command: "right" }, { type: "invalidate" }],
    );

    const pendingOperator = handleModalInput(
      { mode: "visual", visualAnchor: cursor },
      snapshot,
      configuredOptions,
      "q",
    );
    const yanked = handleModalInput(
      pendingOperator.state,
      { text: "abc", lines: ["abc"], cursor: { line: 0, col: 1 } },
      configuredOptions,
      "q",
    );
    expect(yanked.state.register).toEqual({ type: "char", text: "ab" });
    expect(yanked.state.mode).toBe("normal");
  });

  test("visual shift operators transform touched lines and preserve registers", () => {
    const visualChar = applyModalKeys(
      { mode: "visual", visualAnchor: p(0, 1), register: { type: "char", text: "keep" } },
      "one\ntwo\nthree",
      p(1, 1),
      [">"],
    );
    expect(visualChar.text).toBe("  one\n  two\nthree");
    expect(visualChar.state.mode).toBe("normal");
    expect(visualChar.state.visualAnchor).toBeUndefined();
    expect(visualChar.state.register).toEqual({ type: "char", text: "keep" });

    const visualLine = applyModalKeys(
      { mode: "visualLine", visualAnchor: p(0, 0), register: { type: "line", text: "keep" } },
      "  one\n  two\nthree",
      p(1, 0),
      ["<"],
    );
    expect(visualLine.text).toBe("one\ntwo\nthree");
    expect(visualLine.state.mode).toBe("normal");
    expect(visualLine.state.register).toEqual({ type: "line", text: "keep" });

    const visualBlock = applyModalKeys(
      { mode: "visualBlock", visualAnchor: p(0, 1) },
      "one\ntwo\nthree",
      p(2, 1),
      [">"],
    );
    expect(visualBlock.text).toBe("  one\n  two\n  three");
    expect(visualBlock.state.mode).toBe("normal");

    const countedVisual = applyModalKeys(
      { mode: "visualLine", visualAnchor: p(0, 0) },
      "one\ntwo",
      p(1, 0),
      ["2", ">"],
    );
    expect(countedVisual.text).toBe("    one\n    two");
    expect(countedVisual.state.mode).toBe("normal");
  });

  test("visual shifts clear search highlights on changed text and no-op safely without anchor", () => {
    const shifted = applyModalKeys(
      {
        mode: "visualLine",
        visualAnchor: p(0, 0),
        searchHighlight: { query: "one", current: p(0, 0) },
      },
      "one\ntwo",
      p(0, 0),
      [">"],
    );
    expect(shifted.text).toBe("  one\ntwo");
    expect(shifted.state.searchHighlight).toBeUndefined();

    const noAnchor = applyModalKeys({ mode: "visualLine" }, "one", p(0, 0), [">"]);
    expect(noAnchor.text).toBe("one");
    expect(noAnchor.state.mode).toBe("normal");
  });

  test("visual toggle case changes selected text and returns normal", () => {
    const result = handleModalInput(
      { mode: "visual", visualAnchor: { line: 0, col: 1 } },
      { text: "aBc", lines: ["aBc"], cursor: { line: 0, col: 2 } },
      options,
      "~",
    );
    expect(result.state.mode).toBe("normal");
    expect(result.effects[0]).toEqual({
      type: "edit",
      result: {
        text: "abC",
        cursor: { line: 0, col: 1 },
        changed: true,
      },
    });
  });

  test("visual replace changes selected text with a typed character", () => {
    const pending = handleModalInput(
      { mode: "visual", visualAnchor: { line: 0, col: 1 } },
      { text: "abc", lines: ["abc"], cursor: { line: 0, col: 2 } },
      options,
      "r",
    );
    expect(pending.state.pending).toBeDefined();

    const replaced = handleModalInput(
      pending.state,
      { text: "abc", lines: ["abc"], cursor: { line: 0, col: 2 } },
      options,
      "X",
    );
    expect(replaced.state.mode).toBe("normal");
    expect(replaced.effects[0]).toEqual({
      type: "edit",
      result: {
        text: "aXX",
        cursor: { line: 0, col: 1 },
        register: { type: "char", text: "bc" },
        changed: true,
      },
    });
  });

  test("visual block replace changes selected rectangle with a typed character", () => {
    const pending = handleModalInput(
      { mode: "visualBlock", visualAnchor: { line: 0, col: 1 } },
      { text: "abcd\nef", lines: ["abcd", "ef"], cursor: { line: 1, col: 2 } },
      options,
      "r",
    );
    const replaced = handleModalInput(
      pending.state,
      { text: "abcd\nef", lines: ["abcd", "ef"], cursor: { line: 1, col: 2 } },
      options,
      "Q",
    );
    expect(replaced.state.mode).toBe("normal");
    expect(replaced.effects[0]).toMatchObject({
      type: "edit",
      result: { text: "aQQd\neQ", cursor: { line: 0, col: 1 }, changed: true },
    });
  });

  test("visual named register prefix yanks selected text", () => {
    const prefix = handleModalInput(
      { mode: "visual", visualAnchor: { line: 0, col: 1 } },
      { text: "abcd", lines: ["abcd"], cursor: { line: 0, col: 2 } },
      options,
      '"',
    );
    expect(prefix.state.pendingRegister).toBe("awaitingSlot");

    const target = handleModalInput(
      prefix.state,
      { text: "abcd", lines: ["abcd"], cursor: { line: 0, col: 2 } },
      options,
      "a",
    );
    const yanked = handleModalInput(
      target.state,
      { text: "abcd", lines: ["abcd"], cursor: { line: 0, col: 2 } },
      options,
      "y",
    );

    expect(yanked.state).toEqual({
      mode: "normal",
      register: { type: "char", text: "bc" },
      namedRegisters: { a: { type: "char", text: "bc" } },
    });
  });

  test("visual line and block operations write named registers", () => {
    const lineDeleted = handleModalInput(
      {
        mode: "visualLine",
        visualAnchor: { line: 0, col: 0 },
        pendingRegister: { kind: "named", slot: "a", append: false },
      },
      { text: "one\ntwo\nthree", lines: ["one", "two", "three"], cursor: { line: 1, col: 0 } },
      options,
      "d",
    );
    expect(lineDeleted.state.namedRegisters?.a).toEqual({ type: "line", text: "one\ntwo" });
    expect(lineDeleted.state.register).toEqual({ type: "line", text: "one\ntwo" });

    const blockChanged = handleModalInput(
      {
        mode: "visualBlock",
        visualAnchor: { line: 0, col: 1 },
        pendingRegister: { kind: "named", slot: "b", append: false },
      },
      { text: "abcd\nefgh", lines: ["abcd", "efgh"], cursor: { line: 1, col: 2 } },
      options,
      "c",
    );
    expect(blockChanged.state.mode).toBe("insert");
    expect(blockChanged.state.namedRegisters?.b).toEqual({ type: "char", text: "bc\nfg" });
    expect(blockChanged.state.register).toEqual({ type: "char", text: "bc\nfg" });
  });

  test("visual line paste replacement can read named register", () => {
    const result = handleModalInput(
      {
        mode: "visualLine",
        visualAnchor: { line: 1, col: 0 },
        register: { type: "line", text: "unnamed" },
        namedRegisters: { a: { type: "line", text: "alpha\nbeta" } },
        pendingRegister: { kind: "named", slot: "a", append: false },
      },
      { text: "one\ntwo\nthree", lines: ["one", "two", "three"], cursor: { line: 1, col: 0 } },
      options,
      "p",
    );

    expect(result.effects[0]).toEqual({
      type: "edit",
      result: {
        text: "one\nalpha\nbeta\nthree",
        cursor: { line: 1, col: 0 },
        register: { type: "line", text: "two" },
        changed: true,
      },
    });
    expect(result.state.namedRegisters?.a).toEqual({ type: "line", text: "two" });
    expect(result.state.register).toEqual({ type: "line", text: "two" });
  });

  test("visual delete returns edit effect and normal-mode cursor intent", () => {
    const result = handleModalInput(
      { mode: "visual", visualAnchor: { line: 0, col: 1 } },
      { text: "abcd", lines: ["abcd"], cursor: { line: 0, col: 2 } },
      options,
      "d",
    );

    expect(result.state).toEqual({ mode: "normal", register: { type: "char", text: "bc" } });
    expect(result.effects[0]).toEqual({
      type: "edit",
      result: {
        text: "ad",
        cursor: { line: 0, col: 1 },
        register: { type: "char", text: "bc" },
        changed: true,
      },
    });
    expect(result.effects.at(-2)).toEqual({ type: "terminalCursor", style: "block" });
  });

  test("visual line yank updates linewise register and returns normal", () => {
    const result = handleModalInput(
      { mode: "visualLine", visualAnchor: { line: 0, col: 0 } },
      { text: "one\ntwo", lines: ["one", "two"], cursor: { line: 1, col: 0 } },
      options,
      "y",
    );

    expect(result.state).toEqual({ mode: "normal", register: { type: "line", text: "one\ntwo" } });
    expect(result.effects).toEqual([
      { type: "terminalCursor", style: "block" },
      { type: "invalidate" },
    ]);
  });

  test("normal ctrl-v enters visual block mode", () => {
    const result = handleModalInput({ mode: "normal" }, snapshot, options, "\x16");

    expect(result.state).toEqual({ mode: "visualBlock", visualAnchor: cursor });
    expect(result.effects).toEqual([
      { type: "terminalCursor", style: "block" },
      { type: "invalidate" },
    ]);
  });

  test("visual block switches kind without resetting anchor", () => {
    const state: ModalState = { mode: "visualBlock", visualAnchor: { line: 0, col: 1 } };
    expect(handleModalInput(state, snapshot, options, "v").state).toEqual({
      mode: "visual",
      visualAnchor: { line: 0, col: 1 },
    });
    expect(handleModalInput(state, snapshot, options, "V").state).toEqual({
      mode: "visualLine",
      visualAnchor: { line: 0, col: 1 },
    });

    const configuredOptions = {
      ...options,
      keymap: {
        ...DEFAULT_VIM_KEYMAP,
        commands: { ...DEFAULT_VIM_KEYMAP.commands, visualBlock: ["alt+x"] },
      },
    };
    expect(
      handleModalInput(
        { mode: "visual", visualAnchor: { line: 0, col: 1 } },
        snapshot,
        configuredOptions,
        "\x1bx",
      ).state,
    ).toEqual({ mode: "visualBlock", visualAnchor: { line: 0, col: 1 } });
  });

  test("visual block yank delete and change use blockwise character registers", () => {
    const blockState: ModalState = { mode: "visualBlock", visualAnchor: { line: 0, col: 1 } };
    const blockSnapshot = {
      text: "abcd\nefgh",
      lines: ["abcd", "efgh"],
      cursor: { line: 1, col: 2 },
    };

    const yanked = handleModalInput(blockState, blockSnapshot, options, "y");
    expect(yanked.state).toEqual({ mode: "normal", register: { type: "char", text: "bc\nfg" } });

    const deleted = handleModalInput(blockState, blockSnapshot, options, "d");
    expect(deleted.state).toEqual({ mode: "normal", register: { type: "char", text: "bc\nfg" } });
    expect(deleted.effects[0]).toEqual({
      type: "edit",
      result: {
        text: "ad\neh",
        cursor: { line: 0, col: 1 },
        register: { type: "char", text: "bc\nfg" },
        changed: true,
      },
    });

    const changed = handleModalInput(blockState, blockSnapshot, options, "c");
    expect(changed.state.mode).toBe("insert");
    expect(changed.state.register).toEqual({ type: "char", text: "bc\nfg" });
  });

  test("visual block I and A collect text and insert across selected lines on escape", () => {
    const blockState: ModalState = { mode: "visualBlock", visualAnchor: { line: 0, col: 1 } };
    const blockSnapshot = {
      text: "abcd\nefgh",
      lines: ["abcd", "efgh"],
      cursor: { line: 1, col: 2 },
    };

    const started = handleModalInput(blockState, blockSnapshot, options, "I");
    expect(started.state).toEqual({
      mode: "insert",
      blockInsert: {
        anchor: { line: 0, col: 1 },
        active: { line: 1, col: 2 },
        placement: "start",
        previewLine: 0,
        text: "",
      },
    });
    expect(started.effects[0]).toEqual({ type: "restoreCursor", position: { line: 0, col: 1 } });

    const typed = handleModalInput(started.state, blockSnapshot, options, "X");
    expect(typed.effects[0]).toEqual({ type: "delegate", input: "X" });
    const finished = handleModalInput(
      typed.state,
      { text: "aXbcd\nefgh", lines: ["aXbcd", "efgh"], cursor: { line: 0, col: 2 } },
      options,
      "\x1b",
    );
    expect(finished.state.mode).toBe("normal");
    expect(finished.effects[0]).toEqual({
      type: "edit",
      result: { text: "aXbcd\neXfgh", cursor: { line: 0, col: 2 }, changed: true },
    });

    const appendStarted = handleModalInput(blockState, blockSnapshot, options, "A");
    expect(appendStarted.effects[0]).toEqual({
      type: "restoreCursor",
      position: { line: 0, col: 3 },
    });
    const appendTyped = handleModalInput(appendStarted.state, blockSnapshot, options, "Y");
    const appendFinished = handleModalInput(
      appendTyped.state,
      { text: "abcYd\nefgh", lines: ["abcYd", "efgh"], cursor: { line: 0, col: 4 } },
      options,
      "\x1b",
    );
    expect(appendFinished.effects[0]).toEqual({
      type: "edit",
      result: { text: "abcYd\nefgYh", cursor: { line: 0, col: 4 }, changed: true },
    });
  });

  test("visual block insert delegates reset and protected shortcuts", () => {
    const blockInsertState: ModalState = {
      mode: "insert",
      blockInsert: {
        anchor: { line: 0, col: 1 },
        active: { line: 1, col: 2 },
        placement: "start",
        previewLine: 0,
        text: "X",
      },
    };

    const reset = handleModalInput(blockInsertState, snapshot, options, "\x03");
    expect(reset.state).toEqual({ mode: "insert" });
    expect(reset.effects).toContainEqual({ type: "delegate", input: "\x03" });

    const protectedShortcut = handleModalInput(blockInsertState, snapshot, options, "\x0c");
    expect(protectedShortcut.state).toEqual(blockInsertState);
    expect(protectedShortcut.effects).toContainEqual({ type: "delegate", input: "\x0c" });
  });

  test("macro recording starts, captures handled inputs, and stops in normal mode", () => {
    const started = handleModalInput({ mode: "normal" }, snapshot, options, "q");
    expect(started.state).toEqual({ mode: "normal", pendingMacro: "record" });

    const recording = handleModalInput(started.state, snapshot, options, "a");
    expect(recording.state).toEqual({ mode: "normal", macros: { a: [] }, recordingSlot: "a" });

    const insert = handleModalInput(recording.state, snapshot, options, "i");
    expect(insert.state).toMatchObject({
      mode: "insert",
      recordingSlot: "a",
      macros: { a: ["i"] },
    });

    const typedQ = handleModalInput(insert.state, snapshot, options, "q");
    expect(typedQ.state.macros?.a).toEqual(["i", "q"]);

    const escaped = handleModalInput(typedQ.state, snapshot, options, "\x1b");
    expect(escaped.state.macros?.a).toEqual(["i", "q", "\x1b"]);
    expect(escaped.state.recordingSlot).toBe("a");

    const stopped = handleModalInput(escaped.state, snapshot, options, "q");
    expect(stopped.state).toEqual({ mode: "normal", macros: { a: ["i", "q", "\x1b"] } });
  });

  test("macro recording excludes delegated app shortcuts and preserves unnamed register", () => {
    const state: ModalState = {
      mode: "normal",
      recordingSlot: "a",
      macros: { a: [] },
      register: { type: "char", text: "keep" },
    };

    const submitted = handleModalInput(state, snapshot, options, "\r");
    expect(submitted.state.macros?.a).toEqual([]);
    expect(submitted.state.register).toEqual({ type: "char", text: "keep" });
  });

  test("macro playback emits replay effects and repeat-last no-ops safely", () => {
    const pending = handleModalInput(
      { mode: "normal", macros: { a: ["i", "X", "\x1b"] } },
      snapshot,
      options,
      "@",
    );
    expect(pending.state).toEqual({
      mode: "normal",
      macros: { a: ["i", "X", "\x1b"] },
      pendingMacro: "play",
    });

    const played = handleModalInput(pending.state, snapshot, options, "a");
    expect(played.state.lastPlayedMacro).toBe("a");
    expect(played.effects).toEqual([{ type: "playMacro", slot: "a", inputs: ["i", "X", "\x1b"] }]);

    const repeated = handleModalInput(played.state, snapshot, options, "@");
    expect(handleModalInput(repeated.state, snapshot, options, "@").effects).toEqual([
      { type: "playMacro", slot: "a", inputs: ["i", "X", "\x1b"] },
    ]);

    expect(handleModalInput({ mode: "normal" }, snapshot, options, "@").state.pendingMacro).toBe(
      "play",
    );
    expect(
      handleModalInput({ mode: "normal", pendingMacro: "play" }, snapshot, options, "@").effects,
    ).toEqual([{ type: "invalidate" }]);
  });

  test("macro playback is ignored while recording or replaying", () => {
    const recording = handleModalInput(
      { mode: "normal", recordingSlot: "a", macros: { a: [] } },
      snapshot,
      options,
      "@",
    );
    const ignoredRecorded = handleModalInput(recording.state, snapshot, options, "a");
    expect(ignoredRecorded.effects).toEqual([{ type: "invalidate" }]);
    expect(ignoredRecorded.state.macros?.a).toEqual([]);

    expect(
      handleModalInput(
        { mode: "normal", macros: { a: ["x"] } },
        { ...snapshot, isMacroReplaying: true },
        options,
        "@",
      ).effects,
    ).toEqual([{ type: "invalidate" }]);
  });

  test("visual line change returns linewise edit and insert-mode intent", () => {
    const result = handleModalInput(
      { mode: "visualLine", visualAnchor: { line: 1, col: 0 } },
      { text: "one\ntwo", lines: ["one", "two"], cursor: { line: 1, col: 0 } },
      options,
      "c",
    );

    expect(result.state).toEqual({ mode: "insert", register: { type: "line", text: "two" } });
    expect(result.effects[0]).toEqual({
      type: "edit",
      result: {
        text: "one",
        cursor: { line: 0, col: 0 },
        register: { type: "line", text: "two" },
        changed: true,
      },
    });
    expect(result.effects.at(-2)).toEqual({ type: "terminalCursor", style: "bar" });
  });

  test("empty characterwise visual yank preserves previous register", () => {
    const result = handleModalInput(
      {
        mode: "visual",
        visualAnchor: cursor,
        register: { type: "char", text: "keep" },
      },
      { text: "", lines: [""], cursor },
      options,
      "y",
    );

    expect(result.state).toEqual({ mode: "normal", register: { type: "char", text: "keep" } });
  });
});

describe("special register modal behavior", () => {
  test("normal explicit unnamed, black-hole, clipboard, and unsupported targets", () => {
    const yanked = applyModalKeys({ mode: "normal" }, "one\ntwo", p(0, 0), ['"', '"', "y", "y"]);
    expect(yanked.state.register).toEqual({ type: "line", text: "one" });
    expect(yanked.state.namedRegisters).toBeUndefined();
    expect(yanked.state.clipboardRegisters).toBeUndefined();

    const deleted = applyModalKeys(
      { mode: "normal", register: { type: "char", text: "keep" } },
      "one\ntwo",
      p(0, 0),
      ['"', "_", "d", "d"],
    );
    expect(deleted.text).toBe("two");
    expect(deleted.state.register).toEqual({ type: "char", text: "keep" });

    const copied = applyModalKeys({ mode: "normal" }, "one\ntwo", p(0, 0), ['"', "+", "y", "y"]);
    expect(copied.state.register).toEqual({ type: "line", text: "one" });
    expect(copied.state.clipboardRegisters?.["+"]).toEqual({ type: "line", text: "one" });

    const invalid = applyModalKeys({ mode: "normal" }, "one", p(0, 0), ['"', "="]);
    expect(invalid.text).toBe("one");
    expect(invalid.cursor).toEqual(p(0, 0));
    expect(invalid.state.pendingRegister).toBeUndefined();
  });

  test("normal clipboard paste requests host clipboard read with mirror fallback", () => {
    const pasted = applyModalKeys(
      {
        mode: "normal",
        clipboardRegisters: { "+": { type: "line", text: "clip" } },
      },
      "one\ntwo",
      p(1, 0),
      ['"', "+", "P"],
    );
    expect(pasted.text).toBe("one\ntwo");
    expect(pasted.effects).toContainEqual({
      type: "readClipboard",
      register: "+",
      placement: "before",
      fallback: { type: "line", text: "clip" },
    });

    const missing = applyModalKeys({ mode: "normal" }, "one", p(0, 0), ['"', "+", "p"]);
    expect(missing.text).toBe("one");
    expect(missing.cursor).toEqual(p(0, 0));
    expect(missing.effects).toContainEqual({
      type: "readClipboard",
      register: "+",
      placement: "after",
      fallback: undefined,
    });
  });

  test("visual special registers write, discard, and paste through existing semantics", () => {
    const yanked = applyModalKeys({ mode: "visual", visualAnchor: p(0, 0) }, "abc", p(0, 1), [
      '"',
      "+",
      "y",
    ]);
    expect(yanked.state.mode).toBe("normal");
    expect(yanked.state.clipboardRegisters?.["+"]).toEqual({ type: "char", text: "ab" });

    const deleted = applyModalKeys(
      {
        mode: "visualLine",
        visualAnchor: p(0, 0),
        register: { type: "char", text: "keep" },
      },
      "one\ntwo",
      p(1, 0),
      ['"', "_", "d"],
    );
    expect(deleted.text).toBe("");
    expect(deleted.state.register).toEqual({ type: "char", text: "keep" });

    const pasted = applyModalKeys(
      {
        mode: "visualLine",
        visualAnchor: p(0, 0),
        register: { type: "line", text: "new" },
      },
      "one\ntwo",
      p(1, 0),
      ['"', '"', "p"],
    );
    expect(pasted.text).toBe("new");
  });

  test("Ex special register operands write, discard, put, and reject quoted forms", () => {
    const yanked = applyModalKeys({ mode: "normal" }, "one\ntwo", p(0, 0), [
      ":",
      "%",
      "y",
      "a",
      "n",
      "k",
      " ",
      "+",
      "\r",
    ]);
    expect(yanked.state.clipboardRegisters?.["+"]).toEqual({ type: "line", text: "one\ntwo" });
    expect(yanked.state.exMessage).toEqual({ kind: "success", text: "2 lines yanked" });

    const deleted = applyModalKeys(
      { mode: "normal", register: { type: "char", text: "keep" } },
      "one\ntwo",
      p(0, 0),
      [":", "2", "d", "e", "l", "e", "t", "e", " ", "_", "\r"],
    );
    expect(deleted.text).toBe("one");
    expect(deleted.state.register).toEqual({ type: "char", text: "keep" });

    const put = applyModalKeys(
      {
        mode: "normal",
        clipboardRegisters: { "*": { type: "line", text: "clip" } },
      },
      "one",
      p(0, 0),
      [":", "p", "u", "t", " ", "*", "\r"],
    );
    expect(put.text).toBe("one\nclip");

    const rejected = applyModalKeys({ mode: "normal" }, "one", p(0, 0), [
      ":",
      "y",
      "a",
      "n",
      "k",
      " ",
      '"',
      "+",
      "\r",
    ]);
    expect(rejected.text).toBe("one");
    expect(rejected.state.exMessage?.kind).toBe("error");
  });
});

describe("paragraph motions and text objects", () => {
  const para = "alpha\nbeta\n\ngamma\n\ndelta\nepsilon";

  test("normal { and } move across paragraphs", () => {
    expect(applyModalKeys({ mode: "normal" }, para, p(0, 2), ["}"]).cursor).toEqual(p(3, 0));
    expect(applyModalKeys({ mode: "normal" }, para, p(3, 0), ["}"]).cursor).toEqual(p(5, 0));
    expect(applyModalKeys({ mode: "normal" }, para, p(6, 3), ["{"]).cursor).toEqual(p(5, 0));
    expect(applyModalKeys({ mode: "normal" }, para, p(3, 0), ["{"]).cursor).toEqual(p(0, 0));
    expect(applyModalKeys({ mode: "normal" }, para, p(0, 0), ["2", "}"]).cursor).toEqual(p(5, 0));
  });

  test("visual { and } preserve anchor and move active cursor", () => {
    const visual = applyModalKeys({ mode: "visual", visualAnchor: p(0, 0) }, para, p(0, 0), ["}"]);
    expect(visual.state.visualAnchor).toEqual(p(0, 0));
    expect(visual.cursor).toEqual(p(3, 0));
  });

  test("d} deletes through separator and writes character register", () => {
    const deleted = applyModalKeys({ mode: "normal" }, para, p(0, 0), ["d", "}"]);
    expect(deleted.text).toBe("gamma\n\ndelta\nepsilon");
    expect(deleted.state.register).toEqual({ type: "char", text: "alpha\nbeta\n\n" });
    expect(deleted.state.mode).toBe("normal");
  });

  test("c{ changes toward paragraph start and enters insert mode", () => {
    const text = "alpha\n\ngamma\nline";
    const changed = applyModalKeys({ mode: "normal" }, text, p(3, 2), ["c", "{"]);
    expect(changed.text).toBe("alpha\n\nne");
    expect(changed.state.register).toEqual({ type: "char", text: "gamma\nli" });
    expect(changed.state.mode).toBe("insert");
  });

  test("y} yanks paragraph motion range without changing text", () => {
    const yanked = applyModalKeys({ mode: "normal" }, para, p(0, 0), ["y", "}"]);
    expect(yanked.text).toBe(para);
    expect(yanked.state.register).toEqual({ type: "char", text: "alpha\nbeta\n\n" });
  });

  test("dip and dap edit paragraph text objects", () => {
    const text = "para1\n\npara2\n\npara3";
    const inner = applyModalKeys({ mode: "normal" }, text, p(0, 2), ["d", "i", "p"]);
    expect(inner.text).toBe("\npara2\n\npara3");
    expect(inner.state.register).toEqual({ type: "char", text: "para1\n" });

    const around = applyModalKeys({ mode: "normal" }, text, p(0, 2), ["d", "a", "p"]);
    expect(around.text).toBe("para2\n\npara3");
    expect(around.state.register).toEqual({ type: "char", text: "para1\n\n" });
  });

  test("missing paragraph text object is a safe no-op", () => {
    const noOp = applyModalKeys({ mode: "normal" }, "\n\n", p(0, 0), ["d", "i", "p"]);
    expect(noOp.text).toBe("\n\n");
    expect(noOp.state.register).toBeUndefined();
    expect(noOp.state.pending).toBeUndefined();
  });

  test("paragraph delete is repeatable with dot", () => {
    const text = "para1\n\npara2\n\npara3\n\npara4";
    const first = applyModalKeys({ mode: "normal" }, text, p(0, 0), ["d", "a", "p"]);
    expect(first.text).toBe("para2\n\npara3\n\npara4");
    const repeated = applyModalKeys(first.state, first.text, p(0, 0), ["."]);
    expect(repeated.text).toBe("para3\n\npara4");
  });
});
