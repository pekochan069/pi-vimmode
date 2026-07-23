import type {
  EditResult,
  LineRange,
  Position,
  VimDiagnostics,
  VimMode,
  VimRegister,
} from "../types.ts";
import type {
  EditorSnapshot,
  ExMessage,
  LastExSubstitution,
  ModalEffect,
  ModalOptions,
  ModalState,
  ModalUpdate,
  PendingExCommand,
} from "./types.ts";

import {
  applyPromptTransform,
  copyExLineRange,
  deleteExLineRange,
  joinExLineRange,
  moveExLineRange,
  putExRegisterAfterRange,
  substituteLineRangeLiteral,
  substituteLineRangeRegex,
  yankExLineRange,
} from "../buffer.ts";
import { keymapForOptions, promptTransformsForOptions } from "../config.ts";
import {
  parseExCommand,
  suggestExCommands,
  type ExParseResult,
  type ParsedExSubstitution,
} from "../ex.ts";
import {
  changelogPopup,
  diagnosticPopup,
  inspectPopup,
  keybindingsPopup,
  runtimeHelpPopup,
} from "../keybinding-discovery-popup.ts";
import { parseExLineRange } from "../range.ts";
import { type ReadOnlyPopup } from "../read-only-popup.ts";
import {
  clearPending,
  clearPendingEx,
  clearSearchHighlight,
  invalidate,
  keyMatches,
  keySequence,
  resetAndDelegate,
  withEffects,
  withRuntimeMessage,
} from "./core.ts";
import { applyRegisterWrite, registerToRead, writeRegisters } from "./registers.ts";

export function exDisplay(pendingEx: PendingExCommand | undefined): string | undefined {
  return pendingEx ? `:${pendingEx.command}` : undefined;
}

export function visualExCommand(
  sourceMode: Extract<VimMode, "visual" | "visualLine" | "visualBlock">,
  visualAnchor: Position,
  visualCursor: Position,
  visualRange: LineRange,
): PendingExCommand {
  return {
    command: "'<,'>",
    cursor: "'<,'>".length,
    sourceMode,
    visualAnchor,
    visualCursor,
    visualRange,
  };
}

export function hasPendingEx(state: ModalState): boolean {
  return Boolean(state.pendingEx);
}

function exLineRange(anchor: EditorSnapshot["cursor"], active: EditorSnapshot["cursor"]) {
  return {
    startLine: Math.min(anchor.line, active.line),
    endLine: Math.max(anchor.line, active.line),
  };
}

export function startExCommandUpdate(
  state: ModalState,
  snapshot: EditorSnapshot,
  count = 1,
): ModalUpdate {
  const command =
    count > 1
      ? `${snapshot.cursor.line + 1},${Math.min(snapshot.lines.length - 1, snapshot.cursor.line + count - 1) + 1}`
      : "";
  return invalidate({
    ...clearPending(state),
    pendingEx: { command, cursor: command.length, sourceMode: "normal" },
  });
}

export function startVisualExCommandUpdate(
  state: ModalState,
  snapshot: EditorSnapshot,
): ModalUpdate {
  if (!state.visualAnchor) return invalidate(state);
  return invalidate({
    ...clearPending(state),
    mode: state.mode,
    visualAnchor: state.visualAnchor,
    pendingEx: {
      command: "'<,'>",
      cursor: "'<,'>".length,
      sourceMode: state.mode as "visual" | "visualLine" | "visualBlock",
      visualAnchor: state.visualAnchor,
      visualCursor: snapshot.cursor,
      visualRange: exLineRange(state.visualAnchor, snapshot.cursor),
    },
  });
}

const EX_HISTORY_LIMIT = 50;

function addExHistory(history: readonly string[] | undefined, command: string): string[] {
  if (command.length === 0) return [...(history ?? [])];
  const deduped = (history ?? []).filter((entry) => entry !== command);
  return [...deduped, command].slice(-EX_HISTORY_LIMIT);
}

