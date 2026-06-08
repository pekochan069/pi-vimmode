import type { ResolvedVimEditorOptions, VimDiagnostics } from "../types.ts";
import type { EditorSnapshot, ExMessage, ModalState } from "./types.ts";

export const MESSAGE_HISTORY_LIMIT = 20;
const PREVIEW_WIDTH = 48;

export type InspectRenderSummary = {
  width?: number;
  terminalRows?: number;
  workbenchRowActive?: boolean;
  visualRenderActive?: boolean;
  searchRenderActive?: boolean;
  cursorStyle?: string;
};

export type InspectInput = {
  state: ModalState;
  snapshot: EditorSnapshot;
  options: ResolvedVimEditorOptions;
  diagnostics?: VimDiagnostics;
  render?: InspectRenderSummary;
};

export function appendMessageHistory(
  messages: readonly ExMessage[] | undefined,
  message: ExMessage,
): ExMessage[] {
  return [...(messages ?? []), message].slice(-MESSAGE_HISTORY_LIMIT);
}

export function runtimeMessagesMessage(messages: readonly { text: string }[] | undefined): string {
  if (!messages || messages.length === 0) return "messages: none retained";
  const latest = messages.at(-1)!;
  return `messages: ${messages.length} retained; latest: ${redact(latest.text)}`;
}

export function vimmodeInspectMessage(input: InspectInput): string {
  const { state, snapshot, options, diagnostics, render } = input;
  const parts = [
    `mode=${state.mode}`,
    `cursor=${snapshot.cursor.line + 1}:${snapshot.cursor.col + 1}`,
    pendingSummary(state),
    selectionSummary(state),
    registerSummary(state),
    marksSummary(state),
    macrosSummary(state),
    searchSummary(state),
    exSummary(state),
    diagnosticsSummary(diagnostics),
    optionsSummary(options),
    renderSummary(state, render),
  ].filter((part): part is string => Boolean(part));
  return `inspect: ${parts.join("; ")}`;
}

function pendingSummary(state: ModalState): string | undefined {
  const pending = [
    state.pending ? `operator=${state.pending}` : undefined,
    state.pendingRegister ? "register-pending" : undefined,
    state.pendingMark ? "mark-pending" : undefined,
    state.pendingMacro ? `macro-pending=${state.pendingMacro}` : undefined,
    state.pendingSearch
      ? `search-pending=${state.pendingSearch.direction}:${state.pendingSearch.query.length}`
      : undefined,
    state.pendingEx
      ? `ex-pending=${state.pendingEx.sourceMode}:${state.pendingEx.command.length}`
      : undefined,
    state.blockInsert
      ? `block-insert=${state.blockInsert.placement}:${state.blockInsert.text.length}`
      : undefined,
  ].filter(Boolean);
  return pending.length > 0 ? `pending=${pending.join(",")}` : undefined;
}

function selectionSummary(state: ModalState): string | undefined {
  if (!state.visualAnchor) return undefined;
  return `selection=${state.mode}@${state.visualAnchor.line + 1}:${state.visualAnchor.col + 1}`;
}

function registerSummary(state: ModalState): string | undefined {
  const named = Object.keys(state.namedRegisters ?? {}).sort();
  const unnamed = state.register ? `${state.register.type}:${state.register.text.length}` : "empty";
  return `registers=unnamed-${unnamed},named-${named.length}${named.length ? `(${named.join(",")})` : ""}`;
}

function marksSummary(state: ModalState): string | undefined {
  const slots = Object.keys(state.marks ?? {}).sort();
  return slots.length > 0 ? `marks=${slots.join(",")}` : undefined;
}

function macrosSummary(state: ModalState): string | undefined {
  const macros = state.macros ?? {};
  const slots = Object.keys(macros).sort();
  const counts = slots.map((slot) => `${slot}:${macros[slot]?.length ?? 0}`).join(",");
  const recording = state.recordingSlot ? `,recording=${state.recordingSlot}` : "";
  const last = state.lastPlayedMacro ? `,last=${state.lastPlayedMacro}` : "";
  return slots.length || recording || last
    ? `macros=${counts || "none"}${recording}${last}`
    : undefined;
}

function searchSummary(state: ModalState): string | undefined {
  const parts = [
    state.lastSearch
      ? `last=${state.lastSearch.direction}:${state.lastSearch.matcherMode ?? "literal"}:${state.lastSearch.query.length}`
      : undefined,
    state.searchHighlight ? `highlight=${state.searchHighlight.query.length}` : undefined,
    state.searchHistory ? `history=${state.searchHistory.length}` : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? `search=${parts.join(",")}` : undefined;
}

function exSummary(state: ModalState): string | undefined {
  const parts = [
    state.exHistory ? `history=${state.exHistory.length}` : undefined,
    state.pendingEx?.preview ? `preview=${state.pendingEx.preview.matches}` : undefined,
    state.exMessage ? `message=${state.exMessage.kind}:${redact(state.exMessage.text)}` : undefined,
    state.messageHistory ? `messages=${state.messageHistory.length}` : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? `ex=${parts.join(",")}` : undefined;
}

function diagnosticsSummary(diagnostics: VimDiagnostics | undefined): string | undefined {
  const count = diagnostics?.warnings.length ?? 0;
  return count > 0 ? `warnings=${count}` : undefined;
}

function optionsSummary(options: ResolvedVimEditorOptions): string {
  const disabled = [
    options.macros?.enabled === false ? "macros" : undefined,
    options.marks?.enabled === false ? "marks" : undefined,
    options.search?.highlight === false ? "search-highlight" : undefined,
    options.ui?.status?.enabled === false ? "status" : undefined,
    options.promptTransforms?.enabled === false ? "transforms" : undefined,
  ].filter(Boolean);
  return disabled.length > 0 ? `disabled=${disabled.join(",")}` : "features=default";
}

function renderSummary(state: ModalState, render: InspectRenderSummary | undefined): string {
  const visual =
    render?.visualRenderActive ?? Boolean(state.visualAnchor && state.mode.startsWith("visual"));
  const search =
    render?.searchRenderActive ?? Boolean(state.searchHighlight || state.pendingEx?.preview);
  const workbench =
    render?.workbenchRowActive ??
    Boolean(state.pendingSearch || state.pendingEx || state.exMessage);
  const size = render?.width ? `,size=${render.width}x${render.terminalRows ?? "?"}` : "";
  const cursor = render?.cursorStyle ? `,cursor=${render.cursorStyle}` : "";
  return `render=visual:${visual},search:${search},workbench:${workbench}${size}${cursor}`;
}

function redact(text: string): string {
  const compact = text.replace(/\s+/g, " ");
  return compact.length <= PREVIEW_WIDTH ? compact : `${compact.slice(0, PREVIEW_WIDTH - 1)}…`;
}
