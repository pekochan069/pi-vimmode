import type { BindablePromptTransformActionId } from "./prompt-transform-actions.ts";
import type {
  CommandResult,
  NormalCommand,
  PendingOperator,
  PromptTransform,
  ResolvedVimKeymap,
  VimCommandAction,
  VimMotion,
  VimMotionAction,
  VimMotionOperatorAction,
  VimOperator,
  VimOperatorAction,
  VimTextObject,
  VimTextObjectKind,
  VimTextObjectTarget,
} from "./types.ts";

import { DEFAULT_VIM_KEYMAP } from "./config.ts";
import {
  deriveActionsWhere,
  deriveLegacyActionToKey,
  deriveLegacyKeyToAction,
  KEYMAP_COMMAND_DESCRIPTORS,
  KEYMAP_MOTION_DESCRIPTORS,
  KEYMAP_OPERATOR_DESCRIPTORS,
} from "./keymap-descriptors.ts";

const LEGACY_VIM_OPERATORS = new Set<string>(
  Object.keys(deriveLegacyKeyToAction(KEYMAP_OPERATOR_DESCRIPTORS)),
);
const LINE_ONLY_OPERATORS = new Set<VimOperatorAction>(["indent", "dedent"]);
const LEGACY_OPERATOR_MOTIONS = new Set<string>(
  Object.keys(deriveLegacyKeyToAction(KEYMAP_MOTION_DESCRIPTORS)),
);
const OPERATOR_MOTION_SEPARATOR = "\u0000motion\u0000";
const OPERATOR_LINE_SEPARATOR = "\u0000line\u0000";
const OPERATOR_SEARCH_SEPARATOR = "\u0000search\u0000";
const OPERATOR_CHAR_SEARCH_SEPARATOR = "\u0000opchar\u0000";
const OPERATOR_CHAR_SEARCH_REPEAT_SEPARATOR = "\u0000opcharrepeat\u0000";
const COUNT_SEPARATOR = "\u0000count\u0000";
const CHAR_COMMAND_SEPARATOR = "\u0000char\u0000";
const TEXT_OBJECT_SEPARATOR = "\u0000textobj\u0000";

export type SemanticCommandResult =
  | { type: "pending"; pending: string }
  | { type: "motion"; motion: VimMotionAction; count?: number }
  | { type: "command"; command: VimCommandAction; count?: number }
  | {
      type: "action";
      actionId: BindablePromptTransformActionId;
      args: PromptTransform;
      count?: number;
    }
  | { type: "charCommand"; command: VimCommandAction; char: string; count?: number }
  | { type: "lineCommand"; operator: VimOperatorAction; count?: number }
  | {
      type: "operatorMotion";
      operator: VimMotionOperatorAction;
      motion: VimMotionAction;
      count?: number;
    }
  | {
      type: "operatorSearch";
      operator: VimMotionOperatorAction;
      direction: "forward" | "backward";
      count?: number;
    }
  | {
      type: "operatorCharSearch";
      operator: VimMotionOperatorAction;
      command: Extract<
        VimCommandAction,
        "findCharForward" | "findCharBackward" | "tillCharForward" | "tillCharBackward"
      >;
      char: string;
      count?: number;
    }
  | {
      type: "operatorCharSearchRepeat";
      operator: VimMotionOperatorAction;
      reverse: boolean;
      count?: number;
    }
  | {
      type: "operatorTextObject";
      operator: VimMotionOperatorAction;
      textObject: VimTextObject;
      count?: number;
    }
  | { type: "invalid" }
  | { type: "none" };

export type MacroTarget = "record" | "play";

export type MacroCommandResult =
  | { type: "pendingMacro"; target: MacroTarget }
  | { type: "startRecording"; slot: string }
  | { type: "stopRecording" }
  | { type: "playMacro"; slot: string }
  | { type: "repeatMacro" }
  | { type: "invalid" }
  | { type: "none" };

type Binding =
  | { sequence: string; kind: "operator"; operator: VimOperatorAction }
  | { sequence: string; kind: "motion"; motion: VimMotionAction }
  | { sequence: string; kind: "command"; command: VimCommandAction }
  | {
      sequence: string;
      kind: "action";
      actionId: BindablePromptTransformActionId;
      args: PromptTransform;
    };

type CompiledKeymap = {
  exactBindings: Map<string, Binding>;
  longerPrefixes: Set<string>;
  motions: {
    exact: Map<string, VimMotionAction>;
    longerPrefixes: Set<string>;
  };
  operators: Map<
    VimOperatorAction,
    {
      exact: Set<string>;
      longerPrefixes: Set<string>;
    }
  >;
  textObjects: {
    kinds: Map<string, VimTextObjectKind>;
    targets: Map<string, VimTextObjectTarget>;
  };
  commands: {
    searchDirections: Map<string, "forward" | "backward">;
    searchLongerPrefixes: Set<string>;
    charSearch: Map<string, OperatorCharSearchCommand>;
    charSearchLongerPrefixes: Set<string>;
    repeatCharSearch: Map<
      string,
      Extract<VimCommandAction, "repeatCharSearch" | "repeatCharSearchReverse">
    >;
    repeatCharSearchLongerPrefixes: Set<string>;
  };
};

