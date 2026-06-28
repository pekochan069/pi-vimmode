---
title: Protected Pi image paste shortcuts swallowed by visual block binding
date: 2026-06-28
category: docs/solutions/logic-errors
module: pi-vimmode
problem_type: logic_error
component: tooling
symptoms:
  - "Image paste worked outside Vim mode but failed in normal or visual mode"
  - "`Ctrl-v` entered visual block instead of delegating clipboard or image paste to Pi"
  - "Windows `Alt-v` image paste risked being documented or configured as a visual-block binding"
  - "`Ctrl-Alt-v` could be swallowed when emitted for image paste"
root_cause: logic_error
resolution_type: code_fix
severity: medium
related_components:
  - modal-engine
  - keymap-configuration
  - protected-shortcuts
  - visual-block-mode
  - documentation
tags:
  [
    pi-vimmode,
    keybindings,
    protected-shortcuts,
    clipboard,
    image-paste,
    visual-block,
    ctrl-v,
    alt-v,
  ]
---

# Protected Pi image paste shortcuts swallowed by visual block binding

## Problem

`pi-vimmode` blocked Pi image paste shortcuts while Vim normal/visual handling was active. The modal engine hard-coded `Ctrl-v` as visual block mode before protected Pi shortcut delegation could run, so Pi never received the raw paste-image chord.

On Windows, Pi uses `Alt-v` for `app.clipboard.pasteImage`, and some terminal paths may emit `Ctrl-Alt-v`. All three paste variants need to be Pi-owned by default rather than consumed by Vim command handling.

## Symptoms

- Image paste works outside Vim mode but fails when `pi-vimmode` is in normal or visual mode.
- Pressing `Ctrl-v` enters `V-BLOCK` instead of letting Pi handle clipboard/image paste.
- Windows users cannot safely use `Alt-v` for image paste if docs or examples recommend it for visual block.
- `Ctrl-Alt-v` can also be swallowed when the host path emits it for image paste.

## What Didn't Work

- Calling `app.clipboard.pasteImage` directly from `pi-vimmode` was the wrong ownership boundary. Clipboard/image paste is a Pi app action; the extension should delegate the raw input and let Pi dispatch it.
- Keeping `Ctrl-v` as a hidden built-in visual-block binding made `piVimMode.keymap.commands.visualBlock` misleading: the setting looked empty, but `Ctrl-v` still entered visual block.
- Using `Alt-v` as an example visual-block binding was unsafe because Windows owns that chord for image paste.
- The bundled session-history script could not run directly in this Pi environment because the checked-out script had CRLF shell line endings. A narrow session text-search fallback found an older settings-doc session that still claimed built-in `Ctrl-v` visual-block behavior, confirming stale docs needed cleanup. (session history)
- `openspec` and `graphify` were unavailable in the shell, so validation relied on targeted source inspection plus the project test/type/lint/format checks.

## Solution

Treat Pi image paste chords as protected app shortcuts by default:

- Add protected shortcut metadata for `ctrl+v` with `alt+v` and `ctrl+alt+v` aliases.
- Add `ctrl+v`, `alt+v`, and `ctrl+alt+v` to normal/visual protected delegation.
- Remove hard-coded `Ctrl-v` visual-block branches from normal and visual modal dispatch.
- Route visual-block entry only through `piVimMode.keymap.commands.visualBlock`.
- Keep the default and `vim-heavy` preset visual-block bindings empty.
- Preserve explicit opt-in by requiring both `commands.visualBlock` and same-layer `allowProtectedOverrides` for protected paste shortcuts.

Default behavior:

```json
{
  "piVimMode": {
    "keymap": {
      "commands": {
        "visualBlock": []
      }
    }
  }
}
```

Recommended non-protected visual-block binding:

```json
{
  "piVimMode": {
    "keymap": {
      "commands": {
        "visualBlock": ["<A-b>"]
      }
    }
  }
}
```

Intentional Vim-style `Ctrl-v` ownership:

```json
{
  "piVimMode": {
    "keymap": {
      "commands": {
        "visualBlock": ["<C-v>"]
      },
      "allowProtectedOverrides": ["<C-v>"]
    }
  }
}
```

## Why This Works

Pi owns protected application-level shortcuts such as image paste. Delegating `Ctrl-v`, `Alt-v`, and `Ctrl-Alt-v` before Vim command handling preserves platform clipboard behavior and prevents modal routing from intercepting protected chords.

Moving visual block to the semantic keymap path removes hidden ownership. Users can still opt into traditional Vim visual block behavior, but that choice is visible in config and gated by protected-key validation when it overlaps Pi-owned paste shortcuts.

Keeping `vim-heavy` empty for visual block prevents presets from silently reclaiming paste shortcuts. Presets should not bypass the same protected-shortcut boundary that default users rely on.

## Prevention

- Do not hard-code Vim bindings that overlap protected Pi application shortcuts.
- Keep protected shortcut metadata and modal delegation lists aligned.
- Prefer semantic keymap commands over hidden built-in modal branches.
- Avoid protected platform chords such as Windows `Alt-v` in examples and presets.
- When adding a default or preset binding, check Pi app shortcuts across supported platforms.
- Add regression coverage for both default delegation and explicit protected override behavior.
- Update docs, runtime help, specs, and release notes whenever key ownership defaults change.

Validation used for this fix:

```sh
bun test test/config.test.ts test/modal.test.ts test/customization.test.ts test/runtime-help.test.ts test/docs-drift.test.ts
bun run check-types
bun run lint
bun run format:check
```

## Related Issues

- `docs/solutions/developer-experience/pi-vimmode-ctrl-p-insert-mode-delegates-to-pi-2026-06-22.md` — related protected-shortcut mode ownership pattern.
- `docs/solutions/logic-errors/visual-line-paste-swallowed-by-modal-handler-2026-05-27.md` — related visual-handler swallowing pattern, but that fix added visual command handling rather than app shortcut delegation.
- `docs/solutions/logic-errors/pi-vimmode-config-keymap-precedence-2026-06-17.md` — useful when an explicit visual-block override fails because of config precedence or protected-key validation.
