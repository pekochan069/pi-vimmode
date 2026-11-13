import type { EditorTheme } from "@earendil-works/pi-tui";

import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

import type { ModalState } from "./modal/types.ts";
import type { PiCommandActionArgs } from "./pi-command-actions.ts";
import type { ResolvedVimActionBinding, ResolvedVimKeymap, ResolvedVimWhichKey } from "./types.ts";

import { actionBindingModes, resolveLeaderKey } from "./config.ts";
import { displayMappingSequence, mappingSequencePrefixes } from "./mapping-scopes.ts";
import {
  renderPassiveSlashOverflow,
  renderPassiveSlashRows,
  type PassiveSlashRow,
} from "./slash-autocomplete-style.ts";

const DEFAULT_MAX_ROWS = 10;
const PANEL_OVERHEAD_ROWS = 2;
const DEFAULT_SELECT_LIST_THEME: Pick<
  EditorTheme["selectList"],
  "description" | "scrollInfo" | "selectedText"
> = {
  description: (text) => text,
  scrollInfo: (text) => text,
  selectedText: (text) => text,
};

type WhichKeyTheme = {
  border: (text: string) => string;
  selectList: Pick<EditorTheme["selectList"], "description" | "scrollInfo" | "selectedText">;
};

type WhichKeyCandidate = {
  key: string;
  bindings: readonly ResolvedVimActionBinding[];
};

function fitWidth(text: string, width: number): string {
  if (width <= 0) return "";
  const truncated = truncateToWidth(text, width, "");
  return truncated + " ".repeat(Math.max(0, width - visibleWidth(truncated)));
}

function defaultTheme(): WhichKeyTheme {
  return {
    border: (text) => text,
    selectList: DEFAULT_SELECT_LIST_THEME,
  };
}

function isNormalActionBinding(binding: ResolvedVimActionBinding): boolean {
  return actionBindingModes(binding).includes("normal");
}

function isPendingPrefix(sequence: string, pending: string): boolean {
  return sequence === pending || mappingSequencePrefixes(sequence).includes(pending);
}

function candidateGroupKey(bindingKey: string, pending: string): string | undefined {
  const prefixes = [...mappingSequencePrefixes(bindingKey), bindingKey];
  const index = prefixes.indexOf(pending);
  return index < 0 ? undefined : prefixes[index + 1];
}

function candidatesForPending(pending: string, keymap: ResolvedVimKeymap): WhichKeyCandidate[] {
  const candidates = new Map<string, ResolvedVimActionBinding[]>();
  for (const binding of keymap.actions.accepted) {
    if (!isNormalActionBinding(binding) || !isPendingPrefix(binding.key, pending)) continue;
    if (binding.key === pending) continue;
    const next = candidateGroupKey(binding.key, pending);
    if (!next) continue;
    candidates.set(next, [...(candidates.get(next) ?? []), binding]);
  }
  return [...candidates.entries()]
    .map(([key, bindings]) => ({ key, bindings }))
    .sort((left, right) =>
      displayMappingSequence(left.key).localeCompare(displayMappingSequence(right.key)),
    );
}

function leaderRelativeKey(key: string, leader: string): string {
  return displayMappingSequence(key).slice(displayMappingSequence(leader).length);
}

function keySegments(
  key: string,
  typedPrefix: string,
): NonNullable<PassiveSlashRow["primarySegments"]> {
  if (!typedPrefix) return [{ text: key, tone: "accent" }];
  return [
    { text: typedPrefix, tone: "muted" },
    { text: key.slice(typedPrefix.length), tone: "accent" },
  ];
}

/**
 * Describe a bound command. `pi.commandPrompt` commands keep a trailing space
 * so the prompt opens ready for arguments, and both action types accept
 * arguments, so neither form matches a description keyed by name alone.
 */
function commandDescription(
  command: string,
  descriptions: ReadonlyMap<string, string>,
): string | undefined {
  const trimmed = command.trim();
  return descriptions.get(trimmed) ?? descriptions.get(trimmed.split(/\s+/)[0]!);
}

