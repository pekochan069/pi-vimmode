## 1. Modal Integration

- [x] 1.1 Add focused modal tests proving `insertAfter` requests right movement after an existing character but not at EOL or on an empty line.
- [x] 1.2 Include one state-rich EOL assertion confirming the transition enters insert mode, clears transient/search state as before, and preserves unrelated modal state.
- [x] 1.3 Update `src/modal/normal.ts` so `insertAfter` emits the rightward adapter command only when the snapshot cursor points before the current logical line's end.

## 2. Adapter and Live Editor Regression

- [x] 2.1 Add one real `VimEditor` regression test using a long wrapped non-final logical line followed by a blank line; render a constrained viewport, invoke `a`, type text, and verify insertion stays on the original logical line.

## 3. Documentation

- [x] 3.1 Update `docs/features.md` to describe `a` as entering insert mode after the current character without crossing the current logical line.

## 4. Validation

- [x] 4.1 Run `bun test`.
- [x] 4.2 Run `bun run check-types`.
- [x] 4.3 Run `bun run lint`.
- [ ] 4.4 Run `bun run format:check`.
- [x] 4.5 Run `openspec validate --specs --strict`.