function finishExState(
  state: ModalState,
  kind?: "error" | "success" | "info",
  text?: string,
): ModalState {
  const pendingEx = state.pendingEx;
  const nextHistory =
    kind === "success" && pendingEx
      ? addExHistory(state.exHistory, pendingEx.command)
      : state.exHistory;
  const base: ModalState = {
    ...clearPendingEx(state),
    mode: "normal",
    visualAnchor: undefined,
    exHistory: nextHistory,
  };
  if (pendingEx?.sourceMode !== "normal") {
    base.mode = "normal";
  }
  return kind && text ? withRuntimeMessage(base, { kind, text }) : base;
}

function restoreVisualExState(
  state: ModalState,
  message?: ExMessage,
  retainMessage = true,
): ModalUpdate {
  const pendingEx = state.pendingEx;
  if (!pendingEx) return invalidate(state);
  if (pendingEx.sourceMode === "normal") {
    const base: ModalState = { ...clearPendingEx(state), mode: "normal" };
    return invalidate(message ? withRuntimeMessage(base, message, retainMessage) : base);
  }
  const base: ModalState = {
    ...clearPendingEx(state),
    mode: pendingEx.sourceMode,
    visualAnchor: pendingEx.visualAnchor,
  };
  return withEffects(message ? withRuntimeMessage(base, message, retainMessage) : base, [
    ...(pendingEx.visualCursor
      ? [{ type: "restoreCursor" as const, position: pendingEx.visualCursor }]
      : []),
    { type: "invalidate" },
  ]);
}

function cancelExCommand(state: ModalState): ModalUpdate {
  return restoreVisualExState(state);
}

function openReadOnlyPopup(state: ModalState, popup: ReadOnlyPopup): ModalUpdate {
  const command = state.pendingEx?.command;
  const restored = restoreVisualExState(state);
  return {
    state: {
      ...restored.state,
      helpPopup: popup,
      exHistory: command
        ? addExHistory(restored.state.exHistory, command)
        : restored.state.exHistory,
    },
    effects: [...restored.effects, { type: "openReadOnlyPopup", popup }],
  };
}

function substitutionMessage(matches: number): string {
  return `${matches} ${matches === 1 ? "substitution" : "substitutions"}`;
}

function substitutionSource(parsed: ParsedExSubstitution): LastExSubstitution {
  return {
    command: parsed.command,
    pattern: parsed.pattern,
    replacement: parsed.replacement,
    global: parsed.global,
    ignoreCase: parsed.ignoreCase,
    matcherMode: parsed.matcherMode,
  };
}

function lineMessage(lines: number, verb: string): string {
  return `${lines} ${lines === 1 ? "line" : "lines"} ${verb}`;
}

function finishExEdit(
  state: ModalState,
  result: { edit: EditResult; lines: number },
  message: string,
  register?: VimRegister,
  extraEffects: ModalEffect[] = [],
): ModalUpdate {
  const base = result.edit.changed ? clearSearchHighlight(state) : state;
  const next = register ? { ...base, register } : base;
  const finished = finishExState(next, "success", message);
  const effects: ModalEffect[] = result.edit.changed
    ? [{ type: "edit", result: result.edit }, ...extraEffects]
    : [{ type: "invalidate" }, ...extraEffects];
  return withEffects(finished, effects);
}

function finishExPreview(
  state: ModalState,
  pendingEx: NonNullable<ModalState["pendingEx"]>,
): ModalUpdate | undefined {
  if (pendingEx.preview?.command === pendingEx.command) {
    const result = pendingEx.preview;
    const source = result.repeatSource ?? state.lastExSubstitution;
    const base = result.edit.changed ? clearSearchHighlight(state) : state;
    const finished = finishExState(
      source ? { ...base, lastExSubstitution: source } : base,
      "success",
      substitutionMessage(result.matches),
    );
    const effects: ModalEffect[] = result.edit.changed
      ? [{ type: "edit", result: result.edit }]
      : [{ type: "invalidate" }];
    return withEffects(finished, effects);
  }
  return undefined;
}

