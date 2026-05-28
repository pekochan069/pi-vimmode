import { describe, expect, test } from "bun:test";

import type { ModalEffect, ModalState } from "../src/modal/types.ts";

import { DEFAULT_VIM_KEYMAP } from "../src/config.ts";
import { handleModalInput } from "../src/modal/engine.ts";
import { createModalState, resetTransientState, transitionMode } from "../src/modal/state.ts";
import { modalModeLabel, modalStatus, modalVisualStatus } from "../src/modal/view.ts";

const cursor = { line: 0, col: 0 };
const options = {
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

describe("modal contracts", () => {
  test("createModalState starts with configured mode and empty transient state", () => {
    expect(createModalState("normal")).toEqual({ mode: "normal" });
  });

  test("resetTransientState clears visual and pending state without dropping registers", () => {
    const state: ModalState = {
      mode: "visual",
      pending: "d",
      pendingRegister: { slot: "a", append: false },
      visualAnchor: cursor,
      register: { type: "char", text: "x" },
      namedRegisters: { a: { type: "line", text: "one" } },
      marks: { a: cursor },
      pendingMark: { kind: "jumpExact" },
    };

    expect(resetTransientState(state, "insert")).toEqual({
      mode: "insert",
      register: { type: "char", text: "x" },
      namedRegisters: { a: { type: "line", text: "one" } },
      marks: { a: cursor },
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
      { type: "edit", result: { text: "x", cursor, changed: true } },
      { type: "playMacro", slot: "a", inputs: ["i", "x", "\x1b"] },
      { type: "invalidate" },
      { type: "terminalCursor", style: "bar" },
    ];

    expect(effects.map((effect) => effect.type)).toEqual([
      "delegate",
      "edit",
      "playMacro",
      "invalidate",
      "terminalCursor",
    ]);
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

  test("normal mode uses configured semantic keymap", () => {
    const configuredOptions = {
      ...options,
      keymap: {
        ...DEFAULT_VIM_KEYMAP,
        operators: { ...DEFAULT_VIM_KEYMAP.operators, delete: ["z"] },
        motions: { ...DEFAULT_VIM_KEYMAP.motions, wordForward: ["e"] },
        commands: { ...DEFAULT_VIM_KEYMAP.commands, openLineBelow: ["n"], visualBlock: ["alt+x"] },
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
      pendingRegister: { slot: "a", append: false },
    });

    const pending = handleModalInput(targeted.state, snapshot, options, "y");
    expect(pending.state).toEqual({
      mode: "normal",
      pending: "y",
      pendingRegister: { slot: "a", append: false },
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
      { mode: "normal", pending: "d", pendingRegister: { slot: "a", append: false } },
      { text: "one\ntwo", lines: ["one", "two"], cursor },
      options,
      "d",
    );
    expect(deletedLine.state.namedRegisters?.a).toEqual({ type: "line", text: "one" });
    expect(deletedLine.state.register).toEqual({ type: "line", text: "one" });

    const deletedChar = handleModalInput(
      { mode: "normal", pendingRegister: { slot: "b", append: false } },
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
      { mode: "normal", pending: "y", pendingRegister: { slot: "c", append: false } },
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
      { ...state, pendingRegister: { slot: "a", append: false } },
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
        pendingRegister: { slot: "a", append: true },
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
      { mode: "normal", pendingRegister: { slot: "z", append: false } },
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
        pendingRegister: { slot: "a", append: false },
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
        pendingRegister: { slot: "a", append: true },
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
        pendingRegister: { slot: "a", append: false },
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
        pendingRegister: { slot: "b", append: false },
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
        pendingRegister: { slot: "a", append: false },
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
