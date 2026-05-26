import { type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";

import type { VimEditorOptions } from "./types.ts";

import { DEFAULT_VIM_OPTIONS, loadVimOptions } from "./config.ts";
import { VimEditor } from "./vim-editor.ts";

export default function piVimMode(pi: ExtensionAPI) {
  let currentOptions: VimEditorOptions = DEFAULT_VIM_OPTIONS;
  const editors = new Set<VimEditor>();

  const editorFactory = (
    tui: ConstructorParameters<typeof VimEditor>[0],
    theme: ConstructorParameters<typeof VimEditor>[1],
    keybindings: ConstructorParameters<typeof VimEditor>[2],
  ) => {
    const editor = new VimEditor(tui, theme, keybindings, currentOptions);
    editors.add(editor);
    return editor;
  };

  const refreshOptions = (ctx: ExtensionContext) => {
    const loaded = loadVimOptions({ cwd: ctx.cwd });
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
    setTimeout(() => {
      try {
        installEditor(ctx);
      } catch {
        // Context can go stale during reload/session switch. Next session_start will reinstall.
      }
    }, 0);
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
