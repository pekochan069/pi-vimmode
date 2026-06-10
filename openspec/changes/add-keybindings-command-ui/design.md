## Context

pi-vimmode already has read-only popup infrastructure for `:help`, `:features`, `:actions`, `:keymap`, `:mapcheck`, `:messages`, `:vimdoctor`, and `:vimmode inspect`. Keybinding discovery currently exists indirectly through `:features keybindings`, and detailed lookup is split across `:keymap`, `:actions`, and `:mapcheck`.

The new work should make keybinding discovery direct: `:keybindings` lists effective bindings, `:keybindings <query>` shows a focused detail view, and users can configure a normal-mode keybinding to open that same popup. Existing product constraints still apply: practical prompt editing, finite Ex commands, no Vimscript, no runtime mapping, no command palette, no diagnostic/help `vimmode.*` keybinding dispatch.

Relevant implementation patterns already exist in the codebase:

- `src/keybinding-discovery-popup.ts` builds source-backed popup content and scroll state.
- `src/keybinding-discovery-overlay.ts` renders bounded width-safe local-scroll overlay UI.
- `src/ex.ts` parses finite read-only Ex commands explicitly.
- `src/modal/ex-command-line.ts` restores normal/visual source mode and emits popup effects.
- `src/customization.ts` owns effective keymap/action/protected-shortcut metadata.
- `src/diagnostic-actions.ts` keeps `vimmode.*` discovery metadata non-bindable.
- `src/config.ts`, `src/types.ts`, and `src/commands.ts` already resolve semantic keymaps and configured command bindings.

## Goals / Non-Goals

**Goals:**

- Add `:keybindings` as an obvious dedicated read-only Ex command.
- Add `:keybindings <query>` for detail output across categories, action IDs, descriptions, current keys, Ex commands, and protected shortcuts.
- Show output in the same read-only popup UI as `:help` and diagnostics.
- Preserve prompt text, cursor, registers, marks, macros, search state, visual state, dot-repeat, resolved options, retained diagnostics, and message history except for existing successful Ex history semantics.
- Add an optional normal-mode semantic keymap command that opens the same popup and defaults to unbound.
- Keep all output finite, source-backed, and aligned with docs/spec/test drift guards.

**Non-Goals:**

- No runtime `:map`, `:nmap`, `:verbose map`, recursive mappings, `.vimrc`, Vimscript, Neovim Lua, or command palette.
- No default keybinding for keybinding discovery.
- No user keybinding dispatch for metadata-only IDs like `vimmode.help`, `vimmode.keymap`, or `vimmode.actions`.
- No persistent keybinding editor UI; configuration remains through `piVimMode` settings.
- No insert-mode shortcut capture for this command.

## Decisions

### Decision 1: Add explicit `keybindings` Ex command, not alias-only `:features keybindings`

Target seams: `src/ex.ts`, `src/modal/ex-command-line.ts`, `src/keybinding-discovery-popup.ts`, `src/runtime-help.ts`, docs/tests.

`keybindings` becomes a first-class finite parser command with optional query text. Internally it can reuse existing popup builders and customization metadata, but it should parse as its own read-only command so users can discover and document it directly.

Alternatives considered:

- Keep only `:features keybindings`: rejected because the user asked for `:keybindings`, and the current indirection is the discoverability problem.
- Add `:help keybindings`: rejected because existing docs note keybindings are not a help topic; widening `:help` risks implying Vim help tags.
- Implement broad `:map`: rejected because it implies runtime mapping, recursive mapping semantics, and Vim parity outside product scope.

### Decision 2: Build a dedicated keybinding catalog helper from existing metadata

Target seams: `src/customization.ts`, `src/keybinding-discovery-popup.ts`, `src/diagnostic-actions.ts`.

Add helper(s) that format a catalog from `actionEntriesForKeymap`, `PROTECTED_SHORTCUTS`, accepted prompt transform action bindings, and diagnostic/help metadata. Summary output groups finite binding categories. Query output returns focused matching rows and can mention protected shortcut ownership. Metadata-only diagnostic/help actions remain visible as non-bindable discovery entries, not configurable keybinding targets.

Alternatives considered:

- Reuse `keymapMessage()` unchanged: rejected because it returns compact counts or one best match, not all bindings or richer detail.
- Duplicate action/key/protected metadata in popup code: rejected because it creates docs/runtime drift and stale binding risk.
- Read settings files at command time: rejected because diagnostics should use effective resolved options retained by the current editor instance.

### Decision 3: Reuse read-only popup effect and overlay component

Target seams: `src/keybinding-discovery-popup.ts`, `src/keybinding-discovery-overlay.ts`, `src/modal/ex-command-line.ts`, `src/vim-editor.ts`.

`keybindingsPopup(...)` should return the existing `ReadOnlyPopup` shape and be opened through the existing `openReadOnlyPopup` modal effect. The overlay owns width fitting, row caps, local `j`/`k`/arrow scrolling, and close controls.

