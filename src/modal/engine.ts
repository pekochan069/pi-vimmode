import { matchesKey, parseKey } from "@earendil-works/pi-tui";

import type {
  ResolvedVimKeymap,
  VimActionBindingMode,
  VimDiagnostics,
  VimOperatorAction,
} from "../types.ts";
import type {
  EditorSnapshot,
  FastInsertDelegateContext,
  ModalEffect,
  ModalOptions,
  ModalState,
  ModalUpdate,
} from "./types.ts";

import {
  deleteLineMarkRange,
  deleteMarkRange,
  exactMarkPosition,
  insertDeleteLineBackward,
  insertDeleteLineForward,
  insertDeleteWordBackward,
  insertDeleteWordForward,
  insertLineEndPosition,
  insertLineStartPosition,
  insertWordBackwardPosition,
  insertWordForwardPosition,
  lineMarkPosition,
  openLineAbove,
  openLineBelow,
  yankLineMarkRange,
  yankMarkRange,
} from "../buffer.ts";
import {
  countForPendingSequence,
  isKeyUnmapped,
  isMacroControlKey,
  operatorActionForSequence,
  resolveMacroCommand,
  resolveNormalCommand,
  scopedKeymapSequenceFor,
  scopedKeysForAction,
  type SemanticCommandResult,
} from "../commands.ts";
import {
  escapeAliasesForScope as configuredEscapeAliasesForScope,
  keymapForOptions,
  macrosForOptions,
  marksForOptions,
} from "../config.ts";
import { protectedShortcutForKey } from "../customization.ts";
import { scrollHelpPopup } from "../read-only-popup.ts";
import { applyPromptTransformAction, applyVisualPromptTransformAction } from "./actions.ts";
import {
  clearCommandPending,
  clearExMessage,
  clearHelpPopup,
  clearPending,
  delegate,
  editState,
  invalidate,
  insertKeySequence,
  isDelegatedResetKey,
  isProtectedPiDelegateKey,
  keymapHasBinding,
  keySequence,
  modeUpdate,
  resetAndDelegate,
  withEffects,
  withNoopFeedback,
  yankUpdate,
} from "./core.ts";
import { exDisplay, handlePendingExInput, startVisualExCommandUpdate } from "./ex-command-line.ts";
import {
  appendRecordedInput,
  clearPendingMacro,
  playMacroUpdate,
  shouldRecordInput,
  startMacroRecording,
  stopMacroRecording,
} from "./macros.ts";
import {
  clearMarkTarget,
  localMarkPosition,
  markSlotForKey,
  pendingMarkDisplay,
  pendingMarkTarget,
  setLocalMark,
} from "./marks.ts";
import {
  applyCommand,
  applyLineCommand,
  applyOperatorCharSearch,
  applyOperatorCharSearchRepeat,
  applyOperatorMotion,
  applyOperatorTextObject,
  moveUpdate,
} from "./normal.ts";
import { clearRegisterTarget, isRegisterPrefixKey, registerTargetForKey } from "./registers.ts";
import {
  handlePendingSearchInput,
  pendingSearchDisplay,
  repeatSearch,
  startSearchUpdate,
} from "./search.ts";
import { transitionMode } from "./state.ts";
import { captureBeforeVisualExit } from "./visual.ts";
import {
  applyVisualOperator,
  deleteVisualSelection,
  handleBlockInsertInput,
  pasteVisualLineSelection,
  replaceVisualSelection,
  startBlockInsert,
  toggleVisualSelection,
  transformVisualSelection,
  visualKindForMode,
} from "./visual.ts";

function protectedShortcutMessage(data: string): string {
  const key = parseKey(data) ?? data;
  const shortcut = protectedShortcutForKey(key);
  return shortcut
    ? `${shortcut.key} protected for ${shortcut.reason}`
    : "protected Pi shortcut delegated";
}

function delegateProtectedShortcut(
  state: ModalState,
  options: ModalOptions,
  input: string,
): ModalUpdate {
  const cleared = clearPending(state);
  const next = withNoopFeedback(cleared, options, protectedShortcutMessage(input));
  return withEffects(next, [{ type: "delegate", input }, { type: "invalidate" }]);
}

function isPlainFastInsertText(data: string): boolean {
  const chars = Array.from(data);
  if (chars.length !== 1) return false;
  const codePoint = chars[0]?.codePointAt(0) ?? 0;
  return codePoint >= 32 && codePoint !== 127;
}

function clearPendingInsertEscape(state: ModalState): ModalState {
  const { pendingInsertEscape: _pendingInsertEscape, ...rest } = state;
  return rest;
}

function escapeKey(data: string): string | undefined {
  return keySequence(data);
}

