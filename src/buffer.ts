import type {
  BlockRange as ResolvedBlockRangeValue,
  ResolvedBlockRange,
  ResolvedCharacterRange,
  ResolvedDestination,
  ResolvedLineRange,
} from "./range.ts";
import type {
  EditResult,
  LineRange,
  Position,
  PromptStructureTarget,
  PromptTransform,
  ResolvedVimPromptStructures,
  TextRange,
  VimMotion,
  VimRegister,
  VimTextObject,
} from "./types.ts";

import { isErrorBlockLine, resolvePromptStructureRange } from "./prompt-structures.ts";

export type BufferNavigationTarget = "start" | "end" | "firstNonBlank" | "matchingPair";
export type VisualSelectionKind = "char" | "line" | "block";
export type VisualSelectionMode = "visual" | "visualLine" | "visualBlock";

type BlockRange = ResolvedBlockRangeValue;

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

function offsetToPositionFromLineStarts(
  lines: string[],
  starts: number[],
  offset: number,
  textLength: number,
): Position {
  const safeOffset = Math.max(0, Math.min(offset, textLength));
  let low = 0;
  let high = Math.max(0, starts.length - 1);
  let line = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if ((starts[mid] ?? 0) <= safeOffset) {
      line = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const lineStart = starts[line] ?? 0;
  const lineLength = lines[line]?.length ?? 0;
  return { line, col: Math.max(0, Math.min(safeOffset - lineStart, lineLength)) };
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

function isKeywordWordChar(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9_]/.test(char);
}

function wordKind(char: string | undefined): "keyword" | "punctuation" | "whitespace" {
  if (isWhitespace(char)) return "whitespace";
  return isKeywordWordChar(char) ? "keyword" : "punctuation";
}

type WordBoundaryModel = "small" | "big";

type WordBoundaryKind = "keyword" | "punctuation" | "word" | "whitespace";

function boundaryKind(model: WordBoundaryModel, char: string | undefined): WordBoundaryKind {
  if (model === "small") return wordKind(char);
  return isWhitespace(char) ? "whitespace" : "word";
}

function isSameBoundaryKind(
  model: WordBoundaryModel,
  left: string | undefined,
  right: string | undefined,
): boolean {
  const leftKind = boundaryKind(model, left);
  return leftKind !== "whitespace" && leftKind === boundaryKind(model, right);
}

function nextWordStartOffsetFor(model: WordBoundaryModel, text: string, offset: number): number {
  let index = Math.max(0, Math.min(offset, text.length));
  if (index >= text.length) return index;

  const kind = boundaryKind(model, text[index]);
  if (kind !== "whitespace") {
    while (index < text.length && boundaryKind(model, text[index]) === kind) index++;
  }

  while (index < text.length && isWhitespace(text[index])) index++;
  return index;
}

function nextWordStartOffset(text: string, offset: number): number {
  return nextWordStartOffsetFor("small", text, offset);
}

function nextWORDStartOffset(text: string, offset: number): number {
  return nextWordStartOffsetFor("big", text, offset);
}

function wordEndOffsetFor(model: WordBoundaryModel, text: string, offset: number): number {
  let index = Math.max(0, Math.min(offset, text.length));
  if (text.length === 0) return 0;
  if (index >= text.length) return text.length;

  if (isWhitespace(text[index])) {
    while (index < text.length && isWhitespace(text[index])) index++;
  } else if (index + 1 < text.length && isSameBoundaryKind(model, text[index], text[index + 1])) {
    const kind = boundaryKind(model, text[index]);
    while (index + 1 < text.length && boundaryKind(model, text[index + 1]) === kind) index++;
    return index;
  } else {
    index++;
  }

  while (index < text.length && isWhitespace(text[index])) index++;
  if (index >= text.length) return text.length;
  const kind = boundaryKind(model, text[index]);
  while (index + 1 < text.length && boundaryKind(model, text[index + 1]) === kind) index++;
  return index;
}

function wordEndOffset(text: string, offset: number): number {
  return wordEndOffsetFor("small", text, offset);
}

function wordEndWORDOffset(text: string, offset: number): number {
  return wordEndOffsetFor("big", text, offset);
}

function previousWordEndOffsetFor(model: WordBoundaryModel, text: string, offset: number): number {
  const current = Math.max(0, Math.min(offset, text.length));
  if (current === 0 || text.length === 0) return 0;

  let index = current - 1;
  if (current < text.length && isSameBoundaryKind(model, text[index], text[current])) {
    const kind = boundaryKind(model, text[current]);
    while (index >= 0 && boundaryKind(model, text[index]) === kind) index--;
  }
  while (index >= 0 && isWhitespace(text[index])) index--;
  return Math.max(0, index);
}

function previousWordEndOffset(text: string, offset: number): number {
  return previousWordEndOffsetFor("small", text, offset);
}

function previousWordEndWORDOffset(text: string, offset: number): number {
  return previousWordEndOffsetFor("big", text, offset);
}

function previousWordStartOffsetFor(
  model: WordBoundaryModel,
  text: string,
  offset: number,
): number {
  let index = Math.max(0, Math.min(offset, text.length));
  if (index === 0) return 0;

  index--;
  while (index > 0 && isWhitespace(text[index])) index--;
  const kind = boundaryKind(model, text[index]);
  while (index > 0 && boundaryKind(model, text[index - 1]) === kind) index--;
  return index;
}

function previousWordStartOffset(text: string, offset: number): number {
  return previousWordStartOffsetFor("small", text, offset);
}

function previousWORDStartOffset(text: string, offset: number): number {
  return previousWordStartOffsetFor("big", text, offset);
}

function orderedOffsetRange(
  start: number,
  end: number,
): { start: number; end: number } | undefined {
  const ordered = { start: Math.min(start, end), end: Math.max(start, end) };
  return ordered.start === ordered.end ? undefined : ordered;
}

function motionTargetOffset(text: string, offset: number, motion: VimMotion): number {
  const cursor = offsetToPosition(text, offset);
  const bounds = lineBoundsForPosition(text, cursor);
  if (motion === "l") return Math.min(text.length, offset + 1);
  if (motion === "h") return Math.max(0, offset - 1);
  if (motion === "$") return bounds.end;
  if (motion === "0") return bounds.start;
  if (motion === "^") return bounds.start + firstNonBlankColumn(bounds.line);
  if (motion === "w") return nextWordStartOffset(text, offset);
  if (motion === "W") return nextWORDStartOffset(text, offset);
  if (motion === "e") return wordEndOffset(text, offset);
  if (motion === "E") return wordEndWORDOffset(text, offset);
  if (motion === "ge") return previousWordEndOffset(text, offset);
  if (motion === "gE") return previousWordEndWORDOffset(text, offset);
  if (motion === "B") return previousWORDStartOffset(text, offset);
  return previousWordStartOffset(text, offset);
}

function motionOffsetRange(
  text: string,
  cursor: Position,
  motion: VimMotion,
  count = 1,
): { start: number; end: number } | undefined {
  const current = positionToOffset(text, cursor);
  if (motion === "%") {
    const target = navigateBuffer(text, cursor, "matchingPair");
    if (!target) return undefined;
    const targetOffset = positionToOffset(text, target);
    if (targetOffset === current) return undefined;
    return orderedOffsetRange(
      Math.min(current, targetOffset),
      Math.min(text.length, Math.max(current, targetOffset) + 1),
    );
  }
  let target = current;
  const repetitions = Math.max(1, count);
  for (let index = 0; index < repetitions; index++) {
    const next = motionTargetOffset(text, target, motion);
    if (next === target) break;
    target = next;
  }
  if ((motion === "e" || motion === "E") && target >= current)
    return orderedOffsetRange(current, Math.min(text.length, target + 1));
  if ((motion === "ge" || motion === "gE") && target <= current)
    return orderedOffsetRange(target, current);
  if (motion === "l" && target >= current)
    return orderedOffsetRange(current, Math.min(text.length, target));
  return orderedOffsetRange(current, target);
}

function motionLineRange(
  text: string,
  cursor: Position,
  motion: VimMotion,
  count = 1,
): LineRange | undefined {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const lastLine = Math.max(0, lines.length - 1);
  if (motion === "j") {
    const target = Math.min(lastLine, pos.line + Math.max(1, count));
    return target === pos.line ? undefined : { startLine: pos.line, endLine: target };
  }
  if (motion === "k") {
    const target = Math.max(0, pos.line - Math.max(1, count));
    return target === pos.line ? undefined : { startLine: target, endLine: pos.line };
  }
  if (motion === "gg") return pos.line === 0 ? undefined : { startLine: 0, endLine: pos.line };
  if (motion === "G")
    return pos.line === lastLine ? undefined : { startLine: pos.line, endLine: lastLine };
  return undefined;
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

export type SubstituteLineRangeOptions = {
  range: LineRange;
  pattern: string;
  replacement: string;
  global: boolean;
  ignoreCase: boolean;
  originalCursor: Position;
};

export type SubstituteLineRangeResult = {
  edit: EditResult;
  matches: number;
  ranges: TextRange[];
};

function literalIndexOf(
  line: string,
  pattern: string,
  fromIndex: number,
  ignoreCase: boolean,
): number {
  if (!ignoreCase) return line.indexOf(pattern, fromIndex);
  return line.toLocaleLowerCase().indexOf(pattern.toLocaleLowerCase(), fromIndex);
}

function substituteLineLiteral(
  line: string,
  pattern: string,
  replacement: string,
  global: boolean,
  ignoreCase: boolean,
): { line: string; matches: number; ranges: Array<{ start: number; end: number }> } {
  let nextLine = "";
  let cursor = 0;
  let matches = 0;
  const ranges: Array<{ start: number; end: number }> = [];

  while (cursor <= line.length) {
    const match = literalIndexOf(line, pattern, cursor, ignoreCase);
    if (match < 0) break;
    matches++;
    ranges.push({ start: match, end: match + pattern.length - 1 });
    nextLine += line.slice(cursor, match) + replacement;
    cursor = match + pattern.length;
    if (!global) break;
  }

  if (matches === 0) return { line, matches, ranges };
  return { line: nextLine + line.slice(cursor), matches, ranges };
}

type LineSubstitutionSuccess = {
  ok: true;
  line: string;
  matches: number;
  ranges: Array<{ start: number; end: number }>;
};

type LineSubstitutionResult = LineSubstitutionSuccess | { ok: false; message: string };

function substituteLineRange(
  text: string,
  options: SubstituteLineRangeOptions,
  substituteLine: (line: string) => LineSubstitutionResult,
): SubstituteLineRangeResult | { ok: false; message: string } {
  const lines = splitText(text);
  const startLine = Math.max(0, Math.min(options.range.startLine, lines.length - 1));
  const endLine = Math.max(0, Math.min(options.range.endLine, lines.length - 1));
  const nextLines = [...lines];
  let matches = 0;
  const ranges: TextRange[] = [];

  for (let lineIndex = startLine; lineIndex <= endLine; lineIndex++) {
    const result = substituteLine(nextLines[lineIndex] ?? "");
    if (!result.ok) return result;
    nextLines[lineIndex] = result.line;
    matches += result.matches;
    for (const range of result.ranges) {
      ranges.push({
        start: { line: lineIndex, col: range.start },
        end: { line: lineIndex, col: range.end },
      });
    }
  }

  const nextText = joinLines(nextLines);
  return {
    matches,
    ranges,
    edit: {
      text: nextText,
      cursor: clampPosition(nextLines, options.originalCursor),
      changed: nextText !== text,
    },
  };
}

export function substituteLineRangeLiteral(
  text: string,
  options: SubstituteLineRangeOptions,
): SubstituteLineRangeResult {
  const result = substituteLineRange(text, options, (line) => ({
    ok: true,
    ...substituteLineLiteral(
      line,
      options.pattern,
      options.replacement,
      options.global,
      options.ignoreCase,
    ),
  }));
  if ("ok" in result) throw new Error(result.message);
  return result;
}

export type SubstituteLineRangeRegexResult =
  | ({ ok: true } & SubstituteLineRangeResult)
  | { ok: false; message: string };

function substituteLineRegex(
  line: string,
  regex: RegExp,
  replacement: string,
  global: boolean,
): LineSubstitutionSuccess | { ok: false; message: string } {
  let nextLine = "";
  let cursor = 0;
  let matches = 0;
  const ranges: Array<{ start: number; end: number }> = [];
  regex.lastIndex = 0;

  while (cursor <= line.length) {
    regex.lastIndex = cursor;
    const match = regex.exec(line);
    if (!match) break;
    if (match[0].length === 0)
      return { ok: false, message: "Regex pattern cannot match empty text" };
    matches++;
    if (matches > REGEX_SEARCH_MATCH_MAX_COUNT)
      return { ok: false, message: "Regex match count exceeded" };
    ranges.push({ start: match.index, end: match.index + match[0].length - 1 });
    nextLine += line.slice(cursor, match.index) + replacement;
    cursor = match.index + match[0].length;
    if (!global) break;
  }

  if (matches === 0) return { ok: true, line, matches, ranges };
  return { ok: true, line: nextLine + line.slice(cursor), matches, ranges };
}

export function substituteLineRangeRegex(
  text: string,
  options: SubstituteLineRangeOptions,
): SubstituteLineRangeRegexResult {
  if (options.pattern.length === 0) return { ok: false, message: "Regex pattern cannot be empty" };
  if (options.pattern.length > REGEX_SEARCH_PATTERN_MAX_LENGTH)
    return { ok: false, message: "Regex pattern too long" };
  if (text.length > REGEX_SEARCH_SUBJECT_MAX_LENGTH)
    return { ok: false, message: "Regex subject too long" };

  let regex: RegExp;
  try {
    regex = new RegExp(options.pattern, options.ignoreCase ? "gi" : "g");
  } catch {
    return { ok: false, message: "Invalid regex pattern" };
  }

  const result = substituteLineRange(text, options, (line) =>
    substituteLineRegex(line, regex, options.replacement, options.global),
  );
  if ("ok" in result) return result;
  if (result.matches > REGEX_SEARCH_MATCH_MAX_COUNT)
    return { ok: false, message: "Regex match count exceeded" };
  return { ok: true, ...result };
}

export type ExLineEditResult =
  | { ok: true; edit: EditResult; lines: number }
  | { ok: false; message: string };

export type ExLineYankResult = { register: VimRegister; lines: number };

function clampLineRange(lines: string[], range: LineRange): LineRange {
  const last = Math.max(0, lines.length - 1);
  return {
    startLine: Math.max(0, Math.min(range.startLine, last)),
    endLine: Math.max(0, Math.min(range.endLine, last)),
  };
}

function lineCountForRange(range: LineRange): number {
  return range.endLine - range.startLine + 1;
}

export function deleteExLineRange(text: string, range: LineRange): ExLineEditResult {
  const lines = splitText(text);
  const safeRange = clampLineRange(lines, range);
  return {
    ok: true,
    edit: deleteLineRange(
      text,
      { line: safeRange.startLine, col: 0 },
      { line: safeRange.endLine, col: 0 },
    ),
    lines: lineCountForRange(safeRange),
  };
}

export function yankExLineRange(text: string, range: LineRange): ExLineYankResult {
  const lines = splitText(text);
  const safeRange = clampLineRange(lines, range);
  return {
    register: yankLineRange(
      text,
      { line: safeRange.startLine, col: 0 },
      { line: safeRange.endLine, col: 0 },
    ),
    lines: lineCountForRange(safeRange),
  };
}

export function putExRegisterAfterRange(
  text: string,
  range: LineRange,
  register: VimRegister | undefined,
): ExLineEditResult {
  if (!register || register.text.length === 0) return { ok: false, message: "Register is empty" };

  const lines = splitText(text);
  const safeRange = clampLineRange(lines, range);
  const inserted = register.text.split("\n");
  const insertAt = Math.min(lines.length, safeRange.endLine + 1);
  const nextLines = [...lines.slice(0, insertAt), ...inserted, ...lines.slice(insertAt)];
  const nextText = joinLines(nextLines);
  return {
    ok: true,
    lines: inserted.length,
    edit: {
      text: nextText,
      cursor: { line: insertAt, col: 0 },
      changed: nextText !== text,
    },
  };
}

export function copyExLineRange(
  text: string,
  range: LineRange,
  destination: number,
): ExLineEditResult {
  const lines = splitText(text);
  const safeRange = clampLineRange(lines, range);
  if (destination < -1 || destination >= lines.length)
    return { ok: false, message: "Invalid Ex destination" };

  const copied = lines.slice(safeRange.startLine, safeRange.endLine + 1);
  const insertAt = destination + 1;
  const nextLines = [...lines.slice(0, insertAt), ...copied, ...lines.slice(insertAt)];
  const nextText = joinLines(nextLines);
  return {
    ok: true,
    lines: copied.length,
    edit: {
      text: nextText,
      cursor: { line: insertAt, col: 0 },
      changed: nextText !== text,
    },
  };
}

export function moveExLineRange(
  text: string,
  range: LineRange,
  destination: number,
): ExLineEditResult {
  const lines = splitText(text);
  const safeRange = clampLineRange(lines, range);
  if (destination < -1 || destination >= lines.length)
    return { ok: false, message: "Invalid Ex destination" };
  if (destination >= safeRange.startLine && destination <= safeRange.endLine)
    return { ok: false, message: "Ex move destination overlaps range" };

  const moved = lines.slice(safeRange.startLine, safeRange.endLine + 1);
  const remaining = [...lines.slice(0, safeRange.startLine), ...lines.slice(safeRange.endLine + 1)];
  let insertAt = destination + 1;
  if (destination > safeRange.endLine) insertAt -= moved.length;
  const nextLines = [...remaining.slice(0, insertAt), ...moved, ...remaining.slice(insertAt)];
  const nextText = joinLines(nextLines);
  return {
    ok: true,
    lines: moved.length,
    edit: {
      text: nextText,
      cursor: { line: insertAt, col: 0 },
      changed: nextText !== text,
    },
  };
}

export function deleteResolvedLineRange(text: string, target: ResolvedLineRange): ExLineEditResult {
  return deleteExLineRange(text, target.range);
}

export function yankResolvedLineRange(text: string, target: ResolvedLineRange): ExLineYankResult {
  return yankExLineRange(text, target.range);
}

export function putRegisterAfterResolvedLineRange(
  text: string,
  target: ResolvedLineRange,
  register: VimRegister | undefined,
): ExLineEditResult {
  return putExRegisterAfterRange(text, target.range, register);
}

export function copyResolvedLineRange(
  text: string,
  target: ResolvedLineRange,
  destination: ResolvedDestination,
): ExLineEditResult {
  return copyExLineRange(text, target.range, destination.destination);
}

export function moveResolvedLineRange(
  text: string,
  target: ResolvedLineRange,
  destination: ResolvedDestination,
): ExLineEditResult {
  return moveExLineRange(text, target.range, destination.destination);
}

export function deleteResolvedCharacterRange(
  text: string,
  target: ResolvedCharacterRange,
): EditResult {
  return deleteRange(text, target.range.start, target.range.end);
}

export function yankResolvedCharacterRange(
  text: string,
  target: ResolvedCharacterRange,
): VimRegister {
  return { type: "char", text: selectionText(text, target.range.start, target.range.end) };
}

export function deleteResolvedBlockRange(text: string, target: ResolvedBlockRange): EditResult {
  return deleteBlockRange(
    text,
    { line: target.range.startLine, col: target.range.startCol },
    { line: target.range.endLine, col: target.range.endCol },
  );
}

function replaceLineRange(
  text: string,
  range: LineRange,
  replacement: readonly string[],
  cursor: Position,
): ExLineEditResult {
  const lines = splitText(text);
  const safeRange = clampLineRange(lines, range);
  const nextLines = [
    ...lines.slice(0, safeRange.startLine),
    ...replacement,
    ...lines.slice(safeRange.endLine + 1),
  ];
  const nextText = joinLines(nextLines.length === 0 ? [""] : nextLines);
  return {
    ok: true,
    lines: lineCountForRange(safeRange),
    edit: {
      text: nextText,
      cursor: clampPosition(splitText(nextText), cursor),
      changed: nextText !== text,
    },
  };
}

function bulletizeLine(line: string): string {
  if (line.trim().length === 0) return line;
  const indent = /^\s*/.exec(line)?.[0] ?? "";
  const content = line.slice(indent.length).replace(/^(?:[-+*]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/, "");
  return `${indent}- ${content}`;
}

function dedentLine(line: string): string {
  if (line.startsWith("  ")) return line.slice(2);
  if (line.startsWith("\t")) return line.slice(1);
  if (line.startsWith(" ")) return line.slice(1);
  return line;
}

function wrapWords(words: string[], width: number): string[] {
  const output: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length === 0) {
      current = word;
      continue;
    }
    if (current.length + 1 + word.length <= width) current = `${current} ${word}`;
    else {
      output.push(current);
      current = word;
    }
  }
  if (current.length > 0) output.push(current);
  return output;
}

function reflowLines(lines: readonly string[], width: number, initialInFence = false): string[] {
  const output: string[] = [];
  let paragraph: string[] = [];
  let inFence = initialInFence;

  const flush = () => {
    if (paragraph.length === 0) return;
    const indent = /^\s*/.exec(paragraph[0] ?? "")?.[0] ?? "";
    const words = paragraph.flatMap((line) => line.trim().split(/\s+/).filter(Boolean));
    const wrapped = wrapWords(words, Math.max(10, width - indent.length)).map(
      (line) => `${indent}${line}`,
    );
    output.push(...wrapped);
    paragraph = [];
  };

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      flush();
      inFence = !inFence;
      output.push(line);
      continue;
    }
    if (
      inFence ||
      isErrorBlockLine(line) ||
      line.trim().length === 0 ||
      /^\s*[-+*]\s+/.test(line)
    ) {
      flush();
      output.push(line);
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return output;
}

function startsInsideFence(lines: readonly string[], startLine: number): boolean {
  let inFence = false;
  for (let index = 0; index < startLine; index++) {
    if (/^\s*(```|~~~)/.test(lines[index] ?? "")) inFence = !inFence;
  }
  return inFence;
}

export function applyPromptTransform(
  text: string,
  range: LineRange,
  transform: PromptTransform,
  originalCursor: Position,
): ExLineEditResult {
  const lines = splitText(text);
  const safeRange = clampLineRange(lines, range);
  const selected = lines.slice(safeRange.startLine, safeRange.endLine + 1);
  let replacement: string[];

  switch (transform.action) {
    case "quote":
      replacement = selected.map((line) => `> ${line}`);
      break;
    case "unquote":
      replacement = selected.map((line) => line.replace(/^\s*> ?/, ""));
      break;
    case "bulletize":
      replacement = selected.map(bulletizeLine);
      break;
    case "fence":
      replacement = [`${"```"}${transform.language ?? ""}`, ...selected, "```"];
      break;
    case "indent":
      replacement = selected.map((line) => `  ${line}`);
      break;
    case "dedent":
      replacement = selected.map(dedentLine);
      break;
    case "reflow":
      replacement = reflowLines(
        selected,
        transform.width ?? 80,
        startsInsideFence(lines, safeRange.startLine),
      );
      break;
  }

  return replaceLineRange(text, safeRange, replacement, originalCursor);
}

export function shiftLineRange(
  text: string,
  range: LineRange,
  action: Extract<PromptTransform["action"], "indent" | "dedent">,
  originalCursor: Position,
  depth = 1,
): ExLineEditResult {
  let currentText = text;
  let currentResult: ExLineEditResult | undefined;
  let changed = false;
  for (let i = 0; i < Math.max(1, depth); i += 1) {
    currentResult = applyPromptTransform(currentText, range, { action }, originalCursor);
    if (!currentResult.ok) return currentResult;
    changed ||= currentResult.edit.changed;
    currentText = currentResult.edit.text;
  }
  if (!currentResult || !currentResult.ok)
    return applyPromptTransform(text, range, { action }, originalCursor);
  return { ...currentResult, edit: { ...currentResult.edit, changed } };
}

export function shiftLinesFromCursor(
  text: string,
  cursor: Position,
  count: number,
  action: Extract<PromptTransform["action"], "indent" | "dedent">,
): ExLineEditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const endLine = Math.min(lines.length - 1, pos.line + Math.max(1, count) - 1);
  return shiftLineRange(text, { startLine: pos.line, endLine }, action, cursor);
}

export function joinExLineRange(
  text: string,
  range: LineRange,
  rangeExplicit: boolean,
): ExLineEditResult {
  const lines = splitText(text);
  const safeRange = rangeExplicit
    ? clampLineRange(lines, range)
    : clampLineRange(lines, {
        startLine: range.startLine,
        endLine: Math.min(lines.length - 1, range.startLine + 1),
      });
  const count = lineCountForRange(safeRange);
  if (count < 2) return { ok: false, message: "Not enough lines to join" };

  const [first = "", ...rest] = lines.slice(safeRange.startLine, safeRange.endLine + 1);
  let joined = first.trimEnd();
  for (const line of rest) {
    const right = line.trimStart();
    const separator = joined.length > 0 && right.length > 0 ? " " : "";
    joined = `${joined}${separator}${right}`;
  }
  const nextLines = [
    ...lines.slice(0, safeRange.startLine),
    joined,
    ...lines.slice(safeRange.endLine + 1),
  ];
  const nextText = joinLines(nextLines);
  return {
    ok: true,
    lines: count,
    edit: {
      text: nextText,
      cursor: {
        line: safeRange.startLine,
        col: Math.min((first ?? "").trimEnd().length, joined.length),
      },
      changed: nextText !== text,
    },
  };
}

export function exactMarkPosition(text: string, mark: Position): Position {
  return normalizeBufferPosition(text, mark);
}

export function lineMarkPosition(text: string, mark: Position): Position {
  return firstNonBlankPosition(text, mark);
}

export function deleteMarkRange(text: string, cursor: Position, mark: Position): EditResult {
  return deleteRange(text, cursor, mark);
}

export function yankMarkRange(
  text: string,
  cursor: Position,
  mark: Position,
): VimRegister | undefined {
  return yankVisualSelection(text, cursor, mark, "char");
}

export function deleteLineMarkRange(text: string, cursor: Position, mark: Position): EditResult {
  return deleteLineRange(text, cursor, mark);
}

export function yankLineMarkRange(text: string, cursor: Position, mark: Position): VimRegister {
  return yankLineRange(text, cursor, mark);
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

function normalizeBlockRange(lines: string[], anchor: Position, active: Position): BlockRange {
  const a = clampPosition(lines, anchor);
  const b = clampPosition(lines, active);
  return {
    startLine: Math.min(a.line, b.line),
    endLine: Math.max(a.line, b.line),
    startCol: Math.min(a.col, b.col),
    endCol: Math.max(a.col, b.col),
  };
}

function blockSelectionText(text: string, anchor: Position, active: Position): string {
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

export function insertBlockText(
  text: string,
  anchor: Position,
  active: Position,
  insertText: string,
  placement: "start" | "end",
  skipLine?: number,
): EditResult {
  if (insertText.length === 0) return { text, cursor: anchor, changed: false };

  const lines = splitText(text);
  const range = normalizeBlockRange(lines, anchor, active);
  const nextLines = [...lines];
  const col = placement === "start" ? range.startCol : range.endCol + 1;

  for (let lineIndex = range.startLine; lineIndex <= range.endLine; lineIndex++) {
    if (lineIndex === skipLine) continue;
    const line = nextLines[lineIndex] ?? "";
    const insertCol = Math.min(col, line.length);
    nextLines[lineIndex] = line.slice(0, insertCol) + insertText + line.slice(insertCol);
  }

  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: clampPosition(nextLines, {
      line: range.startLine,
      col: Math.min(col + insertText.length, nextLines[range.startLine]?.length ?? 0),
    }),
    changed: nextText !== text,
  };
}

export function deleteBlockRange(text: string, anchor: Position, active: Position): EditResult {
  const lines = splitText(text);
  const range = normalizeBlockRange(lines, anchor, active);
  const selected = blockSelectionText(text, anchor, active);
  const nextLines = [...lines];

  for (let lineIndex = range.startLine; lineIndex <= range.endLine; lineIndex++) {
    const line = nextLines[lineIndex] ?? "";
    const start = Math.min(range.startCol, line.length);
    const end = Math.min(range.endCol + 1, line.length);
    nextLines[lineIndex] = line.slice(0, start) + line.slice(end);
  }

  const nextText = joinLines(nextLines);
  const cursor = clampPosition(nextLines, { line: range.startLine, col: range.startCol });
  return {
    text: nextText,
    cursor,
    register: selected.length > 0 ? { type: "char", text: selected } : undefined,
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

export function replaceVisualRangeChars(
  text: string,
  anchor: Position,
  active: Position,
  kind: "char" | "line" | "block",
  char: string,
): EditResult {
  const lines = splitText(text);
  if (char.length === 0 || char === "\n") {
    return { text, cursor: normalizeBufferPosition(text, anchor), changed: false };
  }

  if (kind === "line") {
    const range = normalizeLineRange(lines, anchor, active);
    const selected = linewiseSelectionText(text, anchor, active);
    const nextLines = [...lines];
    for (let lineIndex = range.startLine; lineIndex <= range.endLine; lineIndex++) {
      const line = nextLines[lineIndex] ?? "";
      nextLines[lineIndex] = char.repeat(line.length);
    }
    const nextText = joinLines(nextLines);
    return {
      text: nextText,
      cursor: { line: range.startLine, col: 0 },
      register: { type: "line", text: selected },
      changed: nextText !== text,
    };
  }

  if (kind === "block") {
    const range = normalizeBlockRange(lines, anchor, active);
    const selected = blockSelectionText(text, anchor, active);
    const nextLines = [...lines];
    for (let lineIndex = range.startLine; lineIndex <= range.endLine; lineIndex++) {
      const line = nextLines[lineIndex] ?? "";
      const start = Math.min(range.startCol, line.length);
      const end = Math.min(range.endCol + 1, line.length);
      nextLines[lineIndex] = line.slice(0, start) + char.repeat(end - start) + line.slice(end);
    }
    const nextText = joinLines(nextLines);
    return {
      text: nextText,
      cursor: clampPosition(nextLines, { line: range.startLine, col: range.startCol }),
      register: selected.length > 0 ? { type: "char", text: selected } : undefined,
      changed: nextText !== text,
    };
  }

  const range = normalizeRange(lines, anchor, active);
  const selected = selectionText(text, range.start, range.end);
  const nextLines = [...lines];
  for (let lineIndex = range.start.line; lineIndex <= range.end.line; lineIndex++) {
    const line = nextLines[lineIndex] ?? "";
    const start = lineIndex === range.start.line ? Math.min(range.start.col, line.length) : 0;
    const end =
      lineIndex === range.end.line ? Math.min(range.end.col + 1, line.length) : line.length;
    nextLines[lineIndex] = line.slice(0, start) + char.repeat(end - start) + line.slice(end);
  }
  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: clampPosition(nextLines, range.start),
    register: selected.length > 0 ? { type: "char", text: selected } : undefined,
    changed: nextText !== text,
  };
}

export function replaceLineRangeWithRegister(
  text: string,
  anchor: Position,
  active: Position,
  register: VimRegister | undefined,
): EditResult {
  const lines = splitText(text);
  const range = normalizeLineRange(lines, anchor, active);
  const selected = linewiseSelectionText(text, anchor, active);
  if (!register || register.text.length === 0) {
    return {
      text,
      cursor: { line: range.startLine, col: 0 },
      changed: false,
    };
  }

  const inserted = register.text.split("\n");
  let nextLines = [
    ...lines.slice(0, range.startLine),
    ...inserted,
    ...lines.slice(range.endLine + 1),
  ];
  if (nextLines.length === 0) nextLines = [""];

  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: { line: range.startLine, col: 0 },
    register: { type: "line", text: selected },
    changed: nextText !== text,
  };
}

export function deleteCharAt(text: string, cursor: Position, count = 1): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const line = lines[pos.line] ?? "";
  if (pos.col >= line.length) {
    return { text, cursor: pos, changed: false };
  }
  const endCol = Math.min(line.length - 1, pos.col + Math.max(1, count) - 1);
  return deleteRange(text, pos, { line: pos.line, col: endCol });
}

export function replaceCharAt(text: string, cursor: Position, char: string, count = 1): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const line = lines[pos.line] ?? "";
  if (pos.col >= line.length || char.length === 0 || char === "\n") {
    return { text, cursor: pos, changed: false };
  }
  const length = Math.min(Math.max(1, count), line.length - pos.col);
  const nextLine = line.slice(0, pos.col) + char.repeat(length) + line.slice(pos.col + length);
  const nextLines = [...lines];
  nextLines[pos.line] = nextLine;
  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: pos,
    register: { type: "char", text: line.slice(pos.col, pos.col + length) },
    changed: nextText !== text,
  };
}

