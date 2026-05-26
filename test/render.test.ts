import { CURSOR_MARKER, visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, test } from "bun:test";

import {
  CURSOR_BAR_START,
  CURSOR_BLOCK_START,
  CURSOR_UNDERLINE_START,
  renderCursorCell,
  renderVisualEditor,
  restyleCursorMarker,
  SELECTION_START,
} from "../src/render.ts";

const p = (line: number, col: number) => ({ line, col });

function expectWidthSafe(lines: string[], width: number) {
  for (const line of lines) expect(visibleWidth(line)).toBeLessThanOrEqual(width);
}

describe("visual render helper", () => {
  test("highlights characterwise selected text", () => {
    const lines = renderVisualEditor({
      lines: ["abcd"],
      cursor: p(0, 2),
      visualAnchor: p(0, 1),
      mode: "visual",
      cursorStyle: "block",
      width: 20,
    });
    expect(lines.join("\n")).toContain(SELECTION_START);
    expect(lines.join("\n")).toContain(CURSOR_BLOCK_START);
    expectWidthSafe(lines, 20);
  });

  test("highlights visual line selections including empty selected lines", () => {
    const lines = renderVisualEditor({
      lines: ["one", "", "three"],
      cursor: p(2, 0),
      visualAnchor: p(0, 0),
      mode: "visualLine",
      cursorStyle: "underline",
      width: 12,
    });
    const output = lines.join("\n");
    expect(output).toContain(SELECTION_START);
    expect(output).toContain(CURSOR_UNDERLINE_START);
    expectWidthSafe(lines, 12);
  });

  test("keeps wrapped selections width-safe", () => {
    const lines = renderVisualEditor({
      lines: ["alpha beta gamma delta"],
      cursor: p(0, 18),
      visualAnchor: p(0, 0),
      mode: "visual",
      cursorStyle: "bar",
      width: 8,
    });
    expect(lines.length).toBeGreaterThan(3);
    expect(lines.join("\n")).toContain(CURSOR_BAR_START);
    expectWidthSafe(lines, 8);
  });

  test("handles narrow widths", () => {
    expect(
      renderVisualEditor({
        lines: ["abc"],
        cursor: p(0, 0),
        visualAnchor: p(0, 0),
        mode: "visual",
        cursorStyle: "block",
        width: 0,
      }),
    ).toEqual([]);
    expectWidthSafe(
      renderVisualEditor({
        lines: ["abc"],
        cursor: p(0, 0),
        visualAnchor: p(0, 0),
        mode: "visual",
        cursorStyle: "block",
        width: 1,
      }),
      1,
    );
  });
});

describe("cursor rendering", () => {
  test("renders distinct cursor style markers", () => {
    expect(renderCursorCell("x", "block")).toContain(CURSOR_BLOCK_START);
    expect(renderCursorCell("x", "bar")).toContain(CURSOR_BAR_START);
    expect(renderCursorCell("x", "underline")).toContain(CURSOR_UNDERLINE_START);
  });

  test("restyles Pi cursor marker output when marker is available", () => {
    const restyled = restyleCursorMarker([`${CURSOR_MARKER}\x1b[7mx\x1b[0m`], "bar");
    expect(restyled[0]).toContain(CURSOR_MARKER);
    expect(restyled[0]).toContain(CURSOR_BAR_START);
  });
});
