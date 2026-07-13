import { type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";

import type { ResolvedVimEditorOptions, VimDiagnostics } from "./types.ts";

import {
  DEFAULT_VIM_OPTIONS,
  loadVimOptions,
  type VimConfigLoadResult,
  type VimConfigPaths,
} from "./config.ts";
import { VimEditor } from "./vim-editor.ts";

type VimEditorFactory = (
  tui: ConstructorParameters<typeof VimEditor>[0],
  theme: ConstructorParameters<typeof VimEditor>[1],
  keybindings: ConstructorParameters<typeof VimEditor>[2],
) => VimEditor;

/** Callback type for shutdown requests from VimEditor. */
export type VimShutdownCallback = () => void;

type EditorComponentFactory = ReturnType<ExtensionContext["ui"]["getEditorComponent"]>;

type TrackedEditor = Pick<VimEditor, "resetTerminalCursorStyle" | "setAgentBusy">;

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
  loadOptions?: (paths: VimConfigPaths) => VimConfigLoadResult;
  createEditor?: CreateEditor;
  schedule?: Schedule;
};

export function registerVimLifecycle(
  pi: ExtensionAPI,
  dependencies: VimLifecycleDependencies = {},
) {
  let currentOptions = dependencies.defaultOptions ?? DEFAULT_VIM_OPTIONS;
  let currentDiagnostics: VimDiagnostics = { warnings: [] };
  let currentShutdown: (() => void) | undefined;
  let enabled = true;
  let agentBusy = false;
  let previousEditorFactory: EditorComponentFactory;
  const editors = new Set<TrackedEditor>();
  const loadOptions = dependencies.loadOptions ?? loadVimOptions;
  const createEditor =
    dependencies.createEditor ??
    ((tui, theme, keybindings, options, diagnostics, vimOptions) =>
      new VimEditor(tui, theme, keybindings, options, diagnostics, vimOptions));
  const schedule = dependencies.schedule ?? ((callback) => setTimeout(callback, 0));

  const VIM_FACTORY_MARKER = Symbol("pi-vimmode:factory");

  const editorFactory: VimEditorFactory = (tui, theme, keybindings) => {
    const editor = createEditor(tui, theme, keybindings, currentOptions, currentDiagnostics, {
      onShutdown: currentShutdown,
    });
    editors.add(editor);
    if (agentBusy) editor.setAgentBusy(true);
    return editor as VimEditor;
  };
  (editorFactory as unknown as Record<symbol, unknown>)[VIM_FACTORY_MARKER] = true;

  const applyLoadedOptions = (ctx: ExtensionContext, loaded: VimConfigLoadResult) => {
    currentOptions = loaded.options;
    currentDiagnostics = { warnings: [...loaded.warnings] };
    ctx.ui.setStatus("pi-vimmode", loaded.warnings.length > 0 ? "vim ⚠" : "vim");
  };

  const refreshOptions = (ctx: ExtensionContext): boolean | Promise<boolean> => {
    try {
      const loaded = loadOptions({ cwd: ctx.cwd });
      if (loaded instanceof Promise) {
        return loaded.then((result) => {
          applyLoadedOptions(ctx, result);
          return true;
        });
      }
      applyLoadedOptions(ctx, loaded);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      applyLoadedOptions(ctx, {
        options: currentOptions,
        warnings: [`global JS config: failed to load (${message})`],
      });
      return true;
    }
  };

  /** Walk Symbol-keyed factory chain up to 10 hops, check if vimmode marker present. */
  function factoryChainContainsVim(factory: EditorComponentFactory): boolean {
    const seen = new Set<EditorComponentFactory>();
    let current: unknown = factory;
    let hops = 0;

    while (
      typeof current === "function" &&
      hops < 10 &&
      !seen.has(current as EditorComponentFactory)
    ) {
      seen.add(current as EditorComponentFactory);
      if ((current as unknown as Record<symbol, unknown>)[VIM_FACTORY_MARKER] === true) return true;

      // Duck-type foreign wrapper symbols: follow any Symbol-keyed function-valued property
      const symbols = Object.getOwnPropertySymbols(current);
      let next: unknown = null;
      for (const sym of symbols) {
        const val: unknown = (current as unknown as Record<symbol, unknown>)[sym];
        if (typeof val === "function" && val !== current) {
          next = val;
          break;
        }
      }
      current = next;
      hops++;
    }
    return false;
  }

  const finishInstall = (ctx: ExtensionContext) => {
    currentShutdown = () => ctx.shutdown();
    if (!factoryChainContainsVim(ctx.ui.getEditorComponent())) {
      previousEditorFactory = ctx.ui.getEditorComponent();
      ctx.ui.setEditorComponent(editorFactory);
    }
  };

  const installEditor = (ctx: ExtensionContext): void | Promise<void> => {
    if (!enabled) {
      ctx.ui.setStatus("pi-vimmode", "vim off");
      return;
    }
    const refreshed = refreshOptions(ctx);
    if (refreshed instanceof Promise) return refreshed.then(() => finishInstall(ctx));
    finishInstall(ctx);
  };

  const installEditorSoon = (ctx: ExtensionContext) => {
    void installEditor(ctx);
    schedule(() => {
      try {
        void installEditor(ctx);
      } catch {
        // Context can go stale during reload/session switch. Next session_start will reinstall.
      }
    });
  };

  const setKnownEditorsAgentBusy = (active: boolean) => {
    agentBusy = active;
    for (const editor of editors) editor.setAgentBusy(active);
  };

  const resetKnownEditors = () => {
    for (const editor of editors) editor.resetTerminalCursorStyle();
    editors.clear();
  };

  const disableEditor = (ctx: ExtensionContext) => {
    enabled = false;
    agentBusy = false;
    resetKnownEditors();
    if (ctx.ui.getEditorComponent() === editorFactory) {
      ctx.ui.setEditorComponent(previousEditorFactory);
    }
    ctx.ui.setStatus("pi-vimmode", "vim off");
  };

  const enableEditor = (ctx: ExtensionContext): void | Promise<void> => {
    enabled = true;
    return installEditor(ctx);
  };

  pi.registerCommand("vimmode", {
    description: "Toggle pi-vimmode editor on/off",
    handler: async (args, ctx) => {
      const action = args.trim().toLowerCase() || "toggle";
      if (action === "status") {
        ctx.ui.notify(`pi-vimmode ${enabled ? "enabled" : "disabled"}`, "info");
        return;
      }
      if (action === "reload") {
        const refreshed = refreshOptions(ctx);
        if (refreshed instanceof Promise) await refreshed;
        if (enabled) finishInstall(ctx);
        ctx.ui.notify(`pi-vimmode ${enabled ? "reloaded" : "config reloaded (disabled)"}`, "info");
        return;
      }
      if (action !== "toggle" && action !== "on" && action !== "off") {
        ctx.ui.notify("Usage: /vimmode [on|off|toggle|status|reload]", "warning");
        return;
      }

      if (action === "on" || (action === "toggle" && !enabled)) await enableEditor(ctx);
      else disableEditor(ctx);

      ctx.ui.notify(`pi-vimmode ${enabled ? "enabled" : "disabled"}`, "info");
    },
  });

  pi.on("session_start", (_event, ctx) => {
    installEditorSoon(ctx);
  });

  pi.on("resources_discover", (_event, ctx) => {
    installEditorSoon(ctx);
  });

  pi.on("agent_start", () => {
    setKnownEditorsAgentBusy(true);
  });

  pi.on("agent_end", (_event, ctx) => {
    setKnownEditorsAgentBusy(false);
    void installEditor(ctx);
  });

  pi.on("session_shutdown", () => {
    agentBusy = false;
    resetKnownEditors();
  });
}
