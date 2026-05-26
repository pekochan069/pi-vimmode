import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { CursorStyle, CursorStyles, StartupMode, VimEditorOptions, VimMode } from "./types.ts";

const VIM_MODES = [
  "insert",
  "normal",
  "visual",
  "visualLine",
] as const satisfies readonly VimMode[];
const START_MODES = new Set<StartupMode>(["insert", "normal"]);
const CURSOR_STYLES = new Set<CursorStyle>(["block", "bar", "underline"]);

export const DEFAULT_VIM_OPTIONS: VimEditorOptions = Object.freeze({
  startMode: "insert",
  cursor: Object.freeze({
    insert: "bar",
    normal: "block",
    visual: "block",
    visualLine: "block",
  }),
});

type PartialVimOptions = {
  startMode?: StartupMode;
  cursor?: Partial<CursorStyles>;
};

export type VimConfigLoadResult = {
  options: VimEditorOptions;
  warnings: string[];
};

export type VimConfigPaths = {
  cwd?: string;
  globalSettingsPath?: string;
  projectSettingsPath?: string;
};

function cloneDefaultOptions(): VimEditorOptions {
  return {
    startMode: DEFAULT_VIM_OPTIONS.startMode,
    cursor: { ...DEFAULT_VIM_OPTIONS.cursor },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePiVimMode(
  value: unknown,
  sourceLabel: string,
): { partial: PartialVimOptions; warnings: string[] } {
  const warnings: string[] = [];
  const partial: PartialVimOptions = {};

  if (value === undefined) return { partial, warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: piVimMode must be an object`);
    return { partial, warnings };
  }

  const startMode = value.startMode;
  if (startMode !== undefined) {
    if (typeof startMode === "string" && START_MODES.has(startMode as StartupMode)) {
      partial.startMode = startMode as StartupMode;
    } else {
      warnings.push(`${sourceLabel}: unsupported piVimMode.startMode`);
    }
  }

  const cursor = value.cursor;
  if (cursor !== undefined) {
    if (!isRecord(cursor)) {
      warnings.push(`${sourceLabel}: piVimMode.cursor must be an object`);
    } else {
      const parsedCursor: Partial<CursorStyles> = {};
      for (const mode of VIM_MODES) {
        const style = cursor[mode];
        if (style === undefined) continue;
        if (typeof style === "string" && CURSOR_STYLES.has(style as CursorStyle)) {
          parsedCursor[mode] = style as CursorStyle;
        } else {
          warnings.push(`${sourceLabel}: unsupported piVimMode.cursor.${mode}`);
        }
      }
      partial.cursor = parsedCursor;
    }
  }

  return { partial, warnings };
}

function mergePartialOptions(target: VimEditorOptions, partial: PartialVimOptions): void {
  if (partial.startMode) target.startMode = partial.startMode;
  if (partial.cursor) target.cursor = { ...target.cursor, ...partial.cursor };
}

export function resolveVimOptions(
  globalSettings: unknown,
  projectSettings?: unknown,
): VimConfigLoadResult {
  const options = cloneDefaultOptions();
  const warnings: string[] = [];

  const globalPiVimMode = isRecord(globalSettings) ? globalSettings.piVimMode : undefined;
  const parsedGlobal = parsePiVimMode(globalPiVimMode, "global settings");
  mergePartialOptions(options, parsedGlobal.partial);
  warnings.push(...parsedGlobal.warnings);

  const projectPiVimMode = isRecord(projectSettings) ? projectSettings.piVimMode : undefined;
  const parsedProject = parsePiVimMode(projectPiVimMode, "project settings");
  mergePartialOptions(options, parsedProject.partial);
  warnings.push(...parsedProject.warnings);

  return { options, warnings };
}

function readJsonFile(
  path: string,
  sourceLabel: string,
): { settings: unknown | undefined; warnings: string[] } {
  if (!existsSync(path)) return { settings: undefined, warnings: [] };

  try {
    return { settings: JSON.parse(readFileSync(path, "utf8")), warnings: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      settings: undefined,
      warnings: [`${sourceLabel}: failed to read settings (${message})`],
    };
  }
}

export function defaultVimConfigPaths(cwd = process.cwd()): Required<Omit<VimConfigPaths, "cwd">> {
  return {
    globalSettingsPath: join(homedir(), ".pi", "agent", "settings.json"),
    projectSettingsPath: join(cwd, ".pi", "settings.json"),
  };
}

export function loadVimOptions(paths: VimConfigPaths = {}): VimConfigLoadResult {
  const defaults = defaultVimConfigPaths(paths.cwd);
  const globalPath = paths.globalSettingsPath ?? defaults.globalSettingsPath;
  const projectPath = paths.projectSettingsPath ?? defaults.projectSettingsPath;

  const globalRead = readJsonFile(globalPath, "global settings");
  const projectRead = readJsonFile(projectPath, "project settings");
  const resolved = resolveVimOptions(globalRead.settings, projectRead.settings);

  return {
    options: resolved.options,
    warnings: [...globalRead.warnings, ...projectRead.warnings, ...resolved.warnings],
  };
}

export function cursorStyleForMode(options: VimEditorOptions, mode: VimMode): CursorStyle {
  return options.cursor[mode] ?? DEFAULT_VIM_OPTIONS.cursor[mode];
}
