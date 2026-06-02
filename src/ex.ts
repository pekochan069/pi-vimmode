import type {
  LineRange,
  PromptTransform,
  PromptTransformAction,
  ResolvedVimPromptTransforms,
} from "./types.ts";

export type ExParseContext = {
  lineCount: number;
  cursorLine: number;
  visualRange?: LineRange;
  promptTransforms?: ResolvedVimPromptTransforms;
};

export type ParsedExSubstitution = {
  type: "substitute";
  command: "s" | "substitute";
  range: LineRange;
  rangeExplicit: boolean;
  pattern: string;
  replacement: string;
  global: boolean;
  ignoreCase: boolean;
};

export type ParsedExLineCommand = {
  type: "delete" | "yank" | "put" | "join";
  command: string;
  range: LineRange;
  rangeExplicit: boolean;
};

export type ParsedExDestinationCommand = {
  type: "copy" | "move";
  command: string;
  range: LineRange;
  rangeExplicit: boolean;
  destination: number;
};

export type ParsedExTransformCommand = {
  type: "transform";
  command: string;
  range: LineRange;
  rangeExplicit: boolean;
  transform: PromptTransform;
};

export type ExParseResult =
  | ParsedExSubstitution
  | ParsedExLineCommand
  | ParsedExDestinationCommand
  | ParsedExTransformCommand
  | { type: "nohlsearch"; command: "noh" | "nohlsearch" }
  | { type: "empty" }
  | { type: "error"; message: string };

type RangeParseResult =
  | { ok: true; range: LineRange; rest: string; explicit: boolean }
  | { ok: false; message: string };

type DestinationParseResult = { ok: true; destination: number } | { ok: false; message: string };

type ParsedCommandName =
  | "s"
  | "substitute"
  | "d"
  | "delete"
  | "y"
  | "yank"
  | "pu"
  | "put"
  | "t"
  | "copy"
  | "m"
  | "move"
  | "j"
  | "join"
  | "quote"
  | "unquote"
  | "bulletize"
  | "fence"
  | "indent"
  | "dedent"
  | "reflow"
  | "noh"
  | "nohlsearch";

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
      ? { ok: true, range, rest: source.slice(1), explicit: true }
      : { ok: false, message: "Invalid Ex range" };
  }

  if (source.startsWith("'<,'>")) {
    if (!context.visualRange)
      return { ok: false, message: "Visual range marker requires captured visual range" };
    return {
      ok: true,
      range: context.visualRange,
      rest: source.slice("'<,'>".length),
      explicit: true,
    };
  }

  const first = parseAddress(source, context);
  if (!first) {
    const range = { startLine: context.cursorLine, endLine: context.cursorLine };
    return validRange(range, context.lineCount)
      ? { ok: true, range, rest: source, explicit: false }
      : { ok: false, message: "Invalid Ex range" };
  }

  if (!first.rest.startsWith(",")) {
    const range = { startLine: first.line, endLine: first.line };
    return validRange(range, context.lineCount)
      ? { ok: true, range, rest: first.rest, explicit: true }
      : { ok: false, message: "Invalid Ex range" };
  }

  const second = parseAddress(first.rest.slice(1), context);
  if (!second) return { ok: false, message: "Invalid Ex range" };
  const range = { startLine: first.line, endLine: second.line };
  return validRange(range, context.lineCount)
    ? { ok: true, range, rest: second.rest, explicit: true }
    : { ok: false, message: "Invalid Ex range" };
}

type ParsedCommandType =
  | "substitute"
  | "delete"
  | "yank"
  | "put"
  | "copy"
  | "move"
  | "join"
  | "transform"
  | "nohlsearch";

type ParsedCommand = {
  name: string;
  type: ParsedCommandType;
  transformAction?: PromptTransformAction;
};

function transformActionForCommand(
  command: string,
  promptTransforms: ResolvedVimPromptTransforms | undefined,
): PromptTransformAction | undefined {
  const config = promptTransforms;
  if (config?.enabled === false) return undefined;
  const commands = config?.commands;
  for (const action of [
    "quote",
    "unquote",
    "bulletize",
    "fence",
    "indent",
    "dedent",
    "reflow",
  ] as const) {
    if (config?.actions[action] === false) continue;
    const names = commands?.[action] ?? [action];
    if (names.includes(command)) return action;
  }
  return undefined;
}

function commandType(command: ParsedCommandName): ParsedCommandType {
  switch (command) {
    case "s":
    case "substitute":
      return "substitute";
    case "d":
    case "delete":
      return "delete";
    case "y":
    case "yank":
      return "yank";
    case "pu":
    case "put":
      return "put";
    case "t":
    case "copy":
      return "copy";
    case "m":
    case "move":
      return "move";
    case "j":
    case "join":
      return "join";
    case "quote":
    case "unquote":
    case "bulletize":
    case "fence":
    case "indent":
    case "dedent":
    case "reflow":
      return "transform";
    case "noh":
    case "nohlsearch":
      return "nohlsearch";
  }
}