function executeSubstitutionCommand(
  state: ModalState,
  snapshot: EditorSnapshot,
  pendingEx: NonNullable<ModalState["pendingEx"]>,
  parsed: Extract<ExParseResult, { type: "substitute" | "repeatSubstitute" }>,
): ModalUpdate {
  const previewUpdate = finishExPreview(state, pendingEx);
  if (previewUpdate) return previewUpdate;

  const source =
    parsed.type === "substitute" ? substitutionSource(parsed) : state.lastExSubstitution;
  if (!source) return invalidate(finishExState(state, "error", "No previous substitution"));

  const optionsForSubstitution = {
    range: parsed.range,
    pattern: source.pattern,
    replacement: source.replacement,
    global: source.global,
    ignoreCase: source.ignoreCase,
    originalCursor: snapshot.cursor,
  };
  const result =
    source.matcherMode === "regex"
      ? substituteLineRangeRegex(snapshot.text, optionsForSubstitution)
      : {
          ok: true as const,
          ...substituteLineRangeLiteral(snapshot.text, optionsForSubstitution),
        };
  if (!result.ok) return invalidate(finishExState(state, "error", result.message));
  if (parsed.type === "substitute" && parsed.countOnly) {
    return invalidate(finishExState(state, "success", substitutionMessage(result.matches)));
  }
  if (result.matches === 0) {
    if (parsed.type === "substitute" && parsed.noError) {
      return invalidate(finishExState(state, "success", substitutionMessage(0)));
    }
    return invalidate(finishExState(state, "error", `Pattern not found: ${source.pattern}`));
  }

  const message = `${result.matches} ${result.matches === 1 ? "match" : "matches"} found; Enter applies, Esc cancels`;
  return invalidate({
    ...state,
    pendingEx: {
      ...pendingEx,
      preview: {
        command: pendingEx.command,
        matches: result.matches,
        ranges: result.ranges,
        edit: result.edit,
        message,
        repeatSource: source,
      },
    },
  });
}

function executeExPopupCommand(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  diagnostics: VimDiagnostics,
  parsed: ExParseResult,
): ModalUpdate | undefined {
  if (parsed.type === "diagnostic") {
    return openReadOnlyPopup(state, diagnosticPopup(parsed, options, diagnostics));
  }

  if (parsed.type === "runtimeHelp") {
    return openReadOnlyPopup(
      state,
      runtimeHelpPopup(parsed, options, diagnostics, state.messageHistory),
    );
  }

  if (parsed.type === "keybindings") {
    return openReadOnlyPopup(state, keybindingsPopup(options, diagnostics, parsed.query));
  }

  if (parsed.type === "inspect") {
    return openReadOnlyPopup(state, inspectPopup({ state, snapshot, options, diagnostics }));
  }

  if (parsed.type === "changelog") {
    return openReadOnlyPopup(state, changelogPopup());
  }
  return undefined;
}

function executeExDirectCommand(
  state: ModalState,
  snapshot: EditorSnapshot,
  parsed: ExParseResult,
): ModalUpdate | undefined {
  if (parsed.type === "quit") {
    const finished = finishExState(state);
    return withEffects(finished, [{ type: "shutdown" }]);
  }

  if (parsed.type === "lineJump") {
    const finished = finishExState(state, "success", `line ${parsed.line + 1}`);
    const targetCol = Math.min(snapshot.cursor.col, snapshot.lines[parsed.line]?.length ?? 0);
    return withEffects(finished, [
      { type: "restoreCursor", position: { line: parsed.line, col: targetCol } },
      { type: "invalidate" },
    ]);
  }

  if (parsed.type === "nohlsearch") {
    return invalidate(finishExState(clearSearchHighlight(state)));
  }
  return undefined;
}

function executeExTransformCommand(
  state: ModalState,
  snapshot: EditorSnapshot,
  parsed: ExParseResult,
): ModalUpdate | undefined {
  if (parsed.type === "transform") {
    const result = applyPromptTransform(
      snapshot.text,
      parsed.range,
      parsed.transform,
      snapshot.cursor,
    );
    if (!result.ok) return invalidate(finishExState(state, "error", result.message));
    return finishExEdit(state, result, lineMessage(result.lines, "transformed"));
  }
  return undefined;
}

function executeExYankCommand(
  state: ModalState,
  snapshot: EditorSnapshot,
  parsed: ExParseResult,
): ModalUpdate | undefined {
  if (parsed.type === "yank") {
    const result = yankExLineRange(snapshot.text, parsed.range);
    const base = parsed.register ? { ...state, pendingRegister: parsed.register } : state;
    const written = applyRegisterWrite(base, result.register);
    return withEffects(
      finishExState(written.state, "success", lineMessage(result.lines, "yanked")),
      [...written.effects, { type: "invalidate" }],
    );
  }
  return undefined;
}

