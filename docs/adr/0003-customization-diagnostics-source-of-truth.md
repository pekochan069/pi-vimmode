# Customization diagnostics source of truth

pi-vimmode keeps runtime customization introspection in a small pure metadata/helper seam (`src/customization.ts`). That module is the source of truth for action descriptions used by `:actions`/`:keymap`, protected Pi shortcut explanations used by `:mapcheck`, and diagnostic summary wording used by `:vimdoctor`.

Settings names, defaults, parsing, preset merge order, and validation still live in `src/config.ts` and `src/types.ts`. Modal execution remains finite in `src/ex.ts` and `src/modal/engine.ts`; `src/customization.ts` describes and explains supported behavior but does not add arbitrary Vim grammar, recursive mappings, `.vimrc`, Vimscript, or Neovim Lua support.

Future docs or tests that mention protected shortcuts, action names, keymap diagnostics, or customization health should verify claims against `src/customization.ts`, `src/config.ts`, durable OpenSpec requirements, and focused tests before updating `docs/features.md` or `docs/settings.md`.
