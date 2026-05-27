import type {
  EditResult,
  LineRange,
  Position,
  TextRange,
  VimMotion,
  VimRegister,
} from "./types.ts";

export type BufferNavigationTarget = "start" | "end" | "firstNonBlank" | "matchingPair";
export type VisualSelectionKind = "char" | "line";
export type VisualSelectionMode = "visual" | "visualLine";

function splitText(text: string): string[] {
  const lines = text.split("\n");
  return lines.length === 0 ? [""] : lines;
}

function joinLines(lines: string[]): string {
  return (lines.length === 0 ? [""] : lines).join("\n");
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

function firstNonBlankColumn(line: string): number {
  const match = /\S/.exec(line);
  return match?.index ?? 0;
}

function lineStartOffsets(lines: string[]): number[] {
  const starts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    starts.push(offset);
    offset += line.length + 1;
  }
  return starts;
}

function positionToOffset(text: string, position: Position): number {
  const lines = splitText(text);
  const pos = clampPosition(lines, position);
  const starts = lineStartOffsets(lines);
  return (starts[pos.line] ?? 0) + pos.col;
}

function offsetToPosition(text: string, offset: number): Position {
  const safeOffset = Math.max(0, Math.min(offset, text.length));
  const lines = splitText(text);
  let consumed = 0;

  for (let line = 0; line < lines.length; line++) {
    const length = lines[line]?.length ?? 0;
    if (safeOffset <= consumed + length) return { line, col: safeOffset - consumed };
    consumed += length + 1;
  }

  const lastLine = Math.max(0, lines.length - 1);
  return { line: lastLine, col: lines[lastLine]?.length ?? 0 };
}

function lineBoundsForPosition(
  text: string,
  position: Position,
): { start: number; end: number; line: string } {
  const lines = splitText(text);
  const pos = clampPosition(lines, position);
  const starts = lineStartOffsets(lines);
  const line = lines[pos.line] ?? "";
  const start = starts[pos.line] ?? 0;
  return { start, end: start + line.length, line };
}

function isWhitespace(char: string | undefined): boolean {
  return char === undefined || /\s/.test(char);
}

function nextWordStartOffset(text: string, offset: number): number {
  let index = Math.max(0, Math.min(offset, text.length));
  if (index >= text.length) return index;

  if (!isWhitespace(text[index])) {
    while (index < text.length && !isWhitespace(text[index])) index++;
  }

  while (index < text.length && isWhitespace(text[index])) index++;
  return index;
}

function previousWordStartOffset(text: string, offset: number): number {
  let index = Math.max(0, Math.min(offset, text.length));
  if (index === 0) return 0;

  index--;
  while (index > 0 && isWhitespace(text[index])) index--;
  while (index > 0 && !isWhitespace(text[index - 1])) index--;
  return index;
}

function orderedOffsetRange(
  start: number,
  end: number,
): { start: number; end: number } | undefined {
  const ordered = { start: Math.min(start, end), end: Math.max(start, end) };
  return ordered.start === ordered.end ? undefined : ordered;
}

function motionOffsetRange(
  text: string,
  cursor: Position,
  motion: VimMotion,
): { start: number; end: number } | undefined {
  const current = positionToOffset(text, cursor);
  const bounds = lineBoundsForPosition(text, cursor);

  if (motion === "$") return orderedOffsetRange(current, bounds.end);
  if (motion === "0") return orderedOffsetRange(bounds.start, current);
  if (motion === "^") {
    const target = bounds.start + firstNonBlankColumn(bounds.line);
    return orderedOffsetRange(current, target);
  }
  if (motion === "w") return orderedOffsetRange(current, nextWordStartOffset(text, current));
  return orderedOffsetRange(previousWordStartOffset(text, current), current);
}

function deleteOffsetRange(text: string, start: number, end: number): EditResult {
  const range = orderedOffsetRange(start, end);
  if (!range) return { text, cursor: offsetToPosition(text, start), changed: false };

  const removed = text.slice(range.start, range.end);
  if (removed.length === 0)
    return { text, cursor: offsetToPosition(text, range.start), changed: false };

  const nextText = text.slice(0, range.start) + text.slice(range.end);
  return {
    text: nextText,
    cursor: offsetToPosition(nextText, range.start),
    register: { type: "char", text: removed },
    changed: nextText !== text,
  };
}

export function bufferStartPosition(): Position {
  return { line: 0, col: 0 };
}

export function bufferEndPosition(text: string): Position {
  const lines = splitText(text);
  const line = Math.max(0, lines.length - 1);
  return { line, col: lines[line]?.length ?? 0 };
}

export function firstNonBlankPosition(text: string, cursor: Position): Position {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  return { line: pos.line, col: firstNonBlankColumn(lines[pos.line] ?? "") };
}

