import { CustomEditor, type KeybindingsManager } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth, type EditorTheme, type TUI } from "@earendil-works/pi-tui";

import type { AdapterCommand, EditorSnapshot, ModalEffect, ModalState } from "./modal/types.ts";
import type { CursorStyle, EditResult, Position, VimEditorOptions, VimMode } from "./types.ts";

import { normalizeBufferPosition } from "./buffer.ts";
import { cursorStyleForMode, DEFAULT_VIM_OPTIONS } from "./config.ts";
import { handleModalInput } from "./modal/engine.ts";
import { createModalState } from "./modal/state.ts";
import { modalModeLabel, modalVisualStatus } from "./modal/view.ts";
import {
  cursorShapeEscape,
  renderVisualEditor,
  RESET_CURSOR_SHAPE,
  restyleCursorMarker,
} from "./render.ts";

const KEY = {
  left: "\x1b[D",
  right: "\x1b[C",
  up: "\x1b[A",
  down: "\x1b[B",
  lineStart: "\x01",
  lineEnd: "\x05",
  wordLeft: "\x1bb",
  wordRight: "\x1bf",
  undo: "\x1f",
} as const satisfies Record<AdapterCommand, string>;

export function fitStatusBorder(
  left: string,
  right: string,
  width: number,
  border: (text: string) => string = (text) => text,
): string {
  if (width <= 0) return "";
  if (width === 1) return border("─");

  let leftText = left;
  let rightText = right;
  const fixedWidth = 2;
  const minimumGap = 1;

  while (
    visibleWidth(rightText) > 0 &&
    fixedWidth + visibleWidth(leftText) + visibleWidth(rightText) + minimumGap > width
  ) {
    rightText = truncateToWidth(rightText, Math.max(0, visibleWidth(rightText) - 1), "");
  }

  while (
    visibleWidth(leftText) > 1 &&
    fixedWidth + visibleWidth(leftText) + visibleWidth(rightText) + minimumGap > width
  ) {
    leftText = truncateToWidth(leftText, Math.max(1, visibleWidth(leftText) - 1), "");
  }

  const gapWidth = Math.max(
    0,
    width - fixedWidth - visibleWidth(leftText) - visibleWidth(rightText),
  );
  return `${border("─")}${leftText}${border("─".repeat(gapWidth))}${rightText}${border("─")}`;
}

function cloneOptions(options: VimEditorOptions): VimEditorOptions {
  return { startMode: options.startMode, cursor: { ...options.cursor } };
}

export class VimEditor extends CustomEditor {
  private modalState: ModalState;
  private readonly options: VimEditorOptions;
  private lastTerminalCursorStyle: CursorStyle | undefined;

  constructor(
    tui: TUI,
    theme: EditorTheme,
    keybindings: KeybindingsManager,
    options: VimEditorOptions = DEFAULT_VIM_OPTIONS,
  ) {
    super(tui, theme, keybindings);
    this.options = cloneOptions(options);
    this.modalState = createModalState(this.options.startMode);
    this.applyTerminalCursorStyle(cursorStyleForMode(this.options, this.modalState.mode));
  }

  getVimMode(): VimMode {
    return this.modalState.mode;
  }

  getRegister() {
    return this.modalState.register;
  }

  getPendingOperator() {
    return this.modalState.pending;
  }

  getCurrentCursorStyle(): CursorStyle {
    return cursorStyleForMode(this.options, this.modalState.mode);
  }

  override handleInput(data: string): void {
    const update = handleModalInput(this.modalState, this.snapshot(), this.options, data);
    this.modalState = update.state;
    this.applyEffects(update.effects);
  }

  override render(width: number): string[] {
    const lines = this.renderEditorLines(width);
    if (lines.length === 0 || width <= 0) return lines;

    const last = lines.length - 1;
    const pending = this.modalState.pending ? ` ${this.modalState.pending}…` : "";
    const left = ` ${modalModeLabel(this.modalState.mode, width)}${pending} `;
    lines[last] = fitStatusBorder(left, this.visualStatus(width), width, this.borderColor);
    return lines;
  }

  private snapshot(): EditorSnapshot {
    return {
      text: this.getText(),
      lines: this.getLines(),
      cursor: this.getCursor(),
      isAutocompleteOpen: this.isShowingAutocomplete(),
    };
  }

  private renderEditorLines(width: number): string[] {
    if (
      (this.modalState.mode === "visual" || this.modalState.mode === "visualLine") &&
      this.modalState.visualAnchor
    ) {
      return renderVisualEditor({
        snapshot: {
          lines: this.getLines(),
          cursor: this.getCursor(),
        },
        visual: {
          mode: this.modalState.mode,
          anchor: this.modalState.visualAnchor,
        },
        cursorStyle: this.getCurrentCursorStyle(),
        viewport: {
          width,
          terminalRows: this.terminalRows(),
          focused: this.focused,
        },
        display: {
          borderColor: this.borderColor,
        },
      });
    }

    return restyleCursorMarker(super.render(width), this.getCurrentCursorStyle());
  }

  private applyEffects(effects: ModalEffect[]): void {
    for (const effect of effects) this.applyEffect(effect);
  }

  private applyEffect(effect: ModalEffect): void {
    switch (effect.type) {
      case "delegate":
        super.handleInput(effect.input);
        return;
      case "adapterCommand":
        super.handleInput(KEY[effect.command]);
        return;
      case "edit":
        this.applyEdit(effect.result);
        return;
      case "restoreCursor":
        this.restoreCursor(effect.position);
        return;
      case "terminalCursor":
        this.applyTerminalCursorStyle(effect.style);
        return;
      case "invalidate":
        this.invalidate();
        return;
    }
  }

  private applyEdit(result: EditResult): void {
    if (!result.changed) {
      this.invalidate();
      return;
    }

    this.setText(result.text);
    this.restoreCursor(result.cursor);
    this.invalidate();
  }

  private restoreCursor(position: Position): void {
    const target = normalizeBufferPosition(this.getText(), position);
    const current = this.getCursor();

    if (current.line > target.line) {
      super.handleInput(KEY.lineStart);
      for (let i = current.line; i > target.line; i--) super.handleInput(KEY.up);
    } else if (current.line < target.line) {
      super.handleInput(KEY.lineStart);
      for (let i = current.line; i < target.line; i++) super.handleInput(KEY.down);
    }

    super.handleInput(KEY.lineStart);
    for (let i = 0; i < target.col; i++) super.handleInput(KEY.right);
  }

  private visualStatus(width: number): string {
    return modalVisualStatus({
      mode: this.modalState.mode,
      text: this.getText(),
      cursor: this.getCursor(),
      visualAnchor: this.modalState.visualAnchor,
      width,
    });
  }

  private terminalRows(): number | undefined {
    const rows = (this.tui as unknown as { terminal?: { rows?: unknown } }).terminal?.rows;
    return typeof rows === "number" ? rows : undefined;
  }

  private terminalWrite(data: string): void {
    const write = (this.tui as unknown as { terminal?: { write?: unknown } }).terminal?.write;
    if (typeof write === "function") {
      write.call((this.tui as unknown as { terminal?: unknown }).terminal, data);
    }
  }

  private applyTerminalCursorStyle(style: CursorStyle): void {
    if (style === this.lastTerminalCursorStyle) return;
    this.lastTerminalCursorStyle = style;
    this.terminalWrite(cursorShapeEscape(style));
  }

  resetTerminalCursorStyle(): void {
    this.lastTerminalCursorStyle = undefined;
    this.terminalWrite(RESET_CURSOR_SHAPE);
  }
}