export function substituteCharAt(text: string, cursor: Position, count = 1): EditResult {
  return deleteCharAt(text, cursor, count);
}

function toggleCaseChar(char: string): string {
  const upper = char.toUpperCase();
  const lower = char.toLowerCase();
  const toggled =
    char === lower && char !== upper ? upper : char === upper && char !== lower ? lower : char;
  return Array.from(toggled).length === 1 ? toggled : char;
}

function codePointSpans(line: string): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  let offset = 0;
  for (const char of line) {
    const start = offset;
    offset += char.length;
    spans.push({ start, end: offset });
  }
  return spans;
}

export function toggleCaseAt(text: string, cursor: Position, count = 1): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const line = lines[pos.line] ?? "";
  if (pos.col >= line.length) return { text, cursor: pos, changed: false };

  const spans = codePointSpans(line);
  const startIndex = spans.findIndex((span) => pos.col >= span.start && pos.col < span.end);
  if (startIndex < 0) return { text, cursor: pos, changed: false };
  const selected = spans.slice(startIndex, startIndex + Math.max(1, count));
  const end = selected.at(-1)?.end ?? spans[startIndex]?.end ?? pos.col;
  const start = spans[startIndex]?.start ?? pos.col;
  const target = line.slice(start, end);
  const toggled = toggleCaseText(target);
  const nextLine = line.slice(0, start) + toggled + line.slice(end);
  const nextLines = [...lines];
  nextLines[pos.line] = nextLine;
  const nextText = joinLines(nextLines);
  const nextCursorCol = start + toggled.length - (Array.from(toggled).at(-1)?.length ?? 1);
  return {
    text: nextText,
    cursor: { line: pos.line, col: nextCursorCol },
    changed: nextText !== text,
  };
}

