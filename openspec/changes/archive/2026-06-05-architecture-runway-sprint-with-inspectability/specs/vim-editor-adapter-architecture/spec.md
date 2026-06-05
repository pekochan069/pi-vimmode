## ADDED Requirements

### Requirement: Modal feature handlers preserve the adapter effect boundary

The modal editing architecture SHALL split feature-specific modal behavior into focused modules while preserving `ModalEffect` as the only contract for Pi adapter side effects.

#### Scenario: Modal router delegates to feature handlers

- **WHEN** `handleModalInput` receives input for normal dispatch, prompt search, Ex command-line flow, visual behavior, macro behavior, or inspect/message diagnostics
- **THEN** it routes to focused modal feature handlers or shared helpers rather than growing one monolithic feature switch

#### Scenario: Feature handlers return adapter-applied effects

- **WHEN** a modal feature handler needs prompt text edits, cursor restoration, Pi delegation, macro playback, invalidation, adapter commands, or terminal cursor hints
- **THEN** it returns typed modal effects or modal updates for `VimEditor` to apply instead of calling Pi or TUI APIs directly

#### Scenario: Side effects remain explicit

- **WHEN** feature handlers update registers, marks, dot-repeat state, search highlights, visual state, Ex messages, message history, cursor targets, or Pi delegation intent
- **THEN** those side effects are represented in `ModalState`, `EditResult`, or `ModalEffect` and remain covered by focused tests

#### Scenario: VimEditor remains the Pi adapter

- **WHEN** the modal feature modules are imported in tests
- **THEN** they run without constructing Pi `CustomEditor`, TUI, theme, keybinding, or lifecycle objects, and `VimEditor` remains the only layer applying Pi runtime calls

### Requirement: Golden modal effect tests guard behavior-preserving extraction

The change SHALL add golden semantic tests that lock modal state/effect behavior before and during feature-module extraction.

#### Scenario: Golden tests cover high-risk feature families

- **WHEN** `bun test` is executed
- **THEN** tests cover normalized state/effect output for prompt search, Ex command-line entry/cancel/history/preview/apply/error behavior, visual char/line/block operations, macro record/play behavior, register/mark interactions, protected Pi delegation, and message/highlight state

#### Scenario: Golden tests normalize stable contract details

- **WHEN** golden modal effect tests assert modal updates
- **THEN** they compare stable semantic fields such as effect type/order, changed text, cursor target, register type/count, message kind/text, preview range counts, and relevant state flags rather than brittle raw internal dumps

#### Scenario: Adapter tests stay focused after extraction

- **WHEN** behavior is covered by parser, buffer, modal feature, and golden effect tests
- **THEN** adapter-level tests verify live editor construction, effect application, render/workbench integration, cursor restoration, and Pi delegation smoke behavior without duplicating every feature edge case

### Requirement: Modal engine functions stay reviewable after extraction

The modal architecture SHALL keep modal coordinator functions small enough for review by moving feature-specific branches into named helpers or modules.

#### Scenario: Oversized handlers are reduced

- **WHEN** `applyCommand`, `executeExCommand`, `handleNormalInput`, or `handleVisualInput` would exceed the project guideline for readable TypeScript functions
- **THEN** feature-specific behavior is extracted to focused helpers or modules while preserving current user-facing behavior

#### Scenario: Extraction avoids cross-feature cycles

- **WHEN** feature modules need shared helpers such as pending-state clearing, effect construction, message logging, or source visual restoration
- **THEN** they import those helpers from shared modal core modules rather than importing other feature modules in cycles
