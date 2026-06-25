import type { BlockRange } from "./range.ts";
import type { LineRange, Position, TextRange } from "./types.ts";

// ── text primitives (ponytail: local copies; general text layer stays in buffer.ts) ──

function splitText(text: string): string[] {
  const lines = text.split("\n");
  return lines.length === 0 ? [""] : lines;
}

function clampPosition(lines: string[], position: Position): Position {
  const safeLines = lines.length === 0 ? [""] : lines;
  const line = Math.max(0, Math.min(position.line, safeLines.length - 1));
  const length = safeLines[line]?.length ?? 0;
  const col = Math.max(0, Math.min(position.col, length));
  return { line, col };
}

function comparePositions(a: Position, b: Position): number {
  if (a.line !== b.line) return a.line - b.line;
  return a.col - b.col;
}

// ── range normalization ──

export function normalizeRange(lines: string[], anchor: Position, active: Position): TextRange {
  const a = clampPosition(lines, anchor);
  const b = clampPosition(lines, active);
  return comparePositions(a, b) <= 0 ? { start: a, end: b } : { start: b, end: a };
}

export function normalizeLineRange(lines: string[], anchor: Position, active: Position): LineRange {
  const a = clampPosition(lines, anchor);
  const b = clampPosition(lines, active);
  return {
    startLine: Math.min(a.line, b.line),
    endLine: Math.max(a.line, b.line),
  };
}

export function normalizeBlockRange(
  lines: string[],
  anchor: Position,
  active: Position,
): BlockRange {
  const a = clampPosition(lines, anchor);
  const b = clampPosition(lines, active);
  return {
    startLine: Math.min(a.line, b.line),
    endLine: Math.max(a.line, b.line),
    startCol: Math.min(a.col, b.col),
    endCol: Math.max(a.col, b.col),
  };
}

// ── selected text extraction ──

export function selectionText(text: string, anchor: Position, active: Position): string {
  const lines = splitText(text);
  const range = normalizeRange(lines, anchor, active);
  const { start, end } = range;

  if (start.line === end.line) {
    const line = lines[start.line] ?? "";
    const endExclusive = Math.min(end.col + 1, line.length);
    return line.slice(start.col, endExclusive);
  }

  const selected: string[] = [];
  const first = lines[start.line] ?? "";
  selected.push(first.slice(start.col));

  for (let line = start.line + 1; line < end.line; line++) {
    selected.push(lines[line] ?? "");
  }

  const last = lines[end.line] ?? "";
  selected.push(last.slice(0, Math.min(end.col + 1, last.length)));
  return selected.join("\n");
}

export function linewiseSelectionText(text: string, anchor: Position, active: Position): string {
  const lines = splitText(text);
  const range = normalizeLineRange(lines, anchor, active);
  return lines.slice(range.startLine, range.endLine + 1).join("\n");
}

export function blockSelectionText(text: string, anchor: Position, active: Position): string {
  const lines = splitText(text);
  const range = normalizeBlockRange(lines, anchor, active);
  const selected: string[] = [];

  for (let lineIndex = range.startLine; lineIndex <= range.endLine; lineIndex++) {
    const line = lines[lineIndex] ?? "";
    const start = Math.min(range.startCol, line.length);
    const end = Math.min(range.endCol + 1, line.length);
    selected.push(line.slice(start, end));
  }

  return selected.join("\n");
}

// ── visual selection queries ──

export type VisualSelectionKind = "char" | "line" | "block";
export type VisualSelectionMode = "visual" | "visualLine" | "visualBlock";

export function isVisualCellSelected(
  mode: VisualSelectionMode,
  lines: string[],
  anchor: Position,
  cursor: Position,
  lineIndex: number,
  col: number,
): boolean {
  if (mode === "visualLine") return isVisualLineSelected(mode, lines, anchor, cursor, lineIndex);
  if (mode === "visualBlock") {
    const range = normalizeBlockRange(lines, anchor, cursor);
    return (
      lineIndex >= range.startLine &&
      lineIndex <= range.endLine &&
      col >= range.startCol &&
      col <= range.endCol
    );
  }

  const range = normalizeRange(lines, anchor, cursor);
  const pos = { line: lineIndex, col };
  return comparePositions(pos, range.start) >= 0 && comparePositions(pos, range.end) <= 0;
}

export function isVisualLineSelected(
  mode: VisualSelectionMode,
  _lines: string[],
  anchor: Position,
  cursor: Position,
  lineIndex: number,
): boolean {
  if (mode !== "visualLine") return false;
  const range = normalizeLineRange(_lines, anchor, cursor);
  return lineIndex >= range.startLine && lineIndex <= range.endLine;
}

// ── visual summaries ──

export function visualSelectionSummary(text: string, anchor: Position, active: Position): string {
  const selected = selectionText(text, anchor, active);
  if (selected.length === 0) return "0 chars";
  const lines = selected.split("\n");
  if (lines.length > 1) return `${lines.length} lines`;
  return `${selected.length} chars`;
}

export function visualLineSelectionSummary(
  text: string,
  anchor: Position,
  active: Position,
): string {
  const lines = splitText(text);
  const range = normalizeLineRange(lines, anchor, active);
  const count = range.endLine - range.startLine + 1;
  return `${count} ${count === 1 ? "line" : "lines"}`;
}

// ── visual edit target helpers ──

export function visualSelectionText(
  text: string,
  anchor: Position,
  active: Position,
  kind: VisualSelectionKind,
): string {
  if (kind === "line") return linewiseSelectionText(text, anchor, active);
  if (kind === "block") return blockSelectionText(text, anchor, active);
  return selectionText(text, anchor, active);
}

export function visualBlockSelectionSummary(
  text: string,
  anchor: Position,
  active: Position,
): string {
  const lines = splitText(text);
  const range = normalizeBlockRange(lines, anchor, active);
  const lineCount = range.endLine - range.startLine + 1;
  const colCount = range.endCol - range.startCol + 1;
  return `${lineCount}x${colCount} block`;
}

export function linewiseVisualRange(
  text: string,
  anchor: Position,
  active: Position,
): { text: string; startLine: number; endLine: number } {
  const lines = splitText(text);
  const range = normalizeLineRange(lines, anchor, active);
  return {
    text: lines.slice(range.startLine, range.endLine + 1).join("\n"),
    startLine: range.startLine,
    endLine: range.endLine,
  };
}
