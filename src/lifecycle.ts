import { type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";

import type { ResolvedVimEditorOptions } from "./types.ts";

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

type TrackedEditor = Pick<VimEditor, "resetTerminalCursorStyle">;

type CreateEditor = (
  tui: ConstructorParameters<typeof VimEditor>[0],
  theme: ConstructorParameters<typeof VimEditor>[1],
  keybindings: ConstructorParameters<typeof VimEditor>[2],
  options: ResolvedVimEditorOptions,
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
  const editors = new Set<TrackedEditor>();
  const loadOptions = dependencies.loadOptions ?? loadVimOptions;
  const createEditor =
    dependencies.createEditor ??
    ((tui, theme, keybindings, options) => new VimEditor(tui, theme, keybindings, options));
  const schedule = dependencies.schedule ?? ((callback) => setTimeout(callback, 0));

  const editorFactory: VimEditorFactory = (tui, theme, keybindings) => {
    const editor = createEditor(tui, theme, keybindings, currentOptions);
    editors.add(editor);
    return editor as VimEditor;
  };

  const refreshOptions = (ctx: ExtensionContext) => {
    const loaded = loadOptions({ cwd: ctx.cwd });
    currentOptions = loaded.options;
    ctx.ui.setStatus("pi-vimmode", loaded.warnings.length > 0 ? "vim ⚠" : "vim");
  };

  const installEditor = (ctx: ExtensionContext) => {
    refreshOptions(ctx);
    if (ctx.ui.getEditorComponent() !== editorFactory) {
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

  const resetKnownEditors = () => {
    for (const editor of editors) editor.resetTerminalCursorStyle();
    editors.clear();
  };

  pi.on("session_start", (_event, ctx) => {
    installEditorSoon(ctx);
  });

  pi.on("resources_discover", (_event, ctx) => {
    installEditorSoon(ctx);
  });

  pi.on("agent_end", (_event, ctx) => {
    installEditor(ctx);
  });

  pi.on("session_shutdown", () => {
    resetKnownEditors();
  });
}
