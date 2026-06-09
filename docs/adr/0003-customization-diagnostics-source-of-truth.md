# Customization diagnostics source of truth

pi-vimmode keeps runtime customization introspection in small pure metadata/helper seams. `src/customization.ts` is the source of truth for diagnostic formatting, protected Pi shortcut explanations used by `:mapcheck`, and diagnostic summary wording used by `:vimdoctor`. Prompt transform action metadata, argument validation, docs anchors, and bindable action IDs live in `src/prompt-transform-actions.ts`; `src/customization.ts` imports that registry when rendering `:actions` and `:keymap` output.

Settings names, defaults, parsing, preset merge order, and validation still live in `src/config.ts` and `src/types.ts`. Modal execution remains finite in `src/ex.ts` and `src/modal/engine.ts`; `src/customization.ts` and `src/prompt-transform-actions.ts` describe and explain supported behavior but do not add arbitrary Vim grammar, recursive mappings, `.vimrc`, Vimscript, or Neovim Lua support.

Future docs or tests that mention protected shortcuts, action names, keymap diagnostics, or customization health should verify claims against `src/prompt-transform-actions.ts` for prompt transform action metadata, `src/customization.ts` for diagnostics formatting/protected shortcuts, `src/config.ts` for settings behavior, durable OpenSpec requirements, and focused tests before updating `docs/features.md` or `docs/settings.md`.