function aliasStartsWith(alias: string, sequence: string): boolean {
  return alias.includes("+") ? alias === sequence : alias.startsWith(sequence);
}

function isInsertEscapePrefix(data: string, sequences: readonly string[]): boolean {
  const key = escapeKey(data);
  return Boolean(key && sequences.some((sequence) => aliasStartsWith(sequence, key)));
}

function escapeAliasesForScope(
  options: ModalOptions,
  scope: "insert" | "visual" | "visualLine" | "visualBlock" | "operatorPending",
): string[] {
  return configuredEscapeAliasesForScope(keymapForOptions(options), scope);
}

type InsertEscapeMatch =
  | { kind: "ignored" }
  | { kind: "pending"; sequence: string }
  | { kind: "matched" }
  | { kind: "mismatched" };

function matchInsertEscapeInput(
  state: ModalState,
  data: string,
  aliases: readonly string[],
): InsertEscapeMatch {
  if (aliases.length === 0 && !state.pendingInsertEscape) return { kind: "ignored" };
  const key = escapeKey(data);
  if (!key) return state.pendingInsertEscape ? { kind: "mismatched" } : { kind: "ignored" };

  const sequence = `${state.pendingInsertEscape ?? ""}${key}`;
  if (aliases.includes(sequence)) return { kind: "matched" };
  if (aliases.some((alias) => aliasStartsWith(alias, sequence)))
    return { kind: "pending", sequence };
  return state.pendingInsertEscape ? { kind: "mismatched" } : { kind: "ignored" };
}

function delegateBufferedInsertEscape(state: ModalState, input: string): ModalUpdate {
  const pending = state.pendingInsertEscape;
  const effects: ModalEffect[] = [
    ...Array.from(pending ?? "", (char) => ({ type: "delegate" as const, input: char })),
    { type: "delegate", input },
  ];
  return withEffects(clearPendingInsertEscape(state), effects);
}

export function canFastDelegateInsertInput(
  state: ModalState,
  data: string,
  context: FastInsertDelegateContext = {},
): boolean {
  return (
    state.mode === "insert" &&
    isPlainFastInsertText(data) &&
    !context.isAutocompleteOpen &&
    !context.isMacroReplaying &&
    !state.pendingInsertEscape &&
    !isInsertEscapePrefix(data, context.escape ?? []) &&
    !state.visualAnchor &&
    !state.pending &&
    !state.blockInsert &&
    !state.recordingSlot &&
    !state.pendingMacro &&
    !state.pendingRegister &&
    !state.pendingMark &&
    !state.pendingWorkbench &&
    !state.pendingSearch &&
    !state.pendingEx &&
    !state.exMessage &&
    !state.helpPopup &&
    !state.searchHighlight
  );
}

/**
 * EASYNOMOTION LOGIC
 */
function handleEasymotionInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  _options: ModalOptions,
  data: string,
): ModalUpdate {
  const key = keySequence(data);
  if (!key || matchesKey(data, "escape")) {
    const { pendingEasymotion, ...rest } = state;
    if (pendingEasymotion?.kind === "highlight") {
      return withEffects(rest, [
        {
          type: "edit",
          result: {
            text: pendingEasymotion.originalText,
            cursor: snapshot.cursor,
            changed: true,
          },
        },
        { type: "invalidate" },
      ]);
    }
    return invalidate(rest);
  }

  if (state.pendingEasymotion?.kind === "char") {
    // Transition to highlight state with case-insensitive matching
    const targets: { label: string; line: number; character: number; original: string }[] = [];
    const lines = snapshot.text.split("\n");
    const labels = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    let count = 0;
    const targetChar = key.toLowerCase();

    for (let i = 0; i < lines.length && count < labels.length; i++) {
      const line = lines[i];
      if (line === undefined) continue;
      // Case-insensitive matching
      let pos = line.toLowerCase().indexOf(targetChar);
      while (pos !== -1 && count < labels.length) {
        const label = labels[count];
        if (label === undefined) break;
        const original = line[pos] ?? key;
        targets.push({ label, line: i, character: pos, original });
        count++;
        pos = line.toLowerCase().indexOf(targetChar, pos + 1);
      }
    }

    if (targets.length === 0) {
      const { pendingEasymotion: _, ...rest } = state;
      return invalidate(rest);
    }

    // Build text with address characters replacing matched characters
    const nextLines = [...snapshot.lines];
    for (const target of targets) {
      const line = nextLines[target.line];
      if (line === undefined) continue;
      nextLines[target.line] =
        line.slice(0, target.character) + target.label + line.slice(target.character + 1);
    }
    const nextText = nextLines.join("\n");

    return withEffects(
      {
        ...state,
        pendingEasymotion: { kind: "highlight", targets, originalText: snapshot.text },
      },
      [
        {
          type: "edit",
          result: { text: nextText, cursor: snapshot.cursor, changed: nextText !== snapshot.text },
        },
      ],
    );
  }

  if (state.pendingEasymotion?.kind === "highlight") {
    // Address character input: jump to target and restore that character
    const target = state.pendingEasymotion.targets.find((t) => t.label === key);

    if (target) {
      const { pendingEasymotion: _, ...rest } = state;
      // Restore full original text then place cursor on the target
      return withEffects(rest, [
        {
          type: "edit",
          result: {
            text: state.pendingEasymotion.originalText,
            cursor: snapshot.cursor,
            changed: true,
          },
        },
        { type: "restoreCursor", position: { line: target.line, col: target.character } },
        { type: "invalidate" },
      ]);
    }
    return invalidate(state);
  }

  if (state.pendingEasymotion?.kind === "jump") {
    const target = state.pendingEasymotion.targets.find((t: any) => t.label === key);
    const { pendingEasymotion: _, ...rest } = state;

    if (target) {
      return withEffects(rest, [
        { type: "restoreCursor", position: { line: target.line, col: target.character } },
        { type: "invalidate" },
      ]);
    }
    return invalidate(rest);
  }

  return invalidate(state);
}

function handleInsertInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
): ModalUpdate {
  if (state.blockInsert) return handleBlockInsertInput(state, snapshot, options, data);

  if (matchesKey(data, "escape")) {
    if (snapshot.isAutocompleteOpen) return delegateBufferedInsertEscape(state, data);
    return modeUpdate(clearPendingInsertEscape(state), "normal", options);
  }

  if (snapshot.isAutocompleteOpen) return delegateBufferedInsertEscape(state, data);

  const match = matchInsertEscapeInput(state, data, escapeAliasesForScope(options, "insert"));
  if (match.kind === "matched")
    return modeUpdate(clearPendingInsertEscape(state), "normal", options);
  if (match.kind === "pending") {
    return withEffects({ ...state, pendingInsertEscape: match.sequence }, []);
  }
  if (match.kind === "mismatched") return delegateBufferedInsertEscape(state, data);

  const key = insertKeySequence(data);
  if (key) {
    const insert = keymapForOptions(options).insert;
    if (insert.openLineBelow.includes(key)) {
      const result = openLineBelow(snapshot.text, snapshot.cursor);
      return withEffects(editState(state, result), [
        { type: "edit", result },
        { type: "invalidate" },
      ]);
    }
    if (insert.openLineAbove.includes(key)) {
      const result = openLineAbove(snapshot.text, snapshot.cursor);
      return withEffects(editState(state, result), [
        { type: "edit", result },
        { type: "invalidate" },
      ]);
    }
    if (insert.deleteWordBackward.includes(key)) {
      const result = insertDeleteWordBackward(snapshot.text, snapshot.cursor);
      return withEffects(editState(state, result), [
        { type: "edit", result },
        { type: "invalidate" },
      ]);
    }
    if (insert.deleteWordForward.includes(key)) {
      const result = insertDeleteWordForward(snapshot.text, snapshot.cursor);
      return withEffects(editState(state, result), [
        { type: "edit", result },
        { type: "invalidate" },
      ]);
    }
    if (insert.deleteLineBackward.includes(key)) {
      const result = insertDeleteLineBackward(snapshot.text, snapshot.cursor);
      return withEffects(editState(state, result), [
        { type: "edit", result },
        { type: "invalidate" },
      ]);
    }
    if (insert.deleteLineForward.includes(key)) {
      const result = insertDeleteLineForward(snapshot.text, snapshot.cursor);
      return withEffects(editState(state, result), [
        { type: "edit", result },
        { type: "invalidate" },
      ]);
    }
    if (insert.moveWordBackward.includes(key)) {
      const position = insertWordBackwardPosition(snapshot.text, snapshot.cursor);
      return withEffects(state, [{ type: "restoreCursor", position }, { type: "invalidate" }]);
    }
    if (insert.moveWordForward.includes(key)) {
      const position = insertWordForwardPosition(snapshot.text, snapshot.cursor);
      return withEffects(state, [{ type: "restoreCursor", position }, { type: "invalidate" }]);
    }
    if (insert.moveLineStart.includes(key)) {
      const position = insertLineStartPosition(snapshot.text, snapshot.cursor);
      return withEffects(state, [{ type: "restoreCursor", position }, { type: "invalidate" }]);
    }
    if (insert.moveLineEnd.includes(key)) {
      const position = insertLineEndPosition(snapshot.text, snapshot.cursor);
      return withEffects(state, [{ type: "restoreCursor", position }, { type: "invalidate" }]);
    }
  }

  return delegate(state, data);
}

