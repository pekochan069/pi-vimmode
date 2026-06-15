import { describe, expect, test } from "bun:test";

import type { EditorSnapshot, ModalEffect, ModalOptions, ModalState } from "../src/modal/types.ts";

import { DEFAULT_VIM_OPTIONS } from "../src/config.ts";
import { handleModalInput } from "../src/modal/engine.ts";

const p = (line: number, col: number) => ({ line, col });
const options: ModalOptions = {
  startMode: "insert",
  cursor: {
    insert: "bar",
    normal: "block",
    visual: "block",
    visualLine: "block",
    visualBlock: "block",
  },
  search: DEFAULT_VIM_OPTIONS.search,
};

type GoldenResult = {
  state: Record<string, unknown>;
  text: string;
  cursor: { line: number; col: number };
  effects: unknown[];
};

function runGolden(
  initialState: ModalState,
  text: string,
  cursor: { line: number; col: number },
  keys: readonly string[],
  modalOptions: ModalOptions = options,
): GoldenResult {
  let state = initialState;
  let currentText = text;
  let currentCursor = cursor;
  const effects: unknown[] = [];

  for (const key of keys) {
    const snapshot: EditorSnapshot = {
      text: currentText,
      lines: currentText.split("\n"),
      cursor: currentCursor,
    };
    const update = handleModalInput(state, snapshot, modalOptions, key);
    state = update.state;
    for (const effect of update.effects) {
      effects.push(normalizeEffect(effect));
      if (effect.type === "edit") {
        currentText = effect.result.text;
        currentCursor = effect.result.cursor;
      } else if (effect.type === "restoreCursor") currentCursor = effect.position;
    }
  }

  return { state: normalizeState(state), text: currentText, cursor: currentCursor, effects };
}

function normalizeEffect(effect: ModalEffect): unknown {
  if (effect.type === "edit") {
    return {
      type: "edit",
      changed: effect.result.changed,
      text: effect.result.text,
      cursor: effect.result.cursor,
      register: effect.result.register
        ? { type: effect.result.register.type, text: effect.result.register.text }
        : undefined,
    };
  }
  return effect;
}

function normalizeState(state: ModalState): Record<string, unknown> {
  return {
    mode: state.mode,
    pending: state.pending,
    pendingSearch: state.pendingSearch
      ? {
          query: state.pendingSearch.query,
          direction: state.pendingSearch.direction,
          operator: state.pendingSearch.operator,
        }
      : undefined,
    pendingEx: state.pendingEx
      ? {
          command: state.pendingEx.command,
          sourceMode: state.pendingEx.sourceMode,
          preview: state.pendingEx.preview
            ? {
                matches: state.pendingEx.preview.matches,
                ranges: state.pendingEx.preview.ranges.length,
              }
            : undefined,
        }
      : undefined,
    visualAnchor: state.visualAnchor,
    register: state.register ? { type: state.register.type, text: state.register.text } : undefined,
    namedRegisters: state.namedRegisters,
    clipboardRegisters: state.clipboardRegisters,
    macros: state.macros,
    recordingSlot: state.recordingSlot,
    lastPlayedMacro: state.lastPlayedMacro,
    marks: state.marks,
    lastSearch: state.lastSearch,
    searchHighlight: state.searchHighlight,
    exMessage: state.exMessage,
  };
}

describe("golden modal effects", () => {
  test("prompt search completes, highlights, and repeats", () => {
    expect(
      runGolden({ mode: "normal" }, "alpha beta alpha", p(0, 11), [
        "/",
        "a",
        "l",
        "p",
        "h",
        "a",
        "\r",
        "n",
      ]),
    ).toEqual({
      state: {
        mode: "normal",
        pending: undefined,
        pendingSearch: undefined,
        pendingEx: undefined,
        visualAnchor: undefined,
        register: undefined,
        namedRegisters: undefined,
        clipboardRegisters: undefined,
        macros: undefined,
        recordingSlot: undefined,
        lastPlayedMacro: undefined,
        marks: undefined,
        lastSearch: { query: "alpha", direction: "forward", matcherMode: "literal" },
        searchHighlight: { query: "alpha", current: p(0, 11) },
        exMessage: undefined,
      },
      text: "alpha beta alpha",
      cursor: p(0, 11),
      effects: [
        { type: "invalidate" },
        { type: "invalidate" },
        { type: "invalidate" },
        { type: "invalidate" },
        { type: "invalidate" },
        { type: "invalidate" },
        { type: "restoreCursor", position: p(0, 0) },
        { type: "invalidate" },
        { type: "restoreCursor", position: p(0, 11) },
        { type: "invalidate" },
      ],
    });
  });

  test("Ex substitution previews then applies with stable edit effect", () => {
    const result = runGolden({ mode: "normal" }, "old old\nold", p(0, 0), [
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
    expect(result.state.exMessage).toEqual({ kind: "success", text: "3 substitutions" });
    expect(result.effects.at(-1)).toEqual({
      type: "edit",
      changed: true,
      text: "new new\nnew",
      cursor: p(0, 0),
      register: undefined,
    });
  });

  test("visual delete yanks selected text and returns to normal", () => {
    const result = runGolden({ mode: "visual", visualAnchor: p(0, 0) }, "abc", p(0, 1), ["d"]);

    expect(result.text).toBe("c");
    expect(result.state).toMatchObject({ mode: "normal", register: { type: "char", text: "ab" } });
    expect(result.effects).toContainEqual({
      type: "edit",
      changed: true,
      text: "c",
      cursor: p(0, 0),
      register: { type: "char", text: "ab" },
    });
  });

  test("macro record and replay use adapter play effect", () => {
    const recorded = runGolden({ mode: "normal" }, "abc", p(0, 0), ["q", "a", "x", "q"]);
    expect(recorded.state.macros).toEqual({ a: ["x"] });

    const replay = runGolden(recorded.state as ModalState, "abc", p(0, 0), ["@", "a"]);
    expect(replay.effects).toContainEqual({ type: "playMacro", slot: "a", inputs: ["x"] });
  });

  test("protected Pi shortcut delegates and clears pending operator", () => {
    const result = runGolden({ mode: "normal", pending: "d" }, "abc", p(0, 0), ["\x10"], {
      ...options,
      feedback: { noop: "status" },
    });

    expect(result.state.pending).toBeUndefined();
    expect(result.state.exMessage).toEqual({
      kind: "info",
      text: "ctrl+p protected for Pi command/model palette",
    });
    expect(result.effects).toEqual([{ type: "delegate", input: "\x10" }, { type: "invalidate" }]);
  });
});
