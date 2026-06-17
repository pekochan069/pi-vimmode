## ADDED Requirements

### Requirement: Resolved editor options preserve clone isolation

The Vim editor SHALL resolve configuration into option objects that do not share mutable keymap, prompt transform, or UI arrays and nested option objects with default options or caller-provided partial configuration.

#### Scenario: Default option resolution returns isolated mutable fields

- **WHEN** editor options are resolved with no `piVimMode` settings
- **THEN** mutating resolved keymap sequences, prompt transform command sequences, UI status items, or UI labels does not mutate `DEFAULT_VIM_OPTIONS`

#### Scenario: Configured option resolution returns isolated mutable fields

- **WHEN** editor options are resolved from valid partial `piVimMode.keymap`, `piVimMode.promptTransforms`, or `piVimMode.ui` settings
- **THEN** mutating resolved nested arrays or objects does not mutate the caller-provided settings object and does not change sibling resolved defaults

#### Scenario: Live editor construction receives isolated options

- **WHEN** `VimEditor` is constructed with resolved or partial options
- **THEN** later mutation of caller-owned option arrays or nested UI objects does not change the live editor behavior
