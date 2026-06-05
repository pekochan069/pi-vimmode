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
import {
  keymapForOptions,
  macrosForOptions,
  marksForOptions,
  promptTransformsForOptions,
} from "../config.ts";
import { actionsMessage, doctorMessage, keymapMessage, mapcheckMessage } from "../customization.ts";
import { parseExCommand } from "../ex.ts";
import { runtimeFeaturesMessage, runtimeHelpMessage } from "../runtime-help.ts";
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
import { runtimeMessagesMessage, vimmodeInspectMessage } from "./inspect.ts";

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
    pendingEx: { command, sourceMode: "normal" },
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

function substitutionMessage(matches: number): string {
  return `${matches} ${matches === 1 ? "substitution" : "substitutions"}`;
}

function lineMessage(lines: number, verb: string): string {
  return `${lines} ${lines === 1 ? "line" : "lines"} ${verb}`;
}

function finishExEdit(
  state: ModalState,
  result: { edit: EditResult; lines: number },
  message: string,
  register?: VimRegister,
): ModalUpdate {
  const base = result.edit.changed ? clearSearchHighlight(state) : state;
  const next = register ? { ...base, register } : base;
  const finished = finishExState(next, "success", message);
  const effects: ModalEffect[] = result.edit.changed
    ? [{ type: "edit", result: result.edit }]
    : [{ type: "invalidate" }];
  return withEffects(finished, effects);
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

  if (parsed.type === "substitute") {
    if (pendingEx.preview?.command === pendingEx.command) {
      const result = pendingEx.preview;
      const finished = finishExState(
        result.edit.changed ? clearSearchHighlight(state) : state,
        "success",
        substitutionMessage(result.matches),
      );
      const effects: ModalEffect[] = result.edit.changed
        ? [{ type: "edit", result: result.edit }]
        : [{ type: "invalidate" }];
      return withEffects(finished, effects);
    }

    const optionsForSubstitution = {
      range: parsed.range,
      pattern: parsed.pattern,
      replacement: parsed.replacement,
      global: parsed.global,
      ignoreCase: parsed.ignoreCase,
      originalCursor: snapshot.cursor,
    };
    const result =
      parsed.matcherMode === "regex"
        ? substituteLineRangeRegex(snapshot.text, optionsForSubstitution)
        : {
            ok: true as const,
            ...substituteLineRangeLiteral(snapshot.text, optionsForSubstitution),
          };
    if (!result.ok) return invalidate(finishExState(state, "error", result.message));
    if (result.matches === 0) {
      return invalidate(finishExState(state, "error", `Pattern not found: ${parsed.pattern}`));
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
        },
      },
    });
  }

  if (parsed.type === "nohlsearch") {
    return invalidate(finishExState(clearSearchHighlight(state)));
  }

  if (parsed.type === "diagnostic") {
    const keymap = keymapForOptions(options);
    const transforms = promptTransformsForOptions(options);
    const macros = macrosForOptions(options);
    const marks = marksForOptions(options);
    const message =
      parsed.command === "vimdoctor"
        ? doctorMessage(options, diagnostics)
        : parsed.command === "keymap"
          ? keymapMessage(keymap, parsed.query, transforms, macros, marks)
          : parsed.command === "mapcheck"
            ? mapcheckMessage(keymap, parsed.query ?? "", diagnostics.warnings)
            : actionsMessage(keymap, parsed.query, transforms, macros, marks);
    return restoreVisualExState(state, { kind: "info", text: message });
  }

  if (parsed.type === "runtimeHelp") {
    const context = { options, diagnostics };
    const message =
      parsed.command === "help"
        ? runtimeHelpMessage(parsed.query, context)
        : parsed.command === "features"
          ? runtimeFeaturesMessage(parsed.query, context)
          : runtimeMessagesMessage(state.messageHistory);
    return restoreVisualExState(
      state,
      { kind: "info", text: message },
      parsed.command !== "messages",
    );
  }

  if (parsed.type === "inspect") {
    const message = vimmodeInspectMessage({ state, snapshot, options, diagnostics });
    return restoreVisualExState(state, { kind: "info", text: message });
  }

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

  if (parsed.type === "yank") {
    const result = yankExLineRange(snapshot.text, parsed.range);
    return invalidate(
      finishExState(
        { ...state, register: result.register },
        "success",
        lineMessage(result.lines, "yanked"),
      ),
    );
  }

  if (parsed.type === "delete") {
    const result = deleteExLineRange(snapshot.text, parsed.range);
    if (!result.ok) return invalidate(finishExState(state, "error", result.message));
    return finishExEdit(state, result, lineMessage(result.lines, "deleted"), result.edit.register);
  }

  if (parsed.type === "put") {
    const result = putExRegisterAfterRange(snapshot.text, parsed.range, state.register);
    if (!result.ok) return invalidate(finishExState(state, "error", result.message));
    return finishExEdit(state, result, lineMessage(result.lines, "put"));
  }

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

  const result = joinExLineRange(snapshot.text, parsed.range, parsed.rangeExplicit);
  if (!result.ok) return invalidate(finishExState(state, "error", result.message));
  return finishExEdit(state, result, lineMessage(result.lines, "joined"));
}

function clearExPreview(pendingEx: NonNullable<ModalState["pendingEx"]>) {
  const { preview: _preview, ...rest } = pendingEx;
  return rest;
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
      historyIndex: nextIndex,
      historyDraft: draft,
    },
  };
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
  if (keyMatches(data, "escape")) return cancelExCommand(state);
  if (keyMatches(data, "ctrl+c") || keyMatches(data, "ctrl+g"))
    return resetAndDelegate(state, options, data);
  if (keyMatches(data, "enter") || keyMatches(data, "return"))
    return executeExCommand(state, snapshot, options, diagnostics);
  if (keyMatches(data, "backspace")) {
    if (pendingEx.command.length === 0) return invalidate(state);
    return invalidate({
      ...state,
      pendingEx: {
        ...clearExPreview(pendingEx),
        command: pendingEx.command.slice(0, -1),
        historyIndex: undefined,
        historyDraft: undefined,
      },
    });
  }
  if (keyMatches(data, "up")) return invalidate(navigateExHistory(state, pendingEx, "previous"));
  if (keyMatches(data, "down")) return invalidate(navigateExHistory(state, pendingEx, "next"));

  const key = keySequence(data);
  if (!key || key.length !== 1) return invalidate(state);
  return invalidate({
    ...state,
    pendingEx: {
      ...clearExPreview(pendingEx),
      command: pendingEx.command + key,
      historyIndex: undefined,
      historyDraft: undefined,
    },
  });
}
