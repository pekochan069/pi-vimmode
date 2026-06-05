import type { LineRange, TextRange } from "./types.ts";

export type BlockRange = {
  startLine: number;
  endLine: number;
  startCol: number;
  endCol: number;
};

export type ResolvedLineRange = {
  type: "line";
  range: LineRange;
};

export type ResolvedCharacterRange = {
  type: "character";
  range: TextRange;
};

export type ResolvedBlockRange = {
  type: "block";
  range: BlockRange;
};

export type ResolvedDestination = {
  type: "destination";
  destination: number;
};

export type RangeError = {
  type: "error";
  message: string;
};

export type RangeResult<T> = { ok: true; value: T } | { ok: false; error: RangeError };

export type ExRangeContext = {
  lineCount: number;
  cursorLine: number;
  visualRange?: LineRange;
};

export type ExAddressAtom = "current" | "last" | "line" | "visual" | "destinationZero";

export type ExAddressAst = {
  type: "address";
  atom: ExAddressAtom;
  line?: number;
  offset?: number;
};

export type ExLineRangeAst =
  | { type: "implicit" }
  | { type: "percent" }
  | { type: "visual" }
  | { type: "single"; address: ExAddressAst }
  | { type: "range"; start: ExAddressAst; end: ExAddressAst; separator: "," | ";" };

export type ParsedExLineRange = {
  ast: ExLineRangeAst;
  range: LineRange;
  rest: string;
  explicit: boolean;
};

export type ParsedExDestination = {
  ast: ExAddressAst;
  destination: number;
};

function rangeError(message: string): RangeError {
  return { type: "error", message };
}

export function validLineRange(range: LineRange, lineCount: number): boolean {
  return (
    range.startLine >= 0 &&
    range.endLine >= 0 &&
    range.startLine < lineCount &&
    range.endLine < lineCount &&
    range.startLine <= range.endLine
  );
}

function resolveAddress(ast: ExAddressAst, context: ExRangeContext): RangeResult<number> {
  let line: number;
  switch (ast.atom) {
    case "current":
      line = context.cursorLine;
      break;
    case "last":
      line = context.lineCount - 1;
      break;
    case "line":
      line = ast.line ?? 0;
      break;
    case "destinationZero":
      if (ast.offset !== undefined)
        return { ok: false, error: rangeError("Invalid Ex destination") };
      return { ok: true, value: -1 };
    case "visual":
      return { ok: false, error: rangeError("Invalid Ex range") };
  }

  line += ast.offset ?? 0;
  if (line < 0 || line >= context.lineCount) {
    return { ok: false, error: rangeError("Invalid Ex range") };
  }
  return { ok: true, value: line };
}

function addressFromSource(
  source: string,
  options: { allowDestinationZero: boolean },
): RangeResult<{ ast: ExAddressAst; rest: string }> {
  const first = source[0];
  let ast: ExAddressAst | undefined;
  let rest = "";

  if (first === ".") {
    ast = { type: "address", atom: "current" };
    rest = source.slice(1);
  } else if (first === "$") {
    ast = { type: "address", atom: "last" };
    rest = source.slice(1);
  } else {
    const numeric = /^\d+/.exec(source);
    if (numeric) {
      const line = Number(numeric[0]) - 1;
      ast =
        options.allowDestinationZero && line === -1
          ? { type: "address", atom: "destinationZero" }
          : { type: "address", atom: "line", line };
      rest = source.slice(numeric[0].length);
    }
  }

  if (!ast) return { ok: false, error: rangeError("Invalid Ex range") };

  const offset = /^[+-]\d+/.exec(rest);
  if (offset) {
    if (ast.atom === "destinationZero") {
      return { ok: false, error: rangeError("Invalid Ex destination") };
    }
    ast = { ...ast, offset: Number(offset[0]) };
    rest = rest.slice(offset[0].length);
    if (/^[+-]\d+/.test(rest)) return { ok: false, error: rangeError("Invalid Ex range") };
  }

  return { ok: true, value: { ast, rest } };
}

export function resolveExLineRangeAst(
  ast: ExLineRangeAst,
  context: ExRangeContext,
): RangeResult<LineRange> {
  if (ast.type === "implicit") {
    const range = { startLine: context.cursorLine, endLine: context.cursorLine };
    return validLineRange(range, context.lineCount)
      ? { ok: true, value: range }
      : { ok: false, error: rangeError("Invalid Ex range") };
  }
  if (ast.type === "percent") {
    const range = { startLine: 0, endLine: context.lineCount - 1 };
    return validLineRange(range, context.lineCount)
      ? { ok: true, value: range }
      : { ok: false, error: rangeError("Invalid Ex range") };
  }
  if (ast.type === "visual") {
    if (!context.visualRange) {
      return {
        ok: false,
        error: rangeError("Visual range marker requires captured visual range"),
      };
    }
    return validLineRange(context.visualRange, context.lineCount)
      ? { ok: true, value: context.visualRange }
      : { ok: false, error: rangeError("Invalid Ex range") };
  }
  if (ast.type === "single") {
    const line = resolveAddress(ast.address, context);
    if (!line.ok) return line;
    return { ok: true, value: { startLine: line.value, endLine: line.value } };
  }

  const start = resolveAddress(ast.start, context);
  if (!start.ok) return start;
  const endContext = ast.separator === ";" ? { ...context, cursorLine: start.value } : context;
  const end = resolveAddress(ast.end, endContext);
  if (!end.ok) return end;
  const range = { startLine: start.value, endLine: end.value };
  return validLineRange(range, context.lineCount)
    ? { ok: true, value: range }
    : { ok: false, error: rangeError("Invalid Ex range") };
}

