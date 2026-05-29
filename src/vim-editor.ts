import { CustomEditor, type KeybindingsManager } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth, type EditorTheme, type TUI } from "@earendil-works/pi-tui";

import type { AdapterCommand, EditorSnapshot, ModalEffect, ModalState } from "./modal/types.ts";
import type {
  CursorStyle,
  EditResult,
  Position,
  ResolvedVimEditorOptions,
  VimMode,
} from "./types.ts";

import { normalizeBufferPosition } from "./buffer.ts";
import { pendingDisplay } from "./commands.ts";
import {
  cursorStyleForMode,
  DEFAULT_VIM_OPTIONS,
  searchForOptions,
  uiForOptions,
} from "./config.ts";
import { handleModalInput, modalPendingDisplay } from "./modal/engine.ts";
import { createModalState } from "./modal/state.ts";
import { modalStatus } from "./modal/view.ts";
import {
  cursorShapeEscape,
  renderPromptEditor,
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

function fitWidth(text: string, width: number): string {
  if (width <= 0) return "";
  const truncated = truncateToWidth(text, width, "");
  return truncated + " ".repeat(Math.max(0, width - visibleWidth(truncated)));
}

function renderExRow(state: ModalState, width: number): string | undefined {
  if (width <= 0) return undefined;
  const text = state.pendingEx ? `:${state.pendingEx.command}` : state.exMessage?.text;
  return text === undefined ? undefined : fitWidth(text, width);
}

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

function cloneOptions(options: ResolvedVimEditorOptions): ResolvedVimEditorOptions {
  return {
    startMode: options.startMode,
    cursor: { ...options.cursor },
    keymap: options.keymap,
    ui: options.ui,
    macros: options.macros,
    marks: options.marks,
    search: options.search,
  };
}

export class VimEditor extends CustomEditor {
  private modalState: ModalState;
  private readonly options: ResolvedVimEditorOptions;
  private readonly originalHardwareCursorVisible: boolean | undefined;
  private lastTerminalCursorStyle: CursorStyle | undefined;
  private isMacroReplaying = false;

  constructor(
    tui: TUI,
    theme: EditorTheme,
    keybindings: KeybindingsManager,
    options: ResolvedVimEditorOptions = DEFAULT_VIM_OPTIONS,
  ) {
    super(tui, theme, keybindings);
    this.options = cloneOptions(options);
    this.modalState = createModalState(this.options.startMode);
    this.originalHardwareCursorVisible = this.getHardwareCursorVisibility();
    this.applyTerminalCursorStyle(cursorStyleForMode(this.options, this.modalState.mode));
  }

  getVimMode(): VimMode {
    return this.modalState.mode;
  }

  getRegister() {
    return this.modalState.register;
  }

  getNamedRegister(slot: string) {
    return this.modalState.namedRegisters?.[slot.toLowerCase()];
  }

  getPendingOperator() {
    return pendingDisplay(this.modalState.pending) ?? modalPendingDisplay(this.modalState);
  }

  getMark(slot: string) {
    return this.modalState.marks?.[slot];
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
    const exRow = renderExRow(this.modalState, width);
    const terminalRows = exRow ? Math.max(1, (this.terminalRows() ?? 24) - 1) : this.terminalRows();
    const lines = this.renderEditorLines(width, terminalRows);
    if (lines.length === 0 || width <= 0) return lines;

    const last = lines.length - 1;
    const status = modalStatus({
      mode: this.modalState.mode,
      text: this.getText(),
      cursor: this.getCursor(),
      visualAnchor: this.modalState.visualAnchor,
      width,
      pending: pendingDisplay(this.modalState.pending) ?? modalPendingDisplay(this.modalState),
      recordingSlot: this.modalState.recordingSlot,
      ui: uiForOptions(this.options),
    });
    lines[last] = fitStatusBorder(status.left, status.right, width, this.borderColor);
    if (exRow) lines.push(exRow);
    return lines;
  }

  private snapshot(): EditorSnapshot {
    return {
      text: this.getText(),
      lines: this.getLines(),
      cursor: this.getCursor(),
      isAutocompleteOpen: this.isShowingAutocomplete(),
      isMacroReplaying: this.isMacroReplaying,
    };
  }

  private searchRenderInput() {
    if (!this.modalState.searchHighlight) return undefined;
    const search = searchForOptions(this.options);
    if (!search.highlight) return undefined;
    return {
      query: this.modalState.searchHighlight.query,
      current: this.modalState.searchHighlight.current,
      highlightCurrent: search.highlightCurrent,
      maxHighlights: search.maxHighlights,
    };
  }

  private renderEditorLines(width: number, terminalRows = this.terminalRows()): string[] {
    if (
      (this.modalState.mode === "visual" ||
        this.modalState.mode === "visualLine" ||
        this.modalState.mode === "visualBlock") &&
      this.modalState.visualAnchor
    ) {
      return renderVisualEditor({
        snapshot: {
          lines: this.getLines(),
          text: this.getText(),
          cursor: this.getCursor(),
        },
        visual: {
          mode: this.modalState.mode,
          anchor: this.modalState.visualAnchor,
        },
        cursorStyle: this.getCurrentCursorStyle(),
        viewport: {
          width,
          terminalRows,
          focused: this.focused,
        },
        search: this.searchRenderInput(),
        display: {
          borderColor: this.borderColor,
        },
      });
    }

    if (this.searchRenderInput() || this.modalState.pendingEx || this.modalState.exMessage) {
      return renderPromptEditor({
        snapshot: {
          lines: this.getLines(),
          text: this.getText(),
          cursor: this.getCursor(),
        },
        cursorStyle: this.getCurrentCursorStyle(),
        viewport: {
          width,
          terminalRows,
          focused: this.focused,
        },
        search: this.searchRenderInput(),
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
      case "playMacro":
        this.playMacro(effect.inputs);
        return;
      case "terminalCursor":
        this.applyTerminalCursorStyle(effect.style);
        return;
      case "invalidate":
        this.invalidate();
        return;
    }
  }

  private playMacro(inputs: readonly string[]): void {
    if (this.isMacroReplaying) return;
    this.isMacroReplaying = true;
    try {
      for (const input of inputs) this.handleInput(input);
    } finally {
      this.isMacroReplaying = false;
    }
  }

  private applyEdit(result: EditResult): void {
    if (!result.changed) {
      this.restoreCursor(result.cursor);
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

  private getHardwareCursorVisibility(): boolean | undefined {
    const getShowHardwareCursor = (this.tui as unknown as { getShowHardwareCursor?: unknown })
      .getShowHardwareCursor;
    if (typeof getShowHardwareCursor !== "function") return undefined;
    return getShowHardwareCursor.call(this.tui) as boolean;
  }

  private setHardwareCursorVisibility(visible: boolean): void {
    const setShowHardwareCursor = (this.tui as unknown as { setShowHardwareCursor?: unknown })
      .setShowHardwareCursor;
    if (typeof setShowHardwareCursor !== "function") return;
    if (this.getHardwareCursorVisibility() === visible) return;
    setShowHardwareCursor.call(this.tui, visible);
  }

  private syncHardwareCursorVisibility(style: CursorStyle): void {
    this.setHardwareCursorVisibility(
      style === "bar" || this.originalHardwareCursorVisible === true,
    );
  }

  private applyTerminalCursorStyle(style: CursorStyle): void {
    this.syncHardwareCursorVisibility(style);
    if (style === this.lastTerminalCursorStyle) return;
    this.lastTerminalCursorStyle = style;
    this.terminalWrite(cursorShapeEscape(style));
  }

  resetTerminalCursorStyle(): void {
    this.lastTerminalCursorStyle = undefined;
    if (this.originalHardwareCursorVisible !== undefined) {
      this.setHardwareCursorVisibility(this.originalHardwareCursorVisible);
    }
    this.terminalWrite(RESET_CURSOR_SHAPE);
  }
}
