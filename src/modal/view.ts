import { truncateToWidth } from "@earendil-works/pi-tui";

import type { Position, ResolvedVimUi, VimMode } from "../types.ts";

import {
  visualBlockSelectionSummary,
  visualLineSelectionSummary,
  visualSelectionSummary,
  visualSelectionText,
} from "../buffer.ts";
import { DEFAULT_VIM_UI } from "../config.ts";

export type ModalVisualStatusInput = {
  mode: VimMode;
  text: string;
  cursor: Position;
  visualAnchor?: Position;
  width: number;
  ui?: ResolvedVimUi;
};

export type ModalStatusInput = ModalVisualStatusInput & {
  pending?: string;
};

export type ModalStatus = {
  left: string;
  right: string;
};

type AnchoredVisualStatusInput = ModalVisualStatusInput & { visualAnchor: Position };

export function modalModeLabel(mode: VimMode, width: number, ui?: ResolvedVimUi): string {
  const full =
    ui?.mode.labels[mode] ??
    (mode === "visualLine" ? "V-LINE" : mode === "visualBlock" ? "V-BLOCK" : mode.toUpperCase());
  const narrow =
    ui?.mode.narrowLabels[mode] ??
    (mode === "visualLine" ? "VL" : mode === "visualBlock" ? "VB" : (mode[0]?.toUpperCase() ?? "?"));
  return width < full.length + 4 ? narrow : full;
}

export function modalStatus(input: ModalStatusInput): ModalStatus {
  const ui = input.ui ?? DEFAULT_VIM_UI;
  if (!ui.status.enabled) return { left: "", right: "" };

  const parts: string[] = [];
  for (const item of ui.status.items) {
    if (item === "mode" && ui.mode.enabled) {
      parts.push(modalModeLabel(input.mode, input.width, ui));
    } else if (item === "pendingOperator" && input.pending) {
      parts.push(`${input.pending}…`);
    } else if (item === "selection" && ui.selection.enabled) {
      const selection = modalVisualStatus(input).trim();
      if (selection.length > 0) parts.push(selection);
    } else if (item === "cursorPosition" && ui.cursorPosition.enabled) {
      parts.push(cursorPositionStatus(input.cursor, ui));
    }
  }

  return {
    left: parts.length > 0 ? ` ${parts.join(" ")} ` : "",
    right: "",
  };
}

function cursorPositionStatus(cursor: Position, ui: ResolvedVimUi): string {
  const line = cursor.line + ui.cursorPosition.base;
  const column = cursor.col + ui.cursorPosition.base;
  return ui.cursorPosition.format
    .replaceAll("{line}", String(line))
    .replaceAll("{column}", String(column));
}

export function modalVisualStatus(input: ModalVisualStatusInput): string {
  const ui = input.ui ?? DEFAULT_VIM_UI;
  if (!ui.selection.enabled) return "";
  if (!input.visualAnchor) return "";
  const anchored = { ...input, visualAnchor: input.visualAnchor, ui };
  if (input.mode === "visual") return characterVisualStatus(anchored);
  if (input.mode === "visualLine") return lineVisualStatus(anchored);
  if (input.mode === "visualBlock") return blockVisualStatus(anchored);
  return "";
}

function characterVisualStatus(input: AnchoredVisualStatusInput): string {
  const ui = input.ui ?? DEFAULT_VIM_UI;
  const summary = visualSelectionSummary(input.text, input.visualAnchor, input.cursor);
  if (input.width < 20) return ` ${summary.split(" ")[0]} `;
  const selected = visualSelectionText(
    input.text,
    input.visualAnchor,
    input.cursor,
    "char",
  ).replace(/\n/g, "↵");
  const preview =
    selected.length > 0 ? ` · ${truncateToWidth(selected, ui.selection.previewMaxChars, "…")}` : "";
  return ` ${summary}${preview} `;
}

function lineVisualStatus(input: AnchoredVisualStatusInput): string {
  const ui = input.ui ?? DEFAULT_VIM_UI;
  const summary = visualLineSelectionSummary(input.text, input.visualAnchor, input.cursor);
  if (input.width < 20) return ` ${summary.split(" ")[0]}L `;
  const selected = visualSelectionText(
    input.text,
    input.visualAnchor,
    input.cursor,
    "line",
  ).replace(/\n/g, "↵");
  const preview =
    selected.length > 0 ? ` · ${truncateToWidth(selected, ui.selection.previewMaxChars, "…")}` : "";
  return ` ${summary}${preview} `;
}

function blockVisualStatus(input: AnchoredVisualStatusInput): string {
  const ui = input.ui ?? DEFAULT_VIM_UI;
  const summary = visualBlockSelectionSummary(input.text, input.visualAnchor, input.cursor);
  if (input.width < 20) return ` ${summary.split(" ")[0]}B `;
  const selected = visualSelectionText(
    input.text,
    input.visualAnchor,
    input.cursor,
    "block",
  ).replace(/\n/g, "↵");
  const preview =
    selected.length > 0 ? ` · ${truncateToWidth(selected, ui.selection.previewMaxChars, "…")}` : "";
  return ` ${summary}${preview} `;
}
