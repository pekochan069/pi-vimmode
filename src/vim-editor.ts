import { CustomEditor, type KeybindingsManager } from "@earendil-works/pi-coding-agent";
import {
  decodeKittyPrintable,
  matchesKey,
  truncateToWidth,
  visibleWidth,
  type EditorTheme,
  type TUI,
} from "@earendil-works/pi-tui";

import type {
  CursorStyle,
  EditResult,
  PendingOperator,
  Position,
  VimEditorOptions,
  VimMode,
  VimMotion,
  VimOperator,
  VimRegister,
} from "./types.ts";

import {
  bufferEndPosition,
  bufferStartPosition,
  changeLine,
  clampPosition,
  deleteByMotion,
  deleteCharAt,
  deleteLine,
  deleteLineRange,
  deleteRange,
  firstNonBlankPosition,
  joinLineWithNext,
  linewiseSelectionText,
  matchingPairPosition,
  openLineAbove,
  openLineBelow,
  pasteRegister,
  pasteRegisterBefore,
  selectionText,
  visualLineSelectionSummary,
  visualSelectionSummary,
  yankByMotion,
  yankLine,
  yankLineRange,
} from "./buffer.ts";
import { parseNormalCommand } from "./commands.ts";
import { cursorStyleForMode, DEFAULT_VIM_OPTIONS } from "./config.ts";
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
} as const;

function printableKey(data: string): string | undefined {
  return (
    decodeKittyPrintable(data) ?? (data.length === 1 && data.charCodeAt(0) >= 32 ? data : undefined)
  );
}

