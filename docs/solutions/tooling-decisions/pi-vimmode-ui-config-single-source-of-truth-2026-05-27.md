---
title: Pi Vim mode UI config as single source of truth
date: 2026-05-27
last_updated: 2026-05-28
category: docs/solutions/tooling-decisions
module: pi-vimmode
problem_type: tooling_decision
component: tooling
severity: medium
applies_when:
  - "Adding extension settings that overlap with familiar external tool options"
  - "Choosing between compatibility aliases and one native JSON config schema"
  - "Debugging mode label, pending command, selection summary, or cursor position display"
  - "Adding a new `VimEditorOptions` field that must survive live editor construction"
tags: [pi-extension, vim-mode, configuration, single-source-of-truth, user-settings, options]
---

# Pi Vim mode UI config as single source of truth

## Context

`pi-vimmode` added configurable keymaps and status UI. Early design included two overlapping status configuration surfaces:

- Native Pi extension config under `piVimMode.ui`
- Vim/Neovim-style aliases under `piVimMode.vimOptions` (`showmode`, `showcmd`, `ruler`)

That created precedence confusion. For example, `vimOptions.ruler: true` could conflict with `ui.status.items` omitting `cursorPosition`, or `vimOptions.showcmd: false` could conflict with an explicit status item order.

Final decision: `piVimMode.ui` is the only active status UI configuration surface. Legacy `piVimMode.vimOptions` is ignored with a warning.

## Guidance

Use `piVimMode.ui` for all status display behavior:

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
          "normal": "COMMAND"
        },
        "narrowLabels": {
          "normal": "C"
        }
      },
      "selection": {
        "enabled": true,
        "previewMaxChars": 16
      },
      "cursorPosition": {
        "enabled": true,
        "base": 1,
        "format": "{line}:{column}"
      }
    }
  }
}
```

Do not restore alias normalization for Vim/Neovim option names:

```json
{
  "piVimMode": {
    "vimOptions": {
      "showmode": false,
      "showcmd": false,
      "ruler": true
    }
  }
}
```

Current behavior is warning-only and ignored:

```ts
warnings.push(`${sourceLabel}: piVimMode.vimOptions is no longer supported; use piVimMode.ui`);
```

Keep public docs, OpenSpec specs, and tests aligned with that contract:

- `README.md` documents `piVimMode.ui` and says `showmode`, `showcmd`, and `ruler` are unsupported.
- `src/types.ts` exposes `ui` on `VimEditorOptions`, with no `VimOptionsAliases` type.
- `src/config.ts` parses and deep-merges `ui`, warns on `vimOptions`, and leaves UI defaults intact.
- `src/vim-editor.ts` passes only resolved `ui` into status rendering and must clone every runtime option field used by live editor behavior.
- `test/config.test.ts` covers legacy `vimOptions` rejection.
- `openspec/specs/vim-ui-configuration/spec.md` states UI config is the single source of truth.

## Why This Matters

Two config surfaces make extension behavior harder to explain and harder to test. Compatibility aliases look familiar, but partial Vim/Neovim semantics imply a broader `.vimrc`/Lua compatibility story that the extension does not provide.

A single `ui` surface keeps status behavior:

- Explicit: item order and enabled state live in one object.
- Typed: TypeScript types match supported runtime behavior.
- Validated: unsupported nested fields fall back without discarding sibling settings.
- Documentable: README examples map directly to implementation.
- Testable: one acceptance test can prove aliases are rejected and `ui` remains effective.

For non-UI behavior settings, the same source-of-truth rule applies across the adapter boundary. If a resolved field is added to `VimEditorOptions`, ensure `cloneOptions()` preserves it and add a live `VimEditor` test. Otherwise config parsing can pass while the live editor silently falls back to defaults.

## When to Apply

- Adding new `piVimMode` settings that could overlap with existing config.
- Adding new `VimEditorOptions` fields used by modal behavior.
- Changing Vim status UI rendering or terminal-width handling.
- Migrating user examples from Vim-style option names to Pi-native JSON config.
- Reviewing archived OpenSpec docs that mention `VimOptionsAliases`; current source/specs supersede those archived design notes.

## Examples

Hide the mode label:

```json
{
  "piVimMode": {
    "ui": {
      "mode": { "enabled": false }
    }
  }
}
```

Hide pending command/status command text:

```json
{
  "piVimMode": {
    "ui": {
      "status": {
        "items": ["mode", "selection"]
      }
    }
  }
}
```

Show a ruler-style cursor position:

```json
{
  "piVimMode": {
    "ui": {
      "status": {
        "items": ["mode", "pendingOperator", "selection", "cursorPosition"]
      },
      "cursorPosition": {
        "enabled": true,
        "base": 1,
        "format": "L{line}:C{column}"
      }
    }
  }
}
```

Rejected approach:

```ts
// Avoid: implicit alias normalization before applying ui overrides.
if (aliases.showmode !== undefined) ui.mode.enabled = aliases.showmode;
if (aliases.showcmd !== undefined) togglePendingOperator(ui, aliases.showcmd);
if (aliases.ruler !== undefined) ui.cursorPosition.enabled = aliases.ruler;
```

That approach recreates precedence rules and suggests the extension supports a Vim option layer. Prefer direct `ui` config instead.

Adapter option cloning follows the same principle:

```ts
function cloneOptions(options: VimEditorOptions): VimEditorOptions {
  return {
    startMode: options.startMode,
    cursor: { ...options.cursor },
    keymap: options.keymap,
    ui: options.ui,
    macros: options.macros,
    marks: options.marks,
  };
}
```

When adding a new runtime option, update this clone and prove the live editor honors the field. Pure config tests alone do not catch adapter construction drift.

## Related

- `README.md` — settings reference and examples.
- `openspec/specs/vim-ui-configuration/spec.md` — durable UI configuration contract.
- `test/config.test.ts` — parser acceptance coverage for ignored `vimOptions`.
- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md` — related keymap/config validation architecture.
