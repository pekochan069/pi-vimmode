---
title: Pi vimmode Ex command-line substitution architecture
date: 2026-05-28
category: docs/solutions/architecture-patterns
module: pi-vimmode
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "Adding Ex command-line features to a prompt-based Vim editor"
  - "Keeping command input separate from prompt-buffer text"
  - "Designing substitution ranges, parser limits, and UI feedback before implementation"
  - "Coordinating OpenSpec, ADRs, TODOs, and domain glossary updates"
related_components:
  - development_workflow
  - testing_framework
  - documentation
tags:
  - pi-vimmode
  - ex-command-line
  - substitution
  - modal-state
  - render-row
  - openspec
  - adr
  - prompt-buffer
---

# Pi vimmode Ex command-line substitution architecture

## Context

`pi-vimmode` already had modal prompt editing, search, ranges, visual modes, macros, registers, semantic keymaps, and width-safe rendering. The remaining user-facing gap was Vim-fluent command-line editing, especially substitution commands such as `:%s/old/new/g`.

The risky part was not adding another keybinding. Ex substitution crosses modal input state, prompt-buffer operations, visual selections, macro replay, keymap config, render layout, search-highlight clearing, register boundaries, cursor clamping, and dot-repeat semantics. A vague TODO like “support colon commands” could easily sprawl into full Vimscript, regex replacement, history, command repetition, and unrelated Ex commands.

The solved approach was to plan the feature through OpenSpec before implementation, name the domain precisely in `CONTEXT.md`, record the UI layout trade-off in an ADR, and push deferred scope into `TODOS.md`.

## Guidance

Use an OpenSpec-first architecture pass for broad Vim behavior features before coding. Treat familiar Vim syntax as a product contract, not as permission to implement all of Vim.

Recommended sequence:

1. Create a focused OpenSpec change:
   - `openspec/changes/add-ex-command-line-substitution/proposal.md`
   - `openspec/changes/add-ex-command-line-substitution/design.md`
   - `openspec/changes/add-ex-command-line-substitution/tasks.md`
   - `openspec/changes/add-ex-command-line-substitution/specs/*/spec.md`

2. Split requirements by affected capability:
   - `vim-ex-command-line` for command-line state, ranges, substitution parser, messages, and side effects.
   - `vim-keymap-configuration` for the semantic `startExCommand` action.
   - `vim-macro-recording` for recording/replaying Ex keystrokes.
   - `vim-ui-configuration` for dedicated row layout and width safety.

3. Add glossary terms before implementation so future specs and code use the same language:
   - Ex command-line mode
   - Ex substitution
   - Ex range
   - Visual range marker
   - Ex substitution pattern
   - Ex error

4. Record hard-to-reverse UI decisions in ADRs. For this feature, `docs/adr/0001-dedicated-ex-command-line-row.md` captures the decision to render active Ex input and transient Ex messages in a dedicated row below the prompt box while shrinking the prompt viewport by one row.

5. Keep v1 deliberately finite:
   - Entry from normal and visual modes with `:`.
   - Commands: exact `:s` and `:substitute` only.
   - Ranges: current line, `%`, captured visual `'<,'>`, numeric lines, `.`, `$`, and comma ranges.
   - Flags: lowercase `g` and `i` only.
   - Parsing: literal patterns/replacements, delimiter and backslash escapes, no regex, no backreferences.
   - Editing controls: printable input, Backspace, Enter/Return, and Escape.

6. Validate the OpenSpec contract before implementation:

```sh
openspec validate add-ex-command-line-substitution --type change --strict
```

The planning session verified this command successfully. `bun test` and `bun run check-types` remain implementation-phase tasks in the generated checklist.

## Why This Matters

Ex command-line behavior has a large blast radius because it looks small at the UI layer while touching most editor subsystems. Without a spec-first boundary, implementers can accidentally mix command text with prompt text, mutate registers from substitution, break macro replay, overfit render layout, or drift into unsupported Vim semantics.

The architecture pattern that worked here:

- Model Ex input as modal state, not prompt-buffer text.
- Parse a finite command grammar with explicit non-goals.
- Apply text changes through prompt-buffer operations, not render/string surgery.
- Render Ex input in a dedicated width-safe row, not the existing status item surface.
- Preserve side-effect boundaries: no register writes, no dot-repeat update, search highlights clear only on text-changing substitution.
- Keep deferred Vim behavior discoverable in `TODOS.md` so omissions are intentional.

This makes the later implementation testable as small contracts instead of one large “make `:%s` work” task.

## When to Apply

- Adding a Vim feature that spans modal engine, buffer operations, render, config, macros, and docs.
- Supporting familiar Vim syntax with intentionally reduced semantics.
- Designing command input that must stay separate from user prompt text.
- Making UI placement decisions that affect terminal viewport math or width safety.
- Turning broad TODOs into implementation-ready OpenSpec tasks.
- Capturing deferred behavior so future users and agents do not mistake scope boundaries for bugs.

## Examples

Before, the roadmap language was broad enough to invite scope creep:

```md
- [ ] Ex commands (things starts with `:`)
```

After, the OpenSpec proposal scoped the capability to v1 substitution:

```md
- Add Ex command-line mode entered from normal and visual modes with `:`.
- Implement literal Ex substitution via `:s` and `:substitute`.
- Keep v1 narrow: no regex, no command history, no full Ex command coverage.
```

Representative accepted commands from the spec:

```vim
:s/old/new/
:%s/old/new/g
:2,4s#old/path#new/path#g
:'<,'>s/old/new/g
:.,$s/old/new/i
```

Representative deferred commands and semantics:

```vim
:g/pattern/cmd
:nohlsearch
:s/regex/\1/g
:s/old/new/c
.+1,$-2s/old/new/g
```

Use the generated task list as the implementation spine:

```md
## 1. Ex State and Parser

## 2. Prompt Buffer Substitution

## 3. Modal Engine Integration

## 4. Rendering and UI

## 5. Macro and Documentation

## 6. Validation
```

## Related

- `openspec/changes/add-ex-command-line-substitution/` — source OpenSpec change for this pattern.
- `docs/adr/0001-dedicated-ex-command-line-row.md` — ADR for dedicated Ex row layout.
- `docs/solutions/design-patterns/pi-vimmode-search-highlighting-render-precedence-2026-05-28.md` — related render-precedence pattern for prompt UI overlays.
- `docs/solutions/architecture-patterns/finite-vim-keybinding-parser-buffer-helpers-2026-05-26.md` — related finite parser and buffer-helper architecture pattern.
- `docs/solutions/architecture-patterns/pi-vimmode-prompt-buffer-operation-api-2026-05-27.md` — related guidance for keeping text operations in prompt-buffer APIs.
- `docs/solutions/tooling-decisions/pi-vimmode-ui-config-single-source-of-truth-2026-05-27.md` — related semantic config and docs/spec/test alignment guidance.
- `docs/solutions/logic-errors/vim-behavior-contract-drift-2026-05-28.md` — related prevention doc for docs/spec/test drift in Vim behavior contracts.