export function parseExLineRange(
  source: string,
  context: ExRangeContext,
): RangeResult<ParsedExLineRange> {
  let ast: ExLineRangeAst;
  let rest: string;
  let explicit = true;

  if (source.startsWith("%")) {
    ast = { type: "percent" };
    rest = source.slice(1);
    if (/^[+-]\d+/.test(rest) || rest.startsWith(",") || rest.startsWith(";")) {
      return { ok: false, error: rangeError("Invalid Ex range") };
    }
  } else if (source.startsWith("'<,'>")) {
    ast = { type: "visual" };
    rest = source.slice("'<,'>".length);
    if (/^[+-]\d+/.test(rest) || rest.startsWith(",") || rest.startsWith(";")) {
      return { ok: false, error: rangeError("Invalid Ex range") };
    }
  } else {
    const first = addressFromSource(source, { allowDestinationZero: false });
    if (!first.ok) {
      if (/^[.$\d]/.test(source)) return first;
      ast = { type: "implicit" };
      rest = source;
      explicit = false;
    } else {
      rest = first.value.rest;
      const separator = rest[0];
      if (separator === "," || separator === ";") {
        const second = addressFromSource(rest.slice(1), { allowDestinationZero: false });
        if (!second.ok) return { ok: false, error: rangeError("Invalid Ex range") };
        if (second.value.rest.startsWith(",") || second.value.rest.startsWith(";")) {
          return { ok: false, error: rangeError("Invalid Ex range") };
        }
        ast = {
          type: "range",
          start: first.value.ast,
          end: second.value.ast,
          separator,
        };
        rest = second.value.rest;
      } else {
        ast = { type: "single", address: first.value.ast };
      }
    }
  }

  const range = resolveExLineRangeAst(ast, context);
  if (!range.ok) return range;
  return { ok: true, value: { ast, range: range.value, rest, explicit } };
}

export function parseExDestination(
  source: string,
  context: ExRangeContext,
): RangeResult<ParsedExDestination> {
  const rest = source.trim();
  if (rest.length === 0) return { ok: false, error: rangeError("Missing Ex destination") };

  const parsed = addressFromSource(rest, { allowDestinationZero: true });
  if (!parsed.ok) {
    const message =
      parsed.error.message === "Invalid Ex destination"
        ? parsed.error.message
        : "Invalid Ex destination";
    return { ok: false, error: rangeError(message) };
  }
  if (parsed.value.rest.trim().length > 0) {
    if (parsed.value.rest.startsWith(",") || parsed.value.rest.startsWith(";")) {
      return { ok: false, error: rangeError("Invalid Ex destination") };
    }
    return { ok: false, error: rangeError("Unexpected Ex command arguments") };
  }

  const destination = resolveAddress(parsed.value.ast, context);
  if (!destination.ok) {
    return { ok: false, error: rangeError("Invalid Ex destination") };
  }
  if (destination.value < -1 || destination.value >= context.lineCount) {
    return { ok: false, error: rangeError("Invalid Ex destination") };
  }
  return { ok: true, value: { ast: parsed.value.ast, destination: destination.value } };
}

export function resolvedLineRange(range: LineRange): ResolvedLineRange {
  return { type: "line", range };
}

export function resolvedCharacterRange(range: TextRange): ResolvedCharacterRange {
  return { type: "character", range };
}

export function resolvedBlockRange(range: BlockRange): ResolvedBlockRange {
  return { type: "block", range };
}

export function resolvedDestination(destination: number): ResolvedDestination {
  return { type: "destination", destination };
}

export function resolveModalLineRange(range: LineRange): RangeResult<ResolvedLineRange> {
  return { ok: true, value: resolvedLineRange(range) };
}

export function resolveModalCharacterRange(range: TextRange): RangeResult<ResolvedCharacterRange> {
  return { ok: true, value: resolvedCharacterRange(range) };
}

export function resolveModalBlockRange(range: BlockRange): RangeResult<ResolvedBlockRange> {
  return { ok: true, value: resolvedBlockRange(range) };
}
