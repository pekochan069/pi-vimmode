## Why

Runtime discovery for keybindings and actions is becoming too dense for one-row status feedback. The first implementation made `:features keybindings` readable but still looked like the Ex/workbench section simply grew taller, and an overflow row such as `… 8 more` was not actionable. Users need a visually distinct, prompt-local discovery surface that can reveal hidden rows without implying Vim help pager, command palette, plugin API, or runtime mapping support.

## What Changes

- Add a dedicated bounded read-only keybinding discovery overlay popup for selected keybinding-oriented runtime help output, starting with `:features keybindings`.
- Render the popup as a visually distinct floating overlay with title/border/body/footer treatment rather than plain inline Ex/workbench rows.
- Show finite multi-line keybinding discovery content sourced from existing metadata: action keybinding recipes/presets, accepted `piVimMode.keymap.actions` bindings, prompt transform action metadata, diagnostic/help metadata limits, and protected shortcut catalog notes where relevant.
- When popup content exceeds visible rows, keep height bounded but provide local scroll controls so users can reach rows hidden behind indicators like `… 8 more`.
- Make the popup dismissible through existing cancel/reset behavior such as `Esc`, without mutating prompt text or modal editing state.
- Preserve current one-line behavior for unrelated diagnostics/runtime-help commands and for compatibility-sensitive surfaces unless explicitly opted into popup rendering by this change.
- Keep `:messages` behavior unchanged; popup content and popup scroll events must not pollute retained message history.
- Non-goals: no full Vim/Neovim help pager, no help tags, no fuzzy command palette, no runtime `:map`, no `:action`, no plugin API, no recursive mappings, no default action keybindings, no broad UI framework rewrite, no unbounded output log. Popup scrolling is local, finite, and panel-scoped only.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `runtime-help-drift-guard`: Runtime feature discovery may present selected keybinding help in a dedicated bounded overlay popup while remaining finite, source-backed, documented, drift-guarded, and locally scrollable when content overflows.
- `vim-customization-diagnostics`: Read-only customization/keybinding discovery state boundaries extend to popup display, popup-local scrolling, and dismissal.
- `vim-runtime-inspectability`: Runtime message history remains separate from transient/popup discovery output; `:messages` does not retain popup output or popup scroll events.
- `pi-vimmode-documentation`: User docs explain the finite keybinding discovery overlay popup, scroll controls, dismissal behavior, source-backed scope, and non-goals.

## Impact

- Affected code seams: `src/modal/types.ts` for popup/open-overlay effects, `src/modal/ex-command-line.ts` for routing selected discovery commands, `src/keybinding-discovery-popup.ts` for source-backed content, `src/keybinding-discovery-overlay.ts` for overlay-local rendering/scrolling, and `src/vim-editor.ts` for adapter-applied Pi TUI overlay opening.
- Tests: add/update focused runtime-help/modal/render tests for `:features keybindings` dedicated popup visuals, scrollability, overflow indicators, scroll bounds, `Esc` dismissal, read-only side-effect invariants, `:messages` non-retention, width/bounds behavior, and docs-drift anchors.
- Docs: update `docs/features.md` with the dedicated overlay popup and scroll controls; update docs-drift tests as needed.
- Dependencies: no new runtime dependencies and no peer/runtime dependency changes.
- Compatibility: no breaking changes; existing one-line discovery commands remain available unless specifically upgraded by the finite popup entry point.
