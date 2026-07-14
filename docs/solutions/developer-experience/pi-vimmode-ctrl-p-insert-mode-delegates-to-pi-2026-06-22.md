---
title: Ctrl-P showKeybindings only works from normal mode
date: 2026-06-22
last_updated: 2026-07-14
category: docs/solutions/developer-experience
module: pi-vimmode
problem_type: developer_experience
component: tooling
severity: low
applies_when:
  - "A protected Pi shortcut appears to ignore a pi-vimmode keymap override"
  - "A keybinding works after pressing Escape but not while typing in insert mode"
  - "Debugging confusion between Pi-owned app shortcuts and pi-vimmode modal ownership"
related_components:
  - "modal-engine"
  - "keymap-configuration"
  - "protected-shortcuts"
  - "runtime-keybinding-discovery"
tags: [pi-vimmode, keybindings, ctrl-p, insert-mode, protected-keys, show-keybindings]
---

# Ctrl-P showKeybindings only works from normal mode

## Context

A user configured `Ctrl-P` to open pi-vimmode's keybindings popup:

```json
{
  "piVimMode": {
    "keymap": {
      "commands": {
        "showKeybindings": ["ctrl+p"]
      },
      "allowProtectedOverrides": ["ctrl+p"]
    }
  }
}
```

Pressing `Ctrl-P` still cycled Pi's model. The configuration looked suspicious because `Ctrl-P` is a protected Pi shortcut, but the actual behavior depended on Vim mode.

`Ctrl-P` is honored by pi-vimmode in normal mode. In insert mode, pi-vimmode delegates unhandled keys back to Pi, so Pi receives `Ctrl-P` and runs `app.model.cycleForward`.

Session history had one supporting finding: control/meta chords need explicit mode ownership rather than generic insert-mode treatment (session history).

## Guidance

Verify protected-key overrides from the mode that owns the binding.

For `showKeybindings` bound to `Ctrl-P`, use normal mode:

```text
Escape
Ctrl-P
```

Or start pi-vimmode in normal mode when keybinding discovery is the common workflow:

```json
{
  "piVimMode": {
    "startMode": "normal"
  }
}
```

Do not keep changing the keymap if this works after `Escape`. The config is valid; the key is being tested from insert mode.

Current dispatch rule: normal and visual modes check keymap bindings before protected delegation; insert mode falls through to Pi for non-escape, non-autocomplete input.

If `Ctrl-P` should open the help popup from insert mode too, configuration alone is not enough. That requires a code change in `handleInsertInput`.

## Why This Matters

`allowProtectedOverrides` only permits protected shortcuts to appear in pi-vimmode's keymap. It does not make every mode own that shortcut.

Normal and visual dispatch check whether a protected key has a pi-vimmode binding before delegating. Insert dispatch intentionally keeps typing close to Pi's default editor behavior and delegates non-escape keys back to Pi.

Without this distinction, a valid keymap looks broken and users may chase config precedence even though the live behavior is mode ownership.

## When to Apply

- User configures `piVimMode.keymap.commands.showKeybindings` with a protected key such as `ctrl+p`.
- User also configured `piVimMode.keymap.allowProtectedOverrides` for that key.
- The key still triggers a Pi global/app action while typing.
- Pressing `Escape` first makes the binding work.

Do not apply this explanation when the key fails in normal mode too. Then investigate config parsing, project settings overriding global settings, command names, and duplicate keymap conflicts.

## Examples

Expected normal-mode result:

```text
Escape -> Ctrl-P -> openReadOnlyPopup(:keybindings)
```

Expected insert-mode result with current code:

```text
Ctrl-P -> delegate(state, data) -> Pi handles app.model.cycleForward
```

Quick troubleshooting rule:

```text
If Escape then Ctrl-P works, config is valid.
If Ctrl-P while typing cycles model, this is current insert-mode delegation.
```

## Related

- `docs/solutions/developer-experience/pi-vimmode-ctrl-d-ctrl-u-half-page-scroll-2026-06-18.md` — same mode-aware control-key ownership pattern.
- `docs/solutions/logic-errors/pi-vimmode-config-keymap-precedence-2026-06-17.md` — useful when a binding fails in normal mode too.
- `docs/solutions/design-patterns/pi-vimmode-actionable-keybinding-catalog-2026-06-10.md` — catalog rows should make mode ownership obvious.
- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md` — adapter/modal boundary and delegation architecture.
- `docs/solutions/architecture-patterns/pi-vimmode-final-leader-resolution-2026-07-14.md` — protected leader suffix validation and accepted normal/visual prefix ownership.