function isDelegatedResetKey(data: string): boolean {
  return matchesKey(data, "enter") || matchesKey(data, "ctrl+c") || matchesKey(data, "ctrl+g");
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

function cloneOptions(options: VimEditorOptions): VimEditorOptions {
  return { startMode: options.startMode, cursor: { ...options.cursor } };
}

export class VimEditor extends CustomEditor {
  private mode: VimMode;
  private readonly options: VimEditorOptions;
  private visualAnchor: Position | undefined;
  private register: VimRegister | undefined;
  private pending: PendingOperator | undefined;
  private lastTerminalCursorStyle: CursorStyle | undefined;

  constructor(
    tui: TUI,
    theme: EditorTheme,
    keybindings: KeybindingsManager,
    options: VimEditorOptions = DEFAULT_VIM_OPTIONS,
  ) {
    super(tui, theme, keybindings);
    this.options = cloneOptions(options);
    this.mode = this.options.startMode;
    this.applyTerminalCursorStyle();
  }

  getVimMode(): VimMode {
    return this.mode;
  }

  getRegister(): VimRegister | undefined {
    return this.register;
  }

  getPendingOperator(): PendingOperator | undefined {
    return this.pending;
  }

  getCurrentCursorStyle(): CursorStyle {
    return cursorStyleForMode(this.options, this.mode);
  }

  override handleInput(data: string): void {
    if (this.mode === "insert") {
      this.handleInsertInput(data);
      return;
    }

    if (this.mode === "visual") {
      this.handleVisualInput(data);
      return;
    }

    if (this.mode === "visualLine") {
      this.handleVisualLineInput(data);
      return;
    }

    this.handleNormalInput(data);
  }

  override render(width: number): string[] {
    let lines: string[];
    if ((this.mode === "visual" || this.mode === "visualLine") && this.visualAnchor) {
      lines = renderVisualEditor({
        lines: this.getLines(),
        cursor: this.getCursor(),
        mode: this.mode,
        visualAnchor: this.visualAnchor,
        cursorStyle: this.getCurrentCursorStyle(),
        width,
        terminalRows: this.terminalRows(),
        focused: this.focused,
        borderColor: this.borderColor,
      });
    } else {
      lines = restyleCursorMarker(super.render(width), this.getCurrentCursorStyle());
    }

    if (lines.length === 0 || width <= 0) return lines;

    const last = lines.length - 1;
    const label = this.modeLabel(width);
    const pending = this.pending ? ` ${this.pending}…` : "";
    const left = ` ${label}${pending} `;
    const right = this.visualStatus(width);
    lines[last] = fitStatusBorder(left, right, width, this.borderColor);
    return lines;
  }

  private handleInsertInput(data: string): void {
    if (matchesKey(data, "escape")) {
      if (this.isShowingAutocomplete()) {
        super.handleInput(data);
        return;
      }
      this.enterNormalMode();
      return;
    }

    super.handleInput(data);
  }

  private handleNormalInput(data: string): void {
    if (matchesKey(data, "escape")) {
      this.pending = undefined;
      super.handleInput(data);
      this.invalidate();
      return;
    }

    if (isDelegatedResetKey(data)) {
      this.resetTransientState(this.options.startMode);
      super.handleInput(data);
      return;
    }

    const key = printableKey(data);
    if (!key) {
      this.pending = undefined;
      super.handleInput(data);
      this.invalidate();
      return;
    }

    const pendingResult = parseNormalCommand(key, this.pending);
    if (pendingResult.type === "pending") {
      this.pending = pendingResult.operator;
      this.invalidate();
      return;
    }
    if (pendingResult.type === "command") {
      this.pending = undefined;
      if (pendingResult.command === "dd") this.deleteCurrentLine();
      if (pendingResult.command === "cc") this.changeCurrentLine();
      if (pendingResult.command === "yy") this.yankCurrentLine();
      if (pendingResult.command === "gg") this.move("gg");
      this.invalidate();
      return;
    }
    if (pendingResult.type === "operatorMotion") {
      this.pending = undefined;
      this.applyOperatorMotion(pendingResult.operator, pendingResult.motion);
      return;
    }
    if (pendingResult.type === "invalid") {
      this.pending = undefined;
      this.invalidate();
      return;
    }

    this.handleNormalPrintable(key);
  }

  private handleVisualInput(data: string): void {
    if (matchesKey(data, "escape")) {
      this.enterNormalMode();
      return;
    }

    if (isDelegatedResetKey(data)) {
      this.resetTransientState(this.options.startMode);
      super.handleInput(data);
      return;
    }

    const key = printableKey(data);
    if (!key) {
      super.handleInput(data);
      return;
    }

    switch (key) {
      case "h":
      case "j":
      case "k":
      case "l":
      case "0":
      case "$":
      case "w":
      case "b":
        this.move(key);
        return;
      case "V":
        this.mode = "visualLine";
        this.pending = undefined;
        this.applyTerminalCursorStyle();
        this.invalidate();
        return;
      case "y":
        this.yankVisualSelection();
        return;
      case "d":
      case "x":
        this.deleteVisualSelection("normal");
        return;
      case "c":
        this.deleteVisualSelection("insert");
        return;
    }

    this.invalidate();
  }

  private handleVisualLineInput(data: string): void {
    if (matchesKey(data, "escape")) {
      this.enterNormalMode();
      return;
    }

    if (isDelegatedResetKey(data)) {
      this.resetTransientState(this.options.startMode);
      super.handleInput(data);
      return;
    }

    const key = printableKey(data);
    if (!key) {
      super.handleInput(data);
      return;
    }

    switch (key) {
      case "h":
      case "j":
      case "k":
      case "l":
      case "0":
      case "$":
      case "w":
      case "b":
        this.move(key);
        return;
      case "v":
        this.mode = "visual";
        this.pending = undefined;
        this.applyTerminalCursorStyle();
        this.invalidate();
        return;
      case "V":
        this.invalidate();
        return;
      case "y":
        this.yankVisualLineSelection();
        return;
      case "d":
      case "x":
        this.deleteVisualLineSelection("normal");
        return;
      case "c":
        this.deleteVisualLineSelection("insert");
        return;
    }

    this.invalidate();
  }

  private handleNormalPrintable(key: string): void {
    switch (key) {
      case "h":
      case "j":
      case "k":
      case "l":
      case "0":
      case "$":
      case "w":
      case "b":
      case "G":
      case "^":
      case "_":
      case "%":
        this.move(key);
        return;
      case "i":
        this.enterInsertMode();
        return;
      case "a":
        this.move("l");
        this.enterInsertMode();
        return;
      case "I":
        this.move("0");
        this.enterInsertMode();
        return;
      case "A":
        this.move("$");
        this.enterInsertMode();
        return;
      case "o":
        this.applyEdit(openLineBelow(this.getText(), this.getCursor()));
        this.enterInsertMode();
        return;
      case "O":
        this.applyEdit(openLineAbove(this.getText(), this.getCursor()));
        this.enterInsertMode();
        return;
      case "v":
        this.mode = "visual";
        this.pending = undefined;
        this.visualAnchor = this.getCursor();
        this.applyTerminalCursorStyle();
        this.invalidate();
        return;
      case "V":
        this.mode = "visualLine";
        this.pending = undefined;
        this.visualAnchor = this.getCursor();
        this.applyTerminalCursorStyle();
        this.invalidate();
        return;
      case "x":
        this.applyEdit(deleteCharAt(this.getText(), this.getCursor()));
        return;
      case "D":
        this.applyEdit(deleteByMotion(this.getText(), this.getCursor(), "$"));
        return;
      case "C":
        this.applyEdit(deleteByMotion(this.getText(), this.getCursor(), "$"));
        this.enterInsertMode();
        return;
      case "Y":
        this.yankCurrentLine();
        return;
      case "J":
        this.applyEdit(joinLineWithNext(this.getText(), this.getCursor()));
        return;
      case "p":
        this.applyEdit(pasteRegister(this.getText(), this.getCursor(), this.register));
        return;
      case "P":
        this.applyEdit(pasteRegisterBefore(this.getText(), this.getCursor(), this.register));
        return;
      case "u":
        super.handleInput(KEY.undo);
        return;
    }

    this.invalidate();
  }

  private move(key: string): void {
    switch (key) {
      case "h":
        super.handleInput(KEY.left);
        break;
      case "j":
        super.handleInput(KEY.down);
        break;
      case "k":
        super.handleInput(KEY.up);
        break;
      case "l":
        super.handleInput(KEY.right);
        break;
      case "0":
        super.handleInput(KEY.lineStart);
        break;
      case "$":
        super.handleInput(KEY.lineEnd);
        break;
      case "w":
        super.handleInput(KEY.wordRight);
        break;
      case "b":
        super.handleInput(KEY.wordLeft);
        break;
      case "gg":
        this.restoreCursor(bufferStartPosition());
        break;
      case "G":
        this.restoreCursor(bufferEndPosition(this.getText()));
        break;
      case "^":
      case "_":
        this.restoreCursor(firstNonBlankPosition(this.getText(), this.getCursor()));
        break;
      case "%": {
        const target = matchingPairPosition(this.getText(), this.getCursor());
        if (target) this.restoreCursor(target);
        break;
      }
    }
    this.invalidate();
  }

  private enterInsertMode(): void {
    this.mode = "insert";
    this.pending = undefined;
    this.visualAnchor = undefined;
    this.applyTerminalCursorStyle();
    this.invalidate();
  }

  private enterNormalMode(): void {
    this.mode = "normal";
    this.pending = undefined;
    this.visualAnchor = undefined;
    this.applyTerminalCursorStyle();
    this.invalidate();
  }

  private resetTransientState(mode: VimMode): void {
    this.mode = mode;
    this.pending = undefined;
    this.visualAnchor = undefined;
    this.applyTerminalCursorStyle();
    this.invalidate();
  }

  private yankCurrentLine(): void {
    this.register = yankLine(this.getText(), this.getCursor());
    this.invalidate();
  }

  private deleteCurrentLine(): void {
    this.applyEdit(deleteLine(this.getText(), this.getCursor()));
  }

  private changeCurrentLine(): void {
    this.applyEdit(changeLine(this.getText(), this.getCursor()));
    this.enterInsertMode();
  }

  private applyOperatorMotion(operator: VimOperator, motion: VimMotion): void {
    if (operator === "y") {
      const register = yankByMotion(this.getText(), this.getCursor(), motion);
      if (register) this.register = register;
      this.invalidate();
      return;
    }

    this.applyEdit(deleteByMotion(this.getText(), this.getCursor(), motion));
    if (operator === "c") this.enterInsertMode();
  }

  private yankVisualSelection(): void {
    if (!this.visualAnchor) {
      this.enterNormalMode();
      return;
    }
    const selected = selectionText(this.getText(), this.visualAnchor, this.getCursor());
    if (selected.length > 0) this.register = { type: "char", text: selected };
    this.enterNormalMode();
  }

  private yankVisualLineSelection(): void {
    if (!this.visualAnchor) {
      this.enterNormalMode();
      return;
    }
    this.register = yankLineRange(this.getText(), this.visualAnchor, this.getCursor());
    this.enterNormalMode();
  }

  private deleteVisualSelection(nextMode: VimMode): void {
    if (!this.visualAnchor) {
      this.resetTransientState(nextMode);
      return;
    }
    const result = deleteRange(this.getText(), this.visualAnchor, this.getCursor());
    this.resetTransientState(nextMode);
    this.applyEdit(result);
    this.mode = nextMode;
    this.applyTerminalCursorStyle();
    this.invalidate();
  }

  private deleteVisualLineSelection(nextMode: VimMode): void {
    if (!this.visualAnchor) {
      this.resetTransientState(nextMode);
      return;
    }
    const result = deleteLineRange(this.getText(), this.visualAnchor, this.getCursor());
    this.resetTransientState(nextMode);
    this.applyEdit(result);
    this.mode = nextMode;
    this.applyTerminalCursorStyle();
    this.invalidate();
  }

  private applyEdit(result: EditResult): void {
    if (result.register) this.register = result.register;
    if (!result.changed) {
      this.invalidate();
      return;
    }

    this.setText(result.text);
    this.restoreCursor(result.cursor);
    this.invalidate();
  }

  private restoreCursor(position: Position): void {
    const target = clampPosition(this.getLines(), position);
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

  private modeLabel(width: number): string {
    const full = this.mode === "visualLine" ? "V-LINE" : this.mode.toUpperCase();
    const narrow = this.mode === "visualLine" ? "VL" : (this.mode[0]?.toUpperCase() ?? "?");
    if (width < full.length + 4) return narrow;
    return full;
  }

  private visualStatus(width: number): string {
    if (!this.visualAnchor) return "";
    if (this.mode === "visual") {
      const summary = visualSelectionSummary(this.getText(), this.visualAnchor, this.getCursor());
      if (width < 20) return ` ${summary.split(" ")[0]} `;
      const selected = selectionText(this.getText(), this.visualAnchor, this.getCursor()).replace(
        /\n/g,
        "↵",
      );
      const preview = selected.length > 0 ? ` · ${truncateToWidth(selected, 16, "…")}` : "";
      return ` ${summary}${preview} `;
    }

    if (this.mode === "visualLine") {
      const summary = visualLineSelectionSummary(
        this.getText(),
        this.visualAnchor,
        this.getCursor(),
      );
      if (width < 20) return ` ${summary.split(" ")[0]}L `;
      const selected = linewiseSelectionText(
        this.getText(),
        this.visualAnchor,
        this.getCursor(),
      ).replace(/\n/g, "↵");
      const preview = selected.length > 0 ? ` · ${truncateToWidth(selected, 16, "…")}` : "";
      return ` ${summary}${preview} `;
    }

    return "";
  }

  private terminalRows(): number | undefined {
    const rows = (this.tui as unknown as { terminal?: { rows?: unknown } }).terminal?.rows;
    return typeof rows === "number" ? rows : undefined;
  }

  private terminalWrite(data: string): void {
    const write = (this.tui as unknown as { terminal?: { write?: unknown } }).terminal?.write;
    if (typeof write === "function")
      write.call((this.tui as unknown as { terminal?: unknown }).terminal, data);
  }

  private applyTerminalCursorStyle(): void {
    const style = this.getCurrentCursorStyle();
    if (style === this.lastTerminalCursorStyle) return;
    this.lastTerminalCursorStyle = style;
    this.terminalWrite(cursorShapeEscape(style));
  }

  resetTerminalCursorStyle(): void {
    this.lastTerminalCursorStyle = undefined;
    this.terminalWrite(RESET_CURSOR_SHAPE);
  }
}
