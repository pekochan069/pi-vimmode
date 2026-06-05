import { describe, expect, test } from "bun:test";

import type { ExRangeContext } from "../src/range.ts";

import {
  parseExDestination,
  parseExLineRange,
  resolvedBlockRange,
  resolvedCharacterRange,
  resolvedDestination,
  resolvedLineRange,
  resolveModalBlockRange,
  resolveModalCharacterRange,
  resolveModalLineRange,
} from "../src/range.ts";

const context: ExRangeContext = {
  lineCount: 5,
  cursorLine: 1,
};

function parsedRange(source: string, ctx: ExRangeContext = context) {
  const result = parseExLineRange(source, ctx);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function rangeError(source: string, ctx: ExRangeContext = context) {
  const result = parseExLineRange(source, ctx);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("expected range error");
  return result.error;
}

function parsedDestination(source: string, ctx: ExRangeContext = context) {
  const result = parseExDestination(source, ctx);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function destinationError(source: string, ctx: ExRangeContext = context) {
  const result = parseExDestination(source, ctx);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("expected destination error");
  return result.error;
}

describe("prompt range algebra", () => {
  test("resolves existing Ex address behavior", () => {
    expect(parsedRange("s/a/b/")).toMatchObject({
      range: { startLine: 1, endLine: 1 },
      rest: "s/a/b/",
      explicit: false,
    });
    expect(parsedRange("%s/a/b/")).toMatchObject({
      range: { startLine: 0, endLine: 4 },
      rest: "s/a/b/",
      explicit: true,
    });
    expect(parsedRange(".s/a/b/")).toMatchObject({ range: { startLine: 1, endLine: 1 } });
    expect(parsedRange("$s/a/b/")).toMatchObject({ range: { startLine: 4, endLine: 4 } });
    expect(parsedRange("3s/a/b/")).toMatchObject({ range: { startLine: 2, endLine: 2 } });
    expect(parsedRange("2,4s/a/b/")).toMatchObject({
      range: { startLine: 1, endLine: 3 },
    });
  });

  test("resolves captured visual range marker", () => {
    expect(
      parsedRange("'<,'>s/a/b/", {
        ...context,
        visualRange: { startLine: 2, endLine: 4 },
      }),
    ).toMatchObject({ range: { startLine: 2, endLine: 4 }, rest: "s/a/b/" });
    expect(rangeError("'<,'>s/a/b/")).toEqual({
      type: "error",
      message: "Visual range marker requires captured visual range",
    });
  });

  test("rejects invalid existing ranges", () => {
    expect(rangeError("999s/a/b/")).toEqual({ type: "error", message: "Invalid Ex range" });
    expect(rangeError("5,3s/a/b/")).toEqual({ type: "error", message: "Invalid Ex range" });
    expect(rangeError("0delete")).toEqual({ type: "error", message: "Invalid Ex range" });
  });

  test("resolves destination addresses including zero sentinel", () => {
    expect(parsedDestination("$")).toMatchObject({ destination: 4 });
    expect(parsedDestination(".")).toMatchObject({ destination: 1 });
    expect(parsedDestination("3")).toMatchObject({ destination: 2 });
    expect(parsedDestination("0")).toMatchObject({ destination: -1 });
  });

  test("resolves single signed offsets", () => {
    expect(parsedRange(".,.+1delete")).toMatchObject({ range: { startLine: 1, endLine: 2 } });
    expect(parsedRange("$-2,$join")).toMatchObject({ range: { startLine: 2, endLine: 4 } });
    expect(parsedRange("3+1yank")).toMatchObject({ range: { startLine: 3, endLine: 3 } });
    expect(parsedRange("3-1yank")).toMatchObject({ range: { startLine: 1, endLine: 1 } });
  });

  test("rejects invalid offsets", () => {
    expect(rangeError("1-1delete")).toEqual({ type: "error", message: "Invalid Ex range" });
    expect(rangeError("$+1yank")).toEqual({ type: "error", message: "Invalid Ex range" });
    expect(rangeError(".+1-2delete")).toEqual({ type: "error", message: "Invalid Ex range" });
    expect(destinationError("0+1")).toEqual({
      type: "error",
      message: "Invalid Ex destination",
    });
  });

  test("resolves destination offsets", () => {
    expect(parsedDestination("$-1")).toMatchObject({ destination: 3 });
    expect(parsedDestination(".+1")).toMatchObject({ destination: 2 });
    expect(parsedDestination("3+1")).toMatchObject({ destination: 3 });
    expect(parsedDestination("3-1")).toMatchObject({ destination: 1 });
  });

  test("resolves semicolon ranges with base reset", () => {
    expect(parsedRange("2;.+2delete")).toMatchObject({ range: { startLine: 1, endLine: 3 } });
    expect(parsedRange(".;.+1s/foo/bar/g")).toMatchObject({
      range: { startLine: 1, endLine: 2 },
    });
  });

  test("rejects invalid semicolon ranges", () => {
    expect(rangeError(".;.-1yank")).toEqual({ type: "error", message: "Invalid Ex range" });
    expect(rangeError("2;delete")).toEqual({ type: "error", message: "Invalid Ex range" });
    expect(rangeError("2;3;4delete")).toEqual({ type: "error", message: "Invalid Ex range" });
    expect(rangeError("2;;3delete")).toEqual({ type: "error", message: "Invalid Ex range" });
  });

  test("wraps typed range outputs without side effects", () => {
    const line = { startLine: 1, endLine: 2 };
    const character = { start: { line: 1, col: 0 }, end: { line: 1, col: 3 } };
    const block = { startLine: 1, endLine: 3, startCol: 0, endCol: 2 };

    expect(resolvedLineRange(line)).toEqual({ type: "line", range: line });
    expect(resolvedCharacterRange(character)).toEqual({ type: "character", range: character });
    expect(resolvedBlockRange(block)).toEqual({ type: "block", range: block });
    expect(resolvedDestination(-1)).toEqual({ type: "destination", destination: -1 });
    expect(resolveModalLineRange(line)).toEqual({ ok: true, value: { type: "line", range: line } });
    expect(resolveModalCharacterRange(character)).toEqual({
      ok: true,
      value: { type: "character", range: character },
    });
    expect(resolveModalBlockRange(block)).toEqual({
      ok: true,
      value: { type: "block", range: block },
    });
  });
});
