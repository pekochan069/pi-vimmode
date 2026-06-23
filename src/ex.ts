import type { ActiveRegisterTarget } from "./modal/types.ts";
import type {
  LineRange,
  PromptTransform,
  PromptTransformAction,
  ResolvedVimPromptTransforms,
} from "./types.ts";

import { normalizePromptTransformActionArgs } from "./prompt-transform-actions.ts";
import { parseExDestination, parseExLineRange } from "./range.ts";

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
  countOnly: boolean;
  noError: boolean;
  matcherMode: "literal" | "regex";
};

export type ParsedExRepeatSubstitution = {
  type: "repeatSubstitute";
  command: "&" | "&&";
  range: LineRange;
  rangeExplicit: boolean;
};

export type ParsedExRegisterOperand = ActiveRegisterTarget;

export type ParsedExLineCommand = {
  type: "delete" | "yank" | "put" | "join";
  command: string;
  range: LineRange;
  rangeExplicit: boolean;
  register?: ParsedExRegisterOperand;
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

export type ParsedExDiagnosticCommand = {
  type: "diagnostic";
  command: "vimdoctor" | "keymap" | "mapcheck" | "actions";
  query?: string;
};

export type ParsedExRuntimeHelpCommand = {
  type: "runtimeHelp";
  command: "help" | "features" | "messages";
  query?: string;
};

export type ParsedExKeybindingsCommand = {
  type: "keybindings";
  command: "keybindings";
  query?: string;
};

export type ParsedExInspectCommand = {
  type: "inspect";
  command: "vimmode";
  query: "inspect";
};

export type ParsedExQuitCommand = {
  type: "quit";
  command: "q" | "quit";
  range: LineRange;
  rangeExplicit: boolean;
};

export type ExParseResult =
  | ParsedExSubstitution
  | ParsedExRepeatSubstitution
  | ParsedExLineCommand
  | ParsedExDestinationCommand
  | ParsedExTransformCommand
  | ParsedExDiagnosticCommand
  | ParsedExRuntimeHelpCommand
  | ParsedExKeybindingsCommand
  | ParsedExInspectCommand
  | { type: "nohlsearch"; command: "noh" | "nohlsearch" }
  | ParsedExQuitCommand
  | { type: "lineJump"; range: LineRange; line: number }
  | { type: "empty" }
  | { type: "error"; message: string };

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
  | "vimdoctor"
  | "keymap"
  | "mapcheck"
  | "actions"
  | "help"
  | "features"
  | "messages"
  | "keybindings"
  | "vimmode"
  | "noh"
  | "nohlsearch"
  | "q"
  | "quit";

type ParsedCommandType =
  | "substitute"
  | "delete"
  | "yank"
  | "put"
  | "copy"
  | "move"
  | "join"
  | "transform"
  | "diagnostic"
  | "runtimeHelp"
  | "keybindings"
  | "inspect"
  | "nohlsearch"
  | "quit";

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
    case "vimdoctor":
    case "keymap":
    case "mapcheck":
    case "actions":
      return "diagnostic";
    case "help":
    case "features":
    case "messages":
      return "runtimeHelp";
    case "keybindings":
      return "keybindings";
    case "vimmode":
      return "inspect";
    case "noh":
    case "nohlsearch":
      return "nohlsearch";
    case "q":
    case "quit":
      return "quit";
  }
}

export type ExCommandSuggestionKind = ParsedCommandType | "repeatSubstitute";

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
    "vimdoctor",
    "keymap",
    "mapcheck",
    "actions",
    "help",
    "features",
    "messages",
    "keybindings",
    "vimmode",
    "noh",
    "nohlsearch",
    "q",
    "quit",
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

function parseSubstitutionArgs(source: string):
  | {
      ok: true;
      pattern: string;
      replacement: string;
      global: boolean;
      ignoreCase: boolean;
      countOnly: boolean;
      noError: boolean;
      matcherMode: "literal" | "regex";
    }
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
      countOnly: false,
      noError: false,
      matcherMode: "literal",
    };
  }

  let global = false;
  let ignoreCase = false;
  let countOnly = false;
  let noError = false;
  let matcherMode: "literal" | "regex" = "literal";
  for (const flag of replacement.rest) {
    if (flag === "g") global = true;
    else if (flag === "i") ignoreCase = true;
    else if (flag === "r") matcherMode = "regex";
    else if (flag === "n") countOnly = true;
    else if (flag === "e") noError = true;
    else return { ok: false, message: `Unsupported substitution flag: ${flag}` };
  }
  return {
    ok: true,
    pattern: pattern.value,
    replacement: replacement.value,
    global,
    ignoreCase,
    countOnly,
    noError,
    matcherMode,
  };
}