Alternatives considered:

- Render keybindings in the Ex row: rejected because all keybindings need multi-line content and the project already moved read-only help to real overlays.
- Add a new overlay component: rejected unless current component cannot support required titles/lines; duplication would increase UI drift.
- Mutate editor render rows for fake popup behavior: rejected by existing solution guidance and user request for popup UI like `:help`.

Side effects: opening, scrolling, and dismissing the popup must not edit prompt text, move prompt cursor, update registers, marks, macros, search highlights/query, dot-repeat, resolved options, retained diagnostics, or retained messages. Source-mode restoration follows existing read-only Ex behavior: normal returns normal; visual restores source visual mode, anchor, cursor, and highlight while opening the popup.

### Decision 4: Add configurable semantic command `showKeybindings`

Target seams: `src/types.ts`, `src/config.ts`, `src/commands.ts`, `src/modal/engine.ts`, `src/vim-editor.ts` clone/live tests, docs/settings.

Add a `VimCommandAction` such as `showKeybindings` with default `[]`. When configured under `piVimMode.keymap.commands.showKeybindings`, normal mode opens the same keybindings popup as `:keybindings`. The command should use existing command resolution, pending-prefix, protected-shortcut, conflict, and warning behavior. Insert mode keeps delegating to Pi. Visual behavior should either be unsupported/no-op unless explicitly specified, or mirror read-only popup opening while preserving selection; M1 should prefer normal-mode only if that keeps scope tighter.

Alternatives considered:

- Bind metadata ID `vimmode.keybindings` through `piVimMode.keymap.actions`: rejected because `keymap.actions` is only for `prompt.transform.*` prompt transforms, and `vimmode.*` metadata remains non-bindable.
- Add new `piVimMode.keybindings.shortcut` option family: rejected because existing semantic keymap infrastructure already solves validation, conflicts, and live editor propagation.
- Add a default key: rejected because any default key risks stealing an existing Vim action or Pi shortcut.

Config propagation risk: adding a command action requires updating `src/types.ts`, default keymap clone/merge code in `src/config.ts`, conflict resolution, `VimEditor` option cloning, and live editor tests. Missing any of these can make `:keybindings` work while configured shortcuts silently fail.

### Decision 5: Treat `:keybindings <query>` as a detail search, not an editor

Target seams: `src/customization.ts`, `src/keybinding-discovery-popup.ts`, docs/tests.

The query should search across normalized key strings, action IDs, action kind/category, descriptions, aliases, Ex command names, diagnostic/help metadata IDs, and protected shortcut keys/reasons. It returns bounded detailed popup lines. If no match exists, it shows a finite no-match row in the popup. It does not edit settings, create mappings, or offer an interactive rebind flow.

Alternatives considered:

- Open a keybinding editor: rejected as persistent settings UI and beyond current architecture.
- Only support exact key lookup: rejected because users also need action/category searches such as `redo`, `motion`, `prompt.transform.reflow`, or `ctrl+p`.
- Return unbounded full JSON: rejected because popup output must be readable and width-safe.

## Risks / Trade-offs

- Config command added in one layer but not another → mitigation: update types/default keymap/clone/merge/command resolver/modal dispatch together, plus config and live editor tests.
- `:keybindings` output duplicates or contradicts `:keymap` / `:actions` → mitigation: use shared `actionEntriesForKeymap`, `PROTECTED_SHORTCUTS`, and diagnostic action registry.
- Query output becomes too long for popup → mitigation: bounded lines with summary/count and local scroll; tests for row cap/width safety already exist.
- Users infer runtime mapping support from command name → mitigation: docs and popup include non-goals: no runtime `:map`, no recursive mappings, no command palette, no metadata action keybinding dispatch.
- Read-only popup accidentally mutates modal state → mitigation: reuse existing `openReadOnlyPopup` path and add modal/adapter tests for normal and visual source modes plus popup-local scrolling.
- `showKeybindings` configured key conflicts with grammar prefixes → mitigation: rely on existing keymap conflict/prefix-shadow validation and `:vimdoctor`/`:mapcheck` warning surfaces.

## Migration Plan

1. Add source-backed catalog/detail helpers and tests without changing parser behavior.
2. Add finite `:keybindings` parser and read-only popup execution.
3. Add optional semantic command binding and live editor propagation tests.
4. Update runtime help, diagnostic metadata, docs, and drift guard tests.
5. Validate with `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback is simple: remove the new Ex command, catalog helper, semantic command, docs/spec deltas, and tests. Existing `:features keybindings`, `:keymap`, and `:actions` behavior remains the fallback discovery path.

## Open Questions

- Should configured `showKeybindings` open from visual modes too, preserving the selection, or be normal-mode only in M1? Recommended default: normal-mode only unless implementation can reuse existing visual read-only restoration safely.
- Should `:keybindings` replace or complement `:features keybindings` in docs? Recommended: complement; keep old entry point working for compatibility and recipes, but promote `:keybindings` as the direct UI.