function executeExEditRangeCommand(
  state: ModalState,
  snapshot: EditorSnapshot,
  parsed: ExParseResult,
): ModalUpdate | undefined {
  const transformUpdate = executeExTransformCommand(state, snapshot, parsed);
  if (transformUpdate) return transformUpdate;

  const yankUpdate = executeExYankCommand(state, snapshot, parsed);
  if (yankUpdate) return yankUpdate;

  if (parsed.type === "delete") {
    const result = deleteExLineRange(snapshot.text, parsed.range);
    if (!result.ok) return invalidate(finishExState(state, "error", result.message));
    const base = parsed.register ? { ...state, pendingRegister: parsed.register } : state;
    const written = applyRegisterWrite(base, result.edit.register);
    return finishExEdit(
      written.state,
      result,
      lineMessage(result.lines, "deleted"),
      undefined,
      written.effects,
    );
  }

  if (parsed.type === "put") {
    const base = parsed.register ? { ...state, pendingRegister: parsed.register } : state;
    const result = putExRegisterAfterRange(snapshot.text, parsed.range, registerToRead(base));
    if (!result.ok) return invalidate(finishExState(state, "error", result.message));
    const next = parsed.register ? writeRegisters(base, undefined) : base;
    return finishExEdit(next, result, lineMessage(result.lines, "put"));
  }
  return undefined;
}

function executeExMoveRangeCommand(
  state: ModalState,
  snapshot: EditorSnapshot,
  parsed: ExParseResult,
): ModalUpdate {
  if (parsed.type === "copy") {
    const result = copyExLineRange(snapshot.text, parsed.range, parsed.destination);
    if (!result.ok) return invalidate(finishExState(state, "error", result.message));
    return finishExEdit(state, result, lineMessage(result.lines, "copied"));
  }

  if (parsed.type === "move") {
    const result = moveExLineRange(snapshot.text, parsed.range, parsed.destination);
    if (!result.ok) return invalidate(finishExState(state, "error", result.message));
    return finishExEdit(state, result, lineMessage(result.lines, "moved"));
  }

  const join = parsed as { range: LineRange; rangeExplicit: boolean };
  const result = joinExLineRange(snapshot.text, join.range, join.rangeExplicit);
  if (!result.ok) return invalidate(finishExState(state, "error", result.message));
  return finishExEdit(state, result, lineMessage(result.lines, "joined"));
}

function executeExCommand(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  diagnostics: VimDiagnostics = { warnings: [] },
): ModalUpdate {
  const pendingEx = state.pendingEx;
  if (!pendingEx) return invalidate(state);
  const parsed = parseExCommand(pendingEx.command, {
    lineCount: snapshot.lines.length,
    cursorLine: snapshot.cursor.line,
    visualRange: pendingEx.visualRange,
    promptTransforms: promptTransformsForOptions(options),
  });
  if (parsed.type === "empty") return invalidate(finishExState(state));
  if (parsed.type === "error") return invalidate(finishExState(state, "error", parsed.message));

  if (parsed.type === "substitute" || parsed.type === "repeatSubstitute")
    return executeSubstitutionCommand(state, snapshot, pendingEx, parsed);

  const directUpdate = executeExDirectCommand(state, snapshot, parsed);
  if (directUpdate) return directUpdate;

  const popupUpdate = executeExPopupCommand(state, snapshot, options, diagnostics, parsed);
  if (popupUpdate) return popupUpdate;

  const editUpdate = executeExEditRangeCommand(state, snapshot, parsed);
  if (editUpdate) return editUpdate;

  return executeExMoveRangeCommand(state, snapshot, parsed);
}

function clearExPreview(pendingEx: NonNullable<ModalState["pendingEx"]>) {
  const { preview: _preview, ...rest } = pendingEx;
  return rest;
}

function exCursor(pendingEx: NonNullable<ModalState["pendingEx"]>): number {
  return Math.max(
    0,
    Math.min(pendingEx.cursor ?? pendingEx.command.length, pendingEx.command.length),
  );
}

