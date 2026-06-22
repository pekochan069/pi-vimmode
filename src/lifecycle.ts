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

  const editorFactory: VimEditorFactory = (tui, theme, keybindings) => {
    const editor = createEditor(tui, theme, keybindings, currentOptions, currentDiagnostics, {
      onShutdown: currentShutdown,
    });
    editors.add(editor);
    if (agentBusy) editor.setAgentBusy(true);
    return editor as VimEditor;
  };

  const refreshOptions = (ctx: ExtensionContext) => {
    const loaded = loadOptions({ cwd: ctx.cwd });
    currentOptions = loaded.options;
    currentDiagnostics = { warnings: [...loaded.warnings] };
    ctx.ui.setStatus("pi-vimmode", loaded.warnings.length > 0 ? "vim ⚠" : "vim");
  };

  const installEditor = (ctx: ExtensionContext) => {
    if (!enabled) {
      ctx.ui.setStatus("pi-vimmode", "vim off");
      return;
    }
    refreshOptions(ctx);
    currentShutdown = () => ctx.shutdown();
    if (ctx.ui.getEditorComponent() !== editorFactory) {
      previousEditorFactory = ctx.ui.getEditorComponent();
      ctx.ui.setEditorComponent(editorFactory);
    }
  };

  const installEditorSoon = (ctx: ExtensionContext) => {
    installEditor(ctx);
    schedule(() => {
      try {
        installEditor(ctx);
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

  const enableEditor = (ctx: ExtensionContext) => {
    enabled = true;
    installEditor(ctx);
  };

  pi.registerCommand("vimmode", {
    description: "Toggle pi-vimmode editor on/off",
    handler: async (args, ctx) => {
      const action = args.trim().toLowerCase() || "toggle";
      if (action === "status") {
        ctx.ui.notify(`pi-vimmode ${enabled ? "enabled" : "disabled"}`, "info");
        return;
      }
      if (action !== "toggle" && action !== "on" && action !== "off") {
        ctx.ui.notify("Usage: /vimmode [on|off|toggle|status]", "warning");
        return;
      }

      if (action === "on" || (action === "toggle" && !enabled)) enableEditor(ctx);
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
    installEditor(ctx);
  });

  pi.on("session_shutdown", () => {
    agentBusy = false;
    resetKnownEditors();
  });
}
