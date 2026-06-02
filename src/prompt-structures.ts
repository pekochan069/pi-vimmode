import type { Position, PromptStructureTarget, VimTextObjectKind } from "./types.ts";

export type PromptStructureRequest = {
  kind: VimTextObjectKind;
  target: PromptStructureTarget;
};

export type PromptStructureRange = {
  start: number;
  endExclusive: number;
};

type LineInfo = { text: string; start: number; end: number };

type TagToken = { name: string; opening: boolean; start: number; end: number };

type TagPair = {
  openStart: number;
  openEnd: number;
  closeStart: number;
  closeEnd: number;
};

function splitLines(text: string): string[] {
  const lines = text.split("\n");
  return lines.length === 0 ? [""] : lines;
}

function lineInfos(text: string): LineInfo[] {
  const lines = splitLines(text);
  const infos: LineInfo[] = [];
  let start = 0;
  for (const line of lines) {
    infos.push({ text: line, start, end: start + line.length });
    start += line.length + 1;
  }
  return infos;
}

function positionToOffset(text: string, position: Position): number {
  const infos = lineInfos(text);
  const line = Math.max(0, Math.min(position.line, infos.length - 1));
  const info = infos[line] ?? { text: "", start: 0, end: 0 };
  const col = Math.max(0, Math.min(position.col, info.text.length));
  return info.start + col;
}

function cursorLine(text: string, cursor: Position): number {
  const infos = lineInfos(text);
  return Math.max(0, Math.min(cursor.line, infos.length - 1));
}

function isNonEmpty(range: PromptStructureRange | undefined): range is PromptStructureRange {
  return Boolean(range && range.start < range.endExclusive);
}

function lineRange(
  infos: LineInfo[],
  startLine: number,
  endLine: number,
): PromptStructureRange | undefined {
  if (startLine < 0 || endLine < startLine || endLine >= infos.length) return undefined;
  const start = infos[startLine]?.start ?? 0;
  const endExclusive = infos[endLine]?.end ?? start;
  return isNonEmpty({ start, endExclusive }) ? { start, endExclusive } : undefined;
}

