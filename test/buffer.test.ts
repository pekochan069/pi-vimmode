import { describe, expect, test } from "bun:test";

import {
  adjustNumberAtOrAfterCursor,
  bufferEndPosition,
  bufferStartPosition,
  changeLine,
  copyExLineRange,
  copyResolvedLineRange,
  deleteBlockRange,
  deleteByMotion,
  deleteByCharSearch,
  deleteExLineRange,
  deleteResolvedBlockRange,
  deleteResolvedCharacterRange,
  deleteResolvedLineRange,
  deleteTextObject,
  findCharOnLine,
  findSearchHighlightRanges,
  findSearchMatch,
  deleteSearchRange,
  insertBlockText,
  joinExLineRange,
  applyPromptTransform,
  shiftLineRange,
  shiftLinesFromCursor,
  moveExLineRange,
  moveResolvedLineRange,
  deleteCharAt,
  deleteCharBefore,
  deleteLine,
  deleteLineMarkRange,
  deleteLineRange,
  deleteMarkRange,
  deleteRange,
  exactMarkPosition,
  firstNonBlankPosition,
  isVisualCellSelected,
  isVisualLineSelected,
  joinLineWithNext,
  matchingPairPosition,
  lineMarkPosition,
  moveByPromptLines,
  navigateBuffer,
  normalizeBufferPosition,
  openLineAbove,
  openLineBelow,
  insertWordBackwardPosition,
  insertWordForwardPosition,
  insertLineStartPosition,
  insertLineEndPosition,
  insertDeleteWordBackward,
  insertDeleteWordForward,
  insertDeleteLineBackward,
  insertDeleteLineForward,
  pasteRegister,
  pasteRegisterBefore,
  paragraphForwardPosition,
  paragraphBackwardPosition,
  putExRegisterAfterRange,
  putRegisterAfterResolvedLineRange,
  replaceVisualRangeChars,
  substituteLineRangeLiteral,
  substituteLineRangeRegex,
  toggleCaseAt,
  toggleCaseVisualRange,
  transformCaseVisualRange,
  visualBlockSelectionSummary,
  visualLineSelectionSummary,
  visualSelectionSummary,
  visualSelectionText,
  wordBackwardPosition,
  wordEndPosition,
  wordEndBigPosition,
  wordForwardPosition,
  wordForwardBigPosition,
  wordBackwardBigPosition,
  wordPreviousEndPosition,
  wordPreviousEndBigPosition,
  yankByMotion,
  yankByCharSearch,
  yankExLineRange,
  yankResolvedCharacterRange,
  yankResolvedLineRange,
  yankLine,
  yankLineMarkRange,
  yankLineRange,
  yankMarkRange,
  yankSearchRange,
  yankTextObject,
  yankVisualSelection,
  wordUnderCursor,
} from "../src/buffer.ts";

const p = (line: number, col: number) => ({ line, col });

