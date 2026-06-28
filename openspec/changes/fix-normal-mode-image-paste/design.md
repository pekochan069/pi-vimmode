## Context

`src/modal/engine.ts` currently checks `matchesKey(data, "ctrl+v")` before resolving `keySequence(data)` and before protected Pi shortcut delegation. In normal mode this creates `visualBlock` state immediately; in visual modes it switches/toggles visual block immediately. Because the raw input never reaches Pi, Pi's image-paste handler or extensions such as `pi-image-tool` cannot handle image clipboard paste from normal mode.

The keymap already has a semantic `commands.visualBlock` action, but its default binding is empty because `Ctrl-v` is hidden in modal dispatch. Settings and docs therefore cannot accurately explain or override ownership from a single source of truth.

## Goals / Non-Goals

**Goals:**

- Delegate `Ctrl-v`, Windows-style `Alt-v`, and `Ctrl-Alt-v` to Pi by default from normal mode so image paste works without switching to insert mode.
- Keep insert-mode `Ctrl-v` delegation unchanged.
- Make visual-block entry use the semantic keymap path (`piVimMode.keymap.commands.visualBlock`) instead of a hard-coded branch.
- Preserve an opt-in path for Vim users who want `Ctrl-v` to enter visual block.
- Keep diagnostics and docs honest about key ownership, default delegation, and explicit override behavior.

**Non-Goals:**

- No direct clipboard or image-paste API invocation from pi-vimmode.
- No dependency on `pi-image-tool` or any Pi extension.
- No new setting family for passthrough shortcuts.
- No broad remapping system, recursive mappings, timeout behavior, or full Vim parity.

## Decisions

1. **Protect `Ctrl-v`, `Alt-v`, and `Ctrl-Alt-v` as Pi-owned image/clipboard paste shortcuts by default.**
   - Target seams: `src/customization.ts`, `src/modal/engine.ts`, protected-key tests.
   - Add protected metadata for `ctrl+v` plus `alt+v` and `ctrl+alt+v` aliases with a reason such as image/clipboard paste and include them in normal/visual protected delegation checks.
   - If `Ctrl-v` has no effective pi-vimmode binding, normal/visual dispatch clears transient pending state and delegates the raw input to Pi.
   - Alternative rejected: call a Pi image-paste command directly. That would couple pi-vimmode to a runtime command/extension surface and would fail when image paste is provided by another extension.

2. **Remove the hard-coded visual-block `Ctrl-v` branch.**
   - Target seam: `src/modal/engine.ts`.
   - Let `resolveNormalCommand()` handle visual-block entry only when `commands.visualBlock` contains the received key.
   - Alternative rejected: keep the hard-coded branch and add special image detection. The modal layer has no reliable, portable image-clipboard signal and would continue hiding ownership from docs/config.

3. **Use existing protected-override semantics for users who want Vim ownership.**
   - Target seams: `src/config.ts`, `src/types.ts` only if current override plumbing needs adjustment.
   - User config that binds `commands.visualBlock` to `ctrl+v` should require same-layer `piVimMode.keymap.allowProtectedOverrides: ["ctrl+v"]`, matching other Pi-owned shortcuts.
   - Keep built-in presets, including `vim-heavy`, with an empty visual-block binding so paste shortcut ownership stays consistent until users opt in explicitly.
   - Alternative rejected: add a dedicated `delegateCtrlV` option. The existing keymap and protected override model already expresses the ownership trade-off.

4. **Update diagnostics and docs from the protected shortcut catalog.**
   - Target seams: `src/customization.ts`, `src/runtime-help.ts` if needed, `docs/features.md`, `docs/settings.md`.
   - `:mapcheck ctrl+v`, `:features ctrl+v`, and keybinding docs should say that default `Ctrl-v` delegates to Pi for image/clipboard paste, and that visual block is configurable through `commands.visualBlock`.
   - Alternative rejected: document only a workaround (`i` then `Ctrl-v`). The fix should make normal mode usable and reduce future support confusion.

## Side Effects

- Registers: no writes when default `Ctrl-v` delegates; explicit visual-block binding also should not write registers on entry.
- Marks: unchanged.
- Dot-repeat: delegated `Ctrl-v` is not a repeatable Vim change; visual-block entry remains non-repeatable.
- Search highlights and Ex messages: pending state should clear consistently with other delegated protected shortcuts; no new search or Ex behavior.
- Visual state: default visual-mode `Ctrl-v` delegation should not silently enter/switch visual block unless `commands.visualBlock` explicitly binds it.
- Cursor placement: delegated input leaves pi-vimmode cursor state to the adapter/Pi behavior; explicit visual-block entry anchors at the current cursor as today.
- Pi delegation: raw `data` must be delegated unchanged so Pi or image-paste extensions receive the same shortcut they receive in insert mode.

## Risks / Trade-offs

- [Risk] Users expect Vim `Ctrl-v` visual block by default. → Mitigation: document the behavior change, keep `commands.visualBlock` examples and explicit opt-in paths, and make `:mapcheck ctrl+v` actionable.
- [Risk] Marking `Ctrl-v` protected may reject existing user config. → Mitigation: require `allowProtectedOverrides` with a clear warning and docs example.
- [Risk] `vim-heavy` preset may accidentally reclaim paste shortcuts. → Mitigation: add tests that pin empty preset visual-block bindings and ensure diagnostics still explain delegation.
- [Risk] Macro recording might include delegated `Ctrl-v`. → Mitigation: rely on existing delegated-input exclusion tests and add a regression if needed.

## Migration Plan

1. Add `ctrl+v` to protected shortcut metadata and normal/visual protected delegation checks.
2. Remove hard-coded normal/visual `matchesKey(data, "ctrl+v")` visual-block handling.
3. Ensure semantic `commands.visualBlock` still enters/switches visual block when explicitly bound, including a `ctrl+v` binding with protected override.
4. Update modal, config, diagnostics, and preset tests.
5. Update durable specs and user-facing docs for image paste delegation and visual-block migration.
6. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback: restore the hard-coded `Ctrl-v` visual-block branches and remove `ctrl+v` from protected metadata, accepting that normal-mode image paste remains blocked.

## Open Questions

- Resolved: `vim-heavy` does not bind visual block by default; users must configure a visual-block key explicitly.
