## Why

`TODOS.md` tracks `:n` line jumps as next-version work, and current Ex command-line can address lines for edits but cannot use a bare line address to navigate. Supporting bare numeric Ex addresses makes prompt-local line navigation fast without expanding into Vimscript.

## What Changes

- Add finite commandless Ex line-jump support for bare single addresses such as `:1`, `:3`, `:.`, `:$`, and existing single-address offsets like `:2+1`.
- Move the prompt cursor to the addressed line, preserving current column when possible and clamping it to the target line length.
- Reject unsupported commandless ranges such as `:2,4`, `:%`, and visual range markers without mutating prompt text.
- Document line-jump behavior in the Ex command docs and tests.

## Non-goals

- No Vimscript parser, file/window commands, command abbreviations, or `:goto` command.
- No commandless range printing or multi-line default command behavior.
- No new keybindings or settings.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-ex-command-line`: Ex command-line gains finite bare single-address line-jump behavior.

## Impact

- Code seams: `src/ex.ts` parsing and `src/modal/ex-command-line.ts` execution; likely no changes to `src/range.ts` beyond reusing existing single-address parsing.
- Tests: parser coverage in `test/ex.test.ts`; modal/effect coverage in `test/modal.test.ts` or focused Ex modal tests.
- Docs: update `docs/features.md` Ex command section if it lists supported Ex commands.
- Dependencies/APIs: no new runtime dependencies, no peer dependency changes, no breaking changes.
