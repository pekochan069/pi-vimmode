## 1. VimEditor Cursor Reset

- [x] 1.1 Add focused `test/vim-editor.test.ts` coverage proving terminal-exit reset skips the hardware visibility setter while still emitting the default cursor-shape sequence
- [x] 1.2 Add the optional `restoreHardwareCursorVisibility` reset option in `src/vim-editor.ts`, defaulting to runtime restoration behavior
- [x] 1.3 Run focused VimEditor tests and confirm existing runtime reset behavior remains unchanged

## 2. Lifecycle Reason Routing

- [x] 2.1 Add table-driven `test/lifecycle.test.ts` coverage for `quit`, `reload`, `new`, `resume`, and `fork`, asserting only `quit` suppresses visibility restoration
- [x] 2.2 Update `src/lifecycle.ts` so `resetKnownEditors` forwards cleanup options and `session_shutdown` classifies only `quit` as terminal exit
- [x] 2.3 Verify `/vimmode off`, editor replacement, and runtime session transitions retain captured visibility restoration and tracked-editor clearing

## 3. Specification Consistency

- [x] 3.1 Verify current tests and implementation preserve active bar hardware cursor visibility during agent work and suppress active block/underline hardware cursors
- [x] 3.2 Confirm lifecycle and visual-configuration delta specs fully describe terminal-exit ownership, runtime restoration, and canonical busy-bar behavior
- [x] 3.3 Confirm `CONTEXT.md` cursor lifecycle terms remain implementation-free and consistent with the finalized behavior

## 4. Validation

- [x] 4.1 Run `bun test`
- [x] 4.2 Run `bun run check-types`
- [x] 4.3 Run `bun run lint`
- [x] 4.4 Run `bun run format:check`
- [x] 4.5 Run `openspec validate --specs --strict`
- [x] 4.6 Manually start Pi with default `showHardwareCursor=false`, enter insert mode, run `/quit`, and verify the shell cursor remains visible with its default shape