describe("prompt buffer operation API", () => {
  test("navigates structural buffer targets through one operation", () => {
    const text = "one\n  two\nthree";
    expect(navigateBuffer(text, p(1, 99), "start")).toEqual(p(0, 0));
    expect(navigateBuffer(text, p(0, 0), "end")).toEqual(p(2, 5));
    expect(navigateBuffer(text, p(1, 99), "firstNonBlank")).toEqual(p(1, 2));
    expect(navigateBuffer("call(a)", p(0, 4), "matchingPair")).toEqual(p(0, 6));
    expect(navigateBuffer("plain", p(0, 0), "matchingPair")).toBeUndefined();
  });

  test("normalizes cursor positions for adapter restoration", () => {
    expect(normalizeBufferPosition("one\ntwo", p(9, 9))).toEqual(p(1, 3));
  });

  test("moves by prompt lines with cursor clamping", () => {
    const text = "zero\none\ntwo\nshrt\nfour";
    expect(moveByPromptLines(text, p(1, 2), 2)).toEqual(p(3, 2));
    expect(moveByPromptLines(text, p(1, 2), -1)).toEqual(p(0, 2));
    expect(moveByPromptLines(text, p(1, 2), 4)).toEqual(p(4, 2));
    expect(moveByPromptLines(text, p(0, 99), 3)).toEqual(p(3, 4));
    expect(moveByPromptLines(text, p(0, 0), -5)).toEqual(p(0, 0));
    expect(moveByPromptLines("", p(9, 9), 3)).toEqual(p(0, 0));
  });

  test("substitutes literal text across a line range and reports counts", () => {
    const result = substituteLineRangeLiteral("foo foo\nfoo\nbar", {
      range: { startLine: 0, endLine: 1 },
      pattern: "foo",
      replacement: "qux",
      global: false,
      ignoreCase: false,
      originalCursor: p(0, 7),
    });
    expect(result.matches).toBe(2);
    expect(result.ranges).toEqual([
      { start: p(0, 0), end: p(0, 2) },
      { start: p(1, 0), end: p(1, 2) },
    ]);
    expect(result.edit).toMatchObject({
      text: "qux foo\nqux\nbar",
      cursor: p(0, 7),
      changed: true,
    });
    expect(result.edit.register).toBeUndefined();
  });

  test("substitutes literal text over clamped ranges and clamps cursor after length changes", () => {
    const result = substituteLineRangeLiteral("keep\nfoo foo\nfoo tail", {
      range: { startLine: -10, endLine: 99 },
      pattern: "foo",
      replacement: "x",
      global: true,
      ignoreCase: false,
      originalCursor: p(2, 99),
    });

    expect(result.matches).toBe(3);
    expect(result.ranges).toEqual([
      { start: p(1, 0), end: p(1, 2) },
      { start: p(1, 4), end: p(1, 6) },
      { start: p(2, 0), end: p(2, 2) },
    ]);
    expect(result.edit).toMatchObject({
      text: "keep\nx x\nx tail",
      cursor: p(2, 6),
      changed: true,
    });
  });

  test("supports global, case-insensitive, empty replacement, and non-overlapping matches", () => {
    expect(
      substituteLineRangeLiteral("Old old OLD", {
        range: { startLine: 0, endLine: 0 },
        pattern: "old",
        replacement: "new",
        global: true,
        ignoreCase: true,
        originalCursor: p(0, 99),
      }),
    ).toMatchObject({ matches: 3, edit: { text: "new new new", cursor: p(0, 11), changed: true } });

    expect(
      substituteLineRangeLiteral("aaaa", {
        range: { startLine: 0, endLine: 0 },
        pattern: "aa",
        replacement: "b",
        global: true,
        ignoreCase: false,
        originalCursor: p(0, 4),
      }),
    ).toMatchObject({ matches: 2, edit: { text: "bb", cursor: p(0, 2), changed: true } });

    expect(
      substituteLineRangeLiteral("old old", {
        range: { startLine: 0, endLine: 0 },
        pattern: "old",
        replacement: "",
        global: true,
        ignoreCase: false,
        originalCursor: p(0, 7),
      }),
    ).toMatchObject({ matches: 2, edit: { text: " ", cursor: p(0, 1), changed: true } });
  });

  test("substitutes bounded regex patterns with literal replacement text", () => {
    expect(
      substituteLineRangeRegex("TODO FIXME done", {
        range: { startLine: 0, endLine: 0 },
        pattern: "TODO|FIXME",
        replacement: "done",
        global: true,
        ignoreCase: false,
        originalCursor: p(0, 99),
      }),
    ).toMatchObject({ ok: true, matches: 2, edit: { text: "done done done", changed: true } });

    expect(
      substituteLineRangeRegex("old", {
        range: { startLine: 0, endLine: 0 },
        pattern: "(old)",
        replacement: "&-$1-\\1",
        global: true,
        ignoreCase: false,
        originalCursor: p(0, 0),
      }),
    ).toMatchObject({ ok: true, matches: 1, edit: { text: "&-$1-\\1", changed: true } });
  });

  test("substitutes bounded regex patterns across lines with ranges and cursor clamp", () => {
    expect(
      substituteLineRangeRegex("one 1\ntwo 22\nthree 333", {
        range: { startLine: 1, endLine: 2 },
        pattern: "\\d+",
        replacement: "#",
        global: true,
        ignoreCase: false,
        originalCursor: p(2, 99),
      }),
    ).toMatchObject({
      ok: true,
      matches: 2,
      ranges: [
        { start: p(1, 4), end: p(1, 5) },
        { start: p(2, 6), end: p(2, 8) },
      ],
      edit: { text: "one 1\ntwo #\nthree #", cursor: p(2, 7), changed: true },
    });
  });

  test("rejects invalid bounded regex substitutions without edit effects", () => {
    expect(
      substituteLineRangeRegex("foo", {
        range: { startLine: 0, endLine: 0 },
        pattern: "(",
        replacement: "bar",
        global: true,
        ignoreCase: false,
        originalCursor: p(0, 0),
      }),
    ).toEqual({ ok: false, message: "Invalid regex pattern" });

    expect(
      substituteLineRangeRegex("foo", {
        range: { startLine: 0, endLine: 0 },
        pattern: "",
        replacement: "bar",
        global: true,
        ignoreCase: false,
        originalCursor: p(0, 0),
      }),
    ).toEqual({ ok: false, message: "Regex pattern cannot be empty" });

    expect(
      substituteLineRangeRegex("foo", {
        range: { startLine: 0, endLine: 0 },
        pattern: ".*?",
        replacement: "bar",
        global: true,
        ignoreCase: false,
        originalCursor: p(0, 0),
      }),
    ).toEqual({ ok: false, message: "Regex pattern cannot match empty text" });

    expect(
      substituteLineRangeRegex("foo", {
        range: { startLine: 0, endLine: 0 },
        pattern: "a".repeat(257),
        replacement: "bar",
        global: true,
        ignoreCase: false,
        originalCursor: p(0, 0),
      }),
    ).toEqual({ ok: false, message: "Regex pattern too long" });

    expect(
      substituteLineRangeRegex("a".repeat(10_001), {
        range: { startLine: 0, endLine: 0 },
        pattern: "a",
        replacement: "b",
        global: true,
        ignoreCase: false,
        originalCursor: p(0, 0),
      }),
    ).toEqual({ ok: false, message: "Regex match count exceeded" });
  });

  test("reports identical replacements and pattern-not-found without edit effects", () => {
    expect(
      substituteLineRangeLiteral("foo", {
        range: { startLine: 0, endLine: 0 },
        pattern: "foo",
        replacement: "foo",
        global: false,
        ignoreCase: false,
        originalCursor: p(0, 2),
      }),
    ).toMatchObject({ matches: 1, edit: { text: "foo", cursor: p(0, 2), changed: false } });

    expect(
      substituteLineRangeLiteral("foo", {
        range: { startLine: 0, endLine: 0 },
        pattern: "bar",
        replacement: "baz",
        global: true,
        ignoreCase: false,
        originalCursor: p(0, 2),
      }),
    ).toMatchObject({ matches: 0, edit: { text: "foo", cursor: p(0, 2), changed: false } });

    expect(
      substituteLineRangeRegex("foo", {
        range: { startLine: 0, endLine: 0 },
        pattern: "foo",
        replacement: "foo",
        global: true,
        ignoreCase: false,
        originalCursor: p(0, 2),
      }),
    ).toMatchObject({
      ok: true,
      matches: 1,
      edit: { text: "foo", cursor: p(0, 2), changed: false },
    });
  });

  test("resolves local mark positions safely", () => {
    expect(exactMarkPosition("one\n  two", p(9, 9))).toEqual(p(1, 5));
    expect(lineMarkPosition("one\n  two", p(1, 99))).toEqual(p(1, 2));
    expect(lineMarkPosition("one\n   ", p(1, 99))).toEqual(p(1, 0));
  });

  test("applies mark ranges as charwise or linewise operations", () => {
    expect(yankMarkRange("hello", p(0, 1), p(0, 3))).toEqual({ type: "char", text: "ell" });
    expect(deleteMarkRange("hello", p(0, 1), p(0, 3))).toMatchObject({
      text: "ho",
      register: { type: "char", text: "ell" },
    });
    expect(yankLineMarkRange("one\ntwo\nthree", p(2, 0), p(1, 2))).toEqual({
      type: "line",
      text: "two\nthree",
    });
    expect(deleteLineMarkRange("one\ntwo\nthree", p(2, 0), p(1, 2))).toMatchObject({
      text: "one",
      register: { type: "line", text: "two\nthree" },
    });
  });

  test("yanks visual selections without callers composing registers", () => {
    expect(yankVisualSelection("alpha\nbravo", p(0, 1), p(0, 3), "char")).toEqual({
      type: "char",
      text: "lph",
    });
    expect(yankVisualSelection("alpha\nbravo", p(0, 1), p(1, 2), "line")).toEqual({
      type: "line",
      text: "alpha\nbravo",
    });
  });

  test("answers visual render selection predicates", () => {
    const lines = ["one", "two", "three"];
    expect(isVisualCellSelected("visual", lines, p(0, 1), p(1, 1), 0, 2)).toBe(true);
    expect(isVisualCellSelected("visual", lines, p(0, 1), p(1, 1), 2, 0)).toBe(false);
    expect(isVisualLineSelected("visualLine", lines, p(0, 1), p(1, 1), 1)).toBe(true);
    expect(isVisualLineSelected("visual", lines, p(0, 1), p(1, 1), 1)).toBe(false);
    expect(isVisualCellSelected("visualBlock", lines, p(0, 1), p(2, 2), 1, 2)).toBe(true);
    expect(isVisualCellSelected("visualBlock", lines, p(0, 1), p(2, 2), 1, 0)).toBe(false);
  });
});

