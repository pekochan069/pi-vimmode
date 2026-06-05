## Context

`pi-vimmode` already has a thin-ish Pi adapter (`src/vim-editor.ts`) and a semantic modal boundary (`ModalState`, `EditorSnapshot`, `ModalEffect`, `ModalUpdate` in `src/modal/types.ts`). Recent search, Ex, prompt-transform, marks, registers, macro, redo, and customization work has concentrated feature-specific behavior back into `src/modal/engine.ts`, especially `applyCommand`, `executeExCommand`, `handleNormalInput`, and `handleVisualInput`.

The sprint should deepen the modal layer without changing the product boundary: practical prompt-local Vim editing inside Pi, not broad Vim/Neovim parity. The new inspectability surface should help users and maintainers see current prompt-local state without dumping prompt contents or moving Pi runtime calls into modal code.

## Goals / Non-Goals

**Goals:**

- Preserve the existing `VimEditor` adapter and `ModalEffect` contract while extracting feature-specific modal behavior into smaller modules.
- Add golden modal effect tests before risky refactors so state/effect contracts are locked independently of Pi runtime integration.
- Add read-only `:vimmode inspect` and `:messages` diagnostics for prompt-local state, render/workbench state, and recent bounded messages.
- Keep diagnostics finite, bounded, and state-preserving except for transient diagnostic/message display.
- Keep user-facing docs and OpenSpec aligned with the exact supported commands and inspect limits.

**Non-Goals:**

- No full Vimscript, recursive mappings, `.vimrc`, Neovim Lua, arbitrary Ex command dispatch, or full Vim parity.
- No `/vimmode inspect` command in this change; active-editor state is cleaner from an Ex command inside the current prompt editor.
- No settings, config propagation, or dependency changes. If implementation discovers a setting is required, it must update `src/config.ts`, `src/types.ts`, `VimEditor` `cloneOptions`, docs, and live editor tests in the same change.
- No full prompt text dumps, full register contents, mark-sensitive snippets, or raw macro token dumps in inspect/messages output.
- No changes to existing keybindings, prompt-edit behavior, Pi shortcut delegation, insert-mode default behavior, or render precedence except the new diagnostics.

## Decisions

### Decision: Split modal feature handlers behind the existing `ModalEffect` boundary

Target seams: `src/modal/engine.ts`, new `src/modal/normal.ts`, `src/modal/search.ts`, `src/modal/ex-command-line.ts`, `src/modal/visual.ts`, `src/modal/macros.ts`, shared `src/modal/effects.ts` or `src/modal/core.ts`, and `src/modal/types.ts`.

Keep `handleModalInput` as the top-level router/state coordinator, but move feature-specific semantics into pure modal feature modules that accept `ModalState`, `EditorSnapshot`, `ModalOptions`, diagnostics when needed, and input/parsed command data. Feature modules return `ModalUpdate` or smaller typed decisions converted into `ModalEffect` by the modal layer. They must not call Pi APIs, mutate terminal state, read settings files, or render TUI output directly.

Side effects stay explicit through existing state/effects: registers and named registers are updated only by modal/buffer decisions; marks stay in modal state; dot-repeat changes only for existing repeatable edit paths; search highlights clear/persist according to existing Ex/search rules; visual state is preserved/restored through current capture rules; cursor placement remains owned by `EditResult`/`restoreCursor`; Pi delegation remains an adapter effect.

Alternatives considered:

- Keep adding helpers inside `src/modal/engine.ts`: rejected because long handlers would remain the review and regression hotspot.
- Split by raw key families: rejected because configurable keymaps and semantic parser results mean behavior belongs to feature/action families, not physical keys.
- Introduce a new adapter API: rejected because `ModalEffect` already names adapter responsibilities and keeps `VimEditor` thin.

### Decision: Add golden effect tests before and during extraction

Target seams: `test/modal-effects.test.ts` or focused additions to `test/modal.test.ts`, plus normalization helpers for `ModalUpdate` snapshots.

Create sequence-driven tests that feed `ModalState`, `EditorSnapshot`, options, and input keys into modal handlers, apply edit/restore effects to a local text/cursor model when necessary, and assert normalized state/effect output. Cover high-risk existing behavior first: prompt search (`/`, `?`, `n`, `N`, empty query recall, operator-search), Ex command-line entry/cancel/history/preview/apply/errors, visual char/line/block operations, macro record/play/replay guards, protected Pi delegation, transient messages, and search-highlight/render-preview state.

Normalize snapshots to stable semantics: effect type/order, changed text/cursor/register type, message kind/text, preview range counts, and relevant state flags. Avoid ANSI render strings except in existing render-specific tests.

Alternatives considered:

- Rely on existing adapter integration tests: rejected because they are too broad to localize feature-module regressions.
- Snapshot entire modal state raw: rejected because it would be brittle around unrelated history arrays, preview text, or future metadata.
- Refactor first then write tests: rejected because current behavior is the contract the sprint must preserve.

### Decision: Implement inspectability as prompt-local Ex diagnostics first

Target seams: `src/ex.ts`, `src/modal/inspect.ts`, `src/modal/types.ts`, `src/modal/view.ts`, `src/vim-editor.ts`, `docs/features.md`.

Add a finite diagnostic parse path for `:vimmode inspect` and `:messages`. `:vimmode inspect` produces a compact snapshot derived from current `ModalState`, `EditorSnapshot`, resolved options/diagnostics, and render/workbench facts the adapter can safely provide. `:messages` renders recent bounded messages from a new message log that is separate from the existing single `exMessage` transient row.