function markJumpTarget(
  state: ModalState,
  snapshot: EditorSnapshot,
  slot: string,
  kind: "jumpExact" | "jumpLine",
) {
  const mark = localMarkPosition(state, slot);
  if (!mark) return undefined;
  return kind === "jumpExact"
    ? exactMarkPosition(snapshot.text, mark)
    : lineMarkPosition(snapshot.text, mark);
}

function jumpToMarkUpdate(
  state: ModalState,
  snapshot: EditorSnapshot,
  slot: string,
  kind: "jumpExact" | "jumpLine",
): ModalUpdate {
  const target = markJumpTarget(state, snapshot, slot, kind);
  const nextState = clearMarkTarget(state);
  return withEffects(
    nextState,
    target
      ? [{ type: "restoreCursor", position: target }, { type: "invalidate" }]
      : [{ type: "invalidate" }],
  );
}

function applyOperatorMarkMotion(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  slot: string,
  kind: "jumpExact" | "jumpLine",
  operator: VimOperatorAction,
): ModalUpdate {
  const target = markJumpTarget(state, snapshot, slot, kind);
  const baseState = clearPending(state);
  if (!target) return invalidate(baseState);

  if (operator === "yank") {
    const register =
      kind === "jumpLine"
        ? yankLineMarkRange(snapshot.text, snapshot.cursor, target)
        : yankMarkRange(snapshot.text, snapshot.cursor, target);
    return yankUpdate(baseState, register);
  }

  const result =
    kind === "jumpLine"
      ? deleteLineMarkRange(snapshot.text, snapshot.cursor, target)
      : deleteMarkRange(snapshot.text, snapshot.cursor, target);
  const edited = editState(baseState, result);
  const effects: ModalEffect[] = [{ type: "edit", result }];
  if (operator === "change") return transitionMode(edited, "insert", options, effects);
  return withEffects(edited, effects);
}

function handlePendingMarkTarget(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  key: string,
): ModalUpdate {
  const target = state.pendingMark;
  if (!target) return invalidate(state);
  const slot = markSlotForKey(key, marksForOptions(options).slots);
  if (!slot) return invalidate(clearPending(state));
  if (target.kind === "set") {
    return invalidate(setLocalMark(state, slot, exactMarkPosition(snapshot.text, snapshot.cursor)));
  }
  if (target.operator) {
    return applyOperatorMarkMotion(state, snapshot, options, slot, target.kind, target.operator);
  }
  return jumpToMarkUpdate(state, snapshot, slot, target.kind);
}

function markPendingForKey(
  key: string,
  options: ModalOptions,
  operator?: VimOperatorAction,
  operatorKey?: string,
  mode: "normal" | "visual" | "visualLine" | "visualBlock" | "operatorPending" = "normal",
) {
  if (!marksForOptions(options).enabled) return undefined;
  const resolved = keymapForOptions(options);
  if (isKeyUnmapped(resolved, key, mode)) return undefined;
  const hasScopedMark = (action: "set" | "jumpExact" | "jumpLine") =>
    scopedKeysForAction(resolved, `mark.${action}`, mode).includes(key);
  if (!operator && (resolved.marks.set.includes(key) || hasScopedMark("set"))) {
    return pendingMarkTarget("set");
  }
  if (resolved.marks.jumpExact.includes(key) || hasScopedMark("jumpExact")) {
    return pendingMarkTarget("jumpExact", operator, operatorKey);
  }
  if (resolved.marks.jumpLine.includes(key) || hasScopedMark("jumpLine")) {
    return pendingMarkTarget("jumpLine", operator, operatorKey);
  }
  return undefined;
}

function remapUpdate(
  state: ModalState,
  options: ModalOptions,
  mode: "normal" | "visual" | "visualLine" | "visualBlock",
  key: string,
): ModalUpdate | undefined {
  const sequence = `${state.pending ?? ""}${key}`;
  const keymap = keymapForOptions(options);
  const actionKeys = new Set(
    keymap.actions.accepted
      .filter((action) => !action.modes || action.modes.includes(mode))
      .map((action) => action.key),
  );
  const remaps = keymap.remaps.accepted.filter(
    (remap) => (!remap.modes || remap.modes.includes(mode)) && !actionKeys.has(remap.key),
  );
  const exact = remaps.find((remap) => remap.key === sequence);
  if (exact) {
    const inputs = exact.inputs.slice(0, macrosForOptions(options).maxReplaySteps);
    return withEffects(clearPending(state), [{ type: "playMacro", slot: "remap", inputs }]);
  }
  if (remaps.some((remap) => remap.key.startsWith(sequence))) {
    return invalidate({ ...state, pending: sequence });
  }
  return undefined;
}

