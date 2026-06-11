## ADDED Requirements

### Requirement: Action keybinding presets are recipe-backed and opt-in

The Vim editor SHALL expose named action keybinding presets that are backed by the existing curated prompt transform action keybinding recipes, use canonical `prompt.transform.*` action IDs, and create no default bindings.

#### Scenario: Preset registry uses canonical bindable action IDs

- **WHEN** action keybinding preset metadata is inspected by config, docs, runtime help, or tests
- **THEN** every preset binding references a canonical bindable `prompt.transform.*` action ID and no metadata-only `vimmode.*` or legacy `promptTransform.*` ID

#### Scenario: Paragraph editing preset matches paragraph recipe

- **WHEN** the `paragraph-editing` preset is resolved or documented
- **THEN** it provides the same `gq`, `g>`, and `g<` action bindings as the paragraph editing recipe

#### Scenario: Markdown wrapping preset matches Markdown recipe

- **WHEN** the `markdown-wrapping` preset is resolved or documented
- **THEN** it provides the same fence, quote, and unquote action bindings as the Markdown wrapping recipe

#### Scenario: Preset bindings execute like explicit action bindings

- **WHEN** a user invokes a prompt transform action keybinding that came from an action preset
- **THEN** modal dispatch, counts, visual range handling, macro recording, registers, marks, dot-repeat behavior, search highlight clearing, feedback, and insert-mode Pi delegation match the same binding configured explicitly through `piVimMode.keymap.actions`

#### Scenario: Presets do not add prompt transform semantics

- **WHEN** action keybinding presets are added
- **THEN** the supported prompt transform action set, action args, target range behavior, and text edit semantics remain those of the existing bindable prompt transform actions

#### Scenario: Presets remain opt-in examples, not plugin API

- **WHEN** user-facing docs or runtime help describe action keybinding presets
- **THEN** they identify presets as finite built-in opt-in bundles and do not imply recursive mappings, arbitrary user actions, diagnostic/help action dispatch, or a generic plugin API
