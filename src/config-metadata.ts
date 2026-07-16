import { DEFAULT_VIM_OPTIONS, VIM_MOTION_OPERATOR_ACTIONS } from "./config.ts";
import { PROTECTED_SHORTCUTS } from "./customization.ts";
import { DIAGNOSTIC_ACTIONS } from "./diagnostic-actions.ts";
import {
  KEYMAP_COMMAND_DESCRIPTORS,
  KEYMAP_INSERT_DESCRIPTORS,
  KEYMAP_MARK_DESCRIPTORS,
  KEYMAP_MACRO_DESCRIPTORS,
  KEYMAP_MOTION_DESCRIPTORS,
  KEYMAP_OPERATOR_DESCRIPTORS,
  KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS,
  KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS,
} from "./keymap-descriptors.ts";
import { mappingScopesForKeymapEntry, type VimMappingScope } from "./mapping-scopes.ts";
import { PROMPT_TRANSFORM_ACTIONS } from "./prompt-transform-actions.ts";

export { VIM_MAPPING_SCOPES, type VimMappingScope } from "./mapping-scopes.ts";

type ActionSource = "keymap-descriptor" | "prompt-transform-registry" | "diagnostic-registry";

export type VimActionMetadata = {
  id: string;
  source: ActionSource;
  defaults: readonly string[];
  scopes: readonly VimMappingScope[];
  bindable: boolean;
};

function descriptorMetadata(
  family: string,
  descriptors: Record<string, { defaults: readonly string[] }>,
): VimActionMetadata[] {
  return Object.entries(descriptors).map(([action, descriptor]) => ({
    id: `${family}.${action}`,
    source: "keymap-descriptor",
    defaults: descriptor.defaults,
    scopes: mappingScopesForKeymapEntry(family, action),
    bindable: true,
  }));
}

export const VIM_ACTION_METADATA: readonly VimActionMetadata[] = [
  ...descriptorMetadata("operator", KEYMAP_OPERATOR_DESCRIPTORS),
  ...descriptorMetadata("motion", KEYMAP_MOTION_DESCRIPTORS),
  ...descriptorMetadata("command", KEYMAP_COMMAND_DESCRIPTORS),
  ...descriptorMetadata("macro", KEYMAP_MACRO_DESCRIPTORS),
  ...descriptorMetadata("mark", KEYMAP_MARK_DESCRIPTORS),
  ...descriptorMetadata("insert", KEYMAP_INSERT_DESCRIPTORS),
  ...descriptorMetadata("textObject.kind", KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS),
  ...descriptorMetadata("textObject.target", KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS),
  ...PROMPT_TRANSFORM_ACTIONS.map(({ id, modes }) => ({
    id,
    source: "prompt-transform-registry" as const,
    defaults: [],
    scopes: modes,
    bindable: true,
  })),
  ...DIAGNOSTIC_ACTIONS.map(({ id }) => ({
    id,
    source: "diagnostic-registry" as const,
    defaults: [],
    scopes: [],
    bindable: false,
  })),
];

export type ConfigLeaf = {
  path: string;
  defaultValue: unknown;
  protectedShortcuts?: typeof PROTECTED_SHORTCUTS;
};

function valueAtPath(path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], DEFAULT_VIM_OPTIONS);
}

function leaves(paths: readonly string[]): ConfigLeaf[] {
  return paths.map((path) => ({
    path,
    defaultValue: valueAtPath(path),
    ...(path === "keymap.allowProtectedOverrides"
      ? { protectedShortcuts: PROTECTED_SHORTCUTS }
      : {}),
  }));
}

const modes = ["insert", "normal", "visual", "visualLine", "visualBlock"];

export const CONFIG_LEAVES: readonly ConfigLeaf[] = leaves([
  "preset",
  "leader",
  "startMode",
  ...modes.map((mode) => `cursor.${mode}`),
  "keymap.escape",
  ...Object.keys(KEYMAP_OPERATOR_DESCRIPTORS).map((action) => `keymap.operators.${action}`),
  ...Object.keys(KEYMAP_MOTION_DESCRIPTORS).map((action) => `keymap.motions.${action}`),
  ...Object.keys(KEYMAP_COMMAND_DESCRIPTORS).map((action) => `keymap.commands.${action}`),
  ...Object.keys(KEYMAP_MACRO_DESCRIPTORS).map((action) => `keymap.macros.${action}`),
  ...Object.keys(KEYMAP_MARK_DESCRIPTORS).map((action) => `keymap.marks.${action}`),
  ...Object.keys(KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS).map(
    (action) => `keymap.textObjects.kinds.${action}`,
  ),
  ...Object.keys(KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS).map(
    (action) => `keymap.textObjects.targets.${action}`,
  ),
  ...VIM_MOTION_OPERATOR_ACTIONS.map((action) => `keymap.operatorMotions.${action}`),
  ...Object.keys(KEYMAP_INSERT_DESCRIPTORS).map((action) => `keymap.insert.${action}`),
  "keymap.actionPresets",
  "keymap.actions.accepted",
  "keymap.remaps.accepted",
  "keymap.allowProtectedOverrides",
  "ui.status.enabled",
  "ui.status.position",
  "ui.status.items",
  "ui.mode.enabled",
  ...modes.flatMap((mode) => [`ui.mode.labels.${mode}`, `ui.mode.narrowLabels.${mode}`]),
  "ui.selection.enabled",
  "ui.selection.previewMaxChars",
  "ui.cursorPosition.enabled",
  "ui.cursorPosition.base",
  "ui.cursorPosition.format",
  "ui.workbench.reservedRows",
  "macros.enabled",
  "macros.slots",
  "macros.maxReplaySteps",
  "marks.enabled",
  "marks.slots",
  "search.highlight",
  "search.highlightCurrent",
  "search.clearOnCancel",
  "search.clearOnInsert",
  "search.maxHighlights",
  "exCommand.autocomplete",
  "feedback.noop",
  "promptStructures.enabled",
  ...Object.keys(DEFAULT_VIM_OPTIONS.promptStructures!.targets).map(
    (target) => `promptStructures.targets.${target}`,
  ),
  "promptTransforms.enabled",
  ...PROMPT_TRANSFORM_ACTIONS.flatMap(({ action }) => [
    `promptTransforms.actions.${action}`,
    `promptTransforms.commands.${action}`,
  ]),
]);