function leafRow(
  key: string,
  typedPrefix: string,
  binding: ResolvedVimActionBinding,
  descriptions: ReadonlyMap<string, string>,
): PassiveSlashRow {
  const primarySegments = keySegments(key, typedPrefix);
  if (binding.actionId !== "pi.command" && binding.actionId !== "pi.commandPrompt") {
    return {
      primary: key,
      primarySegments,
      description: binding.desc ?? binding.actionId,
    };
  }
  const command = (binding.args as PiCommandActionArgs).command.trim();
  return {
    primary: `${key}  ${command}`,
    primarySegments: [...primarySegments, { text: "  " }, { text: command }],
    description: commandDescription(command, descriptions) ?? binding.desc,
  };
}

function candidateRow(
  candidate: WhichKeyCandidate,
  pending: string,
  leader: string,
  groups: Readonly<Record<string, string>>,
  descriptions: ReadonlyMap<string, string>,
): PassiveSlashRow {
  const key = leaderRelativeKey(candidate.key, leader);
  const typedPrefix = leaderRelativeKey(pending, leader);
  if (candidate.bindings.length === 1)
    return leafRow(key, typedPrefix, candidate.bindings[0]!, descriptions);
  const label = groups[candidate.key] ?? `${candidate.bindings.length} mappings`;
  return {
    primary: `${key}  +${label}`,
    primarySegments: [
      ...keySegments(key, typedPrefix),
      { text: "  " },
      { text: `+${label}`, tone: "accent" },
    ],
  };
}

function resolvedGroups(options: ResolvedVimWhichKey, leader: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(options.groups).flatMap(([key, label]) => {
      const resolved = resolveLeaderKey(key, leader);
      return resolved ? [[resolved, label]] : [];
    }),
  );
}

function mappingDepth(sequence: string): number {
  return mappingSequencePrefixes(sequence).length + 1;
}

function titleFor(pending: string, groups: Readonly<Record<string, string>>): string {
  const matched = Object.entries(groups)
    .filter(([key]) => key === pending || mappingSequencePrefixes(pending).includes(key))
    .sort(([left], [right]) => mappingDepth(right) - mappingDepth(left))[0];
  return matched ? `WHICH-KEY : ${matched[1].toUpperCase()}` : "WHICH-KEY";
}

function panelBorder(title: string, width: number, border: (text: string) => string): string {
  if (width <= 0) return "";
  const titleText = truncateToWidth(` ${title} `, Math.max(0, width - 1), "");
  return (
    border("─") + titleText + border("─".repeat(Math.max(0, width - 1 - visibleWidth(titleText))))
  );
}

function typedRow(
  pending: string,
  leader: string,
  width: number,
  theme: WhichKeyTheme["selectList"],
): string {
  const typed = displayMappingSequence(pending).slice(displayMappingSequence(leader).length);
  return fitWidth(theme.selectedText?.(`→ ${typed}`) ?? `→ ${typed}`, width);
}

function boundedCandidateRows(
  candidates: readonly PassiveSlashRow[],
  width: number,
  maximumRows: number,
  theme: WhichKeyTheme["selectList"],
): string[] {
  const candidateRows = maximumRows - PANEL_OVERHEAD_ROWS;
  if (candidates.length <= candidateRows) return renderPassiveSlashRows(candidates, width, theme);
  const visibleRows = Math.max(0, candidateRows - 1);
  return [
    ...renderPassiveSlashRows(candidates.slice(0, visibleRows), width, theme),
    renderPassiveSlashOverflow(candidates.length - visibleRows, width, theme),
  ];
}

export function whichKeyRows(
  state: ModalState,
  keymap: ResolvedVimKeymap,
  options: ResolvedVimWhichKey,
  width: number,
  maximumRows = DEFAULT_MAX_ROWS,
  descriptions: ReadonlyMap<string, string> = new Map(),
  theme: WhichKeyTheme = defaultTheme(),
): string[] {
  const pending = state.pending;
  const leader = keymap.leader;
  if (
    !options.enabled ||
    state.mode !== "normal" ||
    !pending ||
    !leader ||
    !pending.startsWith(leader) ||
    maximumRows < PANEL_OVERHEAD_ROWS + 1
  )
    return [];

  const groups = resolvedGroups(options, leader);
  const candidates = candidatesForPending(pending, keymap).map((candidate) =>
    candidateRow(candidate, pending, leader, groups, descriptions),
  );
  if (candidates.length === 0) return [];

  return [
    panelBorder(titleFor(pending, groups), width, theme.border),
    typedRow(pending, leader, width, theme.selectList),
    ...boundedCandidateRows(candidates, width, maximumRows, theme.selectList),
  ];
}