Inspect output should summarize:

- mode: mode, pending operator/key family, pending register/mark/macro/search/Ex state, block insert summary;
- cursor: zero-based internal line/column plus user-facing line/column if useful;
- selection: visual kind, anchor/cursor, line/char/block summary;
- registers: slots present, register type, length/line count, short preview only when safe and bounded;
- marks: mark slots and positions, not prompt content;
- macros: recording slot, last played slot, stored slots, token counts;
- search: last query direction/matcher, pending query length/direction, highlight presence, history count;
- Ex/workbench/messages: pending Ex command length/source mode, preview match count, transient message, message-log count;
- render: visual render active, search/substitution highlight active, workbench row active, cursor style, terminal width/row summary when available.

Alternatives considered:

- Add `/vimmode inspect`: rejected for v1 because lifecycle command state does not naturally expose active prompt editor internals without new editor tracking plumbing.
- Reuse only `exMessage` for `:messages`: rejected because `exMessage` is one transient row, not history.
- Dump raw state as JSON: rejected because it risks leaking large prompt content and creates a brittle user-facing contract.

### Decision: Keep the message log bounded and diagnostic-oriented

Target seams: `ModalState`, `src/modal/messages.ts` or `src/modal/inspect.ts`, `src/vim-editor.ts`, tests.

Add a bounded in-memory message log to modal/editor state for diagnostics and meaningful Ex/search/customization events. Existing transient `exMessage` remains the workbench row source for immediate feedback. The message log records compact entries with kind, source, text, and optional count/preview metadata. It should not log every keystroke, full prompt text, raw register text, or macro replay token stream.

The implementation should choose a small fixed cap in code for v1 rather than adding settings. If later users need configuration, that must be a separate settings-backed change.

Alternatives considered:

- Store messages globally in lifecycle state: rejected because messages are prompt-editor-local and should not outlive editor sessions unexpectedly.
- Add configurable message retention now: rejected because settings propagation would expand scope and testing.
- Let `:messages` clear or filter logs in v1: rejected; read-only display is enough for first inspectability pass.

### Decision: Preserve render/workbench precedence and expose summaries, not new render surfaces

Target seams: `src/vim-editor.ts`, `src/render.ts`, `src/modal/view.ts`, `src/modal/inspect.ts`.

`renderWorkbenchRow()` currently chooses pending search, Ex preview message, pending Ex command, then transient `exMessage`. Keep that precedence. Inspect should report whether those layers are active; it should not add another always-visible row or change prompt viewport math beyond existing transient message behavior. Existing visual selection, search highlight, cursor style, width truncation, and substitution match preview precedence remain source of truth.

Alternatives considered:

- Add a permanent multi-line inspect panel: rejected because it would change editor viewport behavior and create layout complexity unrelated to architecture runway.
- Render inspect through status items: rejected because status is configurable and should stay concise.
- Change search/render precedence while adding inspect: rejected because this sprint should preserve behavior and make it easier to diagnose later changes.

## Risks / Trade-offs

- Refactor changes hidden behavior in long modal handlers → Add golden effect tests before moving code and keep extraction incremental by feature family.
- Feature modules create import cycles → Put shared helpers/effect constructors in a small core module imported by feature modules; avoid feature modules importing each other.
- Inspect output becomes a second behavior source of truth → Derive output from existing state/options and keep specs focused on bounded summaries, not exact raw internal shapes.
- Message log floods or leaks prompt content → Fixed cap, event-level logging, bounded previews, no full prompt/register/macro dumps.
- `:messages` conflicts with transient Ex row semantics → Keep `exMessage` for current feedback; message log is separate history displayed only on command.
- Future settings desire expands scope → Do not add settings in this change; if unavoidable, update config/types/cloneOptions/docs/live tests together.
- Docs imply broader Vim diagnostics than supported → Document exact `:vimmode inspect` and `:messages` syntax and non-goals in `docs/features.md`.

## Migration Plan

1. Add golden modal effect tests for existing search, Ex, visual, macro, register/mark, protected shortcut, and message/highlight behavior.
2. Add inspect/message types and pure formatters without exposing commands; test bounded redaction and summaries.
3. Add message-log helpers and wire selected diagnostic/error/success events while preserving `exMessage` behavior.
4. Refactor `src/modal/engine.ts` feature family by feature family into focused modules, running golden tests after each move.
5. Extend `src/ex.ts` and modal execution to support `:vimmode inspect` and `:messages` as finite read-only diagnostics.
6. Add adapter smoke tests for live editor construction, render/workbench row preservation, and inspect access through actual Ex input.
7. Update `docs/features.md` with inspect/messages syntax, output scope, redaction, and limitations.
8. Validate with `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback strategy: because this change adds no settings, dependencies, data files, or migration state, rollback is code-only. Revert feature-module extraction and inspect/message command wiring while keeping any useful golden tests that still describe existing behavior.

## Open Questions

- Should the first `:messages` view include only diagnostic commands/errors/successes, or also protected shortcut/no-op feedback when enabled?
- What exact fixed message cap should v1 use: 20, 50, or another small value?
- Should inspect register previews show any text at all, or only type and length/line count?
- Should render summary live in `VimEditor` and be passed into inspect formatting, or can it be derived from state/options without adapter data for v1?