function toggleCaseText(text: string): string {
  return [...text].map(toggleCaseChar).join("");
}

export function toggleCaseVisualRange(
  text: string,
  anchor: Position,
  active: Position,
  kind: "char" | "line" | "block",
): EditResult {
  const lines = splitText(text);

  if (kind === "line") {
    const range = normalizeLineRange(lines, anchor, active);
    const nextLines = [...lines];
    for (let lineIndex = range.startLine; lineIndex <= range.endLine; lineIndex++) {
      nextLines[lineIndex] = toggleCaseText(nextLines[lineIndex] ?? "");
    }
    const nextText = joinLines(nextLines);
    return {
      text: nextText,
      cursor: { line: range.startLine, col: 0 },
      changed: nextText !== text,
    };
  }

  if (kind === "block") {
    const range = normalizeBlockRange(lines, anchor, active);
    const nextLines = [...lines];
    for (let lineIndex = range.startLine; lineIndex <= range.endLine; lineIndex++) {
      const line = nextLines[lineIndex] ?? "";
      const start = Math.min(range.startCol, line.length);
      const end = Math.min(range.endCol + 1, line.length);
      nextLines[lineIndex] =
        line.slice(0, start) + toggleCaseText(line.slice(start, end)) + line.slice(end);
    }
    const nextText = joinLines(nextLines);
    return {
      text: nextText,
      cursor: clampPosition(nextLines, { line: range.startLine, col: range.startCol }),
      changed: nextText !== text,
    };
  }

  const range = normalizeRange(lines, anchor, active);
  const nextLines = [...lines];
  for (let lineIndex = range.start.line; lineIndex <= range.end.line; lineIndex++) {
    const line = nextLines[lineIndex] ?? "";
    const start = lineIndex === range.start.line ? Math.min(range.start.col, line.length) : 0;
    const end =
      lineIndex === range.end.line ? Math.min(range.end.col + 1, line.length) : line.length;
    nextLines[lineIndex] =
      line.slice(0, start) + toggleCaseText(line.slice(start, end)) + line.slice(end);
  }
  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: clampPosition(nextLines, range.start),
    changed: nextText !== text,
  };
}