function rejectTrailingArgs(rest: string): ExParseResult | undefined {
  return rest.trim().length > 0
    ? { type: "error", message: "Unexpected Ex command arguments" }
    : undefined;
}

function parseRegisterOperand(
  rest: string,
): { ok: true; register?: ParsedExRegisterOperand } | { ok: false; message: string } {
  const operand = rest.trim();
  if (operand.length === 0) return { ok: true };
  if (operand.length !== 1) return { ok: false, message: "Invalid Ex register operand" };
  if (/^[A-Za-z]$/.test(operand)) {
    return {
      ok: true,
      register: {
        kind: "named",
        slot: operand.toLowerCase(),
        append: operand >= "A" && operand <= "Z",
      },
    };
  }
  if (operand === '"') return { ok: true, register: { kind: "unnamed" } };
  if (operand === "_") return { ok: true, register: { kind: "blackHole" } };
  if (operand === "+" || operand === "*") {
    return { ok: true, register: { kind: "clipboard", slot: operand } };
  }
  return { ok: false, message: "Invalid Ex register operand" };
}

function parseTransformArgs(
  action: PromptTransformAction,
  rest: string,
): { ok: true; transform: PromptTransform } | { ok: false; message: string } {
  return normalizePromptTransformActionArgs({ source: "ex", action, rest });
}

export function parseExCommand(commandLine: string, context: ExParseContext): ExParseResult {
  const source = commandLine.trim();
  if (source.length === 0) return { type: "empty" };

  const range = parseExLineRange(source, context);
  if (!range.ok) return { type: "error", message: range.error.message };

  const repeat = range.value.rest.trim();
  if (repeat === "&" || repeat === "&&") {
    return {
      type: "repeatSubstitute",
      command: repeat,
      range: range.value.range,
      rangeExplicit: range.value.explicit,
    };
  }

  if (repeat.length === 0 && range.value.explicit) {
    const ast = range.value.ast;
    if (ast.type === "single") {
      return {
        type: "lineJump",
        range: range.value.range,
        line: range.value.range.startLine,
      };
    }
    if (ast.type === "percent" || ast.type === "range" || ast.type === "visual") {
      return { type: "error", message: "Unsupported Ex command" };
    }
  }

  const command = parseCommand(range.value.rest, context);
  if (!command.ok) return { type: "error", message: command.message };

  const type = command.command.type;
  if (type === "substitute") {
    const args = parseSubstitutionArgs(command.rest);
    if (!args.ok) return { type: "error", message: args.message };
    return {
      type,
      command: command.command.name as "s" | "substitute",
      range: range.value.range,
      rangeExplicit: range.value.explicit,
      pattern: args.pattern,
      replacement: args.replacement,
      global: args.global,
      ignoreCase: args.ignoreCase,
      countOnly: args.countOnly,
      noError: args.noError,
      matcherMode: args.matcherMode,
    };
  }

  if (type === "copy" || type === "move") {
    const destination = parseExDestination(command.rest, context);
    if (!destination.ok) return { type: "error", message: destination.error.message };
    return {
      type,
      command: command.command.name,
      range: range.value.range,
      rangeExplicit: range.value.explicit,
      destination: destination.value.destination,
    };
  }

  if (type === "diagnostic") {
    const args = command.rest.trim();
    const name = command.command.name as ParsedExDiagnosticCommand["command"];
    if (name === "vimdoctor" && args.length > 0) {
      return { type: "error", message: "Unexpected Ex command arguments" };
    }
    if (name === "mapcheck" && args.length === 0) {
      return { type: "error", message: "Missing mapcheck key" };
    }
    return args.length > 0 ? { type, command: name, query: args } : { type, command: name };
  }

  if (type === "runtimeHelp") {
    const args = command.rest.trim();
    const name = command.command.name as ParsedExRuntimeHelpCommand["command"];
    if (name === "messages" && args.length > 0) {
      return { type: "error", message: "Unexpected Ex command arguments" };
    }
    return args.length > 0 ? { type, command: name, query: args } : { type, command: name };
  }

  if (type === "keybindings") {
    const args = command.rest.trim();
    return args.length > 0
      ? { type, command: "keybindings", query: args }
      : { type, command: "keybindings" };
  }

  if (type === "inspect") {
    const args = command.rest.trim();
    if (args !== "inspect") return { type: "error", message: "Unexpected Ex command arguments" };
    return { type, command: "vimmode", query: "inspect" };
  }

  if (type === "transform") {
    const transformAction = command.command.transformAction;
    if (!transformAction) return { type: "error", message: "Unsupported Ex command" };
    const transform = parseTransformArgs(transformAction, command.rest);
    if (!transform.ok) return { type: "error", message: transform.message };
    return {
      type,
      command: command.command.name,
      range: range.value.range,
      rangeExplicit: range.value.explicit,
      transform: transform.transform,
    };
  }

  if (type === "delete" || type === "yank" || type === "put") {
    const register = parseRegisterOperand(command.rest);
    if (!register.ok) return { type: "error", message: register.message };
    return {
      type,
      command: command.command.name,
      range: range.value.range,
      rangeExplicit: range.value.explicit,
      ...(register.register ? { register: register.register } : {}),
    };
  }

  const trailingError = rejectTrailingArgs(command.rest);
  if (trailingError) return trailingError;

  if (type === "nohlsearch") {
    return { type, command: command.command.name as "noh" | "nohlsearch" };
  }

  if (type === "quit") {
    const trailingError = rejectTrailingArgs(command.rest);
    if (trailingError) return trailingError;
    return {
      type,
      command: command.command.name as "q" | "quit",
      range: range.value.range,
      rangeExplicit: range.value.explicit,
    };
  }

  return {
    type,
    command: command.command.name,
    range: range.value.range,
    rangeExplicit: range.value.explicit,
  };
}