function exCommandWordBoundaries(
  command: string,
  cursor: number,
  visualRange?: LineRange,
): { left: number; right: number } | undefined {
  const range = parseExLineRange(command, { lineCount: 1, cursorLine: 0, visualRange });
  const commandSource = range.ok ? range.value.rest : command;
  const trimmedCommandSource = commandSource.trim();
  const tokenMatch = /^[A-Za-z&]+/.exec(trimmedCommandSource);
  if (tokenMatch) {
    const left =
      command.length -
      commandSource.length +
      commandSource.indexOf(trimmedCommandSource) +
      trimmedCommandSource.indexOf(tokenMatch[0]);
    const right = left + tokenMatch[0].length;
    if (cursor < left) return undefined;
    return { left, right };
  }
  const tokenInCommand = /([A-Za-z&]+)[^A-Za-z&]*$/.exec(command);
  if (tokenInCommand) {
    const token = tokenInCommand[1] as string;
    const left = command.length - tokenInCommand[0].length;
    const right = left + token.length;
    if (cursor < left) return undefined;
    return { left, right };
  }
  return undefined;
}

export function completePendingExCommand(
  pendingEx: NonNullable<ModalState["pendingEx"]>,
  options: ModalOptions,
): { command: string; cursor: number } | undefined {
  const command = pendingEx.command;
  const cursor = exCursor(pendingEx);
  const boundaries = exCommandWordBoundaries(command, cursor, pendingEx.visualRange);
  if (!boundaries) return undefined;
  const prefix = command.slice(boundaries.left, boundaries.right);
  const candidates = suggestExCommands(prefix, {
    lineCount: 1,
    cursorLine: 0,
    visualRange: pendingEx.visualRange,
    promptTransforms: promptTransformsForOptions(options),
  });

  let replacement: string | undefined;
  if (candidates.length === 1) {
    replacement = candidates[0];
  } else if (candidates.length > 1) {
    const common = candidates.reduce((shared, candidate) => {
      let limit = Math.min(shared.length, candidate.length);
      let index = 0;
      while (index < limit && shared[index] === candidate[index]) index++;
      return shared.slice(0, index);
    });
    if (common.length > prefix.length) replacement = common;
  }
  if (!replacement) return undefined;

  const nextCommand =
    command.slice(0, boundaries.left) + replacement + command.slice(boundaries.right);
  return {
    command: nextCommand,
    cursor: Math.max(cursor, boundaries.left + replacement.length),
  };
}

function suggestExCommandsForPending(
  pendingEx: NonNullable<ModalState["pendingEx"]>,
  options: ModalOptions,
): string[] {
  const command = pendingEx.command;
  if (!/^[A-Za-z&\s]*$/.test(command)) return [];
  const cursor = exCursor(pendingEx);
  const boundaries = exCommandWordBoundaries(command, cursor, pendingEx.visualRange);
  const prefix = boundaries ? command.slice(boundaries.left, boundaries.right) : command;
  if (prefix && !/^[A-Za-z&\s]+$/.test(prefix)) return [];
  return suggestExCommands(prefix, {
    lineCount: 1,
    cursorLine: 0,
    visualRange: pendingEx.visualRange,
    promptTransforms: promptTransformsForOptions(options),
  });
}

function commandWordKind(char: string | undefined): "space" | "alpha" | "digit" | "punct" {
  if (!char || /\s/.test(char)) return "space";
  if (/[A-Za-z_]/.test(char)) return "alpha";
  return /[0-9]/.test(char) ? "digit" : "punct";
}

function wordLeft(command: string, cursor: number): number {
  let next = cursor;
  while (next > 0 && commandWordKind(command[next - 1]) === "space") next--;
  const kind = commandWordKind(command[next - 1]);
  while (next > 0 && commandWordKind(command[next - 1]) === kind) next--;
  return next;
}

function wordRight(command: string, cursor: number): number {
  let next = cursor;
  while (next < command.length && commandWordKind(command[next]) === "space") next++;
  const kind = commandWordKind(command[next]);
  while (next < command.length && commandWordKind(command[next]) === kind) next++;
  while (next < command.length && commandWordKind(command[next]) === "space") next++;
  return next;
}

function editPendingEx(
  pendingEx: NonNullable<ModalState["pendingEx"]>,
  command: string,
  cursor: number,
): PendingExCommand {
  return {
    ...clearExPreview(pendingEx),
    command,
    cursor: Math.max(0, Math.min(cursor, command.length)),
    historyIndex: undefined,
    historyDraft: undefined,
  };
}