export function adjustNumberAtOrAfterCursor(
  text: string,
  cursor: Position,
  delta: number,
): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const line = lines[pos.line] ?? "";
  const search = line.slice(pos.col);
  const match = /[+-]?\d+/.exec(search);
  if (!match || match.index === undefined) return { text, cursor: pos, changed: false };
  const startCol = pos.col + match.index;
  const raw = match[0] ?? "";
  const nextNumber = String(Number.parseInt(raw, 10) + delta);
  const nextLine = line.slice(0, startCol) + nextNumber + line.slice(startCol + raw.length);
  const nextLines = [...lines];
  nextLines[pos.line] = nextLine;
  const nextText = joinLines(nextLines);
  return { text: nextText, cursor: { line: pos.line, col: startCol }, changed: nextText !== text };
}

export type CharSearchKind = "findForward" | "findBackward" | "tillForward" | "tillBackward";
export type SearchDirection = "forward" | "backward";

export function findSearchHighlightRanges(
  text: string,
  query: string,
  maxRanges = Number.POSITIVE_INFINITY,
): TextRange[] {
  if (query.length === 0 || query.includes("\n") || maxRanges <= 0) return [];
  const lines = splitText(text);
  const starts = lineStartOffsets(lines);
  const toPosition = (target: number) =>
    offsetToPositionFromLineStarts(lines, starts, target, text.length);
  const ranges: TextRange[] = [];
  let offset = 0;
  while (ranges.length < maxRanges) {
    const match = text.indexOf(query, offset);
    if (match < 0) break;
    const end = Math.max(match, Math.min(text.length, match + query.length) - 1);
    ranges.push({ start: toPosition(match), end: toPosition(end) });
    offset = match + query.length;
  }
  return ranges;
}