function handleNormalMacroOrMark(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  keymap: ResolvedVimKeymap,
  key: string,
): ModalUpdate | undefined {
  const macros = macrosForOptions(options);
  const macroKeys = (action: "record" | "play") =>
    [...keymap.macros[action], ...scopedKeysForAction(keymap, `macro.${action}`, "normal")].filter(
      (binding) => !isKeyUnmapped(keymap, binding, "normal"),
    );
  const recordKeys = macroKeys("record");
  const playKeys = macroKeys("play");
  if (
    snapshot.isMacroReplaying &&
    (state.pendingMacro || isMacroControlKey(key, recordKeys, playKeys))
  ) {
    return invalidate(clearPendingMacro(state));
  }
  const result = resolveMacroCommand(key, state.pendingMacro, Boolean(state.recordingSlot), {
    enabled: macros.enabled,
    slots: macros.slots,
    recordKeys,
    playKeys,
  });
  if (result.type === "pendingMacro")
    return invalidate({ ...clearPending(state), pendingMacro: result.target });
  if (result.type === "startRecording") return startMacroRecording(state, result.slot);
  if (result.type === "stopRecording") return stopMacroRecording(state);
  if (result.type === "playMacro") {
    if (snapshot.isMacroReplaying || state.recordingSlot)
      return invalidate(clearPendingMacro(state));
    return playMacroUpdate(state, result.slot, options);
  }
  if (result.type === "repeatMacro") {
    if (snapshot.isMacroReplaying || state.recordingSlot || !state.lastPlayedMacro)
      return invalidate(clearPendingMacro(state));
    return playMacroUpdate(state, state.lastPlayedMacro, options);
  }
  if (result.type === "invalid") return invalidate(clearPendingMacro(state));

  const markTarget = markPendingForKey(key, options);
  return markTarget ? invalidate({ ...clearPending(state), pendingMark: markTarget }) : undefined;
}

function applyNormalResolution(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  keymap: ResolvedVimKeymap,
  key: string,
  result: SemanticCommandResult,
): ModalUpdate {
  if (result.type === "pending") {
    const operator = operatorActionForSequence(result.pending, keymap);
    if (state.pendingRegister && !operator) return invalidate(clearPending(state));
    return invalidate({ ...state, pending: result.pending });
  }
  if (result.type === "motion") {
    if (state.pendingRegister) return invalidate(clearPending(state));
    return moveUpdate(clearPending(state), result.motion, snapshot, result.count);
  }
  if (result.type === "command") {
    if (result.command === "easymotion") {
      return invalidate({ ...state, pending: undefined, pendingEasymotion: { kind: "char" } });
    }
    return applyCommand(state, snapshot, options, result.command, result.count);
  }
  if (result.type === "action") {
    if (state.pendingRegister) return invalidate(clearPending(state));
    return applyPromptTransformAction(state, snapshot, options, result);
  }
  if (result.type === "charCommand")
    return applyCommand(state, snapshot, options, result.command, result.count, result.char);
  if (result.type === "lineCommand")
    return applyLineCommand(state, snapshot, options, result.operator, result.count);
  if (result.type === "operatorMotion")
    return applyOperatorMotion(
      state,
      snapshot,
      result.operator,
      result.motion,
      options,
      result.count,
    );
  if (result.type === "operatorSearch")
    return startSearchUpdate(state, result.direction, result.operator);
  if (result.type === "operatorCharSearch")
    return applyOperatorCharSearch(
      state,
      snapshot,
      result.operator,
      result.command,
      result.char,
      options,
      result.count,
    );
  if (result.type === "operatorCharSearchRepeat")
    return applyOperatorCharSearchRepeat(
      state,
      snapshot,
      result.operator,
      result.reverse,
      options,
      result.count,
    );
  if (result.type === "operatorTextObject")
    return applyOperatorTextObject(
      state,
      snapshot,
      result.operator,
      result.textObject,
      options,
      result.count,
    );
  if (result.type === "invalid") {
    if (keymap.leader && state.pending?.startsWith(keymap.leader))
      return invalidate(clearPending(state));
    return invalidate(withNoopFeedback(clearPending(state), options, "invalid Vim key sequence"));
  }
  if (state.pendingRegister) return invalidate(clearPending(state));
  return invalidate(withNoopFeedback(state, options, `unmapped key: ${key}`));
}

function handleNormalInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
): ModalUpdate {
  if (matchesKey(data, "escape")) {
    const nextState = clearPending(state);
    return withEffects(nextState, [{ type: "delegate", input: data }, { type: "invalidate" }]);
  }

  if (isDelegatedResetKey(data)) return resetAndDelegate(state, options, data);
  const key = keySequence(data);
  if (!key) {
    const nextState = clearPending(state);
    return withEffects(nextState, [{ type: "delegate", input: data }, { type: "invalidate" }]);
  }

  const keymap = keymapForOptions(options);
  const pendingOperator = operatorActionForSequence(state.pending, keymap);
  if (pendingOperator) {
    const escapeMatch = matchInsertEscapeInput(
      state,
      data,
      escapeAliasesForScope(options, "operatorPending"),
    );
    if (escapeMatch.kind === "matched") return invalidate(clearPending(state));
    if (escapeMatch.kind === "pending")
      return withEffects({ ...state, pendingInsertEscape: escapeMatch.sequence }, []);
    if (escapeMatch.kind === "mismatched") return invalidate(clearPending(state));
  }
  if (isProtectedPiDelegateKey(data)) {
    if (!keymapHasBinding(keymap, key, "normal")) {
      return delegateProtectedShortcut(state, options, data);
    }
  }

  const scopedSequence = `${state.pending ?? ""}${key}`;
  const scoped = scopedKeymapSequenceFor(keymap, scopedSequence, "normal");
  if (
    !state.pendingMacro &&
    !state.pendingMark &&
    !state.pendingRegister &&
    (scoped.exact || scoped.isPrefix)
  ) {
    if (!scoped.exact) return invalidate({ ...state, pending: scopedSequence });
    if (scoped.exact.actionId.startsWith("macro.") || scoped.exact.actionId.startsWith("mark.")) {
      const handled = handleNormalMacroOrMark(
        { ...state, pending: undefined },
        snapshot,
        options,
        keymap,
        scopedSequence,
      );
      if (handled) return handled;
    }
    return applyNormalResolution(
      state,
      snapshot,
      options,
      keymap,
      scopedSequence,
      resolveNormalCommand(scopedSequence, undefined, keymap, "normal"),
    );
  }

  if (state.pendingRegister === "awaitingSlot") {
    const target = registerTargetForKey(key);
    return invalidate(
      target ? { ...clearCommandPending(state), pendingRegister: target } : clearPending(state),
    );
  }
  if (state.pendingMark) return handlePendingMarkTarget(state, snapshot, options, key);
  const startsLeader =
    !state.pending && !state.pendingRegister && !state.pendingMacro && keymap.leader === key;
  if (!state.pending && !startsLeader && isRegisterPrefixKey(key)) {
    return invalidate({ ...clearPending(state), pendingRegister: "awaitingSlot" });
  }

  if (!state.pending && !state.pendingRegister && !startsLeader) {
    const macroOrMark = handleNormalMacroOrMark(state, snapshot, options, keymap, key);
    if (macroOrMark) return macroOrMark;
  }

  const remapped = remapUpdate(state, options, "normal", key);
  if (remapped) return remapped;

  if (pendingOperator && !isKeyUnmapped(keymap, key, "operatorPending")) {
    const searchCommand = resolveNormalCommand(key, undefined, keymap, "normal");
    if (searchCommand.type === "command" && searchCommand.command === "startSearch") {
      return startSearchUpdate(state, "forward", pendingOperator);
    }
    if (searchCommand.type === "command" && searchCommand.command === "startSearchBackward") {
      return startSearchUpdate(state, "backward", pendingOperator);
    }
    const markTarget = markPendingForKey(
      key,
      options,
      pendingOperator,
      state.pending,
      "operatorPending",
    );
    if (markTarget) return invalidate({ ...clearRegisterTarget(state), pendingMark: markTarget });
  }

  return applyNormalResolution(
    state,
    snapshot,
    options,
    keymap,
    key,
    resolveNormalCommand(key, state.pending, keymap, "normal"),
  );
}

function applyVisualCommand(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  command: Extract<SemanticCommandResult, { type: "command" }>["command"],
): ModalUpdate {
  const registerAware = command === "deleteChar" || command === "pasteAfter";
  if (state.pendingRegister && !registerAware) return invalidate(clearPending(state));
  if (command === "startSearch") return startSearchUpdate(state);
  if (command === "startSearchBackward") return startSearchUpdate(state, "backward");
  if (command === "startExCommand")
    return captureBeforeVisualExit(state, snapshot, startVisualExCommandUpdate(state, snapshot));
  if (command === "repeatSearch") return repeatSearch(state, snapshot, options, false);
  if (command === "repeatSearchReverse") return repeatSearch(state, snapshot, options, true);
  if (command === "visualLine")
    return state.mode === "visualLine"
      ? invalidate(state)
      : modeUpdate(state, "visualLine", options);
  if (command === "visualChar")
    return state.mode === "visual" ? invalidate(state) : modeUpdate(state, "visual", options);
  if (command === "visualBlock")
    return state.mode === "visualBlock"
      ? invalidate(state)
      : modeUpdate(state, "visualBlock", options);
  if (state.mode === "visualBlock" && command === "insertLineStart")
    return startBlockInsert(state, snapshot, options, "start");
  if (state.mode === "visualBlock" && command === "insertLineEnd")
    return startBlockInsert(state, snapshot, options, "end");
  if (command === "deleteChar")
    return deleteVisualSelection(state, snapshot, options, "normal", visualKindForMode(state.mode));
  if (command === "toggleCase")
    return toggleVisualSelection(state, snapshot, options, visualKindForMode(state.mode));
  if (command === "pasteAfter" && state.mode === "visualLine")
    return pasteVisualLineSelection(state, snapshot, options);
  return invalidate(state.pendingRegister ? clearPending(state) : state);
}