const OPEN_TO_CLOSE: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const CLOSE_TO_OPEN: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

function isPairChar(char: string | undefined): boolean {
  return (
    char !== undefined && (OPEN_TO_CLOSE[char] !== undefined || CLOSE_TO_OPEN[char] !== undefined)
  );
}

function bracketAtOrAfterCursorOnLine(text: string, cursor: Position): number | undefined {
  const start = positionToOffset(text, cursor);
  const { end } = lineBoundsForPosition(text, cursor);
  for (let offset = start; offset < end; offset++) {
    if (isPairChar(text[offset])) return offset;
  }
  return undefined;
}

export function matchingPairPosition(text: string, cursor: Position): Position | undefined {
  const bracketOffset = bracketAtOrAfterCursorOnLine(text, cursor);
  if (bracketOffset === undefined) return undefined;

  const bracket = text[bracketOffset];
  if (!bracket) return undefined;

  const close = OPEN_TO_CLOSE[bracket];
  if (close) {
    let depth = 0;
    for (let offset = bracketOffset; offset < text.length; offset++) {
      const char = text[offset];
      if (char === bracket) depth++;
      if (char === close) depth--;
      if (depth === 0) return offsetToPosition(text, offset);
    }
    return undefined;
  }

  const open = CLOSE_TO_OPEN[bracket];
  if (!open) return undefined;

  let depth = 0;
  for (let offset = bracketOffset; offset >= 0; offset--) {
    const char = text[offset];
    if (char === bracket) depth++;
    if (char === open) depth--;
    if (depth === 0) return offsetToPosition(text, offset);
  }

  return undefined;
}

export function normalizeBufferPosition(text: string, cursor: Position): Position {
  return clampPosition(splitText(text), cursor);
}

export function navigateBuffer(
  text: string,
  cursor: Position,
  target: "matchingPair",
): Position | undefined;
export function navigateBuffer(
  text: string,
  cursor: Position,
  target: Exclude<BufferNavigationTarget, "matchingPair">,
): Position;
export function navigateBuffer(
  text: string,
  cursor: Position,
  target: BufferNavigationTarget,
): Position | undefined;
export function navigateBuffer(
  text: string,
  cursor: Position,
  target: BufferNavigationTarget,
): Position | undefined {
  switch (target) {
    case "start":
      return bufferStartPosition();
    case "end":
      return bufferEndPosition(text);
    case "firstNonBlank":
      return firstNonBlankPosition(text, cursor);
    case "matchingPair":
      return matchingPairPosition(text, cursor);
  }
}

function normalizeRange(lines: string[], anchor: Position, active: Position): TextRange {
  const a = clampPosition(lines, anchor);
  const b = clampPosition(lines, active);
  return comparePositions(a, b) <= 0 ? { start: a, end: b } : { start: b, end: a };
}

function normalizeLineRange(lines: string[], anchor: Position, active: Position): LineRange {
  const a = clampPosition(lines, anchor);
  const b = clampPosition(lines, active);
  return {
    startLine: Math.min(a.line, b.line),
    endLine: Math.max(a.line, b.line),
  };
}

function selectionText(text: string, anchor: Position, active: Position): string {
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

function linewiseSelectionText(text: string, anchor: Position, active: Position): string {
  const lines = splitText(text);
  const range = normalizeLineRange(lines, anchor, active);
  return lines.slice(range.startLine, range.endLine + 1).join("\n");
}

export function deleteRange(text: string, anchor: Position, active: Position): EditResult {
  const lines = splitText(text);
  const range = normalizeRange(lines, anchor, active);
  const selected = selectionText(text, range.start, range.end);
  if (selected.length === 0) {
    return { text, cursor: range.start, changed: false };
  }

  const { start, end } = range;
  let nextLines: string[];
  let cursor: Position;

  if (start.line === end.line) {
    const line = lines[start.line] ?? "";
    const endExclusive = Math.min(end.col + 1, line.length);
    const nextLine = line.slice(0, start.col) + line.slice(endExclusive);
    nextLines = [...lines.slice(0, start.line), nextLine, ...lines.slice(start.line + 1)];
    cursor = { line: start.line, col: Math.min(start.col, nextLine.length) };
  } else {
    const first = lines[start.line] ?? "";
    const last = lines[end.line] ?? "";
    const endExclusive = Math.min(end.col + 1, last.length);
    const merged = first.slice(0, start.col) + last.slice(endExclusive);
    nextLines = [...lines.slice(0, start.line), merged, ...lines.slice(end.line + 1)];
    cursor = { line: start.line, col: Math.min(start.col, merged.length) };
  }

  if (nextLines.length === 0) nextLines = [""];
  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: clampPosition(nextLines, cursor),
    register: { type: "char", text: selected },
    changed: nextText !== text,
  };
}