type EncodedCountPending = { type: "count"; count: string; inner: string };
type EncodedCharCommandPending = { type: "charCommand"; command: VimCommandAction; count?: number };
type EncodedTextObjectPending = {
  type: "textObject";
  operatorSequence: string;
  kind: VimTextObjectKind;
  count?: number;
};
type EncodedOperatorMotionPending = {
  type: "operatorMotion";
  operatorSequence: string;
  motionPrefix: string;
  count?: number;
};
type EncodedOperatorLinePending = {
  type: "operatorLine";
  operatorSequence: string;
  repeatPrefix: string;
  count?: number;
};
type EncodedOperatorSearchPending = {
  type: "operatorSearch";
  operatorSequence: string;
  searchPrefix: string;
  count?: number;
};
type OperatorCharSearchCommand = Extract<
  VimCommandAction,
  "findCharForward" | "findCharBackward" | "tillCharForward" | "tillCharBackward"
>;
type EncodedOperatorCharSearchPending = {
  type: "operatorCharSearch";
  operatorSequence: string;
  commandPrefix: string;
  count?: number;
  targetCount?: number;
  command?: OperatorCharSearchCommand;
};
type EncodedOperatorCharSearchRepeatPending = {
  type: "operatorCharSearchRepeat";
  operatorSequence: string;
  repeatPrefix: string;
  count?: number;
};

const LEGACY_OPERATOR_TO_ACTION = deriveLegacyKeyToAction(KEYMAP_OPERATOR_DESCRIPTORS) as Record<
  VimOperator,
  VimOperatorAction
>;
const ACTION_TO_LEGACY_OPERATOR = deriveLegacyActionToKey(KEYMAP_OPERATOR_DESCRIPTORS) as Record<
  VimMotionOperatorAction,
  VimOperator
>;
const LEGACY_MOTION_TO_ACTION = deriveLegacyKeyToAction(KEYMAP_MOTION_DESCRIPTORS) as Record<
  VimMotion,
  VimMotionAction
>;
const ACTION_TO_LEGACY_MOTION = deriveLegacyActionToKey(KEYMAP_MOTION_DESCRIPTORS) as Partial<
  Record<VimMotionAction, VimMotion>
>;

const CHAR_ARGUMENT_ACTIONS = deriveActionsWhere(
  KEYMAP_COMMAND_DESCRIPTORS,
  (descriptor) => "charArgument" in descriptor && Boolean(descriptor.charArgument),
) as VimCommandAction[];
const OPERATOR_CHAR_SEARCH_ACTIONS = deriveActionsWhere(
  KEYMAP_COMMAND_DESCRIPTORS,
  (descriptor) => "operatorCharSearch" in descriptor && Boolean(descriptor.operatorCharSearch),
) as OperatorCharSearchCommand[];
const REPEAT_CHAR_SEARCH_ACTIONS = deriveActionsWhere(
  KEYMAP_COMMAND_DESCRIPTORS,
  (descriptor) => "repeatCharSearch" in descriptor && Boolean(descriptor.repeatCharSearch),
) as Extract<VimCommandAction, "repeatCharSearch" | "repeatCharSearchReverse">[];
const SEARCH_ENTRY_ACTIONS = deriveActionsWhere(
  KEYMAP_COMMAND_DESCRIPTORS,
  (descriptor) => "searchDirection" in descriptor && Boolean(descriptor.searchDirection),
) as Extract<VimCommandAction, "startSearch" | "startSearchBackward">[];

const CHAR_ARGUMENT_COMMANDS = new Set<VimCommandAction>(CHAR_ARGUMENT_ACTIONS);
function isPrintableCharArgument(key: string): boolean {
  return key.length === 1 && key.charCodeAt(0) >= 32 && key.charCodeAt(0) !== 127;
}

function textObjectKindForKey(
  key: string,
  keymap: ResolvedVimKeymap,
): VimTextObjectKind | undefined {
  return compiledKeymapFor(keymap).textObjects.kinds.get(key);
}

function textObjectTargetForKey(
  key: string,
  keymap: ResolvedVimKeymap,
): VimTextObjectTarget | undefined {
  return compiledKeymapFor(keymap).textObjects.targets.get(key);
}

function isLegacyVimOperator(key: string): key is VimOperator {
  return LEGACY_VIM_OPERATORS.has(key);
}

function isLegacyVimMotion(key: string): key is VimMotion {
  return LEGACY_OPERATOR_MOTIONS.has(key);
}

function lineCommandFor(operator: VimOperator): NormalCommand {
  if (operator === "d") return "dd";
  if (operator === "c") return "cc";
  return "yy";
}

function addLongerPrefixes(prefixes: Set<string>, sequence: string): void {
  for (let index = 1; index < sequence.length; index += 1) prefixes.add(sequence.slice(0, index));
}

function setFirstBinding(bindings: Map<string, Binding>, binding: Binding): void {
  if (!bindings.has(binding.sequence)) bindings.set(binding.sequence, binding);
}

function setFirstValue<K, V>(map: Map<K, V>, key: K, value: V): void {
  if (!map.has(key)) map.set(key, value);
}

function compileCommandFamily(
  keymap: ResolvedVimKeymap,
  commands: readonly VimCommandAction[],
  setExact: (sequence: string, command: VimCommandAction) => void,
  prefixes: Set<string>,
): void {
  for (const command of commands) {
    for (const sequence of keymap.commands[command]) {
      setExact(sequence, command);
      addLongerPrefixes(prefixes, sequence);
    }
  }
}

const COMPILED_KEYMAPS = new WeakMap<ResolvedVimKeymap, CompiledKeymap>();

function compiledKeymapFor(keymap: ResolvedVimKeymap): CompiledKeymap {
  const cached = COMPILED_KEYMAPS.get(keymap);
  if (cached) return cached;
  const compiled = compileKeymap(keymap);
  COMPILED_KEYMAPS.set(keymap, compiled);
  return compiled;
}

