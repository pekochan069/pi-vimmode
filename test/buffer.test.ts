import { describe, expect, test } from "bun:test";

import {
  adjustNumberAtOrAfterCursor,
  bufferEndPosition,
  bufferStartPosition,
  changeLine,
  copyExLineRange,
  deleteBlockRange,
  deleteByMotion,
  deleteExLineRange,
  deleteTextObject,
  findCharOnLine,
  findSearchHighlightRanges,
  findSearchMatch,
  deleteSearchRange,
  insertBlockText,
  joinExLineRange,
  moveExLineRange,
  deleteCharAt,
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
  navigateBuffer,
  normalizeBufferPosition,
  openLineAbove,
  openLineBelow,
  pasteRegister,
  pasteRegisterBefore,
  putExRegisterAfterRange,
  replaceVisualRangeChars,
  substituteLineRangeLiteral,
  toggleCaseAt,
  toggleCaseVisualRange,
  visualBlockSelectionSummary,
  visualLineSelectionSummary,
  visualSelectionSummary,
  visualSelectionText,
  wordEndPosition,
  yankByMotion,
  yankExLineRange,
  yankLine,
  yankLineMarkRange,
  yankLineRange,
  yankMarkRange,
  yankSearchRange,
  yankTextObject,
  yankVisualSelection,
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
    expect(result.edit).toMatchObject({
      text: "qux foo\nqux\nbar",
      cursor: p(0, 7),
      changed: true,
    });
    expect(result.edit.register).toBeUndefined();
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

  test("toggles visual case by selection kind", () => {
    expect(toggleCaseVisualRange("abC\nDeF", p(0, 1), p(1, 1), "char")).toMatchObject({
      text: "aBc\ndEF",
      cursor: p(0, 1),
      changed: true,
    });
    expect(toggleCaseVisualRange("abC\nDeF", p(0, 0), p(1, 0), "line")).toMatchObject({
      text: "ABc\ndEf",
      cursor: p(0, 0),
      changed: true,
    });
    expect(toggleCaseVisualRange("abC\nDeF", p(0, 1), p(1, 1), "block")).toMatchObject({
      text: "aBC\nDEF",
      cursor: p(0, 1),
      changed: true,
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
});
