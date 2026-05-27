import { truncateToWidth } from "@earendil-works/pi-tui";

import type { Position, VimMode } from "../types.ts";

import {
  linewiseSelectionText,
  selectionText,
  visualLineSelectionSummary,
  visualSelectionSummary,
} from "../buffer.ts";

export type ModalVisualStatusInput = {
  mode: VimMode;
  text: string;
  cursor: Position;
  visualAnchor?: Position;
  width: number;
};

type AnchoredVisualStatusInput = ModalVisualStatusInput & { visualAnchor: Position };

export function modalModeLabel(mode: VimMode, width: number): string {
  const full = mode === "visualLine" ? "V-LINE" : mode.toUpperCase();
  const narrow = mode === "visualLine" ? "VL" : (mode[0]?.toUpperCase() ?? "?");
  return width < full.length + 4 ? narrow : full;
}

export function modalVisualStatus(input: ModalVisualStatusInput): string {
  if (!input.visualAnchor) return "";
  const anchored = { ...input, visualAnchor: input.visualAnchor };
  if (input.mode === "visual") return characterVisualStatus(anchored);
  if (input.mode === "visualLine") return lineVisualStatus(anchored);
  return "";
}

function characterVisualStatus(input: AnchoredVisualStatusInput): string {
  const summary = visualSelectionSummary(input.text, input.visualAnchor, input.cursor);
  if (input.width < 20) return ` ${summary.split(" ")[0]} `;
  const selected = selectionText(input.text, input.visualAnchor, input.cursor).replace(/\n/g, "↵");
  const preview = selected.length > 0 ? ` · ${truncateToWidth(selected, 16, "…")}` : "";
  return ` ${summary}${preview} `;
}

function lineVisualStatus(input: AnchoredVisualStatusInput): string {
  const summary = visualLineSelectionSummary(input.text, input.visualAnchor, input.cursor);
  if (input.width < 20) return ` ${summary.split(" ")[0]}L `;
  const selected = linewiseSelectionText(input.text, input.visualAnchor, input.cursor).replace(
    /\n/g,
    "↵",
  );
  const preview = selected.length > 0 ? ` · ${truncateToWidth(selected, 16, "…")}` : "";
  return ` ${summary}${preview} `;
}
