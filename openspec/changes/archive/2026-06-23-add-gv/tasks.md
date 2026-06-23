## 1. Keymap and Types

- [x] 1.1 Add `reselectVisual` to `VimCommandAction`, keymap descriptors, customization/help labels, and default command bindings with `gv`.
- [x] 1.2 Add focused keymap tests for default `gv`, configured `piVimMode.keymap.commands.reselectVisual`, invalid binding fallback, and protected-key rejection.

## 2. Modal State and Helpers

- [x] 2.1 Add a typed `lastVisualSelection` modal state field and preserve it through `resetTransientState`.
- [x] 2.2 Add small helpers to capture an active visual selection, validate stored positions against the current prompt snapshot, and build the reselection update.
- [x] 2.3 Wire capture into visual exit paths: `Esc`, configured escape aliases, yank/delete/change, case transforms, replace, visual-line paste, visual prompt actions, and visual-block insert entry.
- [x] 2.4 Implement normal-mode `reselectVisual` handling that restores the saved active cursor, enters the saved visual mode, and safely no-ops when missing or stale.

## 3. Modal Behavior Tests

- [x] 3.1 Test characterwise `gv` after exiting visual mode restores mode, anchor, cursor, and text unchanged.
- [x] 3.2 Test visual-line and visual-block `gv` preserve selection kind and endpoint.
- [x] 3.3 Test later visual exits replace the previous stored selection.
- [x] 3.4 Test missing and stale stored selections leave mode, cursor, text, registers, marks, and search state unchanged.
- [x] 3.5 Test capture after yank/delete/change/case/replace/visual-line paste and visual-block insert entry.

## 4. Documentation

- [x] 4.1 Update `docs/features.md` visual mode sections with `gv` behavior, scope, and no-op rule.
- [x] 4.2 Update `docs/settings.md` keymap command reference with `reselectVisual` and default `gv`.
- [x] 4.3 Update any generated keybinding/runtime-help expectations if command listings are snapshot-tested.

## 5. Validation

- [x] 5.1 Run `bun test`.
- [x] 5.2 Run `bun run check-types`.
- [x] 5.3 Run `bun run lint`.
- [x] 5.4 Run `bun run format:check`.
- [x] 5.5 Run `openspec validate --specs --strict`.
