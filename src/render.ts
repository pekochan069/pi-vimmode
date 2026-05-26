import { CURSOR_MARKER, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

import type { CursorStyle, Position, VimMode } from "./types.ts";

import { normalizeLineRange, normalizeRange } from "./buffer.ts";

export const SELECTION_START = "\x1b[7m";
export const CURSOR_BLOCK_START = "\x1b[4;7m";
export const CURSOR_UNDERLINE_START = "\x1b[4m";
export const CURSOR_BAR_START = "\x1b[1m";
export const ANSI_RESET = "\x1b[0m";

const BAR_CURSOR_GLYPH = "▌";

type TextChunk = {
  text: string;
  startIndex: number;
  endIndex: number;
};

type LayoutLine = {
  lineIndex: number;
  text: string;
  startIndex: number;
  endIndex: number;
  isLastChunk: boolean;
};

export type VisualRenderOptions = {
  lines: string[];
  cursor: Position;
  mode: Extract<VimMode, "visual" | "visualLine">;
  visualAnchor: Position;
  cursorStyle: CursorStyle;
  width: number;
  terminalRows?: number;
  focused?: boolean;
  borderColor?: (text: string) => string;
};

function styleSelection(text: string): string {
  return `${SELECTION_START}${text}${ANSI_RESET}`;
}

export function renderCursorCell(cell: string, style: CursorStyle): string {
  const safeCell = cell.length > 0 ? cell : " ";
  switch (style) {
    case "bar":
      return `${CURSOR_BAR_START}${BAR_CURSOR_GLYPH}${ANSI_RESET}`;
    case "underline":
      return `${CURSOR_UNDERLINE_START}${safeCell}${ANSI_RESET}`;
    case "block":
      return `${CURSOR_BLOCK_START}${safeCell}${ANSI_RESET}`;
  }
}

export function cursorShapeEscape(style: CursorStyle): string {
  switch (style) {
    case "block":
      return "\x1b[2 q";
    case "underline":
      return "\x1b[4 q";
    case "bar":
      return "\x1b[6 q";
  }
}

export const RESET_CURSOR_SHAPE = "\x1b[0 q";

function comparePositions(a: Position, b: Position): number {
  if (a.line !== b.line) return a.line - b.line;
  return a.col - b.col;
}

function isSelectedCell(
  mode: VimMode,
  lines: string[],
  anchor: Position,
  cursor: Position,
  lineIndex: number,
  col: number,
): boolean {
  if (mode === "visualLine") {
    const range = normalizeLineRange(lines, anchor, cursor);
    return lineIndex >= range.startLine && lineIndex <= range.endLine;
  }

  const range = normalizeRange(lines, anchor, cursor);
  const pos = { line: lineIndex, col };
  return comparePositions(pos, range.start) >= 0 && comparePositions(pos, range.end) <= 0;
}

function isLineSelected(
  mode: VimMode,
  lines: string[],
  anchor: Position,
  cursor: Position,
  lineIndex: number,
): boolean {
  if (mode !== "visualLine") return false;
  const range = normalizeLineRange(lines, anchor, cursor);
  return lineIndex >= range.startLine && lineIndex <= range.endLine;
}

function wordWrapLine(line: string, width: number): TextChunk[] {
  const chunks: TextChunk[] = [];
  let current = "";
  let currentStart = 0;
  let currentWidth = 0;
  let offset = 0;

  for (const cell of Array.from(line)) {
    const cellWidth = Math.max(1, visibleWidth(cell));
    if (current.length > 0 && currentWidth + cellWidth > width) {
      chunks.push({ text: current, startIndex: currentStart, endIndex: offset });
      current = "";
      currentStart = offset;
      currentWidth = 0;
    }

    current += cell;
    currentWidth += cellWidth;
    offset += cell.length;
  }

  if (current.length > 0) {
    chunks.push({ text: current, startIndex: currentStart, endIndex: offset });
  }

  return chunks.length === 0 ? [{ text: "", startIndex: 0, endIndex: 0 }] : chunks;
}

function safeChunks(line: string, width: number): TextChunk[] {
  if (line.length === 0) return [{ text: "", startIndex: 0, endIndex: 0 }];
  if (visibleWidth(line) <= width) return [{ text: line, startIndex: 0, endIndex: line.length }];
  return wordWrapLine(line, width);
}

function layoutLines(lines: string[], width: number): LayoutLine[] {
  const result: LayoutLine[] = [];
  const safeLines = lines.length === 0 ? [""] : lines;

  for (let lineIndex = 0; lineIndex < safeLines.length; lineIndex++) {
    const line = safeLines[lineIndex] ?? "";
    const chunks = safeChunks(line, width);
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      if (!chunk) continue;
      result.push({
        lineIndex,
        text: chunk.text,
        startIndex: chunk.startIndex,
        endIndex: chunk.endIndex,
        isLastChunk: chunkIndex === chunks.length - 1,
      });
    }
  }

  return result.length === 0
    ? [{ lineIndex: 0, text: "", startIndex: 0, endIndex: 0, isLastChunk: true }]
    : result;
}