function applyVisualResolution(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  keymap: ResolvedVimKeymap,
  result: SemanticCommandResult,
): ModalUpdate {
  if (result.type === "motion") {
    if (state.pendingRegister) return invalidate(clearPending(state));
    return moveUpdate(state, result.motion, snapshot, result.count);
  }
  if (result.type === "charCommand") {
    if (state.pendingRegister || result.command !== "replaceChar")
      return invalidate(clearPending(state));
    return replaceVisualSelection(
      state,
      snapshot,
      options,
      visualKindForMode(state.mode),
      result.char,
    );
  }
  if (result.type === "action") {
    if (state.pendingRegister) return invalidate(clearPending(state));
    return applyVisualPromptTransformAction(state, snapshot, options, result);
  }
  if (result.type === "command")
    return applyVisualCommand(state, snapshot, options, result.command);
  if (result.type === "pending") {
    const operator = operatorActionForSequence(
      result.pending,
      keymap,
      state.mode as VimActionBindingMode,
    );
    if (operator)
      return applyVisualOperator(
        state,
        snapshot,
        options,
        visualKindForMode(state.mode),
        operator,
        countForPendingSequence(result.pending),
      );
    if (state.pendingRegister) return invalidate(clearPending(state));
    return invalidate({ ...state, pending: result.pending });
  }
  if (result.type === "invalid") return invalidate(clearPending(state));
  return invalidate(state.pendingRegister ? clearPending(state) : state);
}

function handleVisualInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
): ModalUpdate {
  if (matchesKey(data, "escape"))
    return captureBeforeVisualExit(state, snapshot, modeUpdate(state, "normal", options));
  const escapeMatch = matchInsertEscapeInput(
    state,
    data,
    escapeAliasesForScope(options, state.mode as "visual" | "visualLine" | "visualBlock"),
  );
  if (escapeMatch.kind === "matched")
    return captureBeforeVisualExit(state, snapshot, modeUpdate(state, "normal", options));
  if (escapeMatch.kind === "pending")
    return withEffects({ ...state, pendingInsertEscape: escapeMatch.sequence }, []);
  if (escapeMatch.kind === "mismatched") return invalidate(clearPendingInsertEscape(state));
  if (isDelegatedResetKey(data)) return resetAndDelegate(state, options, data);
  const key = keySequence(data);
  if (!key) return delegate(state, data);

  const keymap = keymapForOptions(options);
  if (isProtectedPiDelegateKey(data)) {
    if (!keymapHasBinding(keymap, key, state.mode)) {
      return delegateProtectedShortcut(state, options, data);
    }
  }

  const scopedSequence = `${state.pending ?? ""}${key}`;
  const scoped = scopedKeymapSequenceFor(
    keymap,
    scopedSequence,
    state.mode as VimActionBindingMode,
  );
  if (!state.pendingMark && !state.pendingRegister && (scoped.exact || scoped.isPrefix)) {
    if (!scoped.exact) return invalidate({ ...state, pending: scopedSequence });
    return applyVisualResolution(
      state,
      snapshot,
      options,
      keymap,
      resolveNormalCommand(scopedSequence, undefined, keymap, state.mode as VimActionBindingMode),
    );
  }

  if (state.pendingRegister === "awaitingSlot") {
    const target = registerTargetForKey(key);
    return invalidate(
      target ? { ...clearCommandPending(state), pendingRegister: target } : clearPending(state),
    );
  }
  if (state.pendingMark) return handlePendingMarkTarget(state, snapshot, options, key);
  const startsLeader =
    !state.pending && !state.pendingRegister && !state.pendingMacro && keymap.leader === key;
  if (!state.pending && !startsLeader && isRegisterPrefixKey(key)) {
    return invalidate({ ...clearPending(state), pendingRegister: "awaitingSlot" });
  }
  if (!state.pending && !state.pendingRegister && !startsLeader && key === "u") {
    return transformVisualSelection(
      state,
      snapshot,
      options,
      visualKindForMode(state.mode),
      "lowercase",
    );
  }
  if (!state.pending && !state.pendingRegister && !startsLeader && key === "U") {
    return transformVisualSelection(
      state,
      snapshot,
      options,
      visualKindForMode(state.mode),
      "uppercase",
    );
  }
  if (!state.pending && !state.pendingRegister && !startsLeader) {
    const markTarget = markPendingForKey(
      key,
      options,
      undefined,
      undefined,
      state.mode as "visual" | "visualLine" | "visualBlock",
    );
    if (markTarget?.kind === "jumpExact" || markTarget?.kind === "jumpLine") {
      return invalidate({ ...clearPending(state), pendingMark: markTarget });
    }
  }

  const remapped = remapUpdate(
    state,
    options,
    state.mode as "visual" | "visualLine" | "visualBlock",
    key,
  );
  if (remapped) return remapped;

  return applyVisualResolution(
    state,
    snapshot,
    options,
    keymap,
    resolveNormalCommand(
      key,
      state.pending,
      keymap,
      state.mode as "visual" | "visualLine" | "visualBlock",
    ),
  );
}

