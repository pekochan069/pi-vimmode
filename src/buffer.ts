import type { EditResult, LineRange, Position, TextRange, VimRegister } from "./types.ts";

export function splitText(text: string): string[] {
  const lines = text.split("\n");
  return lines.length === 0 ? [""] : lines;
}

export function joinLines(lines: string[]): string {
  return (lines.length === 0 ? [""] : lines).join("\n");
}

export function clampPosition(lines: string[], position: Position): Position {
  const safeLines = lines.length === 0 ? [""] : lines;
  const line = Math.max(0, Math.min(position.line, safeLines.length - 1));
  const length = safeLines[line]?.length ?? 0;
  const col = Math.max(0, Math.min(position.col, length));
  return { line, col };
}

export function comparePositions(a: Position, b: Position): number {
  if (a.line !== b.line) return a.line - b.line;
  return a.col - b.col;
}

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

export function yankLine(text: string, cursor: Position): VimRegister {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  return { type: "line", text: lines[pos.line] ?? "" };
}

export function yankLineRange(text: string, anchor: Position, active: Position): VimRegister {
  return { type: "line", text: linewiseSelectionText(text, anchor, active) };
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
