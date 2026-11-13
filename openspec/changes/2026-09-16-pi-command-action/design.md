## Context

Pi exposes a single custom-editor factory. pi-vimmode owns that editor and already resolves
finite semantic action bindings through `src/commands.ts`, then applies adapter effects in
`VimEditor`. That path is the safe place to add command dispatch.

## Goals / Non-Goals

Goals:

- Bind a configured Pi slash command from Normal mode.
- Preserve the unfinished prompt, cursor, and local redo stack after dispatch.
- Support JSON and trusted JavaScript configuration.

Non-goals:

- Ex command parsing, command discovery, command-existence checks, Visual dispatch, callbacks,
  or a general action registry rewrite.

## Decisions

### Decision: use a finite `pi.command` registry entry

`src/pi-command-actions.ts` owns the ID, metadata, Normal-only scopes, and argument validation.
This keeps the action distinct from `prompt.transform.*`, because it does not edit prompt lines.
A generic registry refactor is deferred because only one new action family is needed.

### Decision: resolve inside the existing semantic keymap grammar

`src/config.ts` normalizes bindings and `src/commands.ts` returns the existing semantic action
result. This preserves leader expansion, prefix handling, conflict rejection, counts, macros, and
protected-shortcut behavior. A raw-key handler would duplicate grammar and create shadowing risk.

### Decision: use a modal effect and thin adapter

Normal-mode dispatch clears pending command state and emits `dispatchPiCommand`. `VimEditor`
snapshots draft text/cursor, collapsed-paste payloads, local redo, and the guarded private
undo-stack depth; it temporarily sets the slash command, invokes inherited `onSubmit`, then
restores state in `finally` and trims only undo entries added by dispatch. At most one command dispatch is active per editor; a second
trigger reports `Pi command already running` without submitting or mutating the draft. If submit
returns a thenable, the active flag remains set until settlement, which restores an asynchronously
cleared draft and records rejection failures. A missing submit callback reports an unavailable-dispatch
runtime error. The adapter does not validate command names; Pi handles unknown commands through
its normal submit path.

### Decision: make `pi.commandPrompt` a temporary editor session

`pi.commandPrompt` uses the same finite registry and Normal-only configuration path as `pi.command`, but it does not submit immediately. `VimEditor` snapshots the original draft, replaces it with the configured slash command plus one argument separator space, and routes editing through Pi's normal Insert-mode editor and autocomplete behavior. Escape restores the snapshot when autocomplete is closed; while autocomplete is open, the first Escape delegates to Pi so autocomplete closes normally. Enter submits the edited temporary command through the same guarded `pi.command` adapter path, then restores the original draft. The temporary state stays internal to `VimEditor`, avoiding a new public Vim mode and unrelated modal grammar changes.

### Decision: leave Visual dispatch unsupported

The action registry metadata lists `normal`. Trusted JavaScript scope validation and JSON binding
resolution use that metadata. Adding Visual support later requires a metadata expansion and clear
selection semantics, not a new configuration architecture.

## Risks / Trade-offs

- Pi routes may mutate a non-empty draft asynchronously after submit. The guarded late restore
  intentionally only replaces an empty buffer so it does not overwrite subsequent user typing. A
  second command dispatch is rejected while the first remains active.
- The inherited editor undo stack and collapsed-paste registry are private. This change accesses
  them only when their expected shapes are available, clones paste entries before `setText()` can
  clear them, and trims undo entries only when the original array grows.
- An unknown configured command may reach Pi as prompt text by design. Configuration validates
  only slash-command shape.

## Migration Plan

No migration is required. The new action has no default keybinding. Removing the JSON/JS mapping
returns prior behavior.

## Open Questions

None.