export function deleteLineRange(text: string, anchor: Position, active: Position): EditResult {
  const lines = splitText(text);
  const range = normalizeLineRange(lines, anchor, active);
  const selected = linewiseSelectionText(text, anchor, active);

  if (lines.length === 1) {
    return {
      text: "",
      cursor: { line: 0, col: 0 },
      register: { type: "line", text: selected },
      changed: text !== "",
    };
  }

  let nextLines = [...lines.slice(0, range.startLine), ...lines.slice(range.endLine + 1)];
  if (nextLines.length === 0) nextLines = [""];
  const cursorLine = Math.min(range.startLine, nextLines.length - 1);
  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: { line: cursorLine, col: 0 },
    register: { type: "line", text: selected },
    changed: nextText !== text,
  };
}

export function deleteCharAt(text: string, cursor: Position): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const line = lines[pos.line] ?? "";
  if (pos.col >= line.length) {
    return { text, cursor: pos, changed: false };
  }
  return deleteRange(text, pos, pos);
}

export function deleteByMotion(text: string, cursor: Position, motion: VimMotion): EditResult {
  const range = motionOffsetRange(text, cursor, motion);
  if (!range) return { text, cursor: clampPosition(splitText(text), cursor), changed: false };
  return deleteOffsetRange(text, range.start, range.end);
}

export function yankByMotion(
  text: string,
  cursor: Position,
  motion: VimMotion,
): VimRegister | undefined {
  const range = motionOffsetRange(text, cursor, motion);
  if (!range) return undefined;
  const selected = text.slice(range.start, range.end);
  if (selected.length === 0) return undefined;
  return { type: "char", text: selected };
}

export function yankLine(text: string, cursor: Position): VimRegister {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  return { type: "line", text: lines[pos.line] ?? "" };
}

export function yankLineRange(text: string, anchor: Position, active: Position): VimRegister {
  return { type: "line", text: linewiseSelectionText(text, anchor, active) };
}

export function yankVisualSelection(
  text: string,
  anchor: Position,
  active: Position,
  kind: VisualSelectionKind,
): VimRegister | undefined {
  if (kind === "line") return yankLineRange(text, anchor, active);

  const selected = selectionText(text, anchor, active);
  return selected.length > 0 ? { type: "char", text: selected } : undefined;
}

export function visualSelectionText(
  text: string,
  anchor: Position,
  active: Position,
  kind: VisualSelectionKind,
): string {
  return kind === "line"
    ? linewiseSelectionText(text, anchor, active)
    : selectionText(text, anchor, active);
}

export function deleteLine(text: string, cursor: Position): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const removed = lines[pos.line] ?? "";

  if (lines.length === 1) {
    return {
      text: "",
      cursor: { line: 0, col: 0 },
      register: { type: "line", text: removed },
      changed: text !== "",
    };
  }

  const nextLines = [...lines.slice(0, pos.line), ...lines.slice(pos.line + 1)];
  const nextLine = Math.min(pos.line, nextLines.length - 1);
  const nextCursor = clampPosition(nextLines, { line: nextLine, col: pos.col });
  return {
    text: joinLines(nextLines),
    cursor: nextCursor,
    register: { type: "line", text: removed },
    changed: true,
  };
}

export function changeLine(text: string, cursor: Position): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const removed = lines[pos.line] ?? "";
  const nextLines = [...lines];
  nextLines[pos.line] = "";
  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: { line: pos.line, col: 0 },
    register: { type: "line", text: removed },
    changed: nextText !== text,
  };
}

export function openLineBelow(text: string, cursor: Position): EditResult {
  if (text.length === 0) return { text, cursor: { line: 0, col: 0 }, changed: false };
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const nextLines = [...lines.slice(0, pos.line + 1), "", ...lines.slice(pos.line + 1)];
  return {
    text: joinLines(nextLines),
    cursor: { line: pos.line + 1, col: 0 },
    changed: true,
  };
}

export function openLineAbove(text: string, cursor: Position): EditResult {
  if (text.length === 0) return { text, cursor: { line: 0, col: 0 }, changed: false };
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const nextLines = [...lines.slice(0, pos.line), "", ...lines.slice(pos.line)];
  return {
    text: joinLines(nextLines),
    cursor: { line: pos.line, col: 0 },
    changed: true,
  };
}