function chunkHasCursor(chunk: LayoutLine, cursor: Position): boolean {
  if (cursor.line !== chunk.lineIndex) return false;
  if (chunk.isLastChunk) return cursor.col >= chunk.startIndex;
  return cursor.col >= chunk.startIndex && cursor.col < chunk.endIndex;
}

function renderLayoutLine(
  chunk: LayoutLine,
  options: VisualRenderOptions,
): { text: string; width: number } {
  const line = options.lines[chunk.lineIndex] ?? "";
  const marker = options.focused && chunkHasCursor(chunk, options.cursor) ? CURSOR_MARKER : "";
  let output = "";
  let renderedWidth = 0;
  let offset = 0;
  let cursorRendered = false;

  while (offset < chunk.text.length) {
    const cell = Array.from(chunk.text.slice(offset))[0] ?? "";
    const cellStart = chunk.startIndex + offset;
    const cellWidth = visibleWidth(cell);
    const isCursor = options.cursor.line === chunk.lineIndex && options.cursor.col === cellStart;

    if (isCursor) {
      output += marker + renderCursorCell(cell, options.cursorStyle);
      cursorRendered = true;
    } else if (
      isSelectedCell(
        options.mode,
        options.lines,
        options.visualAnchor,
        options.cursor,
        chunk.lineIndex,
        cellStart,
      )
    ) {
      output += styleSelection(cell);
    } else {
      output += cell;
    }

    renderedWidth += cellWidth;
    offset += cell.length;
  }

  const cursorAtEnd =
    options.cursor.line === chunk.lineIndex &&
    options.cursor.col >= chunk.endIndex &&
    chunk.isLastChunk;
  const selectedEmptyVisualLine =
    line.length === 0 &&
    isLineSelected(
      options.mode,
      options.lines,
      options.visualAnchor,
      options.cursor,
      chunk.lineIndex,
    );

  if (cursorAtEnd && !cursorRendered) {
    output += marker + renderCursorCell(" ", options.cursorStyle);
    renderedWidth += 1;
  } else if (selectedEmptyVisualLine && renderedWidth === 0) {
    output += styleSelection(" ");
    renderedWidth += 1;
  }

  return { text: output, width: renderedWidth };
}

function scrollWindow(
  layout: LayoutLine[],
  cursor: Position,
  terminalRows: number,
): { visible: LayoutLine[]; offset: number } {
  const maxVisible = Math.max(5, Math.floor(terminalRows * 0.3));
  let cursorIndex = layout.findIndex((line) => chunkHasCursor(line, cursor));
  if (cursorIndex === -1) cursorIndex = 0;
  const offset = Math.max(0, Math.min(cursorIndex, Math.max(0, layout.length - maxVisible)));
  return { visible: layout.slice(offset, offset + maxVisible), offset };
}

export function renderVisualEditor(options: VisualRenderOptions): string[] {
  if (options.width <= 0) return [];

  const borderColor = options.borderColor ?? ((text: string) => text);
  const horizontal = borderColor("─".repeat(options.width));
  const contentWidth = Math.max(1, options.width - 1);
  const layout = layoutLines(options.lines, contentWidth);
  const { visible, offset } = scrollWindow(layout, options.cursor, options.terminalRows ?? 24);
  const result: string[] = [];

  if (offset > 0) {
    const indicator = `─── ↑ ${offset} more `;
    const remaining = options.width - visibleWidth(indicator);
    result.push(
      borderColor(
        remaining >= 0
          ? indicator + "─".repeat(remaining)
          : truncateToWidth(indicator, options.width),
      ),
    );
  } else {
    result.push(horizontal);
  }

  for (const layoutLine of visible) {
    const rendered = renderLayoutLine(layoutLine, options);
    const padding = " ".repeat(Math.max(0, options.width - rendered.width));
    let line = `${rendered.text}${padding}`;
    if (visibleWidth(line) > options.width) line = truncateToWidth(line, options.width, "");
    result.push(line);
  }

  const linesBelow = layout.length - (offset + visible.length);
  if (linesBelow > 0) {
    const indicator = `─── ↓ ${linesBelow} more `;
    const remaining = options.width - visibleWidth(indicator);
    result.push(borderColor(indicator + "─".repeat(Math.max(0, remaining))));
  } else {
    result.push(horizontal);
  }

  return result;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function restyleCursorMarker(lines: string[], style: CursorStyle): string[] {
  if (style === "block") return lines;
  const marker = escapeRegExp(CURSOR_MARKER);
  const cursorPattern = new RegExp(`${marker}\\x1b\\[7m([\\s\\S]*?)\\x1b\\[0m`);
  return lines.map((line) =>
    line.replace(
      cursorPattern,
      (_match, cell: string) => `${CURSOR_MARKER}${renderCursorCell(cell, style)}`,
    ),
  );
}
