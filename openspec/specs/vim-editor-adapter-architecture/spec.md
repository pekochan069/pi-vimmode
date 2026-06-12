# vim-editor-adapter-architecture Specification

## Purpose

TBD - created by archiving change deepen-vimeditor-pi-adapter-modal-editing-module. Update Purpose after archive.
## Requirements
### Requirement: VimEditor acts as the Pi adapter

The Vim editor SHALL keep `VimEditor` as the Pi-facing `CustomEditor` adapter while moving modal editing semantics out of the adapter class.

#### Scenario: Pi constructs the editor

- **WHEN** Pi creates a prompt editor through the extension factory
- **THEN** the constructed editor is still a `VimEditor` instance compatible with Pi's `CustomEditor` integration

#### Scenario: Adapter owns Pi runtime calls

- **WHEN** modal editing logic needs Pi behavior such as default input handling, cursor movement, rendering, invalidation, or terminal cursor writes
- **THEN** the modal logic returns an adapter-applied intent instead of calling Pi or TUI APIs directly

#### Scenario: Modal module has no Pi runtime dependency

- **WHEN** the modal editing module is imported in tests
- **THEN** it can run without constructing Pi TUI, Pi theme, keybinding, or `CustomEditor` objects

### Requirement: Modal editing module owns modal state transitions

The modal editing module SHALL own Vim mode state transitions, pending command handling, register updates, and command execution decisions for supported prompt-editing behavior while delegating pure prompt text mechanics to operation-level prompt buffer APIs.

#### Scenario: Insert mode handles escape semantics

- **WHEN** the editor is in insert mode and receives `Esc`
- **THEN** the modal module decides whether to enter normal mode or request Pi delegation for active autocomplete behavior

#### Scenario: Normal mode handles finite command parsing

- **WHEN** the editor is in normal mode and receives a supported printable Vim key sequence
- **THEN** the modal module uses the finite command parser and returns state/effects for the supported command without inserting the printable key as text

#### Scenario: Pending command invalidates safely

- **WHEN** the editor is in normal mode with a pending `g`, `d`, `c`, or `y` command and receives an unsupported printable key
- **THEN** the modal module clears the pending command and returns no text insertion effect

#### Scenario: Visual modes preserve anchor behavior

- **WHEN** the editor is in characterwise visual mode or visual line mode and receives supported motion or operation keys
- **THEN** the modal module preserves current visual anchor semantics while using prompt buffer operation APIs for selection movement, yank, delete, change, cancel, or mode switching effects

#### Scenario: Prompt buffer operations replace low-level helper composition

- **WHEN** the modal module or adapter needs navigation, visual editing, linewise editing, operator-motion editing, or paste behavior
- **THEN** it calls prompt buffer operation APIs instead of assembling behavior from low-level text helper exports

### Requirement: Adapter applies modal effects with public Pi APIs

The Pi adapter SHALL apply modal effects using public Pi editor behavior and SHALL NOT depend on private Pi editor state.

#### Scenario: Structural edit applies text and cursor target

- **WHEN** the modal module returns a structural edit effect
- **THEN** the adapter updates prompt text through the supported editor text-update path and restores the cursor using public movement behavior

#### Scenario: Delegated shortcut remains Pi-owned

- **WHEN** the modal module returns a delegate effect for `Enter`, `Esc`, `Ctrl+C`, `Ctrl+D`, `Ctrl+G`, model or thinking shortcuts, image paste, or unknown non-printable input
- **THEN** the adapter delegates the original input to Pi's default editor behavior

#### Scenario: Terminal cursor hint remains best-effort

- **WHEN** the modal module returns a terminal cursor style or reset effect
- **THEN** the adapter applies it best-effort without making terminal support a correctness requirement

### Requirement: Refactor preserves existing user-facing behavior

The adapter/module split MUST preserve the current supported keymap, settings, rendering guarantees, registers, and Pi shortcut compatibility.

#### Scenario: Existing validation suite runs

- **WHEN** `bun test` is executed after the refactor
- **THEN** existing parser, buffer, render, config, and editor behavior tests pass without requiring changed user-facing expectations

#### Scenario: Type checking runs

- **WHEN** `bun run check-types` is executed after the refactor
- **THEN** the TypeScript project compiles without type errors

#### Scenario: Current keymap remains documented

- **WHEN** the user reads the README after the refactor
- **THEN** documented supported commands and limitations match current behavior unless a separate OpenSpec change adds new user-facing behavior

### Requirement: Modal behavior is independently testable

The change SHALL add modal-engine tests that cover behavior previously only reachable through the `VimEditor` adapter.

#### Scenario: Modal tests cover mode families

- **WHEN** `bun test` is executed
- **THEN** tests cover insert, normal, characterwise visual, and visual line modal transitions through the modal module