function handleHelpPopupInput(state: ModalState, options: ModalOptions, data: string): ModalUpdate {
  if (matchesKey(data, "escape")) return invalidate(clearHelpPopup(state));
  if (isDelegatedResetKey(data)) return resetAndDelegate(state, options, data);
  if (isProtectedPiDelegateKey(data)) return delegateProtectedShortcut(state, options, data);

  if (!state.helpPopup) return invalidate(state);
  if (matchesKey(data, "down")) {
    return invalidate({ ...state, helpPopup: scrollHelpPopup(state.helpPopup, 1) });
  }
  if (matchesKey(data, "up")) {
    return invalidate({ ...state, helpPopup: scrollHelpPopup(state.helpPopup, -1) });
  }

  const key = keySequence(data);
  if (key === "j") return invalidate({ ...state, helpPopup: scrollHelpPopup(state.helpPopup, 1) });
  if (key === "k") return invalidate({ ...state, helpPopup: scrollHelpPopup(state.helpPopup, -1) });
  if (key === "g")
    return invalidate({ ...state, helpPopup: { ...state.helpPopup, scrollOffset: 0 } });
  if (key === "G") {
    return invalidate({
      ...state,
      helpPopup: scrollHelpPopup(state.helpPopup, state.helpPopup.lines.length),
    });
  }

  return invalidate(state);
}

function routeModalInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
  diagnostics: VimDiagnostics,
): ModalUpdate {
  const routedState = state.exMessage && !state.pendingEx ? clearExMessage(state) : state;
  if (routedState.helpPopup) return handleHelpPopupInput(routedState, options, data);

  // Easymotion routing
  if (routedState.pendingEasymotion)
    return handleEasymotionInput(routedState, snapshot, options, data);

  if (routedState.pendingEx)
    return handlePendingExInput(routedState, snapshot, options, data, diagnostics);
  if (routedState.pendingSearch)
    return handlePendingSearchInput(routedState, snapshot, options, data);
  if (routedState.mode === "insert") return handleInsertInput(routedState, snapshot, options, data);
  if (
    routedState.mode === "visual" ||
    routedState.mode === "visualLine" ||
    routedState.mode === "visualBlock"
  ) {
    return handleVisualInput(routedState, snapshot, options, data);
  }
  return handleNormalInput(routedState, snapshot, options, data);
}

export function modalPendingDisplay(state: ModalState): string | undefined {
  if (state.pendingEasymotion?.kind === "char") return "EasyMotion: Find Char...";
  if (state.pendingEasymotion?.kind === "highlight") {
    return `Jump [${state.pendingEasymotion.targets.map((t) => t.label).join("")}]: `;
  }
  if (state.pendingEasymotion?.kind === "jump") {
    return `Jump [${state.pendingEasymotion.targets.map((t: any) => t.label).join("")}]: `;
  }

  return (
    exDisplay(state.pendingEx) ??
    pendingSearchDisplay(state.pendingSearch) ??
    pendingMarkDisplay(state.pendingMark)
  );
}

export function handleModalInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
  diagnostics: VimDiagnostics = { warnings: [] },
): ModalUpdate {
  const update = routeModalInput(state, snapshot, options, data, diagnostics);
  if (!state.recordingSlot || !shouldRecordInput(state, snapshot, update, options, data))
    return update;
  return {
    ...update,
    state: appendRecordedInput(update.state, state.recordingSlot, data),
  };
}