function fenceMarker(line: string): string | undefined {
  const match = /^\s*(```|~~~)/.exec(line);
  return match?.[1];
}

function resolveCodeFence(
  text: string,
  cursor: Position,
  kind: VimTextObjectKind,
): PromptStructureRange | undefined {
  const infos = lineInfos(text);
  const line = cursorLine(text, cursor);
  let openLine: number | undefined;
  let marker: string | undefined;

  for (let index = line; index >= 0; index--) {
    const found = fenceMarker(infos[index]?.text ?? "");
    if (!found) continue;
    let earlierOpen = false;
    for (let prior = index - 1; prior >= 0; prior--) {
      if (fenceMarker(infos[prior]?.text ?? "") === found) earlierOpen = !earlierOpen;
    }
    if (!earlierOpen) {
      openLine = index;
      marker = found;
      break;
    }
  }

  if (openLine === undefined || marker === undefined) return undefined;
  let closeLine: number | undefined;
  for (let index = openLine + 1; index < infos.length; index++) {
    if (fenceMarker(infos[index]?.text ?? "") === marker) {
      closeLine = index;
      break;
    }
  }
  if (closeLine === undefined || line < openLine || line > closeLine) return undefined;
  return kind === "around"
    ? lineRange(infos, openLine, closeLine)
    : lineRange(infos, openLine + 1, closeLine - 1);
}

function headingLevel(line: string): number | undefined {
  const match = /^(#{1,6})\s+/.exec(line);
  return match?.[1]?.length;
}

function resolveHeadingSection(
  text: string,
  cursor: Position,
  kind: VimTextObjectKind,
): PromptStructureRange | undefined {
  const infos = lineInfos(text);
  const line = cursorLine(text, cursor);
  let headingLine: number | undefined;
  let level: number | undefined;

  for (let index = line; index >= 0; index--) {
    const found = headingLevel(infos[index]?.text ?? "");
    if (found !== undefined) {
      headingLine = index;
      level = found;
      break;
    }
  }
  if (headingLine === undefined || level === undefined) return undefined;

  let endLine = infos.length - 1;
  for (let index = headingLine + 1; index < infos.length; index++) {
    const found = headingLevel(infos[index]?.text ?? "");
    if (found !== undefined && found <= level) {
      endLine = index - 1;
      break;
    }
  }
  if (line > endLine) return undefined;
  return kind === "around"
    ? lineRange(infos, headingLine, endLine)
    : lineRange(infos, headingLine + 1, endLine);
}

function listMarker(line: string): { indent: number; markerEnd: number } | undefined {
  const match = /^(\s*)(?:[-+*]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/.exec(line);
  if (!match) return undefined;
  return { indent: match[1]?.length ?? 0, markerEnd: match[0].length };
}

function resolveListItem(
  text: string,
  cursor: Position,
  kind: VimTextObjectKind,
): PromptStructureRange | undefined {
  const infos = lineInfos(text);
  const line = cursorLine(text, cursor);
  let startLine: number | undefined;
  let marker: { indent: number; markerEnd: number } | undefined;

  for (let index = line; index >= 0; index--) {
    const found = listMarker(infos[index]?.text ?? "");
    if (found) {
      startLine = index;
      marker = found;
      break;
    }
    if ((infos[index]?.text ?? "").trim().length === 0) return undefined;
  }
  if (startLine === undefined || !marker) return undefined;

  let endLine = startLine;
  for (let index = startLine + 1; index < infos.length; index++) {
    const textLine = infos[index]?.text ?? "";
    const found = listMarker(textLine);
    const indentation = /^\s*/.exec(textLine)?.[0].length ?? 0;
    if (found && found.indent <= marker.indent) break;
    if (textLine.trim().length === 0 || indentation <= marker.indent) break;
    endLine = index;
  }
  if (line > endLine) return undefined;
  if (kind === "around") return lineRange(infos, startLine, endLine);
  const start = (infos[startLine]?.start ?? 0) + marker.markerEnd;
  const endExclusive = infos[endLine]?.end ?? start;
  return isNonEmpty({ start, endExclusive }) ? { start, endExclusive } : undefined;
}

function tagTokens(text: string): TagToken[] {
  const tokens: TagToken[] = [];
  const regex = /<\/?([A-Za-z][A-Za-z0-9:_-]*)(?:\s[^<>]*)?>/g;
  for (const match of text.matchAll(regex)) {
    const raw = match[0];
    if (raw.endsWith("/>")) continue;
    const index = match.index ?? 0;
    tokens.push({
      name: match[1] ?? "",
      opening: !raw.startsWith("</"),
      start: index,
      end: index + raw.length,
    });
  }
  return tokens;
}

function tagPairs(text: string): TagPair[] {
  const stack: TagToken[] = [];
  const pairs: TagPair[] = [];
  for (const token of tagTokens(text)) {
    if (token.opening) {
      stack.push(token);
      continue;
    }
    const open = stack.at(-1);
    if (!open) continue;
    if (open.name !== token.name) {
      stack.length = 0;
      continue;
    }
    stack.pop();
    pairs.push({
      openStart: open.start,
      openEnd: open.end,
      closeStart: token.start,
      closeEnd: token.end,
    });
  }
  return pairs;
}

function resolveTag(
  text: string,
  cursor: Position,
  kind: VimTextObjectKind,
): PromptStructureRange | undefined {
  const offset = positionToOffset(text, cursor);
  const containing = tagPairs(text)
    .filter((pair) => offset >= pair.openStart && offset < pair.closeEnd)
    .sort((a, b) => a.closeEnd - a.openStart - (b.closeEnd - b.openStart))[0];
  if (!containing) return undefined;
  const range =
    kind === "around"
      ? { start: containing.openStart, endExclusive: containing.closeEnd }
      : { start: containing.openEnd, endExclusive: containing.closeStart };
  return isNonEmpty(range) ? range : undefined;
}

export function isErrorBlockLine(line: string): boolean {
  return (
    /(?:error|exception|traceback|panic|fatal|failed|failure)/i.test(line) ||
    /^\s+at\s+\S+/.test(line) ||
    /^\s*File "[^"]+", line \d+/.test(line) ||
    /^\s*(ERROR|WARN|FATAL|FAIL)\b/.test(line) ||
    /\b[\w./-]+\.(?:ts|tsx|js|jsx|py|rs|go|rb|java):\d+(?::\d+)?\b/.test(line)
  );
}

function isErrorContinuation(line: string): boolean {
  return /^\s+\S/.test(line) && !/^\s*[-+*]\s+/.test(line);
}

function resolveErrorBlock(text: string, cursor: Position): PromptStructureRange | undefined {
  const infos = lineInfos(text);
  const line = cursorLine(text, cursor);
  const current = infos[line]?.text ?? "";
  if (!isErrorBlockLine(current) && !isErrorContinuation(current)) return undefined;

  let startLine = line;
  while (startLine > 0) {
    const previous = infos[startLine - 1]?.text ?? "";
    if (previous.trim().length === 0) break;
    if (!isErrorBlockLine(previous) && !isErrorContinuation(previous)) break;
    startLine--;
  }

  let endLine = line;
  while (endLine + 1 < infos.length) {
    const next = infos[endLine + 1]?.text ?? "";
    if (next.trim().length === 0) break;
    if (!isErrorBlockLine(next) && !isErrorContinuation(next)) break;
    endLine++;
  }

  const containsStrongErrorLine = infos
    .slice(startLine, endLine + 1)
    .some((info) => isErrorBlockLine(info.text));
  return containsStrongErrorLine ? lineRange(infos, startLine, endLine) : undefined;
}

export function resolvePromptStructureRange(
  text: string,
  cursor: Position,
  request: PromptStructureRequest,
): PromptStructureRange | undefined {
  switch (request.target) {
    case "codeFence":
      return resolveCodeFence(text, cursor, request.kind);
    case "headingSection":
      return resolveHeadingSection(text, cursor, request.kind);
    case "listItem":
      return resolveListItem(text, cursor, request.kind);
    case "tag":
      return resolveTag(text, cursor, request.kind);
    case "errorBlock":
      return resolveErrorBlock(text, cursor);
  }
}