export type SearchMatcher =
  | { mode: "literal"; query: string }
  | { mode: "regex"; query: string; regex: RegExp };

export type SearchMatch = { position: Position; length: number };

export const REGEX_SEARCH_PATTERN_MAX_LENGTH = 256;
export const REGEX_SEARCH_SUBJECT_MAX_LENGTH = 50_000;
export const REGEX_SEARCH_MATCH_MAX_COUNT = 10_000;

export function compileRegexSearchMatcher(
  query: string,
): { ok: true; matcher: SearchMatcher } | { ok: false; message: string } {
  if (query.length > REGEX_SEARCH_PATTERN_MAX_LENGTH)
    return { ok: false, message: "Regex pattern too long" };
  try {
    const regex = new RegExp(query, "g");
    if (regex.exec("")?.[0] === "")
      return { ok: false, message: "Regex pattern cannot match empty text" };
    return { ok: true, matcher: { mode: "regex", query, regex } };
  } catch {
    return { ok: false, message: "Invalid regex pattern" };
  }
}

export function findSearchMatch(
  text: string,
  cursor: Position,
  query: string,
  direction: SearchDirection = "forward",
): Position | undefined {
  return findSearchMatchWithMatcher(text, cursor, { mode: "literal", query }, direction)?.position;
}