function compileKeymap(keymap: ResolvedVimKeymap): CompiledKeymap {
  const exactBindings = new Map<string, Binding>();
  const longerPrefixes = new Set<string>();
  const motionExact = new Map<string, VimMotionAction>();
  const motionLongerPrefixes = new Set<string>();
  const operators = new Map<
    VimOperatorAction,
    { exact: Set<string>; longerPrefixes: Set<string> }
  >();
  const textObjectKinds = new Map<string, VimTextObjectKind>();
  const textObjectTargets = new Map<string, VimTextObjectTarget>();
  const searchDirections = new Map<string, "forward" | "backward">();
  const searchLongerPrefixes = new Set<string>();
  const charSearch = new Map<string, OperatorCharSearchCommand>();
  const charSearchLongerPrefixes = new Set<string>();
  const repeatCharSearch = new Map<
    string,
    Extract<VimCommandAction, "repeatCharSearch" | "repeatCharSearchReverse">
  >();
  const repeatCharSearchLongerPrefixes = new Set<string>();

  for (const [operator, sequences] of Object.entries(keymap.operators) as [
    VimOperatorAction,
    readonly string[],
  ][]) {
    const operatorLookup = { exact: new Set<string>(), longerPrefixes: new Set<string>() };
    for (const sequence of sequences) {
      setFirstBinding(exactBindings, { sequence, kind: "operator", operator });
      addLongerPrefixes(longerPrefixes, sequence);
      operatorLookup.exact.add(sequence);
      addLongerPrefixes(operatorLookup.longerPrefixes, sequence);
    }
    operators.set(operator, operatorLookup);
  }

  for (const [motion, sequences] of Object.entries(keymap.motions) as [
    VimMotionAction,
    readonly string[],
  ][]) {
    for (const sequence of sequences) {
      setFirstBinding(exactBindings, { sequence, kind: "motion", motion });
      addLongerPrefixes(longerPrefixes, sequence);
      addLongerPrefixes(motionLongerPrefixes, sequence);
    }
  }

  for (const [command, sequences] of Object.entries(keymap.commands) as [
    VimCommandAction,
    readonly string[],
  ][]) {
    for (const sequence of sequences) {
      setFirstBinding(exactBindings, { sequence, kind: "command", command });
      addLongerPrefixes(longerPrefixes, sequence);
    }
  }

  for (const binding of keymap.actions.accepted) {
    setFirstBinding(exactBindings, {
      sequence: binding.key,
      kind: "action",
      actionId: binding.actionId,
      args: binding.args,
    });
    addLongerPrefixes(longerPrefixes, binding.key);
  }

  for (const [sequence, binding] of exactBindings) {
    if (binding.kind === "motion") motionExact.set(sequence, binding.motion);
  }

  for (const [kind, sequences] of Object.entries(keymap.textObjects.kinds) as [
    VimTextObjectKind,
    readonly string[],
  ][]) {
    for (const sequence of sequences) setFirstValue(textObjectKinds, sequence, kind);
  }
  for (const [target, sequences] of Object.entries(keymap.textObjects.targets) as [
    VimTextObjectTarget,
    readonly string[],
  ][]) {
    for (const sequence of sequences) setFirstValue(textObjectTargets, sequence, target);
  }

  compileCommandFamily(
    keymap,
    SEARCH_ENTRY_ACTIONS,
    (sequence, command) => {
      const descriptor = KEYMAP_COMMAND_DESCRIPTORS[command] as {
        searchDirection?: "forward" | "backward";
      };
      if (descriptor.searchDirection)
        setFirstValue(searchDirections, sequence, descriptor.searchDirection);
    },
    searchLongerPrefixes,
  );
  compileCommandFamily(
    keymap,
    OPERATOR_CHAR_SEARCH_ACTIONS,
    (sequence, command) =>
      setFirstValue(charSearch, sequence, command as OperatorCharSearchCommand),
    charSearchLongerPrefixes,
  );
  compileCommandFamily(
    keymap,
    REPEAT_CHAR_SEARCH_ACTIONS,
    (sequence, command) => {
      setFirstValue(
        repeatCharSearch,
        sequence,
        command as Extract<VimCommandAction, "repeatCharSearch" | "repeatCharSearchReverse">,
      );
    },
    repeatCharSearchLongerPrefixes,
  );

  return {
    exactBindings,
    longerPrefixes,
    motions: { exact: motionExact, longerPrefixes: motionLongerPrefixes },
    operators,
    textObjects: { kinds: textObjectKinds, targets: textObjectTargets },
    commands: {
      searchDirections,
      searchLongerPrefixes,
      charSearch,
      charSearchLongerPrefixes,
      repeatCharSearch,
      repeatCharSearchLongerPrefixes,
    },
  };
}

function exactBinding(sequence: string, keymap: ResolvedVimKeymap): Binding | undefined {
  return compiledKeymapFor(keymap).exactBindings.get(sequence);
}

function hasLongerPrefix(sequence: string, keymap: ResolvedVimKeymap): boolean {
  return compiledKeymapFor(keymap).longerPrefixes.has(sequence);
}

function searchDirectionForBinding(
  sequence: string,
  keymap: ResolvedVimKeymap,
): "forward" | "backward" | undefined {
  return compiledKeymapFor(keymap).commands.searchDirections.get(sequence);
}

function hasSearchLongerPrefix(sequence: string, keymap: ResolvedVimKeymap): boolean {
  return compiledKeymapFor(keymap).commands.searchLongerPrefixes.has(sequence);
}

function charSearchCommandForBinding(
  sequence: string,
  keymap: ResolvedVimKeymap,
): OperatorCharSearchCommand | undefined {
  return compiledKeymapFor(keymap).commands.charSearch.get(sequence);
}