export function joinLineWithNext(text: string, cursor: Position): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  if (pos.line >= lines.length - 1) return { text, cursor: pos, changed: false };

  const left = (lines[pos.line] ?? "").trimEnd();
  const right = (lines[pos.line + 1] ?? "").trimStart();
  const separator = left.length > 0 && right.length > 0 ? " " : "";
  const joined = `${left}${separator}${right}`;
  const nextLines = [...lines.slice(0, pos.line), joined, ...lines.slice(pos.line + 2)];

  return {
    text: joinLines(nextLines),
    cursor: { line: pos.line, col: left.length },
    changed: true,
  };
}

export function pasteRegister(
  text: string,
  cursor: Position,
  register: VimRegister | undefined,
): EditResult {
  if (!register || register.text.length === 0) {
    return { text, cursor: clampPosition(splitText(text), cursor), changed: false };
  }

  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);

  if (register.type === "line") {
    const inserted = register.text.split("\n");
    const nextLines = [...lines.slice(0, pos.line + 1), ...inserted, ...lines.slice(pos.line + 1)];
    return {
      text: joinLines(nextLines),
      cursor: { line: pos.line + 1, col: 0 },
      changed: true,
    };
  }

  const line = lines[pos.line] ?? "";
  const insertCol = line.length === 0 ? 0 : Math.min(pos.col + 1, line.length);
  const before = line.slice(0, insertCol);
  const after = line.slice(insertCol);
  const insertedLines = register.text.split("\n");
  let nextLines: string[];
  let nextCursor: Position;

  if (insertedLines.length === 1) {
    const inserted = insertedLines[0] ?? "";
    nextLines = [...lines];
    nextLines[pos.line] = before + inserted + after;
    nextCursor = { line: pos.line, col: insertCol + inserted.length - 1 };
  } else {
    const firstInserted = insertedLines[0] ?? "";
    const lastInserted = insertedLines[insertedLines.length - 1] ?? "";
    const middle = insertedLines.slice(1, -1);
    nextLines = [
      ...lines.slice(0, pos.line),
      before + firstInserted,
      ...middle,
      lastInserted + after,
      ...lines.slice(pos.line + 1),
    ];
    nextCursor = {
      line: pos.line + insertedLines.length - 1,
      col: Math.max(0, lastInserted.length - 1),
    };
  }

  return {
    text: joinLines(nextLines),
    cursor: clampPosition(nextLines, nextCursor),
    changed: true,
  };
}

export function pasteRegisterBefore(
  text: string,
  cursor: Position,
  register: VimRegister | undefined,
): EditResult {
  if (!register || register.text.length === 0) {
    return { text, cursor: clampPosition(splitText(text), cursor), changed: false };
  }

  if (register.type === "line" && text.length === 0) {
    return { text: register.text, cursor: { line: 0, col: 0 }, changed: true };
  }

  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);

  if (register.type === "line") {
    const inserted = register.text.split("\n");
    const nextLines = [...lines.slice(0, pos.line), ...inserted, ...lines.slice(pos.line)];
    return {
      text: joinLines(nextLines),
      cursor: { line: pos.line, col: 0 },
      changed: true,
    };
  }

  const line = lines[pos.line] ?? "";
  const insertCol = Math.min(pos.col, line.length);
  const before = line.slice(0, insertCol);
  const after = line.slice(insertCol);
  const insertedLines = register.text.split("\n");
  let nextLines: string[];

  if (insertedLines.length === 1) {
    const inserted = insertedLines[0] ?? "";
    nextLines = [...lines];
    nextLines[pos.line] = before + inserted + after;
  } else {
    const firstInserted = insertedLines[0] ?? "";
    const lastInserted = insertedLines[insertedLines.length - 1] ?? "";
    const middle = insertedLines.slice(1, -1);
    nextLines = [
      ...lines.slice(0, pos.line),
      before + firstInserted,
      ...middle,
      lastInserted + after,
      ...lines.slice(pos.line + 1),
    ];
  }

  return {
    text: joinLines(nextLines),
    cursor: { line: pos.line, col: insertCol },
    changed: true,
  };
}

export function isVisualCellSelected(
  mode: VisualSelectionMode,
  lines: string[],
  anchor: Position,
  cursor: Position,
  lineIndex: number,
  col: number,
): boolean {
  if (mode === "visualLine") return isVisualLineSelected(mode, lines, anchor, cursor, lineIndex);

  const range = normalizeRange(lines, anchor, cursor);
  const pos = { line: lineIndex, col };
  return comparePositions(pos, range.start) >= 0 && comparePositions(pos, range.end) <= 0;
}

export function isVisualLineSelected(
  mode: VisualSelectionMode,
  lines: string[],
  anchor: Position,
  cursor: Position,
  lineIndex: number,
): boolean {
  if (mode !== "visualLine") return false;
  const range = normalizeLineRange(lines, anchor, cursor);
  return lineIndex >= range.startLine && lineIndex <= range.endLine;
}

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
