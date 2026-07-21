import {
  copyToClipboard,
  CustomEditor,
  type KeybindingsManager,
} from "@earendil-works/pi-coding-agent";
import {
  truncateToWidth,
  visibleWidth,
  type EditorTheme,
  type OverlayHandle,
  type TUI,
} from "@earendil-works/pi-tui";

import type {
  AdapterCommand,
  EditorSnapshot,
  ModalEffect,
  ModalOptions,
  ModalState,
} from "./modal/types.ts";
import type { ReadOnlyPopup } from "./read-only-popup.ts";
import type {
  CursorStyle,
  EditResult,
  Position,
  ResolvedVimEditorOptions,
  VimDiagnostics,
  VimMode,
  VimRegister,
} from "./types.ts";

import { normalizeBufferPosition, pasteRegister, pasteRegisterBefore } from "./buffer.ts";
import { readClipboardText } from "./clipboard.ts";
import { pendingDisplay } from "./commands.ts";
import {
  cloneResolvedVimOptions,
  cursorStyleForMode,
  DEFAULT_VIM_OPTIONS,
  keymapForOptions,
  promptTransformsForOptions,
  searchForOptions,
  uiForOptions,
} from "./config.ts";
import { suggestExCommands } from "./ex.ts";
import {
  canShowReadOnlyPopup,
  READ_ONLY_POPUP_MIN_WIDTH,
  ReadOnlyPopupOverlayComponent,
} from "./keybinding-discovery-overlay.ts";
import {
  canFastDelegateInsertInput,
  handleModalInput,
  modalPendingDisplay,
} from "./modal/engine.ts";
import { appendMessageHistory } from "./modal/inspect.ts";
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
} as const satisfies Record<Exclude<AdapterCommand, "redo">, string>;

function fitWidth(text: string, width: number): string {
  if (width <= 0) return "";
  const truncated = truncateToWidth(text, width, "");
  return truncated + " ".repeat(Math.max(0, width - visibleWidth(truncated)));
}

function workbenchText(state: ModalState): string | undefined {
  return state.pendingSearch
    ? `${state.pendingSearch.direction === "backward" ? "?" : "/"}${state.pendingSearch.query}`
    : state.pendingEx?.preview
      ? state.pendingEx.preview.message
      : state.pendingEx
        ? `:${state.pendingEx.command}`
        : state.exMessage?.text;
}

const MAX_VISIBLE_SUGGESTIONS = 5;

function workbenchSuggestions(
  state: ModalState,
  options: ModalOptions,
): { items: { text: string; selected: boolean }[]; selectedIndex: number; total: number } {
  if (!state.pendingEx || state.pendingEx.preview) return { items: [], selectedIndex: 0, total: 0 };
  if (options.exCommand?.autocomplete === false) return { items: [], selectedIndex: 0, total: 0 };
  const command = state.pendingEx.command;
  if (!/^[A-Za-z&\s]*$/.test(command)) return { items: [], selectedIndex: 0, total: 0 };
  const suggestions = suggestExCommands(command, {
    lineCount: 1,
    cursorLine: 0,
    visualRange: state.pendingEx.visualRange,
    promptTransforms: promptTransformsForOptions(options),
  });
  const selectedIndex = state.pendingEx.selectedSuggestion ?? 0;
  const items = suggestions.map((text, index) => ({
    text,
    selected: index === selectedIndex,
  }));
  return { items, selectedIndex, total: suggestions.length };
}