describe("visual selection operations", () => {
  test("extracts inclusive characterwise selections through yank operations", () => {
    expect(yankVisualSelection("hello world", p(0, 1), p(0, 4), "char")).toEqual({
      type: "char",
      text: "ello",
    });
    expect(yankVisualSelection("alpha\nbravo\ncharlie", p(2, 2), p(0, 3), "char")).toEqual({
      type: "char",
      text: "ha\nbravo\ncha",
    });
  });

  test("reports visual selection summary and preview", () => {
    expect(visualSelectionSummary("abc", p(0, 0), p(0, 1))).toBe("2 chars");
    expect(visualSelectionSummary("a\nb", p(0, 0), p(1, 0))).toBe("2 lines");
    expect(visualSelectionText("a\nb", p(0, 0), p(1, 0), "char")).toBe("a\nb");
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

  test("deletes characters before cursor within current line", () => {
    expect(deleteCharBefore("abcd", p(0, 2))).toMatchObject({
      text: "acd",
      cursor: p(0, 1),
      register: { type: "char", text: "b" },
      changed: true,
    });

    expect(deleteCharBefore("abcdef", p(0, 5), 3)).toMatchObject({
      text: "abf",
      cursor: p(0, 2),
      register: { type: "char", text: "cde" },
      changed: true,
    });
  });

  test("delete before cursor is safe at line start and clamps count to current line", () => {
    expect(deleteCharBefore("abc", p(0, 0))).toMatchObject({
      text: "abc",
      cursor: p(0, 0),
      changed: false,
    });

    expect(deleteCharBefore("one\ntwo", p(1, 1), 3)).toMatchObject({
      text: "one\nwo",
      cursor: p(1, 0),
      register: { type: "char", text: "t" },
      changed: true,
    });
  });

  test("toggles character case within the current line", () => {
    expect(toggleCaseAt("AbC", p(0, 0), 3)).toMatchObject({
      text: "aBc",
      cursor: p(0, 2),
      changed: true,
    });

    expect(toggleCaseAt("a1B", p(0, 0), 3)).toMatchObject({
      text: "A1b",
      cursor: p(0, 2),
      changed: true,
    });
  });

  test("toggle case clamps counts and no-ops at line boundaries", () => {
    expect(toggleCaseAt("ab\nCD", p(0, 1), 5)).toMatchObject({
      text: "aB\nCD",
      cursor: p(0, 1),
      changed: true,
    });
    expect(toggleCaseAt("abc", p(0, 3))).toMatchObject({
      text: "abc",
      cursor: p(0, 3),
      changed: false,
    });
    expect(toggleCaseAt("123", p(0, 0), 3)).toMatchObject({
      text: "123",
      cursor: p(0, 2),
      changed: false,
    });
  });

  test("toggle case counts code points without landing inside surrogate pairs", () => {
    expect(toggleCaseAt("ab😀cd", p(0, 0), 4)).toMatchObject({
      text: "AB😀Cd",
      cursor: p(0, 4),
      changed: true,
    });
    expect(toggleCaseAt("ab😀cd", p(0, 3), 1)).toMatchObject({
      text: "ab😀cd",
      cursor: p(0, 2),
      changed: false,
    });
  });

  test("toggle case skips expanding JavaScript case mappings", () => {
    expect(toggleCaseAt("ßa", p(0, 0), 1)).toMatchObject({
      text: "ßa",
      cursor: p(0, 0),
      changed: false,
    });
    expect(toggleCaseAt("İx", p(0, 0), 1)).toMatchObject({
      text: "İx",
      cursor: p(0, 0),
      changed: false,
    });
  });

  test("transforms visual case by selection kind", () => {
    expect(
      transformCaseVisualRange("abC\nDeF", p(0, 1), p(1, 1), "char", "lowercase"),
    ).toMatchObject({
      text: "abc\ndeF",
      cursor: p(0, 1),
      changed: true,
    });
    expect(
      transformCaseVisualRange("abC\nDeF", p(0, 0), p(1, 0), "line", "uppercase"),
    ).toMatchObject({
      text: "ABC\nDEF",
      cursor: p(0, 0),
      changed: true,
    });
    expect(toggleCaseVisualRange("abC\nDeF", p(0, 1), p(1, 1), "block")).toMatchObject({
      text: "aBC\nDEF",
      cursor: p(0, 1),
      changed: true,
    });
  });

  test("case transform leaves non-letters, empty ranges, and expanding mappings safe", () => {
    expect(transformCaseVisualRange("123", p(0, 0), p(0, 2), "char", "uppercase")).toMatchObject({
      text: "123",
      cursor: p(0, 0),
      changed: false,
    });
    expect(transformCaseVisualRange("abc", p(0, 3), p(0, 3), "char", "uppercase")).toMatchObject({
      text: "abc",
      cursor: p(0, 3),
      changed: false,
    });
    expect(transformCaseVisualRange("ßİ", p(0, 0), p(0, 1), "char", "uppercase")).toMatchObject({
      text: "ßİ",
      cursor: p(0, 0),
      changed: false,
    });
  });
});

describe("blockwise visual operations", () => {
  test("extracts rectangular selections in document order", () => {
    const text = "alpha\nbravo\ncharlie";
    expect(yankVisualSelection(text, p(0, 1), p(2, 3), "block")).toEqual({
      type: "char",
      text: "lph\nrav\nhar",
    });
    expect(visualSelectionText(text, p(2, 3), p(0, 1), "block")).toBe("lph\nrav\nhar");
  });

  test("handles ragged lines as empty slices", () => {
    const text = "abcdef\nx\n12345";
    expect(yankVisualSelection(text, p(0, 2), p(2, 4), "block")).toEqual({
      type: "char",
      text: "cde\n\n345",
    });
    expect(visualBlockSelectionSummary(text, p(0, 2), p(2, 4))).toBe("3x3 block");
  });

  test("deletes rectangular selections line by line", () => {
    const result = deleteBlockRange("abcdef\nx\n12345", p(0, 2), p(2, 4));
    expect(result.text).toBe("abf\nx\n12");
    expect(result.cursor).toEqual(p(0, 2));
    expect(result.register).toEqual({ type: "char", text: "cde\n\n345" });
    expect(result.changed).toBe(true);
  });

  test("inserts text at visual block start and end columns", () => {
    expect(insertBlockText("abcd\nefgh", p(0, 1), p(1, 2), "XX", "start")).toEqual({
      text: "aXXbcd\neXXfgh",
      cursor: p(0, 3),
      changed: true,
    });

    expect(insertBlockText("abcd\nefgh", p(0, 1), p(1, 2), "XX", "end")).toEqual({
      text: "abcXXd\nefgXXh",
      cursor: p(0, 5),
      changed: true,
    });
  });
});

describe("linewise visual operations", () => {
  test("extracts selected full lines in document order", () => {
    const text = "one\ntwo\nthree";
    expect(yankVisualSelection(text, p(0, 2), p(1, 1), "line")).toEqual({
      type: "line",
      text: "one\ntwo",
    });
    expect(yankLineRange(text, p(2, 1), p(1, 0))).toEqual({ type: "line", text: "two\nthree" });
    expect(visualSelectionText(text, p(2, 1), p(1, 0), "line")).toBe("two\nthree");
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

describe("visual replacement operations", () => {
  test("replaces selected characterwise text while preserving line breaks", () => {
    const result = replaceVisualRangeChars("abc\ndef", p(0, 1), p(1, 1), "char", "X");
    expect(result.text).toBe("aXX\nXXf");
    expect(result.cursor).toEqual(p(0, 1));
    expect(result.register).toEqual({ type: "char", text: "bc\nde" });
  });

  test("replaces visual line and block ranges in place", () => {
    const line = replaceVisualRangeChars("abc\ndef", p(0, 0), p(1, 0), "line", "Z");
    expect(line.text).toBe("ZZZ\nZZZ");
    expect(line.register).toEqual({ type: "line", text: "abc\ndef" });

    const block = replaceVisualRangeChars("abcd\nef", p(0, 1), p(1, 2), "block", "Q");
    expect(block.text).toBe("aQQd\neQ");
    expect(block.register).toEqual({ type: "char", text: "bc\nf" });
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

describe("extended navigation helpers", () => {
  test("computes buffer boundary and first non-blank positions", () => {
    expect(bufferStartPosition()).toEqual(p(0, 0));
    expect(bufferEndPosition("one\ntwo")).toEqual(p(1, 3));
    expect(firstNonBlankPosition("one\n  two", p(1, 4))).toEqual(p(1, 2));
    expect(firstNonBlankPosition("one\n   ", p(1, 2))).toEqual(p(1, 0));
  });

  test("finds matching pairs under or after the cursor", () => {
    expect(matchingPairPosition("call(a, [b])", p(0, 4))).toEqual(p(0, 11));
    expect(matchingPairPosition("call(a, [b])", p(0, 8))).toEqual(p(0, 10));
    expect(matchingPairPosition("call(a, [b])", p(0, 10))).toEqual(p(0, 8));
    expect(matchingPairPosition("no pairs", p(0, 0))).toBeUndefined();
  });
});

describe("operator-motion helpers", () => {
  test("deletes and yanks word motions", () => {
    const deleted = deleteByMotion("hello world", p(0, 0), "w");
    expect(deleted.text).toBe("world");
    expect(deleted.cursor).toEqual(p(0, 0));
    expect(deleted.register).toEqual({ type: "char", text: "hello " });

    expect(yankByMotion("hello world", p(0, 6), "b")).toEqual({ type: "char", text: "hello " });
  });

  test("handles line-start, first-nonblank, and line-end motions", () => {
    expect(deleteByMotion("  hello", p(0, 5), "0")).toMatchObject({
      text: "lo",
      cursor: p(0, 0),
      register: { type: "char", text: "  hel" },
    });
    expect(deleteByMotion("  hello", p(0, 5), "^")).toMatchObject({
      text: "  lo",
      cursor: p(0, 2),
      register: { type: "char", text: "hel" },
    });
    expect(deleteByMotion("hello", p(0, 2), "$")).toMatchObject({
      text: "he",
      cursor: p(0, 2),
      register: { type: "char", text: "llo" },
    });
  });

  test("empty ranges are no-ops", () => {
    const result = deleteByMotion("hello", p(0, 0), "0");
    expect(result.text).toBe("hello");
    expect(result.changed).toBe(false);
    expect(yankByMotion("hello", p(0, 0), "0")).toBeUndefined();
  });

  test("supports word-end motion and counted ranges", () => {
    expect(wordEndPosition("hello world", p(0, 0))).toEqual(p(0, 4));
    expect(wordEndPosition("hello world", p(0, 0), 2)).toEqual(p(0, 10));
    expect(deleteByMotion("hello world", p(0, 0), "e")).toMatchObject({
      text: " world",
      register: { type: "char", text: "hello" },
    });
  });

  test("supports explicit WORD navigation without retuning lowercase word behavior", () => {
    const text = "run --foo=bar /tmp/a-b\nnext token";
    expect(wordForwardBigPosition(text, p(0, 0))).toEqual(p(0, 4));
    expect(wordEndBigPosition(text, p(0, 4))).toEqual(p(0, 12));
    expect(wordBackwardBigPosition(text, p(0, 14))).toEqual(p(0, 4));
    expect(wordForwardBigPosition(text, p(0, 0), 3)).toEqual(p(1, 0));
    expect(wordEndBigPosition(text, p(0, 0), 2)).toEqual(p(0, 12));
    expect(wordEndPosition(text, p(0, 4))).toEqual(p(0, 5));
    expect(wordEndPosition(text, p(0, 4))).not.toEqual(wordEndBigPosition(text, p(0, 4)));
  });

  test("supports lowercase word navigation across keyword and punctuation runs", () => {
    const text = "foo/bar baz qux";
    expect(wordForwardPosition(text, p(0, 0))).toEqual(p(0, 3));
    expect(wordForwardPosition(text, p(0, 3))).toEqual(p(0, 4));
    expect(wordForwardPosition(text, p(0, 4))).toEqual(p(0, 8));
    expect(wordForwardPosition(text, p(0, 8))).toEqual(p(0, 12));
    expect(wordBackwardPosition(text, p(0, 12))).toEqual(p(0, 8));
    expect(wordBackwardPosition(text, p(0, 8))).toEqual(p(0, 4));
    expect(wordBackwardPosition(text, p(0, 4))).toEqual(p(0, 3));
    expect(wordBackwardPosition(text, p(0, 3))).toEqual(p(0, 0));
    expect(wordEndPosition(text, p(0, 0))).toEqual(p(0, 2));
    expect(wordEndPosition(text, p(0, 3))).toEqual(p(0, 6));
    expect(wordEndPosition(text, p(0, 4))).toEqual(p(0, 6));

    expect(wordForwardPosition("--flag value", p(0, 0))).toEqual(p(0, 2));
    expect(wordEndPosition("--flag value", p(0, 0))).toEqual(p(0, 1));
    expect(wordBackwardPosition("--flag value", p(0, 8))).toEqual(p(0, 7));
    expect(wordPreviousEndPosition("--flag value", p(0, 8))).toEqual(p(0, 5));

    expect(wordForwardPosition("/tmp/a-b next", p(0, 0))).toEqual(p(0, 1));
    expect(wordForwardPosition("/tmp/a-b next", p(0, 1))).toEqual(p(0, 4));
    expect(wordForwardPosition("/tmp/a-b next", p(0, 4))).toEqual(p(0, 5));
    expect(wordForwardPosition("/tmp/a-b next", p(0, 5))).toEqual(p(0, 6));
    expect(wordForwardPosition("/tmp/a-b next", p(0, 6))).toEqual(p(0, 7));
  });

  test("keeps WORD navigation whitespace-delimited on punctuation-heavy text", () => {
    expect(wordForwardBigPosition("foo/bar baz qux", p(0, 0))).toEqual(p(0, 8));
    expect(wordEndBigPosition("foo/bar baz qux", p(0, 0))).toEqual(p(0, 6));
    expect(wordBackwardBigPosition("foo/bar baz qux", p(0, 12))).toEqual(p(0, 8));
    expect(wordPreviousEndBigPosition("foo/bar baz qux", p(0, 12))).toEqual(p(0, 10));

    expect(wordForwardBigPosition("--flag value", p(0, 0))).toEqual(p(0, 7));
    expect(wordEndBigPosition("--flag value", p(0, 0))).toEqual(p(0, 5));
    expect(wordBackwardBigPosition("--flag value", p(0, 8))).toEqual(p(0, 7));

    expect(wordForwardBigPosition("/tmp/a-b next", p(0, 0))).toEqual(p(0, 9));
    expect(wordEndBigPosition("/tmp/a-b next", p(0, 0))).toEqual(p(0, 7));
    expect(wordPreviousEndBigPosition("/tmp/a-b next", p(0, 9))).toEqual(p(0, 7));
  });

  test("supports previous word-end and previous WORD-end navigation", () => {
    const text = "alpha beta.gamma /tmp/file\nnext";
    expect(wordPreviousEndPosition(text, p(0, 17))).toEqual(p(0, 15));
    expect(wordPreviousEndBigPosition(text, p(0, 17))).toEqual(p(0, 15));
    expect(wordPreviousEndPosition(text, p(0, 10))).toEqual(p(0, 9));
    expect(wordPreviousEndPosition(text, p(0, 17), 2)).toEqual(p(0, 10));
    expect(wordPreviousEndBigPosition(text, p(0, 17), 2)).toEqual(p(0, 4));
    expect(wordPreviousEndPosition(text, p(0, 0))).toEqual(p(0, 0));
    expect(wordPreviousEndBigPosition(text, p(0, 0))).toEqual(p(0, 0));
    expect(wordForwardPosition(text, p(0, 0), 99)).toEqual(p(1, 4));
    expect(wordForwardBigPosition(text, p(0, 0), 99)).toEqual(p(1, 4));
  });

  test("supports WORD and previous-end operator motion ranges", () => {
    expect(deleteByMotion("run --foo=bar /tmp/a-b", p(0, 0), "W")).toMatchObject({
      text: "--foo=bar /tmp/a-b",
      cursor: p(0, 0),
      register: { type: "char", text: "run " },
      changed: true,
    });
    expect(deleteByMotion("run --foo=bar /tmp/a-b", p(0, 4), "E")).toMatchObject({
      text: "run  /tmp/a-b",
      cursor: p(0, 4),
      register: { type: "char", text: "--foo=bar" },
      changed: true,
    });
    expect(deleteByMotion("run --foo=bar", p(0, 4), "e")).toMatchObject({
      text: "run foo=bar",
      cursor: p(0, 4),
      register: { type: "char", text: "--" },
      changed: true,
    });
    expect(yankByMotion("alpha beta.gamma /tmp/file", p(0, 17), "ge")).toEqual({
      type: "char",
      text: "a ",
    });
    expect(yankByMotion("alpha beta.gamma /tmp/file", p(0, 17), "gE")).toEqual({
      type: "char",
      text: "a ",
    });
    expect(deleteByMotion("alpha beta.gamma /tmp/file", p(0, 17), "gE", 2)).toMatchObject({
      text: "alph/tmp/file",
      register: { type: "char", text: "a beta.gamma " },
    });
  });

  test("supports character, linewise, buffer, and matching-pair operator motions", () => {
    expect(deleteByMotion("abcd", p(0, 1), "l", 2)).toMatchObject({
      text: "ad",
      register: { type: "char", text: "bc" },
    });
    expect(deleteByMotion("abcd", p(0, 2), "h", 2)).toMatchObject({
      text: "cd",
      cursor: p(0, 0),
      register: { type: "char", text: "ab" },
    });
    expect(deleteByMotion("one\ntwo\nthree", p(1, 1), "j")).toMatchObject({
      text: "one",
      cursor: p(0, 0),
      register: { type: "line", text: "two\nthree" },
    });
    expect(yankByMotion("one\ntwo\nthree", p(1, 1), "k")).toEqual({
      type: "line",
      text: "one\ntwo",
    });
    expect(deleteByMotion("one\ntwo\nthree", p(1, 1), "gg")).toMatchObject({
      text: "three",
      register: { type: "line", text: "one\ntwo" },
    });
    expect(yankByMotion("one\ntwo\nthree", p(1, 1), "G")).toEqual({
      type: "line",
      text: "two\nthree",
    });
    expect(deleteByMotion("a(b)c", p(0, 1), "%")).toMatchObject({
      text: "ac",
      register: { type: "char", text: "(b)" },
    });
  });
});

describe("roadmap buffer helpers", () => {
  test("adjusts signed integers at or after cursor", () => {
    expect(adjustNumberAtOrAfterCursor("v2 count -3", p(0, 0), 1)).toMatchObject({
      text: "v3 count -3",
      cursor: p(0, 1),
      changed: true,
    });
    expect(adjustNumberAtOrAfterCursor("v2 count -3", p(0, 3), -5)).toMatchObject({
      text: "v2 count -8",
      cursor: p(0, 9),
    });
    expect(adjustNumberAtOrAfterCursor("none", p(0, 0), 1).changed).toBe(false);
  });

  test("finds literal prompt search matches with wrap-around", () => {
    const text = "alpha beta\ngamma beta";
    expect(findSearchMatch(text, p(0, 0), "beta", "forward")).toEqual(p(0, 6));
    expect(findSearchMatch(text, p(1, 6), "beta", "forward")).toEqual(p(0, 6));
    expect(findSearchMatch(text, p(1, 10), "beta", "backward")).toEqual(p(1, 6));
    expect(findSearchMatch(text, p(0, 0), "beta", "backward")).toEqual(p(1, 6));
    expect(findSearchMatch(text, p(0, 0), "missing", "forward")).toBeUndefined();
    expect(findSearchMatch(text, p(0, 0), "", "forward")).toBeUndefined();
  });

  test("finds bounded literal search highlight ranges", () => {
    expect(findSearchHighlightRanges("one two one", "one", 10)).toEqual([
      { start: p(0, 0), end: p(0, 2) },
      { start: p(0, 8), end: p(0, 10) },
    ]);
    expect(findSearchHighlightRanges("one\none", "one", 1)).toEqual([
      { start: p(0, 0), end: p(0, 2) },
    ]);
    expect(findSearchHighlightRanges("aa\nbb\naa\nbb", "bb", 10)).toEqual([
      { start: p(1, 0), end: p(1, 1) },
      { start: p(3, 0), end: p(3, 1) },
    ]);
    expect(findSearchHighlightRanges("aaa", "aa", 10)).toEqual([{ start: p(0, 0), end: p(0, 1) }]);
    expect(findSearchHighlightRanges("aaa", "", 10)).toEqual([]);
    expect(findSearchHighlightRanges("one\ntwo", "one\ntwo", 10)).toEqual([]);
  });

  test("applies prompt search targets as operator ranges", () => {
    expect(deleteSearchRange("alpha beta gamma", p(0, 0), p(0, 6), "beta")).toMatchObject({
      text: " gamma",
      register: { type: "char", text: "alpha beta" },
    });
    expect(yankSearchRange("alpha beta gamma", p(0, 14), p(0, 6), "beta")).toEqual({
      type: "char",
      text: "beta gamm",
    });
  });

  test("finds characters on the current line", () => {
    expect(findCharOnLine("a:b:c", p(0, 0), "findForward", ":")).toEqual(p(0, 1));
    expect(findCharOnLine("a:b:c", p(0, 0), "findForward", ":", 2)).toEqual(p(0, 3));
    expect(findCharOnLine("a:b:c", p(0, 4), "findBackward", ":")).toEqual(p(0, 3));
    expect(findCharOnLine("a:b:c", p(0, 0), "tillForward", ":", 2)).toEqual(p(0, 2));
    expect(findCharOnLine("a:b:c", p(0, 0), "findForward", "z")).toBeUndefined();
  });

  test("applies character search targets as operator ranges", () => {
    expect(deleteByCharSearch("a:b:c", p(0, 0), "findForward", ":")).toMatchObject({
      text: "b:c",
      cursor: p(0, 0),
      register: { type: "char", text: "a:" },
      changed: true,
    });
    expect(deleteByCharSearch("a:b:c", p(0, 0), "tillForward", ":", 2)).toMatchObject({
      text: ":c",
      cursor: p(0, 0),
      register: { type: "char", text: "a:b" },
      changed: true,
    });
    expect(deleteByCharSearch("a:b:c", p(0, 2), "findBackward", ":")).toMatchObject({
      text: "a:c",
      cursor: p(0, 1),
      register: { type: "char", text: ":b" },
      changed: true,
    });
    expect(yankByCharSearch("a[b]c", p(0, 3), "tillBackward", "[")).toEqual({
      type: "char",
      text: "b]",
    });
  });

  test("character search operator ranges no-op safely", () => {
    expect(deleteByCharSearch("a:b", p(0, 0), "tillForward", ":")).toMatchObject({
      text: "a:b",
      cursor: p(0, 0),
      changed: false,
    });
    expect(yankByCharSearch("a:b", p(0, 0), "tillForward", ":")).toBeUndefined();
    expect(deleteByCharSearch("a:b\n:c", p(0, 2), "findForward", ":")).toMatchObject({
      text: "a:b\n:c",
      cursor: p(0, 2),
      changed: false,
    });
    expect(yankByCharSearch("a:b", p(0, 0), "findForward", "z")).toBeUndefined();
  });

  test("resolves word and delimiter text objects", () => {
    expect(
      deleteTextObject("hello world", p(0, 7), { kind: "inner", target: "word" }),
    ).toMatchObject({
      text: "hello ",
      register: { type: "char", text: "world" },
    });
    expect(
      deleteTextObject("hello world next", p(0, 7), { kind: "around", target: "word" }),
    ).toMatchObject({
      text: "hello next",
      register: { type: "char", text: "world " },
    });
    expect(
      yankTextObject('say "hello" now', p(0, 6), { kind: "inner", target: "doubleQuote" }),
    ).toEqual({
      type: "char",
      text: "hello",
    });
    expect(yankTextObject("call(one)", p(0, 5), { kind: "around", target: "paren" })).toEqual({
      type: "char",
      text: "(one)",
    });
  });

  test("resolves prompt-native text objects through buffer operations", () => {
    expect(
      yankTextObject("```ts\nconst x = 1;\n```", p(1, 0), { kind: "inner", target: "codeFence" }),
    ).toEqual({ type: "char", text: "const x = 1;" });

    expect(
      deleteTextObject("# Title\nbody\n# Next", p(1, 0), {
        kind: "around",
        target: "headingSection",
      }),
    ).toMatchObject({ text: "# Next", register: { type: "char", text: "# Title\nbody" } });
  });

  test("deletes inner list item content without joining following line", () => {
    expect(
      deleteTextObject("- first\n- second", p(0, 3), { kind: "inner", target: "listItem" }),
    ).toMatchObject({ text: "- \n- second", register: { type: "char", text: "first" } });
  });

  test("honors disabled prompt-native structure targets", () => {
    expect(
      yankTextObject(
        "```ts\nconst x = 1;\n```",
        p(1, 0),
        { kind: "inner", target: "codeFence" },
        {
          enabled: true,
          targets: {
            codeFence: false,
            headingSection: true,
            listItem: true,
            tag: true,
            errorBlock: true,
          },
        },
      ),
    ).toBeUndefined();
  });
});

describe("line/open/join helpers", () => {
  test("opens blank lines above and below", () => {
    expect(openLineBelow("one\ntwo", p(0, 1))).toMatchObject({
      text: "one\n\ntwo",
      cursor: p(1, 0),
    });
    expect(openLineAbove("one\ntwo", p(1, 1))).toMatchObject({
      text: "one\n\ntwo",
      cursor: p(1, 0),
    });
    expect(openLineBelow("", p(0, 0))).toMatchObject({ text: "", cursor: p(0, 0), changed: false });
  });

  test("insert move helpers use small-word and current-line boundaries", () => {
    const text = "alpha beta\nsecond line";
    expect(insertWordBackwardPosition(text, p(0, 6))).toEqual(p(0, 0));
    expect(insertWordForwardPosition(text, p(0, 4))).toEqual(p(0, 6));
    expect(insertLineStartPosition(text, p(1, 5))).toEqual(p(1, 0));
    expect(insertLineEndPosition(text, p(1, 99))).toEqual(p(1, 11));
  });

  test("insert move helpers clamp at prompt boundaries", () => {
    expect(insertWordBackwardPosition("abc", p(0, 0))).toEqual(p(0, 0));
    expect(insertWordForwardPosition("abc", p(0, 3))).toEqual(p(0, 3));
    expect(insertLineStartPosition("", p(0, 0))).toEqual(p(0, 0));
    expect(insertLineEndPosition("", p(0, 0))).toEqual(p(0, 0));
  });

  test("insert delete helpers remove register-free prompt text", () => {
    const text = "alpha beta\nsecond line";
    expect(insertDeleteWordBackward(text, p(0, 6))).toMatchObject({
      text: "beta\nsecond line",
      cursor: p(0, 0),
      changed: true,
    });
    expect(insertDeleteWordBackward(text, p(0, 6)).register).toBeUndefined();
    expect(insertDeleteWordForward(text, p(0, 4))).toMatchObject({
      text: "alphbeta\nsecond line",
      cursor: p(0, 4),
      changed: true,
    });
    expect(insertDeleteWordForward(text, p(0, 4)).register).toBeUndefined();
  });

  test("insert line-backward delete stays on current line", () => {
    expect(insertDeleteLineBackward("one\ntwo", p(1, 2))).toMatchObject({
      text: "one\no",
      cursor: p(1, 0),
      changed: true,
    });
    expect(insertDeleteLineBackward("abc", p(0, 0))).toMatchObject({ changed: false });
  });

  test("insert line-forward delete joins EOL without trimming spaces", () => {
    expect(insertDeleteLineForward("abc\ndef", p(0, 3))).toMatchObject({
      text: "abcdef",
      cursor: p(0, 3),
      changed: true,
    });
    expect(insertDeleteLineForward("  \n  ", p(0, 2))).toMatchObject({
      text: "    ",
      cursor: p(0, 2),
      changed: true,
    });
    expect(insertDeleteLineForward("abc", p(0, 2))).toMatchObject({
      text: "ab",
      cursor: p(0, 2),
      changed: true,
    });
    expect(insertDeleteLineForward("abc", p(0, 3))).toMatchObject({ changed: false });
  });

  test("changes a line by replacing it with an editable blank line", () => {
    const result = changeLine("one\ntwo", p(1, 1));
    expect(result.text).toBe("one\n");
    expect(result.cursor).toEqual(p(1, 0));
    expect(result.register).toEqual({ type: "line", text: "two" });
  });

  test("joins the current line with the next line", () => {
    const result = joinLineWithNext("one   \n   two\nthree", p(0, 1));
    expect(result.text).toBe("one two\nthree");
    expect(result.cursor).toEqual(p(0, 3));
    expect(joinLineWithNext("one", p(0, 0)).changed).toBe(false);
  });
});

describe("paste before", () => {
  test("charwise paste inserts before cursor", () => {
    const result = pasteRegisterBefore("abc", p(0, 1), { type: "char", text: "ZZ" });
    expect(result.text).toBe("aZZbc");
    expect(result.cursor).toEqual(p(0, 1));
  });

  test("linewise paste inserts above cursor line", () => {
    const result = pasteRegisterBefore("one\ntwo", p(1, 0), { type: "line", text: "alpha\nbeta" });
    expect(result.text).toBe("one\nalpha\nbeta\ntwo");
    expect(result.cursor).toEqual(p(1, 0));
  });
});

describe("Ex line operations", () => {
  test("deletes and yanks addressed line ranges", () => {
    const deleted = deleteExLineRange("one\ntwo\nthree", { startLine: 1, endLine: 2 });
    expect(deleted).toMatchObject({
      ok: true,
      lines: 2,
      edit: { text: "one", cursor: p(0, 0), register: { type: "line", text: "two\nthree" } },
    });

    expect(yankExLineRange("one\ntwo\nthree", { startLine: 0, endLine: 1 })).toEqual({
      lines: 2,
      register: { type: "line", text: "one\ntwo" },
    });
  });

  test("puts unnamed register text as lines after range end", () => {
    expect(
      putExRegisterAfterRange(
        "one\ntwo",
        { startLine: 0, endLine: 0 },
        {
          type: "char",
          text: "alpha\nbeta",
        },
      ),
    ).toMatchObject({
      ok: true,
      lines: 2,
      edit: { text: "one\nalpha\nbeta\ntwo", cursor: p(1, 0) },
    });
    expect(putExRegisterAfterRange("one", { startLine: 0, endLine: 0 }, undefined)).toEqual({
      ok: false,
      message: "Register is empty",
    });
  });

  test("copies and moves ranges relative to destination addresses", () => {
    expect(copyExLineRange("one\ntwo\nthree", { startLine: 1, endLine: 1 }, -1)).toMatchObject({
      ok: true,
      edit: { text: "two\none\ntwo\nthree", cursor: p(0, 0) },
    });
    expect(copyExLineRange("one\ntwo\nthree", { startLine: 0, endLine: 1 }, 2)).toMatchObject({
      ok: true,
      lines: 2,
      edit: { text: "one\ntwo\nthree\none\ntwo", cursor: p(3, 0) },
    });
    expect(
      moveExLineRange("one\ntwo\nthree\nfour", { startLine: 2, endLine: 3 }, -1),
    ).toMatchObject({
      ok: true,
      edit: { text: "three\nfour\none\ntwo", cursor: p(0, 0) },
    });
    expect(moveExLineRange("one\ntwo\nthree\nfour", { startLine: 0, endLine: 0 }, 2)).toMatchObject(
      {
        ok: true,
        edit: { text: "two\nthree\none\nfour", cursor: p(2, 0) },
      },
    );
    expect(moveExLineRange("one\ntwo\nthree", { startLine: 0, endLine: 1 }, 1)).toEqual({
      ok: false,
      message: "Ex move destination overlaps range",
    });
  });

  test("typed resolved ranges drive line, character, block, and destination operations", () => {
    const line = { type: "line" as const, range: { startLine: 1, endLine: 1 } };
    const destination = { type: "destination" as const, destination: -1 };
    expect(deleteResolvedLineRange("one\ntwo\nthree", line)).toMatchObject({
      ok: true,
      edit: { text: "one\nthree", register: { type: "line", text: "two" } },
    });
    expect(yankResolvedLineRange("one\ntwo\nthree", line)).toEqual({
      lines: 1,
      register: { type: "line", text: "two" },
    });
    expect(
      putRegisterAfterResolvedLineRange("one\ntwo", line, { type: "char", text: "alpha" }),
    ).toMatchObject({ ok: true, edit: { text: "one\ntwo\nalpha" } });
    expect(copyResolvedLineRange("one\ntwo", line, destination)).toMatchObject({
      ok: true,
      edit: { text: "two\none\ntwo" },
    });
    expect(moveResolvedLineRange("one\ntwo\nthree", line, destination)).toMatchObject({
      ok: true,
      edit: { text: "two\none\nthree" },
    });

    const character = {
      type: "character" as const,
      range: { start: p(0, 1), end: p(0, 3) },
    };
    expect(yankResolvedCharacterRange("abcd", character)).toEqual({ type: "char", text: "bcd" });
    expect(deleteResolvedCharacterRange("abcd", character)).toMatchObject({
      text: "a",
      cursor: p(0, 1),
    });

    const block = {
      type: "block" as const,
      range: { startLine: 0, endLine: 1, startCol: 1, endCol: 2 },
    };
    expect(deleteResolvedBlockRange("abc\ndef", block)).toMatchObject({ text: "a\nd" });
  });

  test("joins omitted and explicit Ex line ranges", () => {
    expect(
      joinExLineRange("one   \n   two\nthree", { startLine: 0, endLine: 0 }, false),
    ).toMatchObject({
      ok: true,
      lines: 2,
      edit: { text: "one two\nthree", cursor: p(0, 3) },
    });
    expect(joinExLineRange("one\n two \nthree", { startLine: 0, endLine: 2 }, true)).toMatchObject({
      ok: true,
      lines: 3,
      edit: { text: "one two  three", cursor: p(0, 3) },
    });
    expect(joinExLineRange("one", { startLine: 0, endLine: 0 }, false)).toEqual({
      ok: false,
      message: "Not enough lines to join",
    });
  });

  test("shifts prompt line ranges with transform semantics", () => {
    expect(shiftLinesFromCursor("one\ntwo\nthree", p(0, 1), 2, "indent")).toMatchObject({
      ok: true,
      edit: { text: "  one\n  two\nthree", cursor: p(0, 1), changed: true },
    });
    expect(
      shiftLineRange("  one\n\ttwo", { startLine: 0, endLine: 1 }, "dedent", p(0, 2)),
    ).toMatchObject({
      ok: true,
      edit: { text: "one\ntwo", cursor: p(0, 2), changed: true },
    });
    expect(shiftLinesFromCursor("one", p(0, 0), 1, "dedent")).toMatchObject({
      ok: true,
      edit: { text: "one", cursor: p(0, 0), changed: false },
    });
  });

  test("applies prompt transforms across Ex line ranges", () => {
    expect(
      applyPromptTransform("one\ntwo", { startLine: 0, endLine: 1 }, { action: "quote" }, p(0, 0)),
    ).toMatchObject({ edit: { text: "> one\n> two", cursor: p(0, 0), changed: true } });
    expect(
      applyPromptTransform(
        "> one\n> two",
        { startLine: 0, endLine: 1 },
        { action: "unquote" },
        p(0, 0),
      ),
    ).toMatchObject({ edit: { text: "one\ntwo", changed: true } });
    expect(
      applyPromptTransform(
        "a\n  b\n",
        { startLine: 0, endLine: 2 },
        { action: "bulletize" },
        p(0, 0),
      ),
    ).toMatchObject({ edit: { text: "- a\n  - b\n", changed: true } });
    expect(
      applyPromptTransform(
        "const x = 1;",
        { startLine: 0, endLine: 0 },
        { action: "fence", language: "ts" },
        p(0, 0),
      ),
    ).toMatchObject({ edit: { text: "```ts\nconst x = 1;\n```", changed: true } });
    expect(
      applyPromptTransform(
        "  one\n\ttwo",
        { startLine: 0, endLine: 1 },
        { action: "dedent" },
        p(0, 0),
      ),
    ).toMatchObject({ edit: { text: "one\ntwo", changed: true } });
  });

  test("reflows prose while preserving fences and error blocks", () => {
    const text =
      "alpha beta gamma delta\n```\ncode stays as a very long line\n```\nTypeError: boom\n    at fn (x.ts:1:1)";
    const result = applyPromptTransform(
      text,
      { startLine: 0, endLine: 5 },
      { action: "reflow", width: 12 },
      p(0, 0),
    );
    expect(result).toMatchObject({ ok: true, edit: { changed: true } });
    expect(result.ok && result.edit.text).toBe(
      "alpha beta\ngamma delta\n```\ncode stays as a very long line\n```\nTypeError: boom\n    at fn (x.ts:1:1)",
    );
  });

  test("reflow preserves selected subranges inside existing code fences", () => {
    const text = "intro\n```ts\nconst value = some very long expression here\n```\noutro";
    const result = applyPromptTransform(
      text,
      { startLine: 2, endLine: 2 },
      { action: "reflow", width: 12 },
      p(2, 0),
    );

    expect(result).toMatchObject({ ok: true, edit: { text, changed: false } });
  });
});

describe("paragraph motions", () => {
  const three = "alpha\nbeta\n\ngamma\n\ndelta\nepsilon";

  test("forward motion moves to next paragraph first column", () => {
    expect(paragraphForwardPosition(three, p(0, 2))).toEqual(p(3, 0));
    expect(paragraphForwardPosition(three, p(1, 1))).toEqual(p(3, 0));
    expect(paragraphForwardPosition(three, p(3, 0))).toEqual(p(5, 0));
  });

  test("forward motion reaches prompt end at last paragraph", () => {
    expect(paragraphForwardPosition(three, p(5, 2))).toEqual(p(6, 7));
    expect(paragraphForwardPosition(three, p(6, 7))).toEqual(p(6, 7));
  });

  test("backward motion moves to current paragraph start", () => {
    expect(paragraphBackwardPosition(three, p(1, 1))).toEqual(p(0, 0));
    expect(paragraphBackwardPosition(three, p(6, 3))).toEqual(p(5, 0));
  });

  test("backward motion jumps to previous paragraph when already at start", () => {
    expect(paragraphBackwardPosition(three, p(0, 0))).toEqual(p(0, 0));
    expect(paragraphBackwardPosition(three, p(3, 0))).toEqual(p(0, 0));
    expect(paragraphBackwardPosition(three, p(5, 0))).toEqual(p(3, 0));
  });

  test("counted motions repeat and clamp at boundaries", () => {
    expect(paragraphForwardPosition(three, p(0, 0), 2)).toEqual(p(5, 0));
    expect(paragraphForwardPosition(three, p(0, 0), 9)).toEqual(p(6, 7));
    expect(paragraphBackwardPosition(three, p(6, 0), 2)).toEqual(p(3, 0));
    expect(paragraphBackwardPosition(three, p(6, 0), 9)).toEqual(p(0, 0));
  });

  test("separator-only and empty prompts are safe no-ops", () => {
    expect(paragraphForwardPosition("", p(0, 0))).toEqual(p(0, 0));
    expect(paragraphBackwardPosition("", p(0, 0))).toEqual(p(0, 0));
    expect(paragraphForwardPosition("\n\n  \n", p(1, 0))).toEqual(p(3, 0));
    expect(paragraphBackwardPosition("\n\n  \n", p(1, 0))).toEqual(p(0, 0));
  });

  test("delete by forward paragraph removes through separator boundary", () => {
    const text = "alpha\nbeta\n\ngamma\n\ndelta";
    const result = deleteByMotion(text, p(0, 0), "}");
    expect(result.text).toBe("gamma\n\ndelta");
    expect(result.cursor).toEqual(p(0, 0));
    expect(result.register).toEqual({ type: "char", text: "alpha\nbeta\n\n" });
    expect(result.changed).toBe(true);
  });

  test("delete by forward paragraph reaches prompt end at last paragraph", () => {
    const result = deleteByMotion("alpha\n\nbeta", p(2, 0), "}");
    expect(result.text).toBe("alpha\n\n");
    expect(result.register).toEqual({ type: "char", text: "beta" });
  });

  test("delete by backward paragraph resolves toward paragraph start", () => {
    const text = "alpha\n\ngamma\nline";
    const result = deleteByMotion(text, p(3, 2), "{");
    expect(result.text).toBe("alpha\n\nne");
    expect(result.cursor).toEqual(p(2, 0));
    expect(result.register).toEqual({ type: "char", text: "gamma\nli" });
  });

  test("yank by paragraph motion preserves prompt text", () => {
    const text = "alpha\nbeta\n\ngamma";
    expect(yankByMotion(text, p(0, 0), "}")).toEqual({
      type: "char",
      text: "alpha\nbeta\n\n",
    });
    expect(yankByMotion(text, p(3, 0), "{")).toEqual({ type: "char", text: "alpha\nbeta\n\n" });
    expect(yankByMotion(text, p(0, 0), "}")).toEqual({ type: "char", text: "alpha\nbeta\n\n" });
    expect(yankByMotion("alpha", p(0, 5), "}")).toBeUndefined();
  });

  test("inner paragraph text object deletes body without separators", () => {
    const text = "para1\n\npara2\n\npara3";
    expect(deleteTextObject(text, p(0, 2), { kind: "inner", target: "paragraph" })).toMatchObject({
      text: "\npara2\n\npara3",
      cursor: p(0, 0),
      register: { type: "char", text: "para1\n" },
      changed: true,
    });
    expect(deleteTextObject(text, p(2, 0), { kind: "inner", target: "paragraph" })).toMatchObject({
      register: { type: "char", text: "para2\n" },
    });
  });

  test("around paragraph text object includes one adjacent separator group", () => {
    const text = "para1\n\npara2\n\npara3";
    expect(deleteTextObject(text, p(0, 2), { kind: "around", target: "paragraph" })).toMatchObject({
      text: "para2\n\npara3",
      cursor: p(0, 0),
      register: { type: "char", text: "para1\n\n" },
      changed: true,
    });
    expect(deleteTextObject(text, p(4, 0), { kind: "around", target: "paragraph" })).toMatchObject({
      text: "para1\n\npara2\n",
      register: { type: "char", text: "\npara3" },
    });
  });

  test("yank paragraph text object preserves prompt text", () => {
    const text = "para1\n\npara2";
    expect(yankTextObject(text, p(0, 0), { kind: "inner", target: "paragraph" })).toEqual({
      type: "char",
      text: "para1\n",
    });
    expect(yankTextObject(text, p(2, 0), { kind: "around", target: "paragraph" })).toEqual({
      type: "char",
      text: "\npara2",
    });
  });

  test("missing paragraph text object is a safe no-op", () => {
    expect(deleteTextObject("", p(0, 0), { kind: "inner", target: "paragraph" })).toMatchObject({
      text: "",
      changed: false,
    });
    expect(
      deleteTextObject("\n  \n\n", p(1, 0), { kind: "around", target: "paragraph" }),
    ).toMatchObject({ changed: false });
    expect(yankTextObject("\n\n", p(0, 0), { kind: "inner", target: "paragraph" })).toBeUndefined();
  });
});

describe("wordUnderCursor", () => {
  test("returns the keyword word containing the cursor", () => {
    expect(wordUnderCursor("foo bar baz", p(0, 1))).toBe("foo");
    expect(wordUnderCursor("foo bar baz", p(0, 2))).toBe("foo");
  });

  test("returns the preceding word when cursor sits at word end", () => {
    expect(wordUnderCursor("foo bar baz", p(0, 3))).toBe("foo");
    expect(wordUnderCursor("foo bar baz", p(0, 7))).toBe("bar");
  });

  test("returns the preceding word at line end", () => {
    expect(wordUnderCursor("foo bar", p(0, 7))).toBe("bar");
  });

  test("includes underscore and digits as keyword characters", () => {
    expect(wordUnderCursor("foo_bar 1a2b", p(0, 4))).toBe("foo_bar");
    expect(wordUnderCursor("foo_bar 1a2b", p(0, 10))).toBe("1a2b");
  });

  test("returns undefined when no keyword char is under or before the cursor", () => {
    expect(wordUnderCursor("/foo", p(0, 0))).toBeUndefined();
    expect(wordUnderCursor("foo / bar", p(0, 4))).toBeUndefined();
    expect(wordUnderCursor("   ", p(0, 1))).toBeUndefined();
    expect(wordUnderCursor("", p(0, 0))).toBeUndefined();
  });

  test("returns the preceding word when cursor sits on punctuation after a keyword", () => {
    expect(wordUnderCursor("foo/bar", p(0, 3))).toBe("foo");
    expect(wordUnderCursor("foo,bar", p(0, 3))).toBe("foo");
  });
});
