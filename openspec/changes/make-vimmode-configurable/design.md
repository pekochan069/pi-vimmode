## Context

`pi-vimmode` currently reads a small `piVimMode` settings object from Pi global and project settings. Only `startMode` and per-mode `cursor` are configurable. Project settings override global settings field by field, invalid values warn and fall back, and settings files are never modified.

The modal engine is already separated from the Pi-facing `VimEditor` adapter. Hard-coded Vim keys live in `src/commands.ts` and `src/modal/engine.ts`; buffer transforms are semantic helpers and should not need key-specific changes. Status rendering is also partly isolated through `modalModeLabel()`, `modalVisualStatus()`, and `fitStatusBorder()`.

Pi custom-editor docs require extending `CustomEditor`, delegating unhandled/app-owned keys to `super.handleInput()`, and keeping rendered lines width-safe. Pi keybinding docs also establish user-configurable app shortcuts, so `pi-vimmode` must not steal submit, interrupt, autocomplete, model/thinking, image paste, or external-editor shortcuts by default.

## Goals / Non-Goals

**Goals:**

- Preserve existing behavior with default config.
- Add a validated semantic keymap for supported Vim operators, motions, commands, and operator-motion combinations.
- Support multi-key sequences such as `gg` through a deterministic finite matcher, without recursive Vim mappings or timeout behavior.
- Add configurable status UI items for mode label, pending command, visual selection summary, and line/column cursor position.
- Support selected Vim/Neovim option aliases (`showmode`, `showcmd`, `ruler`) as a safe way to port familiar UI preferences.
- Keep all config read-only, namespaced under `piVimMode`, field-level merged, and resilient to invalid values.

**Non-Goals:**

- Full Vim parity: counts, text objects, recursive mappings, leader maps, ex commands, macros, marks, named registers, search, or block visual mode.
- Executing or fully parsing `.vimrc`, Vimscript, or Neovim Lua.
- Remapping Pi app-level shortcuts by default.
- Changing buffer edit semantics beyond resolving configured keys to existing semantic actions.

## Decisions

### 1. Configure semantic actions, not parser internals

Config will map keys to semantic action names such as `delete`, `wordForward`, `openLineBelow`, and `pasteBefore`. The modal engine will resolve input into semantic actions, then reuse existing buffer/navigation helpers.

Example shape:

```json
{
  "piVimMode": {
    "keymap": {
      "operators": {
        "delete": ["d"],
        "change": ["c"],
        "yank": ["y"]
      },
      "motions": {
        "left": ["h"],
        "down": ["j"],
        "up": ["k"],
        "right": ["l"],
        "wordForward": ["w"],
        "wordBackward": ["b"],
        "lineStart": ["0"],
        "lineEnd": ["$"],
        "firstNonBlank": ["^", "_"],
        "bufferStart": ["gg"],
        "bufferEnd": ["G"],
        "matchingPair": ["%"]
      },
      "commands": {
        "insertBefore": ["i"],
        "insertAfter": ["a"],
        "insertLineStart": ["I"],
        "insertLineEnd": ["A"],
        "openLineBelow": ["o"],
        "openLineAbove": ["O"],
        "visualChar": ["v"],
        "visualLine": ["V"],
        "deleteChar": ["x"],
        "deleteToLineEnd": ["D"],
        "changeToLineEnd": ["C"],
        "yankLine": ["Y"],
        "joinLine": ["J"],
        "pasteAfter": ["p"],
        "pasteBefore": ["P"],
        "undo": ["u"]
      },
      "operatorMotions": {
        "delete": ["wordForward", "wordBackward", "lineStart", "firstNonBlank", "lineEnd"],
        "change": ["wordForward", "wordBackward", "lineStart", "firstNonBlank", "lineEnd"],
        "yank": ["wordForward", "wordBackward", "lineStart", "firstNonBlank", "lineEnd"]
      }
    }
  }
}
```

**Rationale:** Existing buffer code already understands semantic motions and edit operations. Keeping config semantic avoids leaking hard-coded parser details and keeps tests focused.

**Alternatives considered:**

- Raw Vimscript-style mappings. Rejected: recursive maps and mode-specific mapping semantics would expand scope dramatically.
- Direct command-string aliases. Rejected: less type-safe and harder to validate than semantic action names.

### 2. Use a finite key-sequence matcher

Replace hard-coded pending command handling with a small matcher built from the resolved keymap. The matcher will support single-key and finite multi-key sequences, track pending prefixes, and clear pending state on unsupported printable input without inserting text.

