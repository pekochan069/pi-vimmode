import type { LineRange } from "./types.ts";

export type ExParseContext = {
  lineCount: number;
  cursorLine: number;
  visualRange?: LineRange;
};

export type ParsedExSubstitution = {
  type: "substitute";
  command: "s" | "substitute";
  range: LineRange;
  pattern: string;
  replacement: string;
  global: boolean;
  ignoreCase: boolean;
};

export type ExParseResult =
  | ParsedExSubstitution
  | { type: "empty" }
  | { type: "error"; message: string };

type RangeParseResult =
  | { ok: true; range: LineRange; rest: string }
  | { ok: false; message: string };

function validRange(range: LineRange, lineCount: number): boolean {
  return (
    range.startLine >= 0 &&
    range.endLine >= 0 &&
    range.startLine < lineCount &&
    range.endLine < lineCount &&
    range.startLine <= range.endLine
  );
}

function parseAddress(
  source: string,
  context: ExParseContext,
): { line: number; rest: string } | undefined {
  if (source.startsWith("'<,'>")) return undefined;
  const first = source[0];
  if (first === ".") return { line: context.cursorLine, rest: source.slice(1) };
  if (first === "$") return { line: context.lineCount - 1, rest: source.slice(1) };
  const numeric = /^\d+/.exec(source);
  if (numeric) return { line: Number(numeric[0]) - 1, rest: source.slice(numeric[0].length) };
  return undefined;
}

function parseRange(source: string, context: ExParseContext): RangeParseResult {
  if (source.startsWith("%")) {
    const range = { startLine: 0, endLine: context.lineCount - 1 };
    return validRange(range, context.lineCount)
      ? { ok: true, range, rest: source.slice(1) }
      : { ok: false, message: "Invalid Ex range" };
  }

  if (source.startsWith("'<,'>")) {
    if (!context.visualRange)
      return { ok: false, message: "Visual range marker requires captured visual range" };
    return { ok: true, range: context.visualRange, rest: source.slice("'<,'>".length) };
  }

  const first = parseAddress(source, context);
  if (!first) {
    const range = { startLine: context.cursorLine, endLine: context.cursorLine };
    return validRange(range, context.lineCount)
      ? { ok: true, range, rest: source }
      : { ok: false, message: "Invalid Ex range" };
  }

  if (!first.rest.startsWith(",")) {
    const range = { startLine: first.line, endLine: first.line };
    return validRange(range, context.lineCount)
      ? { ok: true, range, rest: first.rest }
      : { ok: false, message: "Invalid Ex range" };
  }

  const second = parseAddress(first.rest.slice(1), context);
  if (!second) return { ok: false, message: "Invalid Ex range" };
  const range = { startLine: first.line, endLine: second.line };
  return validRange(range, context.lineCount)
    ? { ok: true, range, rest: second.rest }
    : { ok: false, message: "Invalid Ex range" };
}

function parseCommand(
  source: string,
): { ok: true; command: "s" | "substitute"; rest: string } | { ok: false; message: string } {
  if (source.startsWith("substitute"))
    return { ok: true, command: "substitute", rest: source.slice(10) };
  const name = /^[A-Za-z]+/.exec(source)?.[0];
  if (name) {
    if (name === "s") return { ok: true, command: "s", rest: source.slice(1) };
    return { ok: false, message: `Unsupported Ex command: ${name}` };
  }
  if (source.startsWith("s")) return { ok: true, command: "s", rest: source.slice(1) };
  return { ok: false, message: `Unsupported Ex command: ${source[0] ?? ""}` };
}

function isValidDelimiter(delimiter: string | undefined): delimiter is string {
  return Boolean(
    delimiter &&
    delimiter.length === 1 &&
    delimiter.charCodeAt(0) >= 32 &&
    !/[A-Za-z0-9\s\\]/.test(delimiter),
  );
}

function readDelimited(
  source: string,
  delimiter: string,
): { value: string; rest: string; closed: boolean } {
  let value = "";
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === "\\") {
      const next = source[index + 1];
      if (next === delimiter || next === "\\") {
        value += next;
        index++;
      } else {
        value += char;
      }
      continue;
    }
    if (char === delimiter) return { value, rest: source.slice(index + 1), closed: true };
    value += char;
  }
  return { value, rest: "", closed: false };
}

function parseArgs(
  source: string,
):
  | { ok: true; pattern: string; replacement: string; global: boolean; ignoreCase: boolean }
  | { ok: false; message: string } {
  const delimiter = source[0];
  if (!isValidDelimiter(delimiter)) return { ok: false, message: "Invalid substitution delimiter" };

  const pattern = readDelimited(source.slice(1), delimiter);
  if (!pattern.closed) return { ok: false, message: "Invalid substitution syntax" };
  if (pattern.value.length === 0)
    return { ok: false, message: "Substitution pattern cannot be empty" };

  const replacement = readDelimited(pattern.rest, delimiter);
  if (!replacement.closed) {
    return {
      ok: true,
      pattern: pattern.value,
      replacement: replacement.value,
      global: false,
      ignoreCase: false,
    };
  }

  let global = false;
  let ignoreCase = false;
  for (const flag of replacement.rest) {
    if (flag === "g") global = true;
    else if (flag === "i") ignoreCase = true;
    else return { ok: false, message: `Unsupported substitution flag: ${flag}` };
  }
  return { ok: true, pattern: pattern.value, replacement: replacement.value, global, ignoreCase };
}

export function parseExSubstitution(commandLine: string, context: ExParseContext): ExParseResult {
  const source = commandLine.trim();
  if (source.length === 0) return { type: "empty" };

  const range = parseRange(source, context);
  if (!range.ok) return { type: "error", message: range.message };

  const command = parseCommand(range.rest);
  if (!command.ok) return { type: "error", message: command.message };

  const args = parseArgs(command.rest);
  if (!args.ok) return { type: "error", message: args.message };

  return {
    type: "substitute",
    command: command.command,
    range: range.range,
    pattern: args.pattern,
    replacement: args.replacement,
    global: args.global,
    ignoreCase: args.ignoreCase,
  };
}
