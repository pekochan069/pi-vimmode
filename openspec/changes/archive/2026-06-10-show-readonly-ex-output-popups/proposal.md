## Why

Read-only Ex help and diagnostic commands can produce dense output that is hard to read when squeezed into the one-line workbench/message row. pi-vimmode already has a real TUI overlay for `:features keybindings`; this change generalizes that pattern so all read-only help/diagnostic Ex output uses a bounded popup while prompt-editing commands keep their current inline/editor behavior.

## What Changes

- Route successful read-only Ex help and diagnostic outputs to a centered, bounded, scrollable popup instead of the transient inline row:
  - `:help`
  - `:help <topic>`
  - `:features`
  - `:features <query>`
  - `:actions <query>`
  - `:keymap <action>`
  - `:mapcheck <key>`
  - `:messages`
  - `:vimmode inspect`
  - `:vimdoctor`
- Generalize the existing keybinding discovery popup into a reusable read-only Ex help/diagnostic overlay surface, preserving the current `:features keybindings` behavior as one content type.
- Keep popup controls prompt-safe: `Esc`, `Ctrl-C`, and `Ctrl-G` close; `j`/`k` and arrow keys scroll locally when content overflows.
- Keep edit and mutation Ex commands on their existing paths: `:s`, `:d`, `:y`, `:put`, `:copy`, `:move`, `:join`, prompt transforms, and `:noh` continue to use normal edit effects or compact workbench feedback.
- Keep parser errors, edit-flow success/errors, and unsupported command errors as compact transient messages unless a valid read-only command produced bounded informational output.
- Preserve prompt-local read-only side effects: popup display and popup scrolling do not edit prompt text, move the prompt cursor, update registers, marks, macros, search state, dot-repeat, or macro recording, and do not add popup content to retained runtime message history unless an existing command intentionally records a separate bounded history entry.

### Non-goals

- No full Vim help tags, Vim pager, `:map`, `:action`, command palette, Vimscript, Neovim Lua, plugin API, or diagnostic/help action keybinding dispatch.
- No change to mutating Ex command semantics, prompt transform behavior, substitution preview/apply flow, or `:noh` behavior.
- No new runtime settings or user-facing configuration surface unless implementation discovers an unavoidable accessibility/compatibility need.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `runtime-help-drift-guard`: Runtime help and feature discovery display behavior changes from mostly compact inline messages to popup-backed read-only output, while remaining finite and source-backed.
- `vim-ex-command-line`: Read-only diagnostic/runtime-help Ex commands execute through a popup display effect; mutating Ex commands and parser errors keep existing prompt-local behavior.
- `vim-runtime-inspectability`: `:messages` and `:vimmode inspect` move to popup output while preserving bounded, redacted, read-only, message-history-safe behavior.
- `vim-ui-configuration`: The UI contract expands from keybinding-specific popup support to a generic bounded read-only overlay; workbench rows remain for edit feedback and compact transient messages.
- `pi-vimmode-documentation`: User docs must list popup-backed commands, popup controls, fallback/limitations, and the distinction between read-only popup output and compact edit feedback.

## Impact

- Affected code seams:
  - `src/keybinding-discovery-popup.ts` and `src/keybinding-discovery-overlay.ts`: generalize keybinding-specific popup data/component or introduce `ExHelpOverlayComponent` with reusable content models.
  - `src/modal/ex-command-line.ts`: route diagnostic, runtime-help, and inspect read-only outputs through a popup modal effect after source-mode restoration.
  - `src/modal/types.ts`: adjust popup/effect types if the existing `HelpPopup` / `openHelpPopup` names become generic.
  - `src/vim-editor.ts`: apply the generic popup effect through `tui.showOverlay()` while keeping `VimEditor` as the only Pi TUI integration layer.
  - `src/runtime-help.ts`, `src/diagnostic-actions.ts`, and `src/customization.ts`: shape popup-friendly bounded lines from existing source-backed messages without duplicating registries.
- Tests:
  - Update modal effect tests for a generic popup/open-overlay effect.
  - Update live `VimEditor` overlay tests for representative commands from each read-only group.
  - Add or update runtime-help, inspectability, docs-drift, and overlay scroll/dismiss tests.
- Docs:
  - Update `docs/features.md` to document all popup-backed read-only commands and controls.
  - Update docs-drift expectations that currently distinguish only `:features keybindings` as popup-backed.
- Dependencies:
  - No new runtime dependencies expected.
  - No peer/runtime dependency changes expected.
- Compatibility:
  - No breaking changes to prompt editing or existing Ex command semantics.
  - Visual presentation changes for read-only diagnostic/help commands from inline row to popup are intentional user-facing behavior changes.