function hasCharSearchLongerPrefix(sequence: string, keymap: ResolvedVimKeymap): boolean {
  return compiledKeymapFor(keymap).commands.charSearchLongerPrefixes.has(sequence);
}

function repeatCharSearchCommandForBinding(
  sequence: string,
  keymap: ResolvedVimKeymap,
): Extract<VimCommandAction, "repeatCharSearch" | "repeatCharSearchReverse"> | undefined {
  return compiledKeymapFor(keymap).commands.repeatCharSearch.get(sequence);
}

function hasRepeatCharSearchLongerPrefix(sequence: string, keymap: ResolvedVimKeymap): boolean {
  return compiledKeymapFor(keymap).commands.repeatCharSearchLongerPrefixes.has(sequence);
}

export const DEFAULT_MACRO_SLOTS = "abcdefghijklmnopqrstuvwxyz".split("");

export function isMacroSlot(key: string, slots: readonly string[] = DEFAULT_MACRO_SLOTS): boolean {
  return slots.includes(key);
}

export function isMacroControlKey(
  key: string,
  recordKeys: readonly string[] = ["q"],
  playKeys: readonly string[] = ["@"],
): boolean {
  return recordKeys.includes(key) || playKeys.includes(key);
}

export function resolveMacroCommand(
  key: string,
  pending: MacroTarget | undefined,
  isRecording: boolean,
  config: {
    enabled?: boolean;
    slots?: readonly string[];
    recordKeys?: readonly string[];
    playKeys?: readonly string[];
  } = {},
): MacroCommandResult {
  if (config.enabled === false) return { type: "none" };
  const slots = config.slots ?? DEFAULT_MACRO_SLOTS;
  const recordKeys = config.recordKeys ?? ["q"];
  const playKeys = config.playKeys ?? ["@"];

  if (pending === "record") {
    return isMacroSlot(key, slots) ? { type: "startRecording", slot: key } : { type: "invalid" };
  }

  if (pending === "play") {
    if (playKeys.includes(key)) return { type: "repeatMacro" };
    return isMacroSlot(key, slots) ? { type: "playMacro", slot: key } : { type: "invalid" };
  }

  if (recordKeys.includes(key)) {
    return isRecording ? { type: "stopRecording" } : { type: "pendingMacro", target: "record" };
  }
  if (playKeys.includes(key)) return { type: "pendingMacro", target: "play" };
  return { type: "none" };
}

export function pendingDisplay(pending: string | undefined): string | undefined {
  if (!pending) return undefined;
  const count = decodeCountPending(pending);
  if (count) return `${count.count}${pendingDisplay(count.inner) ?? count.inner}`;
  const charCommand = decodeCharCommandPending(pending);
  if (charCommand) return commandSequenceFor(charCommand.command, DEFAULT_VIM_KEYMAP);
  const textObject = decodeTextObjectPending(pending);
  if (textObject) return `${textObject.operatorSequence}${textObject.kind === "inner" ? "i" : "a"}`;
  const operatorMotion = decodeOperatorMotionPending(pending);
  if (operatorMotion) return `${operatorMotion.operatorSequence}${operatorMotion.motionPrefix}`;
  const operatorLine = decodeOperatorLinePending(pending);
  if (operatorLine) return `${operatorLine.operatorSequence}${operatorLine.repeatPrefix}`;
  const operatorSearch = decodeOperatorSearchPending(pending);
  if (operatorSearch) return `${operatorSearch.operatorSequence}${operatorSearch.searchPrefix}`;
  const operatorCharSearch = decodeOperatorCharSearchPending(pending);
  if (operatorCharSearch)
    return `${operatorCharSearch.operatorSequence}${operatorCharSearch.targetCount ?? ""}${operatorCharSearch.commandPrefix}`;
  const operatorCharSearchRepeat = decodeOperatorCharSearchRepeatPending(pending);
  if (operatorCharSearchRepeat)
    return `${operatorCharSearchRepeat.operatorSequence}${operatorCharSearchRepeat.repeatPrefix}`;
  return pending;
}

function encodeCountPending(count: string, inner = ""): string {
  return `${count}${COUNT_SEPARATOR}${inner}`;
}

function decodeCountPending(pending: string): EncodedCountPending | undefined {
  const index = pending.indexOf(COUNT_SEPARATOR);
  if (index < 0) return undefined;
  return {
    type: "count",
    count: pending.slice(0, index),
    inner: pending.slice(index + COUNT_SEPARATOR.length),
  };
}

function encodeCharCommandPending(command: VimCommandAction, count?: number): string {
  return `${command}${CHAR_COMMAND_SEPARATOR}${count ?? ""}`;
}

function decodeCharCommandPending(pending: string): EncodedCharCommandPending | undefined {
  const parts = pending.split(CHAR_COMMAND_SEPARATOR);
  if (parts.length !== 2) return undefined;
  const command = parts[0] as VimCommandAction;
  return { type: "charCommand", command, count: parts[1] ? Number(parts[1]) : undefined };
}

function encodeTextObjectPending(
  operatorSequence: string,
  kind: VimTextObjectKind,
  count?: number,
): string {
  return `${operatorSequence}${TEXT_OBJECT_SEPARATOR}${kind}${TEXT_OBJECT_SEPARATOR}${count ?? ""}`;
}

