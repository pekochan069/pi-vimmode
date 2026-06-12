## 1. Register Target Types and Helpers

- [x] 1.1 Extend `PendingRegisterTarget` and modal register state with typed named, unnamed, black-hole, and clipboard target variants plus `clipboardRegisters` mirror storage.
- [x] 1.2 Update modal state construction, reset/preservation helpers, and inspect summaries to preserve clipboard mirrors while clearing pending register targets safely.
- [x] 1.3 Replace letter-only `registerTargetForKey()` behavior with finite target parsing for `a-z`, `A-Z`, `"`, `_`, `+`, and `*`, while rejecting unsupported targets such as `=`, `1`, `/`, `.`, `:`, and `%`.
- [x] 1.4 Add register read helpers for named, explicit unnamed, black-hole, and clipboard mirror targets, including missing/empty clipboard mirror safety.
- [x] 1.5 Add register write helpers that update unnamed/named/clipboard mirrors, preserve unnamed for black-hole writes, consume one-shot targets, and return clipboard-copy effects when needed.
- [x] 1.6 Add focused helper tests for target parsing, target display, read selection, unnamed writes, named append preservation, black-hole discard, clipboard mirror writes, and unsupported target clearing.

## 2. Modal Effect and Adapter Clipboard Integration

- [x] 2.1 Add a `copyClipboard` `ModalEffect` carrying text and `+`/`*` target metadata.
- [x] 2.2 Update modal effect golden/test helpers so clipboard effects are observable without performing host clipboard writes.
- [x] 2.3 Import Pi's existing `copyToClipboard` helper in `src/vim-editor.ts` and apply `copyClipboard` effects in the adapter without adding runtime dependencies.
- [x] 2.4 Surface async clipboard-copy failures as bounded runtime warnings/messages without rolling back prompt text, cursor, mode, or register state.
- [x] 2.5 Add adapter/live editor tests or injectable smoke coverage proving clipboard effects are applied and existing edit/delegate effects still work.

## 3. Normal and Visual Mode Integration

- [x] 3.1 Update normal-mode register prefix handling to accept `""`, `"_`, `"+`, and `"*` before supported register-aware commands and to reject unsupported special targets safely.
- [x] 3.2 Route normal-mode yank/delete/change paths through the new register write helper so clipboard effects and black-hole semantics apply consistently.
- [x] 3.3 Route normal-mode `p`/`P` through the new register read helper for explicit unnamed, clipboard mirror, and black-hole reads.
- [x] 3.4 Update visual, visual-line, and visual-block prefix handling to accept selected special registers and reject unsupported special targets safely.
- [x] 3.5 Route visual yank/delete/change and visual-line paste replacement through the new register read/write helpers.
- [x] 3.6 Add normal-mode tests for `""yy`, `""p`, `"_dd`, `"_p`, `"+yy`, `"*dw`, `"+P`, missing clipboard mirror paste, and unsupported `"=`/`"1`/`"/` targets.
- [x] 3.7 Add visual-mode tests for `"+y`, `"_d`, `"*c`, `""p`, visual state clearing, clipboard effects, black-hole unnamed preservation, and existing named-register regressions.
- [x] 3.8 Verify dot-repeat and protected Pi shortcut behavior do not change for existing register-aware and register-unaware commands.

## 4. Ex Command Integration

- [x] 4.1 Extend `src/ex.ts` register operand parsing to accept bare `_`, `+`, `*`, and `"` while preserving bare alphabetic operands and rejecting quoted forms like `"+`.
- [x] 4.2 Update Ex execution for `:delete`, `:yank`, and `:put` to use selected special register read/write helpers and merge clipboard-copy effects into updates.
- [x] 4.3 Preserve Ex side effects: line counts, cursor placement, search-highlight clearing on edits, Ex history, and dot-repeat non-updates.
- [x] 4.4 Add parser tests for valid special operands and invalid quoted/unsupported operands.
- [x] 4.5 Add Ex execution tests for `:delete "`, `:2delete _`, `:%yank +`, `:put *`, `:put _`, missing clipboard mirror errors, and preservation of existing named-register operands.

## 5. Documentation and Runtime Help

- [x] 5.1 Update `docs/features.md` Registers and Ex command-line sections with `""`, `"_`, `"+`, `"*`, host clipboard write/read behavior, prompt-local clipboard mirror fallback, and remaining unsupported registers.
- [x] 5.2 Update runtime help/register quick-reference source text so `:help registers` and feature discovery match `docs/features.md`.
- [x] 5.3 Update docs drift tests or runtime-help fixtures that currently assert special/system clipboard registers are unsupported.
- [x] 5.4 Ensure docs do not claim full Vim/Neovim register parity or typed Vim metadata for arbitrary OS clipboard reads.

## 6. Validation

- [x] 6.1 Run `bun test` and fix failures.
- [x] 6.2 Run `bun run check-types` and fix TypeScript errors.
- [x] 6.3 Run `bun run lint` and fix lint errors.
- [x] 6.4 Run `bun run format:check` and fix formatting drift.
- [x] 6.5 Run `openspec validate support-special-registers --type change --strict` and fix artifact/spec issues.
- [x] 6.6 Run `openspec validate --specs --strict` and fix durable spec issues.

## 7. Clipboard Paste Follow-up

- [x] 7.1 Add adapter-owned clipboard text read helper using platform clipboard tools without new runtime dependencies.
- [x] 7.2 Route normal-mode `"+p`/`"+P`/`"*p`/`"*P` through a read-clipboard modal effect with prompt-local mirror fallback.
- [x] 7.3 Update docs, runtime help, and OpenSpec artifacts from mirror-only paste to host-read-plus-fallback behavior.
- [x] 7.4 Add modal and live editor tests for clipboard read effects, host clipboard paste, and mirror fallback.
- [x] 7.5 Re-run validation commands after follow-up changes.
