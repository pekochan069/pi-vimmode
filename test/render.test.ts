import { CURSOR_MARKER, visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, test } from "bun:test";

import type { CursorStyle, VimMode } from "../src/types.ts";

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

type VisualFixture = {
  lines: string[];
  cursor: ReturnType<typeof p>;
  visualAnchor: ReturnType<typeof p>;
  mode: Extract<VimMode, "visual" | "visualLine">;
  cursorStyle?: CursorStyle;
  width?: number;
  terminalRows?: number;
  focused?: boolean;
};

function renderVisual(fixture: VisualFixture): string[] {
  return renderVisualEditor({
    snapshot: {
      lines: fixture.lines,
      cursor: fixture.cursor,
    },
    visual: {
      mode: fixture.mode,
      anchor: fixture.visualAnchor,
    },
    cursorStyle: fixture.cursorStyle ?? "block",
    viewport: {
      width: fixture.width ?? 20,
      terminalRows: fixture.terminalRows,
      focused: fixture.focused,
    },
  });
}

function expectWidthSafe(lines: string[], width: number) {
  for (const line of lines) expect(visibleWidth(line)).toBeLessThanOrEqual(width);
}

describe("visual render helper", () => {
  test("highlights characterwise selected text", () => {
    const lines = renderVisual({
      lines: ["abcd"],
      cursor: p(0, 2),
      visualAnchor: p(0, 1),
      mode: "visual",
      width: 20,
    });
    expect(lines.join("\n")).toContain(SELECTION_START);
    expect(lines.join("\n")).toContain(CURSOR_BLOCK_START);
    expectWidthSafe(lines, 20);
  });

  test("highlights visual line selections including empty selected lines", () => {
    const lines = renderVisual({
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
    const lines = renderVisual({
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
      renderVisual({
        lines: ["abc"],
        cursor: p(0, 0),
        visualAnchor: p(0, 0),
        mode: "visual",
        width: 0,
      }),
    ).toEqual([]);
    expectWidthSafe(
      renderVisual({
        lines: ["abc"],
        cursor: p(0, 0),
        visualAnchor: p(0, 0),
        mode: "visual",
        width: 1,
      }),
      1,
    );
  });

  test("renders cursor styling instead of selection styling for selected cursor cell", () => {
    const output = renderVisual({
      lines: ["abcd"],
      cursor: p(0, 1),
      visualAnchor: p(0, 0),
      mode: "visual",
      width: 20,
    }).join("\n");

    expect(output).toContain(CURSOR_BLOCK_START);
    expect(output).not.toContain(`${SELECTION_START}b`);
  });

  test("renders cursor at end of last wrapped chunk", () => {
    const lines = renderVisual({
      lines: ["abcdef"],
      cursor: p(0, 6),
      visualAnchor: p(0, 0),
      mode: "visual",
      cursorStyle: "underline",
      width: 4,
    });

    expect(lines.join("\n")).toContain(CURSOR_UNDERLINE_START);
    expectWidthSafe(lines, 4);
  });

  test("renders scroll indicators when visual layout exceeds viewport", () => {
    const lines = renderVisual({
      lines: ["one", "two", "three", "four", "five", "six", "seven", "eight"],
      cursor: p(2, 0),
      visualAnchor: p(0, 0),
      mode: "visualLine",
      width: 12,
      terminalRows: 6,
    });

    const output = lines.join("\n");
    expect(output).toContain("↑");
    expect(output).toContain("↓");
    expectWidthSafe(lines, 12);
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