export function findSearchMatchWithMatcher(
  text: string,
  cursor: Position,
  matcher: SearchMatcher,
  direction: SearchDirection = "forward",
): SearchMatch | undefined {
  if (matcher.query.length === 0 || matcher.query.includes("\n")) return undefined;
  if (matcher.mode === "literal")
    return findLiteralSearchMatch(text, cursor, matcher.query, direction);
  if (text.length > REGEX_SEARCH_SUBJECT_MAX_LENGTH) return undefined;
  return findRegexSearchMatch(text, cursor, matcher.regex, direction);
}

function findLiteralSearchMatch(
  text: string,
  cursor: Position,
  query: string,
  direction: SearchDirection,
): SearchMatch | undefined {
  const start = positionToOffset(text, cursor);
  if (direction === "forward") {
    const later = text.indexOf(query, Math.min(text.length, start + 1));
    if (later >= 0) return { position: offsetToPosition(text, later), length: query.length };
    const wrapped = text.indexOf(query, 0);
    return wrapped >= 0
      ? { position: offsetToPosition(text, wrapped), length: query.length }
      : undefined;
  }

  const earlier = start > 0 ? text.lastIndexOf(query, start - 1) : -1;
  if (earlier >= 0) return { position: offsetToPosition(text, earlier), length: query.length };
  const wrapped = text.lastIndexOf(query);
  return wrapped >= 0
    ? { position: offsetToPosition(text, wrapped), length: query.length }
    : undefined;
}

function regexMatches(
  text: string,
  regex: RegExp,
): { offset: number; length: number }[] | undefined {
  const matches: { offset: number; length: number }[] = [];
  regex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[0].length === 0) return undefined;
    matches.push({ offset: match.index, length: match[0].length });
    if (matches.length > REGEX_SEARCH_MATCH_MAX_COUNT) return undefined;
  }
  return matches;
}

function findRegexSearchMatch(
  text: string,
  cursor: Position,
  regex: RegExp,
  direction: SearchDirection,
): SearchMatch | undefined {
  const matches = regexMatches(text, regex);
  if (!matches || matches.length === 0) return undefined;
  const start = positionToOffset(text, cursor);
  const found =
    direction === "forward"
      ? (matches.find((match) => match.offset > start) ?? matches[0])
      : (matches.findLast((match) => match.offset < start) ?? matches.at(-1));
  return found
    ? { position: offsetToPosition(text, found.offset), length: found.length }
    : undefined;
}

function searchRangeEnd(text: string, target: Position, length: number): Position {
  const targetOffset = positionToOffset(text, target);
  const endOffset = Math.max(targetOffset, Math.min(text.length, targetOffset + length) - 1);
  return offsetToPosition(text, endOffset);
}

export function deleteSearchMatchRange(
  text: string,
  cursor: Position,
  match: SearchMatch,
): EditResult {
  const active =
    comparePositions(cursor, match.position) <= 0
      ? searchRangeEnd(text, match.position, match.length)
      : match.position;
  return deleteRange(text, cursor, active);
}

export function yankSearchMatchRange(
  text: string,
  cursor: Position,
  match: SearchMatch,
): VimRegister | undefined {
  const active =
    comparePositions(cursor, match.position) <= 0
      ? searchRangeEnd(text, match.position, match.length)
      : match.position;
  return yankVisualSelection(text, cursor, active, "char");
}