function renderWorkbenchRows(
  state: ModalState,
  options: ModalOptions,
  width: number,
  reservedRows: number,
  theme?: {
    selectList?: {
      selectedPrefix?: (t: string) => string;
      selectedText?: (t: string) => string;
      scrollInfo?: (t: string) => string;
    };
  },
): string[] {
  if (width <= 0) return [];
  const text = workbenchText(state);
  const { items: suggestions, selectedIndex, total } = workbenchSuggestions(state, options);
  const baseRows = Math.max(text === undefined ? 0 : 1, reservedRows);
  if (baseRows === 0 && suggestions.length === 0) return [];

  const rows: string[] = Array.from({ length: baseRows }, () => fitWidth(text ?? "", width));

  if (suggestions.length > 0) {
    const visibleCount = Math.min(suggestions.length, MAX_VISIBLE_SUGGESTIONS);
    const scrollOffset = Math.max(
      0,
      Math.min(selectedIndex - visibleCount + 1, suggestions.length - visibleCount),
    );
    const visibleItems = suggestions.slice(scrollOffset, scrollOffset + visibleCount);

    for (const item of visibleItems) {
      if (item.selected && theme?.selectList) {
        const prefixFn = theme.selectList.selectedPrefix;
        const prefix = prefixFn ? prefixFn("→ ") : "> ";
        const textFn = theme.selectList.selectedText;
        const maxContent = width - 2;
        const content = item.text.length > maxContent ? item.text.slice(0, maxContent) : item.text;
        rows.push(prefix + (textFn ? textFn(content) : content));
      } else {
        rows.push(fitWidth("  " + item.text, width));
      }
    }

    if (theme?.selectList?.scrollInfo) {
      rows.push(theme.selectList.scrollInfo(`(${selectedIndex + 1}/${total})`));
    } else {
      rows.push(fitWidth(`(${selectedIndex + 1}/${total})`, width));
    }
  }

  return rows;
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
  return cloneResolvedVimOptions(options);
}

type RedoSnapshot = {
  text: string;
  cursor: Position;
};

function sameRedoSnapshot(a: RedoSnapshot, b: RedoSnapshot): boolean {
  return a.text === b.text && a.cursor.line === b.cursor.line && a.cursor.col === b.cursor.col;
}

export type VimEditorOptions = {
  onShutdown?: () => void;
};

export type ResetTerminalCursorStyleOptions = {
  restoreHardwareCursorVisibility?: boolean;
};

export class VimEditor extends CustomEditor {
  private modalState: ModalState;
  private readonly options: ResolvedVimEditorOptions;
  private readonly diagnostics: VimDiagnostics;
  private readonly overlayTheme: EditorTheme;
  private readonly redoStack: RedoSnapshot[] = [];
  private readonly originalHardwareCursorVisible: boolean | undefined;
  private lastTerminalCursorStyle: CursorStyle | undefined;
  private helpOverlay: OverlayHandle | undefined;
  private agentBusy = false;
  private isMacroReplaying = false;
  private promptViewportOffset: number | undefined;
  private readonly onShutdown?: () => void;

