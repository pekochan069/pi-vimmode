import {
  matchesKey,
  truncateToWidth,
  visibleWidth,
  type Component,
  type TUI,
} from "@earendil-works/pi-tui";

import type { ReadOnlyPopup } from "./read-only-popup.ts";

import { renderMarkdownRows } from "./markdown-popup.ts";
import { HELP_POPUP_BODY_ROWS, scrollHelpPopup } from "./read-only-popup.ts";

export const READ_ONLY_POPUP_MIN_WIDTH = 48;
export const READ_ONLY_POPUP_MIN_HEIGHT = 12;

export function canShowReadOnlyPopup(width?: number, height?: number): boolean {
  return (
    width === undefined ||
    height === undefined ||
    (width >= READ_ONLY_POPUP_MIN_WIDTH && height >= READ_ONLY_POPUP_MIN_HEIGHT)
  );
}

type OverlayTheme = {
  fg?: (color: string, text: string) => string;
  bold?: (text: string) => string;
};

type OverlayStyle = {
  text: (text: string) => string;
  dim: (text: string) => string;
  accent: (text: string) => string;
  bold: (text: string) => string;
};

const LEFT = "│ ";
const RIGHT = " │";
const BORDER_OVERHEAD = visibleWidth(LEFT) + visibleWidth(RIGHT);

function styleForTheme(theme: OverlayTheme | unknown): OverlayStyle {
  const maybeTheme = theme as OverlayTheme;
  return {
    text: (text) => text,
    dim: (text) => maybeTheme.fg?.("dim", text) ?? text,
    accent: (text) => maybeTheme.fg?.("cyan", text) ?? text,
    bold: (text) => maybeTheme.bold?.(text) ?? text,
  };
}

function fit(text: string, width: number): string {
  if (width <= 0) return "";
  const truncated = truncateToWidth(text, width, "");
  return truncated + " ".repeat(Math.max(0, width - visibleWidth(truncated)));
}

function borderedRow(text: string, width: number, style: OverlayStyle): string {
  const innerWidth = Math.max(0, width - BORDER_OVERHEAD);
  return `${style.accent(LEFT)}${fit(text, innerWidth)}${style.accent(RIGHT)}`;
}

export class ReadOnlyPopupOverlayComponent implements Component {
  private popup: ReadOnlyPopup;

  constructor(
    private readonly tui: TUI,
    popup: ReadOnlyPopup,
    private readonly theme: unknown,
    private readonly onClose: () => void,
  ) {
    this.popup = popup;
  }

  handleInput(data: string): void {
    if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c") || matchesKey(data, "ctrl+g")) {
      this.onClose();
      return;
    }
    if (data === "j" || matchesKey(data, "down")) {
      this.popup = scrollHelpPopup(this.popup, 1);
      this.tui.requestRender();
      return;
    }
    if (data === "k" || matchesKey(data, "up")) {
      this.popup = scrollHelpPopup(this.popup, -1);
      this.tui.requestRender();
    }
  }

  invalidate(): void {}

  render(width: number): string[] {
    const safeWidth = Math.max(36, width);
    const style = styleForTheme(this.theme);
    if (this.popup.markdown !== undefined) {
      this.popup = {
        ...this.popup,
        lines: renderMarkdownRows(
          this.popup.markdown,
          Math.max(1, safeWidth - BORDER_OVERHEAD),
          style,
        ),
      };
    }
    const bodyRows = Math.min(HELP_POPUP_BODY_ROWS, this.popup.lines.length);
    const maxOffset = Math.max(0, this.popup.lines.length - bodyRows);
    const offset = Math.max(0, Math.min(maxOffset, this.popup.scrollOffset));
    const end = Math.min(this.popup.lines.length, offset + bodyRows);
    const hiddenAbove = offset > 0 ? ` ↑${offset}` : "";
    const hiddenBelow = end < this.popup.lines.length ? ` ↓${this.popup.lines.length - end}` : "";
    const range = `${offset + 1}-${end}/${this.popup.lines.length}`;
    const horizontal = "─".repeat(Math.max(0, safeWidth - 2));
    const title = ` ${this.popup.title} ${range}${hiddenAbove}${hiddenBelow} `;
    const footer = " j/k ↑/↓ scroll · Esc close ";

    return [
      style.accent(`╭${horizontal}╮`),
      borderedRow(style.bold(title), safeWidth, style),
      borderedRow(style.dim(""), safeWidth, style),
      ...this.popup.lines.slice(offset, end).map((line) => borderedRow(line, safeWidth, style)),
      borderedRow(style.dim(""), safeWidth, style),
      borderedRow(style.dim(footer), safeWidth, style),
      style.accent(`╰${horizontal}╯`),
    ];
  }
}

export { ReadOnlyPopupOverlayComponent as KeybindingDiscoveryOverlayComponent };