export function parseExSubstitution(commandLine: string, context: ExParseContext): ExParseResult {
  return parseExCommand(commandLine, context);
}

function stableUnique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

const CANDIDATE_NAMES_BY_COMMAND_TYPE: Record<string, string[]> = {
  substitute: ["s", "substitute"],
  delete: ["d", "delete"],
  yank: ["y", "yank"],
  put: ["pu", "put"],
  copy: ["t", "copy"],
  move: ["m", "move"],
  join: ["j", "join"],
  nohlsearch: ["noh", "nohlsearch"],
  quit: ["q", "quit"],
  repeatSubstitute: ["&", "&&"],
  lineJump: [] as string[],
  diagnostic: ["vimdoctor", "keymap", "mapcheck", "actions"],
  runtimeHelp: ["help", "features", "messages"],
  keybindings: ["keybindings"],
  inspect: ["vimmode"],
  transform: [] as string[],
};

function resolvedTransformCommandAliases(promptTransforms?: ResolvedVimPromptTransforms): string[] {
  if (promptTransforms?.enabled === false) return [];
  const commands = promptTransforms?.commands;
  const actions: Array<{
    action: PromptTransformAction;
    enabled?: boolean;
    commandNames: readonly string[];
  }> = [
    {
      action: "quote",
      enabled: promptTransforms?.actions.quote,
      commandNames: commands?.quote ?? ["quote"],
    },
    {
      action: "unquote",
      enabled: promptTransforms?.actions.unquote,
      commandNames: commands?.unquote ?? ["unquote"],
    },
    {
      action: "bulletize",
      enabled: promptTransforms?.actions.bulletize,
      commandNames: commands?.bulletize ?? ["bulletize"],
    },
    {
      action: "fence",
      enabled: promptTransforms?.actions.fence,
      commandNames: commands?.fence ?? ["fence"],
    },
    {
      action: "indent",
      enabled: promptTransforms?.actions.indent,
      commandNames: commands?.indent ?? ["indent"],
    },
    {
      action: "dedent",
      enabled: promptTransforms?.actions.dedent,
      commandNames: commands?.dedent ?? ["dedent"],
    },
    {
      action: "reflow",
      enabled: promptTransforms?.actions.reflow,
      commandNames: commands?.reflow ?? ["reflow"],
    },
  ];

  const names: string[] = [];
  for (const entry of actions) {
    if (entry.enabled === false) continue;
    for (const name of entry.commandNames) {
      names.push(name);
    }
  }
  return names;
}

const allBuiltInCandidateNames = Object.values(CANDIDATE_NAMES_BY_COMMAND_TYPE).flat().sort();

export function suggestExCommands(commandLine: string, context: ExParseContext): string[] {
  const source = commandLine.trim();
  if (source.length === 0) {
    return stableUnique([
      ...allBuiltInCandidateNames,
      ...resolvedTransformCommandAliases(context.promptTransforms),
    ]).sort();
  }

  const range = parseExLineRange(source, context);
  const commandSource = range.ok ? range.value.rest.trim() : source;
  if (!/^[A-Za-z&]+$/.test(commandSource)) return [];

  const allCandidates = stableUnique([
    ...allBuiltInCandidateNames,
    ...resolvedTransformCommandAliases(context.promptTransforms),
  ]);
  if (commandSource.length === 0) return allCandidates;

  const prefix = commandSource;
  return stableUnique(allCandidates.filter((candidate) => candidate.startsWith(prefix))).sort();
}