function decodeTextObjectPending(pending: string): EncodedTextObjectPending | undefined {
  const parts = pending.split(TEXT_OBJECT_SEPARATOR);
  if (parts.length !== 3) return undefined;
  const kind = parts[1] as VimTextObjectKind;
  if (kind !== "inner" && kind !== "around") return undefined;
  return {
    type: "textObject",
    operatorSequence: parts[0] ?? "",
    kind,
    count: parts[2] ? Number(parts[2]) : undefined,
  };
}

function encodeOperatorMotionPending(
  operatorSequence: string,
  motionPrefix: string,
  count?: number,
): string {
  return `${operatorSequence}${OPERATOR_MOTION_SEPARATOR}${motionPrefix}${OPERATOR_MOTION_SEPARATOR}${count ?? ""}`;
}

function encodeOperatorLinePending(
  operatorSequence: string,
  repeatPrefix: string,
  count?: number,
): string {
  return `${operatorSequence}${OPERATOR_LINE_SEPARATOR}${repeatPrefix}${OPERATOR_LINE_SEPARATOR}${count ?? ""}`;
}

function encodeOperatorSearchPending(
  operatorSequence: string,
  searchPrefix: string,
  count?: number,
): string {
  return `${operatorSequence}${OPERATOR_SEARCH_SEPARATOR}${searchPrefix}${OPERATOR_SEARCH_SEPARATOR}${count ?? ""}`;
}

function encodeOperatorCharSearchPending(
  operatorSequence: string,
  commandPrefix: string,
  count?: number,
  targetCount?: number,
  command?: OperatorCharSearchCommand,
): string {
  return [operatorSequence, commandPrefix, count ?? "", targetCount ?? "", command ?? ""].join(
    OPERATOR_CHAR_SEARCH_SEPARATOR,
  );
}

function encodeOperatorCharSearchRepeatPending(
  operatorSequence: string,
  repeatPrefix: string,
  count?: number,
): string {
  return [operatorSequence, repeatPrefix, count ?? ""].join(OPERATOR_CHAR_SEARCH_REPEAT_SEPARATOR);
}

function decodeOperatorMotionPending(pending: string): EncodedOperatorMotionPending | undefined {
  const parts = pending.split(OPERATOR_MOTION_SEPARATOR);
  if (parts.length === 2) {
    return {
      type: "operatorMotion",
      operatorSequence: parts[0] ?? "",
      motionPrefix: parts[1] ?? "",
    };
  }
  if (parts.length !== 3) return undefined;
  return {
    type: "operatorMotion",
    operatorSequence: parts[0] ?? "",
    motionPrefix: parts[1] ?? "",
    count: parts[2] ? Number(parts[2]) : undefined,
  };
}

function decodeOperatorLinePending(pending: string): EncodedOperatorLinePending | undefined {
  const parts = pending.split(OPERATOR_LINE_SEPARATOR);
  if (parts.length === 2) {
    return { type: "operatorLine", operatorSequence: parts[0] ?? "", repeatPrefix: parts[1] ?? "" };
  }
  if (parts.length !== 3) return undefined;
  return {
    type: "operatorLine",
    operatorSequence: parts[0] ?? "",
    repeatPrefix: parts[1] ?? "",
    count: parts[2] ? Number(parts[2]) : undefined,
  };
}

function decodeOperatorSearchPending(pending: string): EncodedOperatorSearchPending | undefined {
  const parts = pending.split(OPERATOR_SEARCH_SEPARATOR);
  if (parts.length !== 3) return undefined;
  return {
    type: "operatorSearch",
    operatorSequence: parts[0] ?? "",
    searchPrefix: parts[1] ?? "",
    count: parts[2] ? Number(parts[2]) : undefined,
  };
}

function decodeOperatorCharSearchPending(
  pending: string,
): EncodedOperatorCharSearchPending | undefined {
  const parts = pending.split(OPERATOR_CHAR_SEARCH_SEPARATOR);
  if (parts.length !== 5) return undefined;
  const command = parts[4] as OperatorCharSearchCommand | "";
  return {
    type: "operatorCharSearch",
    operatorSequence: parts[0] ?? "",
    commandPrefix: parts[1] ?? "",
    count: parts[2] ? Number(parts[2]) : undefined,
    targetCount: parts[3] ? Number(parts[3]) : undefined,
    command: command || undefined,
  };
}

function decodeOperatorCharSearchRepeatPending(
  pending: string,
): EncodedOperatorCharSearchRepeatPending | undefined {
  const parts = pending.split(OPERATOR_CHAR_SEARCH_REPEAT_SEPARATOR);
  if (parts.length !== 3) return undefined;
  return {
    type: "operatorCharSearchRepeat",
    operatorSequence: parts[0] ?? "",
    repeatPrefix: parts[1] ?? "",
    count: parts[2] ? Number(parts[2]) : undefined,
  };
}

export function operatorActionForSequence(
  sequence: string | undefined,
  keymap: ResolvedVimKeymap = DEFAULT_VIM_KEYMAP,
): VimOperatorAction | undefined {
  if (!sequence) return undefined;
  const count = decodeCountPending(sequence);
  if (count) return operatorActionForSequence(count.inner, keymap);
  const binding = exactBinding(sequence, keymap);
  return binding?.kind === "operator" ? binding.operator : undefined;
}

export function countForPendingSequence(sequence: string | undefined): number | undefined {
  if (!sequence) return undefined;
  const count = decodeCountPending(sequence);
  return count ? Number(count.count) : undefined;
}

function commandSequenceFor(
  command: VimCommandAction,
  keymap: ResolvedVimKeymap,
): string | undefined {
  return keymap.commands[command]?.[0];
}

function motionForSequence(
  sequence: string,
  keymap: ResolvedVimKeymap,
): VimMotionAction | undefined {
  return compiledKeymapFor(keymap).motions.exact.get(sequence);
}

