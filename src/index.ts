import { type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { VimEditor } from "./vim-editor.ts";

export default function piVimMode(pi: ExtensionAPI) {
	const editorFactory = (tui: ConstructorParameters<typeof VimEditor>[0], theme: ConstructorParameters<typeof VimEditor>[1], keybindings: ConstructorParameters<typeof VimEditor>[2]) =>
		new VimEditor(tui, theme, keybindings);

	const installEditor = (ctx: ExtensionContext) => {
		if (ctx.ui.getEditorComponent() !== editorFactory) {
			ctx.ui.setEditorComponent(editorFactory);
		}
		ctx.ui.setStatus("pi-vimmode", "vim");
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

	pi.on("session_start", (_event, ctx) => {
		installEditorSoon(ctx);
	});

	pi.on("resources_discover", (_event, ctx) => {
		installEditorSoon(ctx);
	});

	pi.on("agent_end", (_event, ctx) => {
		installEditor(ctx);
	});
}