function navigateExHistory(
  state: ModalState,
  pendingEx: NonNullable<ModalState["pendingEx"]>,
  direction: "previous" | "next",
): ModalState {
  const history = state.exHistory ?? [];
  if (history.length === 0) return state;
  const draft = pendingEx.historyDraft ?? pendingEx.command;
  const currentIndex = pendingEx.historyIndex;
  const nextIndex =
    direction === "previous"
      ? Math.max(0, currentIndex === undefined ? history.length - 1 : currentIndex - 1)
      : currentIndex === undefined
        ? undefined
        : currentIndex + 1;
  if (nextIndex === undefined) return state;
  if (nextIndex >= history.length) {
    return {
      ...state,
      pendingEx: {
        ...clearExPreview(pendingEx),
        command: draft,
        cursor: draft.length,
        historyIndex: undefined,
        historyDraft: undefined,
      },
    };
  }
  return {
    ...state,
    pendingEx: {
      ...clearExPreview(pendingEx),
      command: history[nextIndex] ?? draft,
      cursor: (history[nextIndex] ?? draft).length,
      historyIndex: nextIndex,
      historyDraft: draft,
    },
  };
}

function handleExEditingNavigation(
  state: ModalState,
  pendingEx: NonNullable<ModalState["pendingEx"]>,
  data: string,
  key: string | undefined,
): ModalUpdate | undefined {
  if (keyMatches(data, "backspace")) {
    const cursor = exCursor(pendingEx);
    if (cursor === 0) return invalidate(state);
    return invalidate({
      ...state,
      pendingEx: editPendingEx(
        pendingEx,
        pendingEx.command.slice(0, cursor - 1) + pendingEx.command.slice(cursor),
        cursor - 1,
      ),
    });
  }
  if (keyMatches(data, "delete") || key === "delete" || data === "\x1b[3~") {
    const cursor = exCursor(pendingEx);
    if (cursor >= pendingEx.command.length) return invalidate(state);
    return invalidate({
      ...state,
      pendingEx: editPendingEx(
        pendingEx,
        pendingEx.command.slice(0, cursor) + pendingEx.command.slice(cursor + 1),
        cursor,
      ),
    });
  }
  if (keyMatches(data, "left")) {
    const cursor = Math.max(0, exCursor(pendingEx) - 1);
    return invalidate({ ...state, pendingEx: { ...clearExPreview(pendingEx), cursor } });
  }
  if (keyMatches(data, "right")) {
    const cursor = Math.min(pendingEx.command.length, exCursor(pendingEx) + 1);
    return invalidate({ ...state, pendingEx: { ...clearExPreview(pendingEx), cursor } });
  }
  if (keyMatches(data, "home")) {
    return invalidate({ ...state, pendingEx: { ...clearExPreview(pendingEx), cursor: 0 } });
  }
  if (keyMatches(data, "end")) {
    return invalidate({
      ...state,
      pendingEx: { ...clearExPreview(pendingEx), cursor: pendingEx.command.length },
    });
  }
  return undefined;
}

function exSuggestionNavigation(
  state: ModalState,
  pendingEx: NonNullable<ModalState["pendingEx"]>,
  options: ModalOptions,
  direction: "previous" | "next",
): ModalUpdate | undefined {
  if (options.exCommand?.autocomplete === false) return undefined;
  const suggestions = suggestExCommandsForPending(pendingEx, options);
  const hasHistory = (state.exHistory ?? []).length > 0;
  if (suggestions.length === 0 || (hasHistory && !pendingEx.command)) return undefined;
  const selected =
    pendingEx.selectedSuggestion ?? (direction === "previous" ? suggestions.length : -1);
  const offset = direction === "previous" ? -1 : 1;
  return invalidate({
    ...state,
    pendingEx: {
      ...pendingEx,
      selectedSuggestion: (selected + offset + suggestions.length) % suggestions.length,
    },
  });
}