#### Scenario: Modal tests cover effect contracts

- **WHEN** `bun test` is executed
- **THEN** tests cover delegate effects, structural edit effects, register updates, pending operator clearing, mode feedback state, and terminal cursor style intents

#### Scenario: Adapter tests stay focused

- **WHEN** adapter-level tests are maintained after the refactor
- **THEN** they verify Pi integration smoke behavior and effect application instead of duplicating every parser and buffer edge case

### Requirement: Status and rendering boundaries remain width-safe

The refactor SHALL keep mode feedback and visual rendering width-safe while deepening active visual view construction inside the renderer and separating it from Pi-facing adapter rendering.

#### Scenario: Non-visual rendering delegates to Pi base renderer

- **WHEN** the editor renders outside visual modes
- **THEN** the adapter uses Pi's base editor rendering path and applies only the current status feedback and cursor marker restyling integration

#### Scenario: Visual renderer receives cohesive render input

- **WHEN** the editor renders in characterwise visual mode or visual line mode with an active anchor
- **THEN** the adapter passes one cohesive active-visual render input to the renderer instead of coordinating layout, wrapping, scrolling, highlight, or cursor-precedence details itself

#### Scenario: Visual rendering remains scoped

- **WHEN** the editor renders in characterwise visual mode or visual line mode with an active anchor
- **THEN** visual highlighting remains scoped to the selected range and rendered lines stay within the requested width

#### Scenario: Visual renderer owns active visual view mechanics

- **WHEN** the visual renderer receives prompt content, cursor, active visual state, cursor style, viewport data, and display hooks
- **THEN** it derives wrapped layout, scroll window, selected cell display, empty selected line display, cursor precedence, padding, and width-safe border or scroll indicator rows without requiring the Pi adapter to compute those details

#### Scenario: Status derivation is testable

- **WHEN** mode, pending command, or visual selection state changes
- **THEN** testable status/view helpers can derive the correct label and summary data without requiring Pi TUI objects

### Requirement: Real-editor scenarios validate behavior contracts

The Vim editor SHALL include test-only scenarios that exercise behavior through the actual `VimEditor` adapter when a contract can be broken by construction, option cloning, effect application, or adapter state integration.

#### Scenario: Adapter scenario covers option propagation

- **WHEN** a behavior option is configured through `VimEditor` construction
- **THEN** at least one real-editor scenario verifies that the option affects live editor behavior rather than only modal-engine behavior

#### Scenario: Adapter scenario harness remains test-only

- **WHEN** real-editor scenarios are added
- **THEN** they reuse or add test helpers under the test suite without introducing a new production editor-driver seam

#### Scenario: Focused modal tests retain locality

- **WHEN** behavior is validated through real-editor scenarios
- **THEN** focused modal-engine tests still cover the underlying state and effect contracts needed to diagnose failures locally

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

### Requirement: Read-only popup contract stays behind a shared seam

The modal editing architecture SHALL keep generic read-only popup state and pure popup helpers in a shared seam that is independent of feature-specific popup content builders.

#### Scenario: Modal types import generic popup state from the shared seam

- **WHEN** modal state or modal effects need to reference a read-only popup
- **THEN** they import the popup contract from the shared popup seam rather than from a keybinding-discovery, runtime-help, customization, or inspectability content module

#### Scenario: Feature content builders do not own popup mechanics

- **WHEN** runtime help, keybinding discovery, customization diagnostics, message history, or inspectability code builds popup content
- **THEN** it produces the shared read-only popup data shape without redefining popup state, body row sizing, message splitting, or scroll clamping

#### Scenario: Popup extraction avoids feature-content import cycles

- **WHEN** the project imports modal types, popup content builders, inspectability helpers, and read-only popup overlay code in tests
- **THEN** those imports do not require a cycle between keybinding-discovery content, modal inspectability content, and modal type definitions

### Requirement: Popup helper extraction preserves adapter effect boundary

Read-only popup helper extraction SHALL preserve `ModalEffect` as the only contract for opening popups from modal logic and SHALL keep Pi/TUI calls inside the `VimEditor` adapter or overlay component integration.

#### Scenario: Modal code opens popups through typed effects

- **WHEN** modal command handling opens a read-only popup for a supported help, feature, customization, message, or inspectability command
- **THEN** it returns the existing typed popup effect without calling Pi TUI APIs directly

#### Scenario: Popup-local controls remain prompt-safe

- **WHEN** a read-only popup is opened, scrolled, or dismissed after the seam extraction
- **THEN** prompt text, cursor position, registers, named registers, marks, macro slots, macro recording state, search highlights, visual state, dot-repeat state, and Pi delegation behavior remain governed by the existing modal effect and overlay contracts

