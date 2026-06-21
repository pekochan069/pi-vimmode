## Context

Issue #4 asks for home-row insert-mode escape keys produced by home-row modifier tools, such as `Ctrl-J` or `Cmd-J`. Today `src/modal/engine.ts` handles physical `Esc` in insert mode and delegates every other insert key to Pi. `src/vim-editor.ts` also has a guarded fast path that delegates safe plain insert text before building a modal snapshot, so this needs an explicit insert-only key alias path rather than normal text handling.

Existing keymap configuration is normal/visual/operator focused. Insert mode is intentionally Pi-owned except for physical `Esc`, so this change needs a narrow escape alias surface rather than general insert-mode mappings.

## Goals / Non-Goals

**Goals:**

- Add opt-in `piVimMode.keymap.escape` aliases for modified home-row keys such as `<C-j>` and `<D-j>`.
- Keep physical `Esc` behavior unchanged.
- Preserve ordinary insert typing, autocomplete, submit, Pi shortcuts, macro safety, redo behavior, visual behavior outside the alias, and the insert fast path when configured aliases are irrelevant.
- Validate and document the setting using existing key sequence syntax and protected shortcut rules.
- Keep the implementation finite, typed, and prompt-local.

**Non-Goals:**

- No full Vim insert mappings, recursive mappings, abbreviations, `.vimrc`, Vimscript, Lua config, or `timeoutlen`.
- No raw normal/visual text aliases that would steal existing normal/visual `j`, `k`, or keymap behavior.
- No user settings file edits.
- No new runtime dependencies.

## Decisions

### Decision 1: Add finite `piVimMode.keymap.escape`

Target seams: `src/types.ts`, `src/config.ts`, `src/keymap-descriptors.ts` only if descriptor support is useful, docs/settings docs, and keybinding diagnostics/catalog helpers.

Add `escape` as a sibling keymap field with default `[]`. It is not a `VimCommandAction`, not part of normal-mode command resolution, and not included in default keymap precedence removal across operators/motions/commands/macros/marks.

Accepted entries use existing key normalization and protected-key rejection. Printable text aliases such as `"j"`, `"jk"`, and `"jj"` are rejected with a warning because they make normal typing ambiguous. Modified keys such as `"<C-j>"`, `"<D-j>"`, and `"<A-j>"` are accepted when existing protected shortcut validation says they are safe.

Alternative considered: add `escape` as a normal command. Rejected because normal mode already delegates `Esc` to Pi and because escape aliases should not steal normal mappings.

Alternative considered: a top-level `insertMode` config family. Rejected for now because one finite alias setting fits the existing `keymap` user mental model without starting a broader insert-mapping API.

### Decision 2: Resolve aliases as exact insert/visual/Ex key matches

Target seams: `src/modal/types.ts`, `src/modal/engine.ts`, and small helper functions near modal input parsing.

In insert mode with autocomplete inactive and in visual modes, normalize incoming key data and compare it against configured `escape` aliases. A match transitions to normal mode without delegating input. A non-match keeps existing mode behavior. Raw printable text chords are rejected at config time, so no timeout or text prefix buffer is part of the user-facing behavior.

Alternative considered: support raw text chords such as `jk` with a prefix buffer. Rejected because those are typed text, not real key commands, and they delay normal typing unless timeout behavior is added.

### Decision 3: Keep autocomplete Pi-owned

Target seams: `handleInsertInput`, `VimEditor` snapshot/context, and autocomplete integration tests.

When autocomplete is open, configured escape aliases do not fire. Input delegates to Pi so completion filtering/navigation stays unchanged. Physical `Esc` keeps current behavior: delegate to Pi when autocomplete is open, otherwise enter normal mode.

Alternative considered: make configured aliases close autocomplete and enter normal mode. Rejected because insert-mode autocomplete is explicitly Pi-owned and users may use home-row keys while filtering completions.

### Decision 4: Update the insert fast path without deleting it

Target seams: `canFastDelegateInsertInput` and `VimEditor.handleInput`.

The fast path should remain active for ordinary insert text. Modified-key aliases already miss the plain-text fast path, and autocomplete or macro replay context already disables it. Keep the guard explicit so any configured alias input routes through modal handling while ordinary characters such as `a` stay fast.

Alternative considered: disable the fast path whenever `escape` is configured. Rejected because it penalizes every insert character for a rare key alias.

### Decision 5: Surface aliases in docs and diagnostics as insert/visual/Ex escape bindings

Target seams: `docs/settings.md`, `docs/features.md`, `src/customization.ts`, runtime help metadata, and drift guard tests if the metadata requires anchors.

Document `piVimMode.keymap.escape`, modified-key examples, raw text chord rejection, protected-key rejection, and autocomplete behavior. If `:keybindings`, `:keymap`, `:mapcheck`, or `:features` report it, mark ownership as `insert` and avoid implying general Vim mappings.

Alternative considered: docs-only with no runtime diagnostics. Rejected because this project already treats keymap discoverability and protected-key explanations as part of the user-facing customization surface.

## Risks / Trade-offs

- Raw text chords steal normal typing → Mitigation: reject printable text sequences such as `jk` and test that they insert normally.
- Fast path bypasses alias matching → Mitigation: add modifier-key guard tests and live editor tests for `<C-j>`/`<D-j>` and default typing.
- Autocomplete behavior regresses → Mitigation: disable aliases while autocomplete is open and test physical `Esc` plus configured aliases.
- Macro recording/replay diverges → Mitigation: keep fast path disabled during recording/replay and pin recording/replay behavior with live tests.
- Keymap precedence accidentally removes normal bindings → Mitigation: keep `escape` outside top-level normal keymap precedence removal and test configured aliases do not alter normal motion bindings.
- Config clone/merge drift → Mitigation: update resolved option cloning, keymap merge overlays, and live `VimEditor` construction tests.

## Migration Plan

1. Add types/config parsing, default `[]`, merge/clone support, and config warnings for invalid/protected/printable-text aliases.
2. Add insert escape matching helper without changing default behavior.
3. Wire `handleInsertInput` and fast-path guard for configured aliases.
4. Add live editor, modal, config, diagnostics, and docs drift tests.
5. Update settings/feature docs and runtime help/catalog metadata.
6. Validate with `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback: remove `escape` parsing and the modal alias branch; default behavior returns to physical-`Esc` only.
