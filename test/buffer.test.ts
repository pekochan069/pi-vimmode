import { describe, expect, test } from "bun:test";

import {
  deleteCharAt,
  deleteLine,
  deleteLineRange,
  deleteRange,
  linewiseSelectionText,
  normalizeLineRange,
  normalizeRange,
  pasteRegister,
  selectionText,
  visualLineSelectionSummary,
  visualSelectionSummary,
  yankLine,
  yankLineRange,
} from "../src/buffer.ts";

const p = (line: number, col: number) => ({ line, col });

describe("range normalization and selection", () => {
  test("normalizes forward same-line range and extracts inclusive text", () => {
    const text = "hello world";
    expect(normalizeRange([text], p(0, 1), p(0, 4))).toEqual({ start: p(0, 1), end: p(0, 4) });
    expect(selectionText(text, p(0, 1), p(0, 4))).toBe("ello");
  });

  test("normalizes reversed multiline range and preserves newlines", () => {
    const text = "alpha\nbravo\ncharlie";
    expect(normalizeRange(text.split("\n"), p(2, 2), p(0, 3))).toEqual({
      start: p(0, 3),
      end: p(2, 2),
    });
    expect(selectionText(text, p(2, 2), p(0, 3))).toBe("ha\nbravo\ncha");
  });

  test("reports visual selection summary", () => {
    expect(visualSelectionSummary("abc", p(0, 0), p(0, 1))).toBe("2 chars");
    expect(visualSelectionSummary("a\nb", p(0, 0), p(1, 0))).toBe("2 lines");
  });
});

describe("charwise edits", () => {
  test("deletes a visual range and returns cursor to range start", () => {
    const result = deleteRange("hello world", p(0, 1), p(0, 4));
    expect(result.text).toBe("h world");
    expect(result.cursor).toEqual(p(0, 1));
    expect(result.register).toEqual({ type: "char", text: "ello" });
    expect(result.changed).toBe(true);
  });

  test("deletes a reversed multiline visual range", () => {
    const result = deleteRange("alpha\nbravo\ncharlie", p(2, 2), p(0, 3));
    expect(result.text).toBe("alprlie");
    expect(result.cursor).toEqual(p(0, 3));
    expect(result.register).toEqual({ type: "char", text: "ha\nbravo\ncha" });
  });

  test("delete char at end of line is a no-op", () => {
    const result = deleteCharAt("abc", p(0, 3));
    expect(result.text).toBe("abc");
    expect(result.changed).toBe(false);
  });
});

describe("linewise visual operations", () => {
  test("normalizes forward and reversed line ranges", () => {
    const lines = ["one", "two", "three"];
    expect(normalizeLineRange(lines, p(0, 2), p(2, 1))).toEqual({ startLine: 0, endLine: 2 });
    expect(normalizeLineRange(lines, p(2, 1), p(0, 2))).toEqual({ startLine: 0, endLine: 2 });
  });

  test("extracts selected full lines in document order", () => {
    const text = "one\ntwo\nthree";
    expect(linewiseSelectionText(text, p(0, 2), p(1, 1))).toBe("one\ntwo");
    expect(linewiseSelectionText(text, p(2, 1), p(1, 0))).toBe("two\nthree");
    expect(yankLineRange(text, p(2, 1), p(1, 0))).toEqual({ type: "line", text: "two\nthree" });
  });

  test("deletes selected middle lines and returns a linewise register", () => {
    const result = deleteLineRange("one\ntwo\nthree\nfour", p(1, 1), p(2, 3));
    expect(result.text).toBe("one\nfour");
    expect(result.cursor).toEqual(p(1, 0));
    expect(result.register).toEqual({ type: "line", text: "two\nthree" });
    expect(result.changed).toBe(true);
  });

  test("deleting the whole buffer leaves an editable empty prompt", () => {
    const result = deleteLineRange("one\ntwo", p(0, 0), p(1, 0));
    expect(result.text).toBe("");
    expect(result.cursor).toEqual(p(0, 0));
    expect(result.register).toEqual({ type: "line", text: "one\ntwo" });
  });

  test("reports visual line selection summary", () => {
    expect(visualLineSelectionSummary("a\nb", p(0, 0), p(1, 0))).toBe("2 lines");
    expect(visualLineSelectionSummary("a\nb", p(1, 0), p(1, 0))).toBe("1 line");
  });
});

describe("linewise register operations", () => {
  test("yanks and pastes current line below cursor line", () => {
    const register = yankLine("one\ntwo", p(0, 0));
    const result = pasteRegister("one\ntwo", p(0, 0), register);
    expect(register).toEqual({ type: "line", text: "one" });
    expect(result.text).toBe("one\none\ntwo");
    expect(result.cursor).toEqual(p(1, 0));
  });

  test("deleting the only line leaves an editable empty prompt", () => {
    const result = deleteLine("only", p(0, 2));
    expect(result.text).toBe("");
    expect(result.cursor).toEqual(p(0, 0));
    expect(result.register).toEqual({ type: "line", text: "only" });
  });

  test("paste with empty register is a no-op", () => {
    const result = pasteRegister("abc", p(0, 1), undefined);
    expect(result.text).toBe("abc");
    expect(result.cursor).toEqual(p(0, 1));
    expect(result.changed).toBe(false);
  });

  test("charwise paste inserts after cursor", () => {
    const result = pasteRegister("abc", p(0, 1), { type: "char", text: "ZZ" });
    expect(result.text).toBe("abZZc");
    expect(result.cursor).toEqual(p(0, 3));
  });
});
