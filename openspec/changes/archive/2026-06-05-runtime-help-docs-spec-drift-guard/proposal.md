## Why

pi-vimmode feature surface has grown across Ex commands, prompt transforms, keymap diagnostics, settings, and documentation, but users still lack a general runtime way to ask what is supported and what limits apply. Docs/spec/runtime drift has already caused stale claims such as `:nohlsearch` being documented as unsupported after source support existed, so this change adds source-backed runtime help plus validation that fails when docs contradict implementation contracts.

## What Changes

- Add finite read-only runtime help commands: `:help [topic]`, `:features [query]`, and `:messages`.
- Introduce a source-backed feature/help registry that reuses existing action, Ex command, protected shortcut, config, spec, and test anchors instead of copying prose into runtime handlers.
- Add docs/spec drift guard tests or scripts that validate feature docs, settings docs, and known stale-claim regressions against source-backed metadata and durable OpenSpec anchors.
- Update user-facing docs with runtime help workflows, feature matrix semantics, message introspection behavior, and explicit limits.
- Keep runtime output compact, prompt-local, and bounded by the existing transient message model unless a minimal capped message history is required for `:messages`.

Non-goals:

- No full Vim `:help` tag system, pager, help files, `.vimrc`, Vimscript, recursive mappings, Neovim Lua, or broad command palette.
- No runtime OpenSpec parser, test runner, or docs scraper inside the editor.
- No generated documentation replacing human-maintained `docs/features.md` or `docs/settings.md` in this change.
- No broad UI layout expansion beyond the existing bounded message row unless explicitly needed for a capped message summary.

## Capabilities

### New Capabilities

- `runtime-help-drift-guard`: finite runtime help, feature discovery, message introspection, and docs/spec/source drift validation for pi-vimmode.

### Modified Capabilities

- `vim-ex-command-line`: finite read-only Ex command support expands to `:help`, `:features`, and `:messages`.
- `vim-customization-diagnostics`: action/keymap/protected-shortcut metadata becomes reusable by broader feature/help discovery without changing existing `:actions`, `:keymap`, `:mapcheck`, or `:vimdoctor` contracts.
- `pi-vimmode-documentation`: feature/settings docs gain runtime help coverage and automated drift validation against source-backed metadata, OpenSpec specs, and tests.
- `vim-ui-configuration`: transient runtime messages may gain bounded introspection for `:messages` while preserving width-safe display and prompt viewport bounds.

## Impact

- Affected code seams: likely new `src/runtime-help.ts` or equivalent, plus `src/customization.ts`, `src/config.ts`, `src/ex.ts`, `src/modal/engine.ts`, `src/modal/types.ts`, `src/modal/view.ts`, `src/vim-editor.ts`, and possibly `src/render.ts` if message history/display needs view support.
- Tests affected: runtime help registry tests, docs drift guard tests, Ex parser tests, modal read-only command tests, visual Ex state preservation tests, and message rendering/view tests.
- Docs affected: `docs/features.md`, `docs/settings.md`, and possibly a compact ADR if the feature/help registry becomes a durable source-of-truth policy.
- Specs affected: new `runtime-help-drift-guard` spec plus deltas for Ex command-line, customization diagnostics, documentation, and UI message behavior.
- No new runtime dependencies expected. Dev-only validation should run through existing Bun/OpenSpec validation where practical.
- No breaking changes expected; new Ex commands are additive and docs guard failures only affect development validation.