**Rationale:** Current `g`/`gg` and operator-pending handling already behave like finite matching. Generalizing that shape supports configurable `gg`-like bindings without introducing Vim mapping recursion or timers.

**Alternatives considered:**

- Timeout-based mapping like Vim's `timeoutlen`. Rejected for prompt editing: adds latency and complexity.
- Keep switch statements and patch aliases into them. Rejected: duplicates behavior and makes conflicts hard to reason about.

### 3. Protect Pi-owned shortcuts

Config validation will reject or ignore protected app-owned keys for Vim mappings unless a future change explicitly expands that contract. Insert mode continues to delegate to Pi. Normal/visual modes continue to delegate unknown non-printable/control inputs.

**Rationale:** Pi app shortcuts are safety and workflow controls. Preserving them keeps the extension compatible with Pi core and documented behavior.

**Alternatives considered:** letting users remap all keys. Rejected for this change because it can break submit/interrupt/autocomplete behavior and conflicts with Pi's own `keybindings.json` system.

### 4. Make UI config declarative and width-safe

Add `piVimMode.ui` for status item enablement, order, labels, narrow labels, selection preview length, and cursor position display.

Example shape:

```json
{
  "piVimMode": {
    "ui": {
      "status": {
        "enabled": true,
        "items": ["mode", "pendingOperator", "selection", "cursorPosition"]
      },
      "mode": {
        "enabled": true,
        "labels": {
          "insert": "INSERT",
          "normal": "NORMAL",
          "visual": "VISUAL",
          "visualLine": "V-LINE"
        },
        "narrowLabels": {
          "insert": "I",
          "normal": "N",
          "visual": "V",
          "visualLine": "VL"
        }
      },
      "selection": {
        "enabled": true,
        "previewMaxChars": 16
      },
      "cursorPosition": {
        "enabled": false,
        "base": 1,
        "format": "{line}:{column}"
      }
    }
  }
}
```

`fitStatusBorder()` remains the final width guard. Status derivation should stay in pure helpers so labels and item composition can be tested without Pi TUI objects.

**Alternatives considered:** exposing a render callback. Rejected: user settings must remain JSON-compatible and safe to load from Pi settings.

### 5. Support selected Vim/Neovim option aliases as compatibility input

Add optional `piVimMode.vimOptions` for selected UI aliases:

- `showmode`: controls mode item visibility.
- `showcmd`: controls pending-operator/pending-command item visibility.
- `ruler`: controls cursor position visibility.

`vimOptions` is normalized before explicit `ui` config, so `ui` wins when both are present.

**Rationale:** This gives Vim/Neovim users familiar knobs without executing or parsing external config files.

**Alternatives considered:** automatically reading `.vimrc` or `init.lua`. Rejected for this change because safe partial parsing, source precedence, and user expectations need separate design.

### 6. Preserve field-level fallback and warning behavior

Extend `resolveVimOptions()` to validate `keymap`, `ui`, and `vimOptions`. Invalid nested fields fall back to defaults or lower-precedence settings without discarding sibling fields. Warnings continue to surface through the existing `vim ⚠` status marker.

**Rationale:** Current config behavior is resilient; broader config must not make session startup fragile.

## Risks / Trade-offs

- Scope creep from Vim/Neovim config import → Limit to selected aliases and document full `.vimrc`/Lua parsing as out of scope.
- Keybinding conflicts → Validate per mode/context, keep deterministic precedence, warn, and preserve Pi-owned shortcuts.
- Multi-key ambiguity → Use finite matcher with no timeout; pending prefixes only resolve when completed or invalidated.
- Width regressions from extra UI items → Keep `fitStatusBorder()` as final guard and add narrow-width tests.
- User surprise from disabled mode label → Defaults keep mode visible; hiding mode is explicit config.
- Existing config compatibility → Preserve `startMode` and `cursor` schema and test old examples unchanged.

## Migration Plan

1. Add typed default config for `keymap`, `ui`, and `vimOptions` behind existing defaults.
2. Extend config parsing and warnings with field-level tests.
3. Replace hard-coded key switches with semantic action resolution while preserving current default keymap.
4. Add configurable UI derivation and render tests.
5. Update README with config examples, Vim/Neovim alias scope, and limitations.
6. Run `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate make-vimmode-configurable --strict` if available.

Rollback: revert to the previous hard-coded keymap/view helpers; existing `startMode` and `cursor` settings remain compatible because this change only adds optional fields.

## Open Questions

- None for initial implementation. Future changes can add real `.vimrc`/Neovim config-file import or broader mapping semantics after this typed settings layer lands.