function parseCommand(
  source: string,
  context: ExParseContext,
): { ok: true; command: ParsedCommand; rest: string } | { ok: false; message: string } {
  const trimmed = source.trimStart();
  const name = /^[A-Za-z]+/.exec(trimmed)?.[0];
  if (!name) return { ok: false, message: `Unsupported Ex command: ${trimmed[0] ?? ""}` };

  const supported = new Set<string>([
    "s",
    "substitute",
    "d",
    "delete",
    "y",
    "yank",
    "pu",
    "put",
    "t",
    "copy",
    "m",
    "move",
    "j",
    "join",
    "quote",
    "unquote",
    "bulletize",
    "fence",
    "indent",
    "dedent",
    "reflow",
    "noh",
    "nohlsearch",
  ]);
  if (supported.has(name)) {
    const type = commandType(name as ParsedCommandName);
    if (type !== "transform")
      return { ok: true, command: { name, type }, rest: trimmed.slice(name.length) };
  }
  const transformAction = transformActionForCommand(name, context.promptTransforms);
  if (transformAction) {
    return {
      ok: true,
      command: { name, type: "transform", transformAction },
      rest: trimmed.slice(name.length),
    };
  }
  return { ok: false, message: `Unsupported Ex command: ${name}` };
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

function parseSubstitutionArgs(
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

function parseDestinationAddress(source: string, context: ExParseContext): DestinationParseResult {
  const rest = source.trim();
  if (rest.length === 0) return { ok: false, message: "Missing Ex destination" };

  let destination: number;
  let tail = "";
  if (rest[0] === ".") {
    destination = context.cursorLine;
    tail = rest.slice(1);
  } else if (rest[0] === "$") {
    destination = context.lineCount - 1;
    tail = rest.slice(1);
  } else {
    const numeric = /^\d+/.exec(rest);
    if (!numeric) return { ok: false, message: "Invalid Ex destination" };
    destination = Number(numeric[0]) - 1;
    tail = rest.slice(numeric[0].length);
  }

  if (tail.trim().length > 0) return { ok: false, message: "Unexpected Ex command arguments" };
  if (destination < -1 || destination >= context.lineCount)
    return { ok: false, message: "Invalid Ex destination" };
  return { ok: true, destination };
}

function rejectTrailingArgs(rest: string): ExParseResult | undefined {
  return rest.trim().length > 0
    ? { type: "error", message: "Unexpected Ex command arguments" }
    : undefined;
}

function parseTransformArgs(
  action: PromptTransformAction,
  rest: string,
): { ok: true; transform: PromptTransform } | { ok: false; message: string } {
  const args = rest.trim();
  if (action === "fence") {
    if (/\s/.test(args)) return { ok: false, message: "Invalid fence language" };
    return {
      ok: true,
      transform: args ? { action: "fence", language: args } : { action: "fence" },
    };
  }
  if (action === "reflow") {
    if (args.length === 0) return { ok: true, transform: { action: "reflow" } };
    if (!/^\d+$/.test(args)) return { ok: false, message: "Invalid reflow width" };
    const width = Number(args);
    if (width < 20 || width > 240) return { ok: false, message: "Invalid reflow width" };
    return { ok: true, transform: { action: "reflow", width } };
  }
  if (args.length > 0) return { ok: false, message: "Unexpected Ex command arguments" };
  if (
    action === "quote" ||
    action === "unquote" ||
    action === "bulletize" ||
    action === "indent" ||
    action === "dedent"
  ) {
    return { ok: true, transform: { action } };
  }
  return { ok: false, message: "Unsupported Ex command" };
}

export function parseExCommand(commandLine: string, context: ExParseContext): ExParseResult {
  const source = commandLine.trim();
  if (source.length === 0) return { type: "empty" };

  const range = parseRange(source, context);
  if (!range.ok) return { type: "error", message: range.message };

  const command = parseCommand(range.rest, context);
  if (!command.ok) return { type: "error", message: command.message };

  const type = command.command.type;
  if (type === "substitute") {
    const args = parseSubstitutionArgs(command.rest);
    if (!args.ok) return { type: "error", message: args.message };
    return {
      type,
      command: command.command.name as "s" | "substitute",
      range: range.range,
      rangeExplicit: range.explicit,
      pattern: args.pattern,
      replacement: args.replacement,
      global: args.global,
      ignoreCase: args.ignoreCase,
    };
  }

  if (type === "copy" || type === "move") {
    const destination = parseDestinationAddress(command.rest, context);
    if (!destination.ok) return { type: "error", message: destination.message };
    return {
      type,
      command: command.command.name,
      range: range.range,
      rangeExplicit: range.explicit,
      destination: destination.destination,
    };
  }

  if (type === "transform") {
    const transformAction = command.command.transformAction;
    if (!transformAction) return { type: "error", message: "Unsupported Ex command" };
    const transform = parseTransformArgs(transformAction, command.rest);
    if (!transform.ok) return { type: "error", message: transform.message };
    return {
      type,
      command: command.command.name,
      range: range.range,
      rangeExplicit: range.explicit,
      transform: transform.transform,
    };
  }

  const trailingError = rejectTrailingArgs(command.rest);
  if (trailingError) return trailingError;

  if (type === "nohlsearch") {
    return { type, command: command.command.name as "noh" | "nohlsearch" };
  }

  return {
    type,
    command: command.command.name,
    range: range.range,
    rangeExplicit: range.explicit,
  };
}

export function parseExSubstitution(commandLine: string, context: ExParseContext): ExParseResult {
  return parseExCommand(commandLine, context);
}
