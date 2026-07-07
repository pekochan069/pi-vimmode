## 1. Adapter Cursor Policy

- [x] 1.1 Update `VimEditor.syncHardwareCursorVisibility` so agent-busy state preserves hardware cursor visibility when the current cursor style is `bar`.
- [x] 1.2 Keep agent-busy hardware cursor suppression for `block` and `underline` cursor styles.
- [x] 1.3 Confirm busy/idle transitions do not change prompt text, cursor position, Vim mode, or terminal cursor-shape writes.

## 2. Tests

- [x] 2.1 Update the existing live-editor busy cursor regression test so a `bar` cursor remains visible during agent work.
- [x] 2.2 Add or update live-editor coverage showing `block` or `underline` hardware cursors remain suppressed during agent work.
- [x] 2.3 Preserve lifecycle tests that prove `agent_start`, editor creation during busy state, `agent_end`, shutdown, and `/vimmode off` still broadcast/reset busy state correctly.

## 3. Documentation

- [x] 3.1 Update `docs/features.md` to describe the narrowed busy cursor policy: bar cursors stay visible; non-bar cursors are suppressed.

## 4. Validation

- [x] 4.1 Run `bun test`.
- [x] 4.2 Run `bun run check-types`.
- [x] 4.3 Run `bun run lint`.
- [x] 4.4 Run `bun run format:check`.
- [x] 4.5 Run `openspec validate --specs --strict`.