export function deleteSearchRange(
  text: string,
  cursor: Position,
  target: Position,
  query: string,
): EditResult {
  return deleteSearchMatchRange(text, cursor, { position: target, length: query.length });
}

export function yankSearchRange(
  text: string,
  cursor: Position,
  target: Position,
  query: string,
): VimRegister | undefined {
  return yankSearchMatchRange(text, cursor, { position: target, length: query.length });
}

export function findCharOnLine(
  text: string,
  cursor: Position,
  kind: CharSearchKind,
  target: string,
  count = 1,
): Position | undefined {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const line = lines[pos.line] ?? "";
  if (target.length !== 1 || target === "\n") return undefined;
  const forward = kind === "findForward" || kind === "tillForward";
  let found = -1;
  let remaining = Math.max(1, count);

  if (forward) {
    for (let index = pos.col + 1; index < line.length; index++) {
      if (line[index] === target && --remaining === 0) {
        found = index;
        break;
      }
    }
  } else {
    for (let index = pos.col - 1; index >= 0; index--) {
      if (line[index] === target && --remaining === 0) {
        found = index;
        break;
      }
    }
  }

  if (found < 0) return undefined;
  const tillOffset = kind === "tillForward" ? -1 : kind === "tillBackward" ? 1 : 0;
  return { line: pos.line, col: Math.max(0, Math.min(line.length, found + tillOffset)) };
}

function charSearchMatchColumn(
  line: string,
  cursorCol: number,
  kind: CharSearchKind,
  target: string,
  count = 1,
): number | undefined {
  if (target.length !== 1 || target === "\n") return undefined;
  const forward = kind === "findForward" || kind === "tillForward";
  let remaining = Math.max(1, count);
  if (forward) {
    for (let index = cursorCol + 1; index < line.length; index++) {
      if (line[index] === target && --remaining === 0) return index;
    }
    return undefined;
  }
  for (let index = cursorCol - 1; index >= 0; index--) {
    if (line[index] === target && --remaining === 0) return index;
  }
  return undefined;
}

function charSearchOperatorOffsetRange(
  text: string,
  cursor: Position,
  kind: CharSearchKind,
  target: string,
  count = 1,
): { start: number; end: number; cursor: Position } | undefined {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const bounds = lineBoundsForPosition(text, pos);
  const found = charSearchMatchColumn(bounds.line, pos.col, kind, target, count);
  if (found === undefined) return undefined;

  if (kind === "tillForward" && found === pos.col + 1) return undefined;
  if (kind === "tillBackward" && found === pos.col - 1) return undefined;
  const cursorColEnd = Math.min(pos.col + 1, bounds.line.length);
  const range =
    kind === "findForward"
      ? { start: pos.col, end: found + 1 }
      : kind === "tillForward"
        ? { start: pos.col, end: found }
        : kind === "findBackward"
          ? { start: found, end: cursorColEnd }
          : { start: found + 1, end: cursorColEnd };
  if (range.end <= range.start) return undefined;
  return { start: bounds.start + range.start, end: bounds.start + range.end, cursor: pos };
}

export function deleteByCharSearch(
  text: string,
  cursor: Position,
  kind: CharSearchKind,
  target: string,
  count = 1,
): EditResult {
  const range = charSearchOperatorOffsetRange(text, cursor, kind, target, count);
  if (!range) return { text, cursor: clampPosition(splitText(text), cursor), changed: false };
  return deleteOffsetRange(text, range.start, range.end);
}

export function yankByCharSearch(
  text: string,
  cursor: Position,
  kind: CharSearchKind,
  target: string,
  count = 1,
): VimRegister | undefined {
  const range = charSearchOperatorOffsetRange(text, cursor, kind, target, count);
  if (!range) return undefined;
  const selected = text.slice(range.start, range.end);
  return selected.length > 0 ? { type: "char", text: selected } : undefined;
}

function countedWordPosition(
  text: string,
  cursor: Position,
  count: number,
  nextOffset: (text: string, offset: number) => number,
): Position {
  let offset = positionToOffset(text, cursor);
  for (let index = 0; index < Math.max(1, count); index++) {
    const next = nextOffset(text, offset);
    if (next === offset) break;
    offset = next;
  }
  return offsetToPosition(text, offset);
}

export function wordForwardPosition(text: string, cursor: Position, count = 1): Position {
  return countedWordPosition(text, cursor, count, nextWordStartOffset);
}

export function wordBackwardPosition(text: string, cursor: Position, count = 1): Position {
  return countedWordPosition(text, cursor, count, previousWordStartOffset);
}

export function wordEndPosition(text: string, cursor: Position, count = 1): Position {
  return countedWordPosition(text, cursor, count, wordEndOffset);
}

export function wordForwardBigPosition(text: string, cursor: Position, count = 1): Position {
  return countedWordPosition(text, cursor, count, nextWORDStartOffset);
}

export function wordBackwardBigPosition(text: string, cursor: Position, count = 1): Position {
  return countedWordPosition(text, cursor, count, previousWORDStartOffset);
}

export function wordEndBigPosition(text: string, cursor: Position, count = 1): Position {
  return countedWordPosition(text, cursor, count, wordEndWORDOffset);
}

export function wordPreviousEndPosition(text: string, cursor: Position, count = 1): Position {
  return countedWordPosition(text, cursor, count, previousWordEndOffset);
}

export function wordPreviousEndBigPosition(text: string, cursor: Position, count = 1): Position {
  return countedWordPosition(text, cursor, count, previousWordEndWORDOffset);
}

export function deleteByMotion(
  text: string,
  cursor: Position,
  motion: VimMotion,
  count = 1,
): EditResult {
  const lineRange = motionLineRange(text, cursor, motion, count);
  if (lineRange) {
    return deleteLineRange(
      text,
      { line: lineRange.startLine, col: 0 },
      { line: lineRange.endLine, col: 0 },
    );
  }
  const range = motionOffsetRange(text, cursor, motion, count);
  if (!range) return { text, cursor: clampPosition(splitText(text), cursor), changed: false };
  return deleteOffsetRange(text, range.start, range.end);
}

export function yankByMotion(
  text: string,
  cursor: Position,
  motion: VimMotion,
  count = 1,
): VimRegister | undefined {
  const lineRange = motionLineRange(text, cursor, motion, count);
  if (lineRange) {
    return yankLineRange(
      text,
      { line: lineRange.startLine, col: 0 },
      { line: lineRange.endLine, col: 0 },
    );
  }
  const range = motionOffsetRange(text, cursor, motion, count);
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

  const selected =
    kind === "block"
      ? blockSelectionText(text, anchor, active)
      : selectionText(text, anchor, active);
  return selected.length > 0 ? { type: "char", text: selected } : undefined;
}

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

export function deleteLine(text: string, cursor: Position, count = 1): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const endLine = Math.min(lines.length - 1, pos.line + Math.max(1, count) - 1);
  return deleteLineRange(text, pos, { line: endLine, col: 0 });
}

