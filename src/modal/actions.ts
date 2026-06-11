import type { SemanticCommandResult } from "../commands.ts";
import type { LineRange } from "../types.ts";
import type {
  EditorSnapshot,
  ModalEffect,
  ModalOptions,
  ModalState,
  ModalUpdate,
} from "./types.ts";

import { applyPromptTransform } from "../buffer.ts";
import {
  clearCommandPending,
  editState,
  invalidate,
  modeUpdate,
  withEffects,
  withNoopFeedback,
  withRuntimeMessage,
} from "./core.ts";

export type PromptTransformActionResult = Extract<SemanticCommandResult, { type: "action" }>;

function normalActionRange(snapshot: EditorSnapshot, count = 1): LineRange {
  const lastLine = Math.max(0, snapshot.lines.length - 1);
  const startLine = Math.max(0, Math.min(snapshot.cursor.line, lastLine));
  return {
    startLine,
    endLine: Math.max(startLine, Math.min(startLine + Math.max(1, count) - 1, lastLine)),
  };
}

function visualActionRange(state: ModalState, snapshot: EditorSnapshot): LineRange | undefined {
  if (!state.visualAnchor) return undefined;
  const lastLine = Math.max(0, snapshot.lines.length - 1);
  const startLine = Math.max(0, Math.min(state.visualAnchor.line, snapshot.cursor.line, lastLine));
  const endLine = Math.max(
    0,
    Math.min(Math.max(state.visualAnchor.line, snapshot.cursor.line), lastLine),
  );
  return { startLine, endLine };
}

function applyActionToRange(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  action: PromptTransformActionResult,
  range: LineRange,
): ModalUpdate {
  const baseState = clearCommandPending(state);
  const result = applyPromptTransform(snapshot.text, range, action.args, snapshot.cursor);
  if (!result.ok) {
    return invalidate(withRuntimeMessage(baseState, { kind: "error", text: result.message }));
  }
  const edited = editState(baseState, result.edit);
  if (!result.edit.changed) {
    return invalidate(withNoopFeedback(edited, options, "prompt transform made no changes"));
  }
  return withEffects(edited, [{ type: "edit", result: result.edit }]);
}

export function applyPromptTransformAction(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  action: PromptTransformActionResult,
): ModalUpdate {
  return applyActionToRange(
    state,
    snapshot,
    options,
    action,
    normalActionRange(snapshot, action.count),
  );
}

export function applyVisualPromptTransformAction(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  action: PromptTransformActionResult,
): ModalUpdate {
  const range = visualActionRange(state, snapshot);
  const baseState = clearCommandPending(state);
  if (!range)
    return modeUpdate(
      withNoopFeedback(baseState, options, "prompt transform has no selection"),
      "normal",
      options,
    );

  const result = applyPromptTransform(snapshot.text, range, action.args, snapshot.cursor);
  if (!result.ok) {
    return modeUpdate(
      withRuntimeMessage(baseState, { kind: "error", text: result.message }),
      "normal",
      options,
    );
  }

  const edited = editState(baseState, result.edit);
  const nextState = result.edit.changed
    ? edited
    : withNoopFeedback(edited, options, "prompt transform made no changes");
  const effects: ModalEffect[] = result.edit.changed ? [{ type: "edit", result: result.edit }] : [];
  return modeUpdate(nextState, "normal", options, effects);
}
