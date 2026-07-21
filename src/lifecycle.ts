import { type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";

import type { ResolvedVimEditorOptions, VimDiagnostics } from "./types.ts";

import {
  createVimConfigPlan,
  DEFAULT_VIM_OPTIONS,
  loadVimOptions,
  type VimConfigLoadResult,
  type VimConfigPaths,
} from "./config.ts";
import { type ResetTerminalCursorStyleOptions, VimEditor } from "./vim-editor.ts";

type VimEditorFactory = (
  tui: ConstructorParameters<typeof VimEditor>[0],
  theme: ConstructorParameters<typeof VimEditor>[1],
  keybindings: ConstructorParameters<typeof VimEditor>[2],
) => VimEditor;

/** Callback type for shutdown requests from VimEditor. */
export type VimShutdownCallback = () => void;

type EditorComponentFactory = ReturnType<ExtensionContext["ui"]["getEditorComponent"]>;
type TrackedEditor = Pick<VimEditor, "reconfigure" | "resetTerminalCursorStyle" | "setAgentBusy">;
type CreateEditor = (
  tui: ConstructorParameters<typeof VimEditor>[0],
  theme: ConstructorParameters<typeof VimEditor>[1],
  keybindings: ConstructorParameters<typeof VimEditor>[2],
  options: ResolvedVimEditorOptions,
  diagnostics: VimDiagnostics,
  vimOptions?: { onShutdown?: () => void },
) => TrackedEditor;
type Schedule = (callback: () => void) => void;

export type VimLifecycleDependencies = {
  defaultOptions?: ResolvedVimEditorOptions;
  loadOptions?: (paths: VimConfigPaths) => VimConfigLoadResult | Promise<VimConfigLoadResult>;
  createEditor?: CreateEditor;
  schedule?: Schedule;
};

type ConfigState = {
  options: () => ResolvedVimEditorOptions;
  diagnostics: () => VimDiagnostics;
  refresh: (ctx: ExtensionContext) => boolean | Promise<boolean>;
};

function createConfigState(
  dependencies: VimLifecycleDependencies,
  onCommit: (options: ResolvedVimEditorOptions, diagnostics: VimDiagnostics) => void,
): ConfigState {
  let currentPlan = createVimConfigPlan(dependencies.defaultOptions ?? DEFAULT_VIM_OPTIONS, []);
  let currentDiagnostics: VimDiagnostics = currentPlan.diagnostics;
  let hasCommittedLoad = false;
  let refreshGeneration = 0;
  const loadOptions = dependencies.loadOptions ?? loadVimOptions;

  const apply = (ctx: ExtensionContext, loaded: VimConfigLoadResult) => {
    const previousConfig = JSON.stringify([currentPlan.options, currentDiagnostics]);
    const committed = !loaded.fatal || !hasCommittedLoad;
    if (committed) {
      currentPlan = loaded.plan;
      hasCommittedLoad = true;
    }
    currentDiagnostics = loaded.fatal ? loaded.plan.diagnostics : currentPlan.diagnostics;
    const configChanged =
      JSON.stringify([currentPlan.options, currentDiagnostics]) !== previousConfig;
    if (committed && configChanged) onCommit(currentPlan.options, currentDiagnostics);
    ctx.ui.setStatus("pi-vimmode", currentDiagnostics.warnings.length > 0 ? "vim ⚠" : "vim");
  };
  const applyFailure = (ctx: ExtensionContext, error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    const warnings = [`global JS config: failed to load (${message})`];
    apply(ctx, {
      plan: createVimConfigPlan(currentPlan.options, warnings),
      options: currentPlan.options,
      warnings,
      fatal: true,
    });
  };
  const refresh = (ctx: ExtensionContext): boolean | Promise<boolean> => {
    const generation = ++refreshGeneration;
    try {
      const loaded = loadOptions({ cwd: ctx.cwd });
      if (loaded instanceof Promise) {
        return loaded.then(
          (result) => {
            if (generation !== refreshGeneration) return false;
            apply(ctx, result);
            return true;
          },
          (error) => {
            if (generation !== refreshGeneration) return false;
            applyFailure(ctx, error);
            return true;
          },
        );
      }
      apply(ctx, loaded);
    } catch (error) {
      applyFailure(ctx, error);
    }
    return true;
  };

  return {
    options: () => currentPlan.options,
    diagnostics: () => currentDiagnostics,
    refresh,
  };
}

type EditorState = {
  config: ConfigState;
  createEditor: CreateEditor;
  schedule: Schedule;
  editors: Set<TrackedEditor>;
  editorFactory: VimEditorFactory;
  currentShutdown?: () => void;
  enabled: boolean;
  agentBusy: boolean;
  previousEditorFactory?: EditorComponentFactory;
  hasInstalledFactory: boolean;
};

function finishInstall(state: EditorState, ctx: ExtensionContext, force = false): void {
  state.currentShutdown = () => ctx.shutdown();
  const current = ctx.ui.getEditorComponent();
  if (current === state.editorFactory) {
    state.hasInstalledFactory = true;
    return;
  }
  if (
    !force &&
    state.hasInstalledFactory &&
    current !== undefined &&
    current !== state.previousEditorFactory
  ) {
    return;
  }
  state.previousEditorFactory = current;
  ctx.ui.setEditorComponent(state.editorFactory);
  state.hasInstalledFactory = true;
}

function installEditor(
  state: EditorState,
  ctx: ExtensionContext,
  force = false,
): void | Promise<void> {
  if (!state.enabled) {
    ctx.ui.setStatus("pi-vimmode", "vim off");
    return;
  }
  const refreshed = state.config.refresh(ctx);
  if (refreshed instanceof Promise) {
    return refreshed.then((applied) => {
      if (!applied) return;
      if (state.enabled) finishInstall(state, ctx, force);
      else ctx.ui.setStatus("pi-vimmode", "vim off");
    });
  }
  finishInstall(state, ctx, force);
}

function resetKnownEditors(state: EditorState, options?: ResetTerminalCursorStyleOptions): void {
  for (const editor of state.editors) editor.resetTerminalCursorStyle(options);
  state.editors.clear();
}

function createEditorState(dependencies: VimLifecycleDependencies): EditorState {
  let state: EditorState;
  const config = createConfigState(dependencies, (options, diagnostics) => {
    if (!state?.enabled) return;
    for (const editor of state.editors) editor.reconfigure(options, diagnostics);
  });
  state = {
    config,
    createEditor:
      dependencies.createEditor ??
      ((tui, theme, keybindings, options, diagnostics, vimOptions) =>
        new VimEditor(tui, theme, keybindings, options, diagnostics, vimOptions)),
    schedule: dependencies.schedule ?? ((callback) => setTimeout(callback, 0)),
    editors: new Set<TrackedEditor>(),
    editorFactory: undefined as unknown as VimEditorFactory,
    enabled: true,
    agentBusy: false,
    hasInstalledFactory: false,
  };
  state.editorFactory = (tui, theme, keybindings) => {
    const editor = state.createEditor(
      tui,
      theme,
      keybindings,
      state.config.options(),
      state.config.diagnostics(),
      { onShutdown: state.currentShutdown },
    );
    state.editors.add(editor);
    if (state.agentBusy) editor.setAgentBusy(true);
    return editor as VimEditor;
  };
  return state;
}

function observeInstall(install: void | Promise<void>, ctx: ExtensionContext): void {
  if (!(install instanceof Promise)) return;
  void install.catch((error: unknown) => {
    try {
      const message = error instanceof Error ? error.message : String(error);
      ctx.ui.notify(`pi-vimmode install failed: ${message}`, "error");
    } catch {
      // Context went stale while reporting the original failure.
    }
  });
}

function installEditorSoon(state: EditorState, ctx: ExtensionContext): void {
  observeInstall(installEditor(state, ctx), ctx);
  state.schedule(() => {
    try {
      observeInstall(installEditor(state, ctx), ctx);
    } catch {
      // Context can go stale during reload/session switch. Next session_start will reinstall.
    }
  });
}

function disableEditor(state: EditorState, ctx: ExtensionContext): void {
  state.enabled = false;
  state.agentBusy = false;
  resetKnownEditors(state);
  if (ctx.ui.getEditorComponent() === state.editorFactory) {
    ctx.ui.setEditorComponent(state.previousEditorFactory);
    state.hasInstalledFactory = false;
  }
  ctx.ui.setStatus("pi-vimmode", "vim off");
}

function registerVimCommand(pi: ExtensionAPI, state: EditorState): void {
  pi.registerCommand("vimmode", {
    description: "Toggle pi-vimmode editor on/off",
    handler: async (args, ctx) => {
      const action = args.trim().toLowerCase() || "toggle";
      if (action === "status") {
        ctx.ui.notify(`pi-vimmode ${state.enabled ? "enabled" : "disabled"}`, "info");
        return;
      }
      if (action === "reload") {
        if (!(await state.config.refresh(ctx))) return;
        if (state.enabled) finishInstall(state, ctx);
        ctx.ui.notify(
          `pi-vimmode ${state.enabled ? "reloaded" : "config reloaded (disabled)"}`,
          "info",
        );
        return;
      }
      if (action !== "toggle" && action !== "on" && action !== "off") {
        ctx.ui.notify("Usage: /vimmode [on|off|toggle|status|reload]", "warning");
        return;
      }
      if (action === "on" || (action === "toggle" && !state.enabled)) {
        state.enabled = true;
        await installEditor(state, ctx, true);
      } else {
        disableEditor(state, ctx);
      }
      ctx.ui.notify(`pi-vimmode ${state.enabled ? "enabled" : "disabled"}`, "info");
    },
  });
}

export function registerVimLifecycle(
  pi: ExtensionAPI,
  dependencies: VimLifecycleDependencies = {},
): void {
  const state = createEditorState(dependencies);
  registerVimCommand(pi, state);
  pi.on("session_start", (_event, ctx) => installEditorSoon(state, ctx));
  pi.on("resources_discover", (_event, ctx) => installEditorSoon(state, ctx));
  pi.on("agent_start", () => {
    state.agentBusy = true;
    for (const editor of state.editors) editor.setAgentBusy(true);
  });
  pi.on("agent_end", (_event, ctx) => {
    state.agentBusy = false;
    for (const editor of state.editors) editor.setAgentBusy(false);
    observeInstall(installEditor(state, ctx), ctx);
  });
  pi.on("session_shutdown", (event) => {
    state.agentBusy = false;
    resetKnownEditors(state, {
      restoreHardwareCursorVisibility: event.reason !== "quit",
    });
  });
}
