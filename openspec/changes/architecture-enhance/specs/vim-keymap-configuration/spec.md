## ADDED Requirements

### Requirement: Keymap grammar diagnostics share resolver semantics

The Vim keymap configuration SHALL keep runtime command resolution and settings diagnostics aligned for finite key sequence enumeration, exact conflicts, and prefix-shadow conflicts.

#### Scenario: Runtime and diagnostics enumerate the same grammar bindings

- **WHEN** the default resolved keymap is inspected by runtime command resolution and by settings diagnostics
- **THEN** both paths see the same finite operator, motion, command, macro, mark, text-object, character-search, search, and prompt-transform action key sequences

#### Scenario: Exact conflicts are diagnosed before dispatch

- **WHEN** settings configure an action key sequence that exactly matches an existing resolved grammar binding
- **THEN** settings resolution rejects the action binding with a warning and runtime dispatch keeps the existing grammar binding behavior

#### Scenario: Prefix shadows are diagnosed before dispatch

- **WHEN** settings configure a binding that is a strict prefix of an existing executable grammar sequence or has an existing executable grammar sequence as its strict prefix
- **THEN** settings resolution rejects the shadowing binding with a warning and runtime dispatch keeps finite deterministic key sequence behavior

#### Scenario: Shared non-executable prefixes remain valid

- **WHEN** two bindings share a common prefix that is not itself executable, such as two `g`-prefixed sequences
- **THEN** settings diagnostics accepts both non-conflicting bindings and runtime resolution waits for the full configured sequence before dispatch

#### Scenario: Refactor preserves default command behavior

- **WHEN** `bun test` is executed after grammar helper extraction
- **THEN** existing default keymap command resolution, pending-prefix invalidation, protected shortcut handling, and action keybinding conflict tests continue to pass without changed user-facing expectations
