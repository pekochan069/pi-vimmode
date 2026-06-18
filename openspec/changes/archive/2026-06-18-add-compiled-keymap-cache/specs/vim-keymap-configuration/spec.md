## ADDED Requirements

### Requirement: Cached keymap lookups preserve semantic command resolution

The Vim keymap configuration SHALL allow normal-mode command resolution to use cached or compiled lookup data while preserving the existing finite semantic parser contract for resolved keymaps.

#### Scenario: Default keymap resolution remains equivalent

- **WHEN** the editor resolves default normal-mode operators, motions, commands, command prefixes, counts, search commands, character-search commands, text objects, and prompt-transform action bindings
- **THEN** command resolution returns the same semantic results and pending-state behavior as the uncached resolver contract

#### Scenario: Configured keymap resolution remains equivalent

- **WHEN** `piVimMode.keymap` configures supported operators, motions, commands, text-object keys, operator-motion matrices, or prompt-transform action bindings
- **THEN** command resolution uses the active resolved keymap and preserves explicit override precedence, finite multi-key prefixes, invalid-key handling, and accepted action args

#### Scenario: Operator-pending grammar remains scoped

- **WHEN** an operator is pending and the next key could also be part of an unrelated longer top-level key sequence
- **THEN** the resolver interprets the key through operator-pending grammar before generic top-level prefix matching

#### Scenario: Duplicate sequences remain deterministic

- **WHEN** a directly supplied resolved keymap contains the same sequence in multiple resolver groups
- **THEN** command resolution keeps the same deterministic first-match behavior as before this change and does not fail session startup

### Requirement: Compiled keymap cache is scoped to resolved keymap identity

The Vim keymap resolver SHALL scope cached lookup data to each `ResolvedVimKeymap` object identity so different active keymaps do not share stale command bindings.

#### Scenario: Distinct keymaps resolve same sequence differently

- **WHEN** two different resolved keymap objects bind the same key sequence to different supported semantic actions
- **THEN** resolving that sequence against each keymap returns the action for that specific keymap object

#### Scenario: Settings refresh uses new keymap data

- **WHEN** a later settings resolution produces a new resolved keymap object after an earlier keymap has already been used for command resolution
- **THEN** subsequent command resolution uses the later keymap data instead of stale lookup data from the earlier keymap

#### Scenario: Default and custom keymaps can be interleaved

- **WHEN** command resolution alternates between the default keymap and one or more custom resolved keymaps
- **THEN** each call resolves against the keymap provided for that call without cross-keymap contamination

### Requirement: Resolver performance work is validated without user-visible behavior changes

The change SHALL validate resolver performance work with tests and profiling evidence while keeping public keymap behavior unchanged.

#### Scenario: Automated semantic validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover cached resolver equivalence for default commands, configured bindings, prefix precedence, operator motions, operator text objects, operator search, character search, counts, prompt-transform action bindings, invalid pending input, and distinct keymap identities

#### Scenario: Typecheck validates cached lookup types

- **WHEN** `bun run check-types` is executed
- **THEN** TypeScript validates the compiled lookup structures without exposing unsupported public keymap API

#### Scenario: No documentation update is required

- **WHEN** users read `docs/features.md` or `docs/settings.md`
- **THEN** no new keybinding, setting, command syntax, or Vim parity claim is introduced by the cache refactor