export function changeLine(text: string, cursor: Position, count = 1): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const endLine = Math.min(lines.length - 1, pos.line + Math.max(1, count) - 1);
  const removed = lines.slice(pos.line, endLine + 1).join("\n");
  const nextLines = [...lines.slice(0, pos.line), "", ...lines.slice(endLine + 1)];
  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: { line: pos.line, col: 0 },
    register: { type: "line", text: removed },
    changed: nextText !== text,
  };
}

export function yankLineCount(text: string, cursor: Position, count = 1): VimRegister {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const endLine = Math.min(lines.length - 1, pos.line + Math.max(1, count) - 1);
  return { type: "line", text: lines.slice(pos.line, endLine + 1).join("\n") };
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

function wordRangeAtOffset(
  text: string,
  offset: number,
): { start: number; end: number } | undefined {
  const clamped = Math.max(0, Math.min(offset, text.length));
  let index = clamped;
  if (index >= text.length) index = text.length - 1;
  if (index < 0) return undefined;
  if (isWhitespace(text[index])) {
    if (index > 0 && !isWhitespace(text[index - 1])) index--;
    else return undefined;
  }
  let start = index;
  while (start > 0 && !isWhitespace(text[start - 1])) start--;
  let end = index + 1;
  while (end < text.length && !isWhitespace(text[end])) end++;
  return start < end ? { start, end } : undefined;
}

function quoteRangeAtOffset(
  text: string,
  cursor: Position,
  quote: string,
): { start: number; end: number } | undefined {
  const current = positionToOffset(text, cursor);
  const bounds = lineBoundsForPosition(text, cursor);
  const before = text.lastIndexOf(quote, Math.max(bounds.start, current - 1));
  if (before < bounds.start) return undefined;
  const after = text.indexOf(quote, current);
  if (after < 0 || after > bounds.end || after <= before) return undefined;
  return { start: before, end: after + 1 };
}

function bracketRangeAtOffset(
  text: string,
  cursor: Position,
  open: string,
  close: string,
): { start: number; end: number } | undefined {
  const current = positionToOffset(text, cursor);
  let start: number | undefined;
  let depth = 0;
  for (let offset = current; offset >= 0; offset--) {
    const char = text[offset];
    if (char === close) depth++;
    if (char === open) {
      if (depth === 0) {
        start = offset;
        break;
      }
      depth--;
    }
  }
  if (start === undefined) return undefined;

  depth = 0;
  for (let offset = start; offset < text.length; offset++) {
    const char = text[offset];
    if (char === open) depth++;
    if (char === close) depth--;
    if (depth === 0) return { start, end: offset + 1 };
  }
  return undefined;
}

export function textObjectRange(
  text: string,
  cursor: Position,
  textObject: VimTextObject,
  promptStructures?: ResolvedVimPromptStructures,
): { start: Position; end: Position } | undefined {
  const current = positionToOffset(text, cursor);
  let range: { start: number; end: number } | undefined;
  if (textObject.target === "word") {
    range = wordRangeAtOffset(text, current);
    if (range && textObject.kind === "around") {
      let end = range.end;
      while (end < text.length && isWhitespace(text[end]) && text[end] !== "\n") end++;
      if (end === range.end) {
        let start = range.start;
        while (start > 0 && isWhitespace(text[start - 1]) && text[start - 1] !== "\n") start--;
        range = { start, end: range.end };
      } else range = { start: range.start, end };
    }
  } else if (textObject.target === "singleQuote") range = quoteRangeAtOffset(text, cursor, "'");
  else if (textObject.target === "doubleQuote") range = quoteRangeAtOffset(text, cursor, '"');
  else if (textObject.target === "paren") range = bracketRangeAtOffset(text, cursor, "(", ")");
  else if (textObject.target === "bracket") range = bracketRangeAtOffset(text, cursor, "[", "]");
  else if (textObject.target === "brace") range = bracketRangeAtOffset(text, cursor, "{", "}");
  else if (
    isPromptStructureTarget(textObject.target) &&
    (promptStructures?.enabled ?? true) &&
    (promptStructures?.targets[textObject.target] ?? true)
  ) {
    const structureRange = resolvePromptStructureRange(text, cursor, {
      kind: textObject.kind,
      target: textObject.target,
    });
    if (structureRange) range = { start: structureRange.start, end: structureRange.endExclusive };
  }

  if (!range) return undefined;
  const delimiterTarget = ["singleQuote", "doubleQuote", "paren", "bracket", "brace"].includes(
    textObject.target,
  );
  const inner = textObject.kind === "inner" && delimiterTarget;
  const start = inner ? range.start + 1 : range.start;
  const endExclusive = inner ? range.end - 1 : range.end;
  if (start >= endExclusive) return undefined;
  return { start: offsetToPosition(text, start), end: offsetToPosition(text, endExclusive - 1) };
}

function isPromptStructureTarget(target: VimTextObject["target"]): target is PromptStructureTarget {
  return !["word", "singleQuote", "doubleQuote", "paren", "bracket", "brace"].includes(target);
}

function promptStructureTextObjectRange(
  text: string,
  cursor: Position,
  textObject: VimTextObject,
  promptStructures?: ResolvedVimPromptStructures,
) {
  if (!isPromptStructureTarget(textObject.target)) return undefined;
  if (
    promptStructures?.enabled === false ||
    promptStructures?.targets[textObject.target] === false
  ) {
    return undefined;
  }
  return resolvePromptStructureRange(text, cursor, {
    kind: textObject.kind,
    target: textObject.target,
  });
}

export function yankTextObject(
  text: string,
  cursor: Position,
  textObject: VimTextObject,
  promptStructures?: ResolvedVimPromptStructures,
): VimRegister | undefined {
  const structureRange = promptStructureTextObjectRange(text, cursor, textObject, promptStructures);
  if (structureRange)
    return { type: "char", text: text.slice(structureRange.start, structureRange.endExclusive) };
  const range = textObjectRange(text, cursor, textObject, promptStructures);
  if (!range) return undefined;
  return yankVisualSelection(text, range.start, range.end, "char");
}

function isWholeLineRange(text: string, start: number, endExclusive: number): boolean {
  const startsAtLineStart = start === 0 || text[start - 1] === "\n";
  const endsAtLineEnd = endExclusive >= text.length || text[endExclusive] === "\n";
  return startsAtLineStart && endsAtLineEnd;
}

export function deleteTextObject(
  text: string,
  cursor: Position,
  textObject: VimTextObject,
  promptStructures?: ResolvedVimPromptStructures,
): EditResult {
  const structureRange = promptStructureTextObjectRange(text, cursor, textObject, promptStructures);
  if (structureRange) {
    let endExclusive = structureRange.endExclusive;
    if (
      isWholeLineRange(text, structureRange.start, structureRange.endExclusive) &&
      endExclusive < text.length &&
      text[endExclusive] === "\n"
    )
      endExclusive++;
    const nextText = text.slice(0, structureRange.start) + text.slice(endExclusive);
    return {
      text: nextText,
      cursor: offsetToPosition(nextText, structureRange.start),
      register: {
        type: "char",
        text: text.slice(structureRange.start, structureRange.endExclusive),
      },
      changed: nextText !== text,
    };
  }
  const range = textObjectRange(text, cursor, textObject, promptStructures);
  if (!range) return { text, cursor: normalizeBufferPosition(text, cursor), changed: false };
  return deleteRange(text, range.start, range.end);
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
