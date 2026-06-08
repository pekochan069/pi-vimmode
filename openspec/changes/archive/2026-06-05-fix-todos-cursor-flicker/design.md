## Context

`VimEditor` currently snapshots Pi TUI's original hardware cursor visibility, writes DECSCUSR cursor-shape hints, and calls `setShowHardwareCursor(true)` whenever the effective cursor style is `bar`. This fixed invisible bar cursors, but it also means Pi's `positionHardwareCursor()` shows a real blinking terminal cursor at every render that includes `CURSOR_MARKER`.

During agent work, assistant/tool components render frequently while the prompt editor can still be focused and can still emit `CURSOR_MARKER`. A visible hardware cursor therefore blinks or appears to flicker near the prompt even though the user is not actively editing. Pi's default editor mostly avoids this by keeping the hardware cursor hidden unless IME positioning needs it.

Relevant seams:

- `src/vim-editor.ts` owns runtime terminal writes and Pi TUI hardware cursor calls.
- `src/lifecycle.ts` already tracks created editors, resets cursor styles on shutdown, and receives `agent_end`; Pi extension events also include `agent_start`.
- `src/render.ts` emits fake cursor cells and `CURSOR_MARKER` in custom prompt renders and post-processes Pi's default render output.
- `test/vim-editor.test.ts`, `test/lifecycle.test.ts`, and `test/render.test.ts` already cover cursor shape, visibility, and width safety.

## Goals / Non-Goals

**Goals:**

- Suppress visible hardware cursor flicker while agent work is running.
- Preserve visible `bar` cursor behavior during interactive prompt editing.
- Keep `block` and `underline` fake cursor render paths unchanged except for visibility policy side effects.
- Keep terminal cursor style and hardware visibility reset safe on `agent_start`, `agent_end`, `/vimmode off`, and `session_shutdown`.
- Add regression tests before marking the `TODOS.md` flicker item complete.

**Non-Goals:**

- No full Neovim `guicursor`/blink timing parity.
- No terminal-specific cursor negotiation beyond existing DECSCUSR best-effort hints.
- No modal behavior, prompt text, register, mark, macro, search, Ex, or dot-repeat changes.
- No new settings unless implementation proves an internal busy/idle policy is insufficient.

## Decisions

### 1. Gate hardware cursor visibility by agent busy state in `VimEditor`

Target seams: `src/vim-editor.ts`, `test/vim-editor.test.ts`.

Add a small runtime policy to `VimEditor`:

- Track whether agent work is active (`agentBusy` or equivalent).
- Keep `lastTerminalCursorStyle` for shape-write dedupe.
- Compute desired hardware visibility as `false` while busy; otherwise `true` only when the current style needs the real hardware cursor (`bar`) or the original Pi visibility was already true.
- Expose a small method such as `setAgentBusy(active: boolean)` for lifecycle to call. The method reapplies the visibility policy without changing prompt text or modal state.
- Keep `resetTerminalCursorStyle()` restoring original visibility and reset shape escape.

Rationale: `VimEditor` already owns Pi runtime calls and cursor side effects, so this keeps the modal engine and render helpers pure.

Alternatives rejected:

- Change `renderCursorCell("bar")` to a glyph-only fake bar and never show the hardware cursor. Rejected because previous documented solution found fake bar styling insufficient and glyph replacement can disturb character preservation/width expectations.
- Remove `CURSOR_MARKER` during agent work. Rejected because focus/render state belongs to Pi TUI and removing markers risks IME/cursor positioning regressions in other modes.
- Add a user setting first. Rejected because the flicker has one preferred safe default; settings can come later if terminals differ.

### 2. Drive busy/idle from lifecycle `agent_start` and `agent_end`

Target seams: `src/lifecycle.ts`, `test/lifecycle.test.ts`.

Widen tracked editor shape from reset-only to cursor-lifecycle methods. On `agent_start`, call `setAgentBusy(true)` on every tracked editor. On `agent_end`, call `setAgentBusy(false)` before or during the existing install path so newly interactive prompts restore the current cursor policy. On shutdown or disable, reset tracked editors as today.

Rationale: lifecycle already tracks editor instances and is the only module listening to Pi agent events. This avoids adding Pi event knowledge to `VimEditor` or the modal engine.

Alternatives rejected:

- Reinstall/replace the editor on `agent_start`. Rejected: component churn can drop prompt state and violates existing stable-factory behavior.
- Rely only on focus changes. Rejected: the reported flicker can occur while the editor remains the focused component, and focus transitions are owned by Pi TUI internals.
- Use `before_agent_start`. Rejected for now because `agent_start` is enough for visible streaming/tool work and avoids suppressing cursor during preflight handlers that may still interact with prompt UI.

### 3. Preserve render width safety and docs source-of-truth

Target seams: `src/render.ts`, `test/render.test.ts`, `docs/features.md`, `TODOS.md`.

Prefer no render output change. If implementation requires a fallback fake cursor adjustment, keep `visibleWidth(renderCursorCell(...)) === 1`, keep underlying character preservation, and keep `CURSOR_MARKER` placement unchanged. Document only observable user-facing cursor behavior, not internal lifecycle plumbing. Mark `TODOS.md` complete only after validation passes.

Alternatives rejected:

- Document flicker as terminal limitation. Rejected because Pi lifecycle gives enough signal to suppress it without changing user workflow.
- Update README as full behavior reference. Rejected because current source-of-truth hierarchy keeps detailed behavior in `docs/features.md` and settings in `docs/settings.md`.

## Risks / Trade-offs

- Agent event ordering differs from expectation → Mitigate with lifecycle tests for `agent_start` before any editor exists, existing editors, new editor creation after busy state, `agent_end`, and shutdown.
- Hardware cursor remains hidden after a failed or interrupted agent turn → Mitigate by restoring on `agent_end`, resetting on `session_shutdown`, and keeping `/vimmode off` reset behavior.
- Bar cursor becomes less visible during a small window before `agent_end` → Acceptable because user is not actively editing during agent work; prompt interactivity resumes after `agent_end` restores policy.
- Original Pi hardware cursor visibility was true → Mitigate by preserving original visibility outside busy suppression and restoring it on reset.
- Terminal writes churn or flicker worse due redundant show/hide calls → Mitigate by retaining current visibility checks before calling `setShowHardwareCursor()` and shape-write dedupe.

## Migration Plan

1. Add focused tests for `VimEditor` busy/idle visibility policy while `insert` uses `bar`, including original visibility true/false cases and reset behavior.
2. Extend lifecycle tracking and tests for `agent_start`, `agent_end`, shutdown, delayed install, and `/vimmode off`.
3. Implement the minimal adapter/lifecycle changes.
4. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.
5. Update `TODOS.md` after validation passes.

Rollback: revert this change. It only affects extension runtime cursor visibility and docs; no data migration or persisted setting migration is required.

## Open Questions

- If a future Pi version exposes a direct "prompt input disabled" or "agent busy" editor prop, should pi-vimmode switch from lifecycle calls to that source? Current plan stays on public lifecycle events.
- If a terminal still flickers with busy suppression, should a later change add an opt-in `piVimMode.cursor.hardwareCursor` policy? Not part of this change unless validation proves necessary.