  constructor(
    tui: TUI,
    theme: EditorTheme,
    keybindings: KeybindingsManager,
    options: ResolvedVimEditorOptions = DEFAULT_VIM_OPTIONS,
    diagnostics: VimDiagnostics = { warnings: [] },
    vimOptions?: VimEditorOptions,
  ) {
    super(tui, theme, keybindings);
    this.options = cloneOptions(options);
    this.diagnostics = { warnings: [...diagnostics.warnings] };
    this.overlayTheme = theme;
    this.onShutdown = vimOptions?.onShutdown;
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

  getClipboardRegister(slot: "+" | "*") {
    return this.modalState.clipboardRegisters?.[slot];
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

  setAgentBusy(active: boolean): void {
    if (this.agentBusy === active) return;
    this.agentBusy = active;
    this.syncHardwareCursorVisibility(this.getCurrentCursorStyle());
  }

  override handleInput(data: string): void {
    if (
      canFastDelegateInsertInput(this.modalState, data, {
        isAutocompleteOpen: this.isShowingAutocomplete(),
        isMacroReplaying: this.isMacroReplaying,
        escape: keymapForOptions(this.options).escape,
      })
    ) {
      this.delegateDefaultInput(data);
      return;
    }

    const update = handleModalInput(
      this.modalState,
      this.snapshot(),
      this.options,
      data,
      this.diagnostics,
    );
    this.modalState = update.state;
    this.applyEffects(update.effects);
  }

  override render(width: number): string[] {
    const reservedRows = Math.max(0, uiForOptions(this.options).workbench.reservedRows);
    const workbenchRows = renderWorkbenchRows(
      this.modalState,
      this.options,
      width,
      reservedRows,
      this.overlayTheme,
    );
    const terminalRows = workbenchRows.length
      ? Math.max(1, (this.terminalRows() ?? 24) - workbenchRows.length)
      : this.terminalRows();
    const lines = this.renderEditorLines(width, terminalRows, workbenchRows.length > 0);
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
    const statusLine = fitStatusBorder(status.left, status.right, width, this.borderColor);
    if (this.isShowingAutocomplete()) lines.push(statusLine);
    else lines[last] = statusLine;
    lines.push(...workbenchRows);
    return lines;
  }

  private snapshot(): EditorSnapshot {
    return {
      text: this.getText(),
      lines: this.getLines(),
      cursor: this.getCursor(),
      isAutocompleteOpen: this.isShowingAutocomplete(),
      terminalRows: this.terminalRows(),
      isMacroReplaying: this.isMacroReplaying,
      isRedoAvailable: this.redoStack.length > 0,
    };
  }

  private searchRenderInput() {
    const search = searchForOptions(this.options);
    if (!search.highlight) return undefined;
    const preview = this.modalState.pendingEx?.preview;
    if (preview) {
      return {
        query: "",
        ranges: preview.ranges,
        highlightCurrent: false,
        maxHighlights: search.maxHighlights,
      };
    }
    if (!this.modalState.searchHighlight) return undefined;
    return {
      query: this.modalState.searchHighlight.query,
      current: this.modalState.searchHighlight.current,
      highlightCurrent: search.highlightCurrent,
      maxHighlights: search.maxHighlights,
    };
  }

  private renderEditorLines(
    width: number,
    terminalRows = this.terminalRows(),
    forcePromptRender = false,
  ): string[] {
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
          offset: this.promptViewportOffset,
          onOffset: (offset) => {
            this.promptViewportOffset = offset;
          },
        },
        search: this.searchRenderInput(),
        display: {
          borderColor: this.borderColor,
        },
      });
    }

    if (this.isShowingAutocomplete()) {
      return restyleCursorMarker(super.render(width), this.getCurrentCursorStyle());
    }

    if (
      this.searchRenderInput() ||
      this.modalState.pendingSearch ||
      this.modalState.pendingEx ||
      this.modalState.exMessage ||
      forcePromptRender ||
      this.promptViewportOffset !== undefined ||
      this.modalState.mode !== "insert"
    ) {
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
          offset: this.promptViewportOffset,
          onOffset: (offset) => {
            this.promptViewportOffset = offset;
          },
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

  private delegateDefaultInput(input: string): void {
    const before = this.redoSnapshot();
    super.handleInput(input);
    this.clearRedoAfterTextChange(before);
  }

  private applyEffect(effect: ModalEffect): void {
    switch (effect.type) {
      case "delegate":
        this.delegateDefaultInput(effect.input);
        return;
      case "adapterCommand":
        this.applyAdapterCommand(effect.command);
        return;
      case "edit":
        this.applyEdit(effect.result);
        if (effect.result.changed) this.clearRedoStack();
        return;
      case "restoreCursor":
        this.restoreCursor(effect.position);
        return;
      case "playMacro":
        this.playMacro(effect.inputs);
        return;
      case "openReadOnlyPopup":
        this.openReadOnlyPopup(effect.popup);
        return;
      case "copyClipboard":
        this.copyClipboard(effect.text);
        return;
      case "readClipboard":
        this.readClipboardAndPaste(effect.register, effect.placement, effect.fallback);
        return;
      case "terminalCursor":
        this.applyTerminalCursorStyle(effect.style);
        return;
      case "invalidate":
        this.invalidate();
        return;
      case "shutdown":
        this.onShutdown?.();
        return;
    }
  }

  private copyClipboard(text: string): void {
    void copyToClipboard(text).catch(() => {
      this.addRuntimeMessage({ kind: "error", text: "Clipboard copy failed" });
    });
  }

  private readClipboardAndPaste(
    slot: "+" | "*",
    placement: "after" | "before",
    fallback?: VimRegister,
  ): void {
    void readClipboardText()
      .then((text) => {
        const register: VimRegister = { type: "char", text };
        this.pasteClipboardRegister(slot, placement, register);
      })
      .catch(() => {
        if (fallback) {
          this.pasteClipboardRegister(slot, placement, fallback);
          return;
        }
        this.addRuntimeMessage({ kind: "error", text: "Clipboard paste failed" });
      });
  }

  private pasteClipboardRegister(
    slot: "+" | "*",
    placement: "after" | "before",
    register: VimRegister,
  ): void {
    const result =
      placement === "before"
        ? pasteRegisterBefore(this.getText(), this.getCursor(), register)
        : pasteRegister(this.getText(), this.getCursor(), register);
    this.modalState = {
      ...this.modalState,
      clipboardRegisters: { ...this.modalState.clipboardRegisters, [slot]: register },
    };
    this.applyEdit(result);
    if (result.changed) this.clearRedoStack();
  }

  private addRuntimeMessage(message: { kind: "error" | "success" | "info"; text: string }): void {
    this.modalState = {
      ...this.modalState,
      exMessage: message,
      messageHistory: appendMessageHistory(this.modalState.messageHistory, message),
    };
    this.invalidate();
  }

  private openReadOnlyPopup(popup: ReadOnlyPopup): void {
    this.helpOverlay?.hide();
    const termWidth = this.terminalColumns();
    const termHeight = this.terminalRows();
    const { helpPopup: _helpPopup, ...state } = this.modalState;
    if (!canShowReadOnlyPopup(termWidth, termHeight)) {
      this.helpOverlay = undefined;
      this.modalState = {
        ...state,
        exMessage: { kind: "info", text: "Read-only popup unavailable: terminal too small" },
      };
      this.invalidate();
      return;
    }

    let handle: OverlayHandle | undefined;
    const component = new ReadOnlyPopupOverlayComponent(this.tui, popup, this.overlayTheme, () => {
      handle?.hide();
      if (this.helpOverlay === handle) this.helpOverlay = undefined;
      this.tui.requestRender();
    });
    handle = this.tui.showOverlay(component, {
      anchor: "center",
      width: "90%",
      minWidth: READ_ONLY_POPUP_MIN_WIDTH,
      maxHeight: "90%",
      margin: 2,
      visible: (termWidth, termHeight) => canShowReadOnlyPopup(termWidth, termHeight),
    });
    this.helpOverlay = handle;
    this.modalState = state;
    this.invalidate();
  }

  private applyAdapterCommand(command: AdapterCommand): void {
    if (command === "undo") {
      this.applyUndo();
      return;
    }
    if (command === "redo") {
      this.applyRedo();
      return;
    }
    super.handleInput(KEY[command]);
  }

  private redoSnapshot(): RedoSnapshot {
    return { text: this.getText(), cursor: this.getCursor() };
  }

  private clearRedoStack(): void {
    this.redoStack.length = 0;
  }

  private clearRedoAfterTextChange(before: RedoSnapshot): void {
    if (this.getText() !== before.text) this.clearRedoStack();
  }

  private applyUndo(): void {
    const before = this.redoSnapshot();
    super.handleInput(KEY.undo);
    if (!sameRedoSnapshot(before, this.redoSnapshot())) this.redoStack.push(before);
  }

  private applyRedo(): void {
    const snapshot = this.redoStack.pop();
    if (!snapshot) {
      this.invalidate();
      return;
    }
    this.setText(snapshot.text);
    this.restoreCursor(snapshot.cursor);
    this.invalidate();
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

  private terminalColumns(): number | undefined {
    const columns = (this.tui as unknown as { terminal?: { columns?: unknown } }).terminal?.columns;
    return typeof columns === "number" ? columns : undefined;
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
    if (this.agentBusy) {
      this.setHardwareCursorVisibility(style === "bar");
      return;
    }
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

  resetTerminalCursorStyle({
    restoreHardwareCursorVisibility = true,
  }: ResetTerminalCursorStyleOptions = {}): void {
    this.lastTerminalCursorStyle = undefined;
    if (restoreHardwareCursorVisibility && this.originalHardwareCursorVisible !== undefined) {
      this.setHardwareCursorVisibility(this.originalHardwareCursorVisible);
    }
    this.terminalWrite(RESET_CURSOR_SHAPE);
  }
}
