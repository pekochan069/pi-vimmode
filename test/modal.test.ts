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

  test("resetTransientState clears visual and pending state without dropping register", () => {
    const state: ModalState = {
      mode: "visual",
      pending: "d",
      visualAnchor: cursor,
      register: { type: "char", text: "x" },
    };

    expect(resetTransientState(state, "insert")).toEqual({
      mode: "insert",
      register: { type: "char", text: "x" },
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
      { type: "invalidate" },
      { type: "terminalCursor", style: "bar" },
    ];

    expect(effects.map((effect) => effect.type)).toEqual([
      "delegate",
      "edit",
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
        operators: { ...DEFAULT_VIM_KEYMAP.operators, delete: ["q"] },
        motions: { ...DEFAULT_VIM_KEYMAP.motions, wordForward: ["e"] },
        commands: { ...DEFAULT_VIM_KEYMAP.commands, openLineBelow: ["n"], visualBlock: ["alt+x"] },
      },
    };

    expect(handleModalInput({ mode: "normal" }, snapshot, configuredOptions, "q")).toEqual({
      state: { mode: "normal", pending: "q" },
      effects: [{ type: "invalidate" }],
    });

    const deleted = handleModalInput(
      { mode: "normal", pending: "q" },
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