function hasMotionPrefix(sequence: string, keymap: ResolvedVimKeymap): boolean {
  return compiledKeymapFor(keymap).motions.longerPrefixes.has(sequence);
}

function operatorLookupFor(keymap: ResolvedVimKeymap, operator: VimOperatorAction) {
  return compiledKeymapFor(keymap).operators.get(operator);
}

function hasOperatorPrefix(
  sequence: string,
  keymap: ResolvedVimKeymap,
  operator: VimOperatorAction,
): boolean {
  return operatorLookupFor(keymap, operator)?.longerPrefixes.has(sequence) ?? false;
}

function operatorSequenceMatches(
  sequence: string,
  keymap: ResolvedVimKeymap,
  operator: VimOperatorAction,
): boolean {
  return operatorLookupFor(keymap, operator)?.exact.has(sequence) ?? false;
}

function withCount<T extends SemanticCommandResult>(
  result: T,
  count?: number,
): SemanticCommandResult {
  if (!count || result.type === "pending" || result.type === "invalid" || result.type === "none") {
    return result;
  }
  if ("count" in result && result.count) {
    return result.type === "operatorCharSearch"
      ? { ...result, count: result.count * count }
      : result;
  }
  return { ...result, count };
}

function isLineOnlyOperator(operator: VimOperatorAction): boolean {
  return LINE_ONLY_OPERATORS.has(operator);
}

function isMotionOperator(operator: VimOperatorAction): operator is VimMotionOperatorAction {
  return !isLineOnlyOperator(operator);
}

function resolveOperatorMotionPending(
  pending: EncodedOperatorMotionPending,
  key: string,
  keymap: ResolvedVimKeymap,
): SemanticCommandResult {
  const operator = operatorActionForSequence(pending.operatorSequence, keymap);
  if (!operator || !isMotionOperator(operator)) return { type: "invalid" };
  const motionSequence = pending.motionPrefix + key;
  const motion = motionForSequence(motionSequence, keymap);
  if (motion && keymap.operatorMotions[operator].includes(motion)) {
    return { type: "operatorMotion", operator, motion, count: pending.count };
  }
  if (hasMotionPrefix(motionSequence, keymap)) {
    return {
      type: "pending",
      pending: encodeOperatorMotionPending(pending.operatorSequence, motionSequence, pending.count),
    };
  }
  return { type: "invalid" };
}

function resolveOperatorLinePending(
  pending: EncodedOperatorLinePending,
  key: string,
  keymap: ResolvedVimKeymap,
): SemanticCommandResult {
  const operator = operatorActionForSequence(pending.operatorSequence, keymap);
  if (!operator) return { type: "invalid" };
  const repeatSequence = pending.repeatPrefix + key;
  if (operatorSequenceMatches(repeatSequence, keymap, operator)) {
    return { type: "lineCommand", operator, count: pending.count };
  }
  if (hasOperatorPrefix(repeatSequence, keymap, operator)) {
    return {
      type: "pending",
      pending: encodeOperatorLinePending(pending.operatorSequence, repeatSequence, pending.count),
    };
  }
  return { type: "invalid" };
}

function resolveOperatorSearchPending(
  pending: EncodedOperatorSearchPending,
  key: string,
  keymap: ResolvedVimKeymap,
): SemanticCommandResult {
  const operator = operatorActionForSequence(pending.operatorSequence, keymap);
  if (!operator || !isMotionOperator(operator)) return { type: "invalid" };
  const searchSequence = pending.searchPrefix + key;
  const direction = searchDirectionForBinding(searchSequence, keymap);
  if (direction) {
    return { type: "operatorSearch", operator, direction, count: pending.count };
  }
  if (hasSearchLongerPrefix(searchSequence, keymap)) {
    return {
      type: "pending",
      pending: encodeOperatorSearchPending(pending.operatorSequence, searchSequence, pending.count),
    };
  }
  return { type: "invalid" };
}

function effectiveOperatorCharSearchCount(
  count: number | undefined,
  targetCount: number | undefined,
): number | undefined {
  if (!count) return targetCount;
  if (!targetCount) return count;
  return count * targetCount;
}

function resolveOperatorCharSearchPending(
  pending: EncodedOperatorCharSearchPending,
  key: string,
  keymap: ResolvedVimKeymap,
): SemanticCommandResult {
  const operator = operatorActionForSequence(pending.operatorSequence, keymap);
  if (!operator || !isMotionOperator(operator)) return { type: "invalid" };
  if (pending.command) {
    if (!isPrintableCharArgument(key)) return { type: "invalid" };
    return {
      type: "operatorCharSearch",
      operator,
      command: pending.command,
      char: key,
      count: effectiveOperatorCharSearchCount(pending.count, pending.targetCount),
    };
  }
  if (!pending.commandPrefix && !pending.targetCount && /^[1-9]$/.test(key)) {
    return {
      type: "pending",
      pending: encodeOperatorCharSearchPending(
        pending.operatorSequence,
        "",
        pending.count,
        Number(key),
      ),
    };
  }
  if (!pending.commandPrefix && pending.targetCount && /^\d$/.test(key)) {
    return {
      type: "pending",
      pending: encodeOperatorCharSearchPending(
        pending.operatorSequence,
        "",
        pending.count,
        Number(`${pending.targetCount}${key}`),
      ),
    };
  }
  if (!pending.commandPrefix && pending.targetCount) {
    return resolveAfterOperator(
      pending.operatorSequence,
      key,
      keymap,
      effectiveOperatorCharSearchCount(pending.count, pending.targetCount),
    );
  }
  const commandSequence = pending.commandPrefix + key;
  const command = charSearchCommandForBinding(commandSequence, keymap);
  if (command) {
    return {
      type: "pending",
      pending: encodeOperatorCharSearchPending(
        pending.operatorSequence,
        commandSequence,
        pending.count,
        pending.targetCount,
        command,
      ),
    };
  }
  if (hasCharSearchLongerPrefix(commandSequence, keymap)) {
    return {
      type: "pending",
      pending: encodeOperatorCharSearchPending(
        pending.operatorSequence,
        commandSequence,
        pending.count,
        pending.targetCount,
      ),
    };
  }
  return { type: "invalid" };
}