function handleExHistoryNavigation(
  state: ModalState,
  pendingEx: NonNullable<ModalState["pendingEx"]>,
  options: ModalOptions,
  data: string,
): ModalUpdate | undefined {
  if (keyMatches(data, "up"))
    return (
      exSuggestionNavigation(state, pendingEx, options, "previous") ??
      invalidate(navigateExHistory(state, pendingEx, "previous"))
    );
  if (keyMatches(data, "down"))
    return (
      exSuggestionNavigation(state, pendingEx, options, "next") ??
      invalidate(navigateExHistory(state, pendingEx, "next"))
    );
}

function handleExWordNavigation(
  state: ModalState,
  pendingEx: NonNullable<ModalState["pendingEx"]>,
  data: string,
  key: string | undefined,
): ModalUpdate | undefined {
  if (key === "alt+left") {
    return invalidate({
      ...state,
      pendingEx: {
        ...clearExPreview(pendingEx),
        cursor: wordLeft(pendingEx.command, exCursor(pendingEx)),
      },
    });
  }
  if (key === "alt+right") {
    return invalidate({
      ...state,
      pendingEx: {
        ...clearExPreview(pendingEx),
        cursor: wordRight(pendingEx.command, exCursor(pendingEx)),
      },
    });
  }
  if (key === "ctrl+w") {
    const cursor = exCursor(pendingEx);
    const nextCursor = wordLeft(pendingEx.command, cursor);
    return invalidate({
      ...state,
      pendingEx: editPendingEx(
        pendingEx,
        pendingEx.command.slice(0, nextCursor) + pendingEx.command.slice(cursor),
        nextCursor,
      ),
    });
  }
  return undefined;
}

function autocompleteExCommand(
  pendingEx: NonNullable<ModalState["pendingEx"]>,
  options: ModalOptions,
): string | undefined {
  if (options.exCommand?.autocomplete === false || !pendingEx.command) return undefined;
  const suggestions = suggestExCommandsForPending(pendingEx, options);
  if (suggestions.length === 0) return undefined;
  const selected = pendingEx.selectedSuggestion ?? 0;
  if (selected >= suggestions.length) return undefined;
  const boundaries = exCommandWordBoundaries(
    pendingEx.command,
    exCursor(pendingEx),
    pendingEx.visualRange,
  );
  return (boundaries ? pendingEx.command.slice(0, boundaries.left) : "") + suggestions[selected];
}

function handleExTabInput(
  state: ModalState,
  pendingEx: NonNullable<ModalState["pendingEx"]>,
  options: ModalOptions,
  data: string,
): ModalUpdate | undefined {
  if (!keyMatches(data, "tab") && data !== "\t") return undefined;
  const command = autocompleteExCommand(pendingEx, options);
  if (command)
    return invalidate({ ...state, pendingEx: editPendingEx(pendingEx, command, command.length) });
  const completed = completePendingExCommand(pendingEx, options);
  return completed
    ? invalidate({
        ...state,
        pendingEx: editPendingEx(pendingEx, completed.command, completed.cursor),
      })
    : invalidate(state);
}

export function handlePendingExInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
  diagnostics: VimDiagnostics,
): ModalUpdate {
  const pendingEx = state.pendingEx;
  if (!pendingEx) return invalidate(state);
  const parsed = keySequence(data);
  if (
    keyMatches(data, "escape") ||
    (parsed !== undefined && keymapForOptions(options).escape.includes(parsed))
  ) {
    return cancelExCommand(state);
  }
  if (keyMatches(data, "ctrl+c") || keyMatches(data, "ctrl+g"))
    return resetAndDelegate(state, options, data);
  if (keyMatches(data, "enter") || keyMatches(data, "return"))
    return executeExCommand(state, snapshot, options, diagnostics);
  const key = parsed;
  const navigationUpdate =
    handleExEditingNavigation(state, pendingEx, data, key) ??
    handleExHistoryNavigation(state, pendingEx, options, data) ??
    handleExWordNavigation(state, pendingEx, data, key) ??
    handleExTabInput(state, pendingEx, options, data);
  if (navigationUpdate) return navigationUpdate;
  if (!key || key.length !== 1) return invalidate(state);
  const cursor = exCursor(pendingEx);
  return invalidate({
    ...state,
    pendingEx: editPendingEx(
      pendingEx,
      pendingEx.command.slice(0, cursor) + key + pendingEx.command.slice(cursor),
      cursor + key.length,
    ),
  });
}
