import type { BindablePromptTransformActionId } from "./prompt-transform-actions.ts";
import type {
  CommandResult,
  NormalCommand,
  PendingOperator,
  PromptTransform,
  ResolvedVimKeymap,
  VimActionBindingMode,
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
import { grammarEntriesForKeymap, type KeymapGrammarEntry } from "./keymap-grammar.ts";
import {
  isAtomicMappingSequence,
  mappingScopesForKeymapEntry,
  type VimMappingScope,
} from "./mapping-scopes.ts";

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
      modes?: readonly VimActionBindingMode[];
    };

type ActionBinding = Extract<Binding, { kind: "action" }>;

type CompiledKeymap = {
  exactBindings: Map<string, Binding>;
  actionBindings: Map<string, ActionBinding[]>;
  actionLongerPrefixes: Map<string, ActionBinding[]>;
  motions: { exact: Map<string, VimMotionAction> };
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
  kind?: VimTextObjectKind;
  kindPrefix: string;
  targetPrefix?: string;
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

export function scopedKeymapBindingFor(
  keymap: ResolvedVimKeymap,
  key: string,
  mode: VimActionBindingMode | "operatorPending",
) {
  return [...keymap.scoped]
    .reverse()
    .find((binding) => binding.key === key && binding.modes.includes(mode));
}

export function scopedKeymapSequenceFor(
  keymap: ResolvedVimKeymap,
  sequence: string,
  mode: VimActionBindingMode | "operatorPending",
): { exact?: ResolvedVimKeymap["scoped"][number]; isPrefix: boolean } {
  const exact = scopedKeymapBindingFor(keymap, sequence, mode);
  return {
    exact,
    isPrefix: keymap.scoped.some(
      (binding) =>
        binding.modes.includes(mode) &&
        binding.key.startsWith(sequence) &&
        binding.key !== sequence,
    ),
  };
}

export function scopedKeysForAction(
  keymap: ResolvedVimKeymap,
  actionId: ResolvedVimKeymap["scoped"][number]["actionId"],
  mode: VimActionBindingMode | "operatorPending",
): string[] {
  return keymap.scoped
    .filter((binding) => binding.actionId === actionId && binding.modes.includes(mode))
    .map((binding) => binding.key);
}

function scopedTextObjectSequenceFor(
  keymap: ResolvedVimKeymap,
  sequence: string,
  prefix: "textObject.kind." | "textObject.target.",
): { action?: string; isPrefix: boolean } {
  const bindings = keymap.scoped.filter(
    (binding) =>
      binding.modes.includes("operatorPending") &&
      binding.actionId.startsWith(prefix) &&
      !isKeyUnmapped(keymap, binding.key, "operatorPending"),
  );
  return {
    action: [...bindings]
      .reverse()
      .find((binding) => binding.key === sequence)
      ?.actionId.slice(prefix.length),
    isPrefix: bindings.some(
      (binding) => binding.key !== sequence && binding.key.startsWith(sequence),
    ),
  };
}

function textObjectKindForKey(
  key: string,
  keymap: ResolvedVimKeymap,
): VimTextObjectKind | undefined {
  if (isKeyUnmapped(keymap, key, "operatorPending")) return undefined;
  return (
    (scopedTextObjectSequenceFor(keymap, key, "textObject.kind.").action as
      | VimTextObjectKind
      | undefined) ?? compiledKeymapFor(keymap).textObjects.kinds.get(key)
  );
}

function textObjectTargetForKey(
  key: string,
  keymap: ResolvedVimKeymap,
): VimTextObjectTarget | undefined {
  if (isKeyUnmapped(keymap, key, "operatorPending")) return undefined;
  return (
    (scopedTextObjectSequenceFor(keymap, key, "textObject.target.").action as
      | VimTextObjectTarget
      | undefined) ?? compiledKeymapFor(keymap).textObjects.targets.get(key)
  );
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
  if (isAtomicMappingSequence(sequence)) return;
  for (let index = 1; index < sequence.length; index += 1) prefixes.add(sequence.slice(0, index));
}

function setFirstBinding(bindings: Map<string, Binding>, binding: Binding): void {
  if (!bindings.has(binding.sequence)) bindings.set(binding.sequence, binding);
}

function addActionBinding(bindings: Map<string, ActionBinding[]>, binding: ActionBinding): void {
  bindings.set(binding.sequence, [...(bindings.get(binding.sequence) ?? []), binding]);
}

function addActionPrefixes(prefixes: Map<string, ActionBinding[]>, binding: ActionBinding): void {
  if (isAtomicMappingSequence(binding.sequence)) return;
  for (let index = 1; index < binding.sequence.length; index += 1) {
    const prefix = binding.sequence.slice(0, index);
    prefixes.set(prefix, [...(prefixes.get(prefix) ?? []), binding]);
  }
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
  const actionBindings = new Map<string, ActionBinding[]>();
  const actionLongerPrefixes = new Map<string, ActionBinding[]>();
  const motionExact = new Map<string, VimMotionAction>();
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

  for (const entry of grammarEntriesForKeymap(keymap)) {
    if (entry.family === "operator") {
      setFirstBinding(exactBindings, {
        sequence: entry.sequence,
        kind: "operator",
        operator: entry.id,
      });
    } else if (entry.family === "motion") {
      setFirstBinding(exactBindings, {
        sequence: entry.sequence,
        kind: "motion",
        motion: entry.id,
      });
    } else if (entry.family === "command") {
      setFirstBinding(exactBindings, {
        sequence: entry.sequence,
        kind: "command",
        command: entry.id,
      });
    } else if (entry.family === "textObjectKind") {
      setFirstValue(textObjectKinds, entry.sequence, entry.id);
    } else if (entry.family === "textObjectTarget") {
      setFirstValue(textObjectTargets, entry.sequence, entry.id);
    }
  }

  for (const binding of keymap.actions.accepted) {
    const actionBinding: ActionBinding = {
      sequence: binding.key,
      kind: "action",
      actionId: binding.actionId,
      args: binding.args,
      modes: binding.modes,
    };
    addActionBinding(actionBindings, actionBinding);
    addActionPrefixes(actionLongerPrefixes, actionBinding);
  }

  for (const [sequence, binding] of exactBindings) {
    if (binding.kind === "motion") motionExact.set(sequence, binding.motion);
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
    actionBindings,
    actionLongerPrefixes,
    motions: { exact: motionExact },
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

function actionBindingMatchesMode(
  binding: Binding,
  mode: VimActionBindingMode | "operatorPending" | undefined,
): boolean {
  return (
    binding.kind !== "action" ||
    mode === undefined ||
    !binding.modes ||
    (mode !== "operatorPending" && binding.modes.includes(mode))
  );
}

function grammarEntryScopes(entry: KeymapGrammarEntry): readonly VimMappingScope[] {
  const family =
    entry.family === "textObjectKind"
      ? "textObject.kind"
      : entry.family === "textObjectTarget"
        ? "textObject.target"
        : entry.family;
  return mappingScopesForKeymapEntry(family, entry.id);
}

function liveGrammarEntries(
  keymap: ResolvedVimKeymap,
  mode?: VimActionBindingMode | "operatorPending",
): KeymapGrammarEntry[] {
  return grammarEntriesForKeymap(keymap).filter(
    (entry) =>
      !isKeyUnmapped(keymap, entry.sequence, mode) &&
      (!mode || grammarEntryScopes(entry).includes(mode)),
  );
}

export function isKeyUnmapped(
  keymap: ResolvedVimKeymap,
  sequence: string,
  mode: VimActionBindingMode | "operatorPending" | undefined,
): boolean {
  return Boolean(
    mode && keymap.unmaps.some((unmap) => unmap.key === sequence && unmap.modes.includes(mode)),
  );
}

function scopedBinding(
  sequence: string,
  keymap: ResolvedVimKeymap,
  mode?: VimActionBindingMode | "operatorPending",
): Binding | undefined {
  const mapping = mode ? scopedKeymapBindingFor(keymap, sequence, mode) : undefined;
  if (!mapping) return undefined;
  const [family, ...parts] = mapping.actionId.split(".");
  const action = parts.join(".");
  if (family === "operator")
    return { sequence, kind: "operator", operator: action as VimOperatorAction };
  if (family === "motion") return { sequence, kind: "motion", motion: action as VimMotionAction };
  if (family === "command")
    return { sequence, kind: "command", command: action as VimCommandAction };
  if (mapping.actionId.startsWith("prompt.transform.")) {
    return {
      sequence,
      kind: "action",
      actionId: mapping.actionId as BindablePromptTransformActionId,
      args: mapping.args as PromptTransform,
    };
  }
  return undefined;
}

function exactBinding(
  sequence: string,
  keymap: ResolvedVimKeymap,
  mode?: VimActionBindingMode | "operatorPending",
): Binding | undefined {
  const scoped = scopedBinding(sequence, keymap, mode);
  if (scoped) return scoped;
  if (isKeyUnmapped(keymap, sequence, mode)) return undefined;
  const compiled = compiledKeymapFor(keymap);
  const action = compiled.actionBindings
    .get(sequence)
    ?.find(
      (binding) =>
        actionBindingMatchesMode(binding, mode) && !isKeyUnmapped(keymap, binding.sequence, mode),
    );
  return action ?? compiled.exactBindings.get(sequence);
}

function hasLongerPrefix(
  sequence: string,
  keymap: ResolvedVimKeymap,
  mode?: VimActionBindingMode | "operatorPending",
): boolean {
  if (
    keymap.scoped.some(
      (binding) =>
        binding.key !== sequence &&
        binding.key.startsWith(sequence) &&
        (!mode || binding.modes.includes(mode)) &&
        !isKeyUnmapped(keymap, binding.key, mode),
    )
  ) {
    return true;
  }
  if (
    liveGrammarEntries(keymap, mode).some(
      (entry) =>
        !isAtomicMappingSequence(entry.sequence) &&
        entry.sequence !== sequence &&
        entry.sequence.startsWith(sequence),
    )
  ) {
    return true;
  }
  return (
    compiledKeymapFor(keymap)
      .actionLongerPrefixes.get(sequence)
      ?.some(
        (binding) =>
          actionBindingMatchesMode(binding, mode) && !isKeyUnmapped(keymap, binding.sequence, mode),
      ) ?? false
  );
}

function searchDirectionForBinding(
  sequence: string,
  keymap: ResolvedVimKeymap,
): "forward" | "backward" | undefined {
  return isKeyUnmapped(keymap, sequence, "operatorPending")
    ? undefined
    : compiledKeymapFor(keymap).commands.searchDirections.get(sequence);
}

function hasSearchLongerPrefix(sequence: string, keymap: ResolvedVimKeymap): boolean {
  return compiledKeymapFor(keymap).commands.searchLongerPrefixes.has(sequence);
}

function charSearchCommandForBinding(
  sequence: string,
  keymap: ResolvedVimKeymap,
): OperatorCharSearchCommand | undefined {
  return isKeyUnmapped(keymap, sequence, "operatorPending")
    ? undefined
    : compiledKeymapFor(keymap).commands.charSearch.get(sequence);
}

function hasCharSearchLongerPrefix(sequence: string, keymap: ResolvedVimKeymap): boolean {
  return compiledKeymapFor(keymap).commands.charSearchLongerPrefixes.has(sequence);
}

function repeatCharSearchCommandForBinding(
  sequence: string,
  keymap: ResolvedVimKeymap,
): Extract<VimCommandAction, "repeatCharSearch" | "repeatCharSearchReverse"> | undefined {
  return isKeyUnmapped(keymap, sequence, "operatorPending")
    ? undefined
    : compiledKeymapFor(keymap).commands.repeatCharSearch.get(sequence);
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
  if (textObject)
    return `${textObject.operatorSequence}${textObject.kindPrefix}${textObject.targetPrefix ?? ""}`;
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
  kindPrefix: string,
  kind: VimTextObjectKind | undefined,
  targetPrefix?: string,
  count?: number,
): string {
  return [operatorSequence, kindPrefix, kind ?? "", targetPrefix ?? "", count ?? ""].join(
    TEXT_OBJECT_SEPARATOR,
  );
}

function decodeTextObjectPending(pending: string): EncodedTextObjectPending | undefined {
  const parts = pending.split(TEXT_OBJECT_SEPARATOR);
  if (parts.length === 3) {
    const kind = parts[1] as VimTextObjectKind;
    if (kind !== "inner" && kind !== "around") return undefined;
    return {
      type: "textObject",
      operatorSequence: parts[0] ?? "",
      kindPrefix: kind === "inner" ? "i" : "a",
      kind,
      count: parts[2] ? Number(parts[2]) : undefined,
    };
  }
  if (parts.length !== 5) return undefined;
  const kind = parts[2] as VimTextObjectKind | "";
  if (kind && kind !== "inner" && kind !== "around") return undefined;
  return {
    type: "textObject",
    operatorSequence: parts[0] ?? "",
    kindPrefix: parts[1] ?? "",
    kind: kind || undefined,
    targetPrefix: parts[3] || undefined,
    count: parts[4] ? Number(parts[4]) : undefined,
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
  mode: VimActionBindingMode = "normal",
): VimOperatorAction | undefined {
  if (!sequence) return undefined;
  const count = decodeCountPending(sequence);
  if (count) return operatorActionForSequence(count.inner, keymap, mode);
  const binding = exactBinding(sequence, keymap, mode);
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
  if (isKeyUnmapped(keymap, sequence, "operatorPending")) return undefined;
  const scoped = exactBinding(sequence, keymap, "operatorPending");
  return scoped?.kind === "motion"
    ? scoped.motion
    : compiledKeymapFor(keymap).motions.exact.get(sequence);
}

function hasMotionPrefix(sequence: string, keymap: ResolvedVimKeymap): boolean {
  return hasLongerPrefix(sequence, keymap, "operatorPending");
}

function hasOperatorPrefix(
  sequence: string,
  keymap: ResolvedVimKeymap,
  operator: VimOperatorAction,
): boolean {
  return (
    keymap.scoped.some(
      (binding) =>
        binding.actionId === `operator.${operator}` &&
        binding.modes.includes("normal") &&
        binding.key !== sequence &&
        binding.key.startsWith(sequence) &&
        !isKeyUnmapped(keymap, binding.key, "operatorPending"),
    ) ||
    liveGrammarEntries(keymap).some(
      (entry) =>
        entry.family === "operator" &&
        entry.id === operator &&
        !isAtomicMappingSequence(entry.sequence) &&
        entry.sequence !== sequence &&
        entry.sequence.startsWith(sequence) &&
        !isKeyUnmapped(keymap, entry.sequence, "operatorPending"),
    )
  );
}

function operatorSequenceMatches(
  sequence: string,
  keymap: ResolvedVimKeymap,
  operator: VimOperatorAction,
): boolean {
  return (
    !isKeyUnmapped(keymap, sequence, "operatorPending") &&
    operatorActionForSequence(sequence, keymap) === operator
  );
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

function supportsSearchTargets(operator: VimMotionOperatorAction): boolean {
  return operator === "delete" || operator === "change" || operator === "yank";
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
  if (!operator || !isMotionOperator(operator)) return { type: "invalid" };

  if (!pending.kind) {
    const kindSequence = pending.kindPrefix + key;
    const scoped = scopedTextObjectSequenceFor(keymap, kindSequence, "textObject.kind.");
    const kind = textObjectKindForKey(kindSequence, keymap);
    if (kind && !scoped.isPrefix) {
      return {
        type: "pending",
        pending: encodeTextObjectPending(
          pending.operatorSequence,
          kindSequence,
          kind,
          undefined,
          pending.count,
        ),
      };
    }
    if (scoped.isPrefix) {
      return {
        type: "pending",
        pending: encodeTextObjectPending(
          pending.operatorSequence,
          kindSequence,
          undefined,
          undefined,
          pending.count,
        ),
      };
    }
    return { type: "invalid" };
  }

  const targetSequence = `${pending.targetPrefix ?? ""}${key}`;
  const scoped = scopedTextObjectSequenceFor(keymap, targetSequence, "textObject.target.");
  const target = textObjectTargetForKey(targetSequence, keymap);
  if (target && !scoped.isPrefix) {
    return {
      type: "operatorTextObject",
      operator,
      textObject: { kind: pending.kind, target },
      count: pending.count,
    };
  }
  if (scoped.isPrefix) {
    return {
      type: "pending",
      pending: encodeTextObjectPending(
        pending.operatorSequence,
        pending.kindPrefix,
        pending.kind,
        targetSequence,
        pending.count,
      ),
    };
  }
  return { type: "invalid" };
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
  if (supportsSearchTargets(operator)) {
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
      return {
        type: "pending",
        pending: encodeOperatorSearchPending(operatorSequence, key, count),
      };
    }
  }

  const scopedTextObjectKind = scopedTextObjectSequenceFor(keymap, key, "textObject.kind.");
  const textObjectKind = textObjectKindForKey(key, keymap);
  if (textObjectKind && !scopedTextObjectKind.isPrefix) {
    return {
      type: "pending",
      pending: encodeTextObjectPending(operatorSequence, key, textObjectKind, undefined, count),
    };
  }
  if (scopedTextObjectKind.isPrefix) {
    return {
      type: "pending",
      pending: encodeTextObjectPending(operatorSequence, key, undefined, undefined, count),
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
  mode?: VimActionBindingMode,
): SemanticCommandResult {
  if (!count && keymap.leader === key) return { type: "pending", pending: key };
  if (!count && /^[1-9]$/.test(key)) return { type: "pending", pending: encodeCountPending(key) };
  if (hasLongerPrefix(key, keymap, mode))
    return { type: "pending", pending: count ? encodeCountPending(String(count), key) : key };
  const binding = exactBinding(key, keymap, mode);
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
  mode?: VimActionBindingMode,
): SemanticCommandResult {
  if (pending) {
    const count = decodeCountPending(pending);
    if (count) {
      if (count.inner === "" && /^\d$/.test(key)) {
        return { type: "pending", pending: encodeCountPending(count.count + key) };
      }
      if (count.inner === "")
        return withCount(
          resolveWithoutPending(key, keymap, Number(count.count), mode),
          Number(count.count),
        );
      const innerResult = resolveNormalCommand(key, count.inner, keymap, mode);
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
    if (hasLongerPrefix(combined, keymap, mode)) return { type: "pending", pending: combined };
    const combinedBinding = exactBinding(combined, keymap, mode);
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

  return resolveWithoutPending(key, keymap, undefined, mode);
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