function resolveOperatorCharSearchRepeatPending(
  pending: EncodedOperatorCharSearchRepeatPending,
  key: string,
  keymap: ResolvedVimKeymap,
): SemanticCommandResult {
  const operator = operatorActionForSequence(pending.operatorSequence, keymap);
  if (!operator || !isMotionOperator(operator)) return { type: "invalid" };
  const repeatSequence = pending.repeatPrefix + key;
  const command = repeatCharSearchCommandForBinding(repeatSequence, keymap);
  if (command) {
    return {
      type: "operatorCharSearchRepeat",
      operator,
      reverse: command === "repeatCharSearchReverse",
      count: pending.count,
    };
  }
  if (hasRepeatCharSearchLongerPrefix(repeatSequence, keymap)) {
    return {
      type: "pending",
      pending: encodeOperatorCharSearchRepeatPending(
        pending.operatorSequence,
        repeatSequence,
        pending.count,
      ),
    };
  }
  return { type: "invalid" };
}

function resolveTextObjectPending(
  pending: EncodedTextObjectPending,
  key: string,
  keymap: ResolvedVimKeymap,
): SemanticCommandResult {
  const operator = operatorActionForSequence(pending.operatorSequence, keymap);
  const target = textObjectTargetForKey(key, keymap);
  if (!operator || !isMotionOperator(operator) || !target) return { type: "invalid" };
  return {
    type: "operatorTextObject",
    operator,
    textObject: { kind: pending.kind, target },
    count: pending.count,
  };
}

function resolveAfterOperator(
  operatorSequence: string,
  key: string,
  keymap: ResolvedVimKeymap,
  count?: number,
): SemanticCommandResult {
  const operator = operatorActionForSequence(operatorSequence, keymap);
  if (!operator) return { type: "invalid" };

  if (operatorSequenceMatches(key, keymap, operator))
    return { type: "lineCommand", operator, count };
  if (hasOperatorPrefix(key, keymap, operator)) {
    return { type: "pending", pending: encodeOperatorLinePending(operatorSequence, key, count) };
  }
  if (!isMotionOperator(operator)) return { type: "invalid" };
  if (/^[1-9]$/.test(key)) {
    return {
      type: "pending",
      pending: encodeOperatorCharSearchPending(operatorSequence, "", count, Number(key)),
    };
  }
  const charSearchCommand = charSearchCommandForBinding(key, keymap);
  if (charSearchCommand) {
    return {
      type: "pending",
      pending: encodeOperatorCharSearchPending(
        operatorSequence,
        key,
        count,
        undefined,
        charSearchCommand,
      ),
    };
  }
  if (hasCharSearchLongerPrefix(key, keymap)) {
    return {
      type: "pending",
      pending: encodeOperatorCharSearchPending(operatorSequence, key, count),
    };
  }

  const repeatCharSearchCommand = repeatCharSearchCommandForBinding(key, keymap);
  if (repeatCharSearchCommand) {
    return {
      type: "operatorCharSearchRepeat",
      operator,
      reverse: repeatCharSearchCommand === "repeatCharSearchReverse",
      count,
    };
  }
  if (hasRepeatCharSearchLongerPrefix(key, keymap)) {
    return {
      type: "pending",
      pending: encodeOperatorCharSearchRepeatPending(operatorSequence, key, count),
    };
  }

  const searchDirection = searchDirectionForBinding(key, keymap);
  if (searchDirection) {
    return { type: "operatorSearch", operator, direction: searchDirection, count };
  }
  if (hasSearchLongerPrefix(key, keymap)) {
    return { type: "pending", pending: encodeOperatorSearchPending(operatorSequence, key, count) };
  }

  const textObjectKind = textObjectKindForKey(key, keymap);
  if (textObjectKind) {
    return {
      type: "pending",
      pending: encodeTextObjectPending(operatorSequence, textObjectKind, count),
    };
  }

  if (hasMotionPrefix(key, keymap)) {
    return { type: "pending", pending: encodeOperatorMotionPending(operatorSequence, key, count) };
  }
  const motion = motionForSequence(key, keymap);
  if (motion && keymap.operatorMotions[operator].includes(motion)) {
    return { type: "operatorMotion", operator, motion, count };
  }
  return { type: "invalid" };
}

function resolveWithoutPending(
  key: string,
  keymap: ResolvedVimKeymap,
  count?: number,
): SemanticCommandResult {
  if (!count && /^[1-9]$/.test(key)) return { type: "pending", pending: encodeCountPending(key) };
  if (hasLongerPrefix(key, keymap))
    return { type: "pending", pending: count ? encodeCountPending(String(count), key) : key };
  const binding = exactBinding(key, keymap);
  if (binding?.kind === "operator")
    return { type: "pending", pending: count ? encodeCountPending(String(count), key) : key };
  if (binding?.kind === "motion") return { type: "motion", motion: binding.motion, count };
  if (binding?.kind === "command") {
    if (CHAR_ARGUMENT_COMMANDS.has(binding.command)) {
      return { type: "pending", pending: encodeCharCommandPending(binding.command, count) };
    }
    return { type: "command", command: binding.command, count };
  }
  if (binding?.kind === "action") {
    return { type: "action", actionId: binding.actionId, args: binding.args, count };
  }
  return { type: "none" };
}

