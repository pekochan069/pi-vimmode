import { describe, expect, test } from "bun:test";

import type { ModalEffect, ModalState } from "../src/modal/types.ts";

import { handleModalInput } from "../src/modal/engine.ts";
import { createModalState, resetTransientState, transitionMode } from "../src/modal/state.ts";
import { modalModeLabel, modalVisualStatus } from "../src/modal/view.ts";

const cursor = { line: 0, col: 0 };
const options = {
  startMode: "insert" as const,
  cursor: {
    insert: "bar" as const,
    normal: "block" as const,
    visual: "block" as const,
    visualLine: "block" as const,
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
      cursor: { insert: "bar", normal: "block", visual: "underline", visualLine: "block" },
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