export function resolveNormalCommand(
  key: string,
  pending: string | undefined,
  keymap: ResolvedVimKeymap = DEFAULT_VIM_KEYMAP,
): SemanticCommandResult {
  if (pending) {
    const count = decodeCountPending(pending);
    if (count) {
      if (count.inner === "" && /^\d$/.test(key)) {
        return { type: "pending", pending: encodeCountPending(count.count + key) };
      }
      if (count.inner === "")
        return withCount(
          resolveWithoutPending(key, keymap, Number(count.count)),
          Number(count.count),
        );
      const innerResult = resolveNormalCommand(key, count.inner, keymap);
      if (innerResult.type === "pending") {
        return { type: "pending", pending: encodeCountPending(count.count, innerResult.pending) };
      }
      return withCount(innerResult, Number(count.count));
    }

    const charCommand = decodeCharCommandPending(pending);
    if (charCommand) {
      if (!isPrintableCharArgument(key)) return { type: "invalid" };
      return {
        type: "charCommand",
        command: charCommand.command,
        char: key,
        count: charCommand.count,
      };
    }
    const textObject = decodeTextObjectPending(pending);
    if (textObject) return resolveTextObjectPending(textObject, key, keymap);
    const operatorMotion = decodeOperatorMotionPending(pending);
    if (operatorMotion) return resolveOperatorMotionPending(operatorMotion, key, keymap);
    const operatorLine = decodeOperatorLinePending(pending);
    if (operatorLine) return resolveOperatorLinePending(operatorLine, key, keymap);
    const operatorSearch = decodeOperatorSearchPending(pending);
    if (operatorSearch) return resolveOperatorSearchPending(operatorSearch, key, keymap);
    const operatorCharSearch = decodeOperatorCharSearchPending(pending);
    if (operatorCharSearch)
      return resolveOperatorCharSearchPending(operatorCharSearch, key, keymap);
    const operatorCharSearchRepeat = decodeOperatorCharSearchRepeatPending(pending);
    if (operatorCharSearchRepeat)
      return resolveOperatorCharSearchRepeatPending(operatorCharSearchRepeat, key, keymap);

    const pendingOperator = operatorActionForSequence(pending, keymap);
    if (pendingOperator) return resolveAfterOperator(pending, key, keymap);

    const combined = pending + key;
    if (hasLongerPrefix(combined, keymap)) return { type: "pending", pending: combined };
    const combinedBinding = exactBinding(combined, keymap);
    if (combinedBinding?.kind === "motion")
      return { type: "motion", motion: combinedBinding.motion };
    if (combinedBinding?.kind === "command") {
      if (CHAR_ARGUMENT_COMMANDS.has(combinedBinding.command)) {
        return { type: "pending", pending: encodeCharCommandPending(combinedBinding.command) };
      }
      return { type: "command", command: combinedBinding.command };
    }
    if (combinedBinding?.kind === "operator") return { type: "pending", pending: combined };
    if (combinedBinding?.kind === "action") {
      return {
        type: "action",
        actionId: combinedBinding.actionId,
        args: combinedBinding.args,
      };
    }

    return { type: "invalid" };
  }

  return resolveWithoutPending(key, keymap);
}

export function semanticOperatorToLegacy(operator: VimMotionOperatorAction): VimOperator {
  return ACTION_TO_LEGACY_OPERATOR[operator];
}

export function semanticMotionToLegacy(motion: VimMotionAction): VimMotion | undefined {
  return ACTION_TO_LEGACY_MOTION[motion];
}

export function parseNormalCommand(key: string, pending?: PendingOperator): CommandResult {
  const result = resolveNormalCommand(key, pending, DEFAULT_VIM_KEYMAP);
  if (result.type === "pending")
    return { type: "pending", operator: pendingDisplay(result.pending) ?? result.pending };
  if (result.type === "lineCommand") {
    if (!isMotionOperator(result.operator)) return { type: "invalid" };
    return { type: "command", command: lineCommandFor(semanticOperatorToLegacy(result.operator)) };
  }
  if (result.type === "motion" && result.motion === "bufferStart")
    return { type: "command", command: "gg" };
  if (result.type === "operatorMotion") {
    if (!isMotionOperator(result.operator)) return { type: "invalid" };
    const motion = semanticMotionToLegacy(result.motion);
    if (!motion) return { type: "invalid" };
    return { type: "operatorMotion", operator: semanticOperatorToLegacy(result.operator), motion };
  }
  if (result.type === "invalid") return { type: "invalid" };
  return { type: "none" };
}

export function isPendingOperatorKey(key: string): key is PendingOperator {
  return key === "g" || isLegacyVimOperator(key) || /^[1-9]$/.test(key);
}

export function isDefaultOperatorKey(key: string): key is VimOperator {
  return isLegacyVimOperator(key);
}

export function isDefaultOperatorMotionKey(key: string): key is VimMotion {
  return isLegacyVimMotion(key);
}

export function legacyMotionToSemantic(motion: VimMotion): VimMotionAction {
  return LEGACY_MOTION_TO_ACTION[motion];
}

export function legacyOperatorToSemantic(operator: VimOperator): VimOperatorAction {
  return LEGACY_OPERATOR_TO_ACTION[operator];
}
