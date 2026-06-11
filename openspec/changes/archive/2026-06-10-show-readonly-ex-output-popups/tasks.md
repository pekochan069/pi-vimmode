## 1. Popup Model and Content Builders

- [x] 1.1 Add a generic read-only popup data model that can represent runtime help, feature discovery, customization diagnostics, `:messages`, `:vimmode inspect`, and keybinding discovery output.
- [x] 1.2 Refactor the existing keybinding discovery popup builder to emit the generic popup model while preserving current `:features keybindings` content and docs anchor.
- [x] 1.3 Add popup content builders or adapters for `:help`, `:features`, `:actions`, `:keymap`, `:mapcheck`, `:vimdoctor`, `:messages`, and `:vimmode inspect` using existing source-backed registries/messages instead of duplicating metadata.
- [x] 1.4 Add focused unit tests for generic popup content titles, bounded line arrays, keybinding discovery compatibility, empty/no-match runtime help output, and `:messages` empty-history output.

## 2. Overlay Component and Adapter Boundary

- [x] 2.1 Generalize `KeybindingDiscoveryOverlayComponent` into a reusable read-only Ex help/diagnostic overlay component, or wrap it with a generic component while preserving visual style.
- [x] 2.2 Keep overlay-local controls in the component: `Esc`/`Ctrl-C`/`Ctrl-G` close; `j`/`k` and Up/Down scroll; scroll offset clamps at content bounds.
- [x] 2.3 Update overlay render tests for width fitting, capped height, range/scroll indicators, empty content, and hidden-row reachability.
- [x] 2.4 Add a too-small-terminal fallback in the adapter if the overlay cannot be displayed, with bounded visible feedback and no prompt-state mutation.

## 3. Modal Effect and Ex Command Routing

- [x] 3.1 Rename or extend the modal popup effect from keybinding-specific `openHelpPopup` to a generic read-only popup effect in `src/modal/types.ts`.
- [x] 3.2 Route successful runtime help commands (`:help`, `:help <topic>`, `:features`, `:features <query>`) through the generic popup effect.
- [x] 3.3 Route successful customization diagnostic commands (`:actions`, `:actions <query>`, `:keymap`, `:keymap <action>`, `:mapcheck <key>`, `:vimdoctor`) through the generic popup effect.
- [x] 3.4 Route successful inspectability commands (`:messages`, `:vimmode inspect`) through the generic popup effect while preserving `:messages` non-retention semantics.
- [x] 3.5 Preserve compact workbench behavior for parser errors, unsupported abbreviations, mutating Ex commands, prompt transforms, `:noh`, substitution preview/apply, and optional no-op feedback.
- [x] 3.6 Add modal tests covering popup effects for normal-source and visual-source Ex commands, no-match runtime help output, unsupported command inline errors, and existing mutating command behavior.

## 4. Side-Effect Regression Coverage

- [x] 4.1 Add tests proving popup display, scroll, and dismissal do not edit prompt text or move the prompt cursor.
- [x] 4.2 Add tests proving popup-backed commands do not write unnamed or named registers.
- [x] 4.3 Add tests proving popup-backed commands do not change marks, macro slots, macro recording state, or macro playback state.
- [x] 4.4 Add tests proving popup-backed commands do not clear search highlights or alter repeat-search state.
- [x] 4.5 Add tests proving popup-backed commands do not update dot-repeat and do not replace previous repeatable edits.
- [x] 4.6 Add tests proving visual-source Ex popup commands restore visual mode, visual anchor/cursor, and visual range rendering.
- [x] 4.7 Add tests proving popup content, popup scroll, and popup dismissal do not pollute retained runtime message history, including repeated popup opens and `:messages` output.

## 5. Live VimEditor and Pi Adapter Integration

- [x] 5.1 Update `src/vim-editor.ts` to apply the generic popup effect through `tui.showOverlay()` while keeping `VimEditor` as the only Pi TUI integration layer.
- [x] 5.2 Add live editor tests for representative popup-backed commands from each group: `:help search`, `:features redo`, `:actions redo`, `:keymap redo`, `:mapcheck ctrl+p`, `:vimdoctor`, `:messages`, and `:vimmode inspect`.
- [x] 5.3 Add live editor tests showing popup output is absent from main editor render rows while compact workbench feedback still appears for edit-flow messages and parser errors.
- [x] 5.4 Verify protected Pi shortcuts remain delegated outside the popup path and popup-local `Ctrl-C`/`Ctrl-G` close the overlay without invoking prompt editing behavior.
- [x] 5.5 Confirm no new config surface is needed; if one is added, update `src/config.ts`, `src/types.ts`, `VimEditor` `cloneOptions`, settings docs, config tests, and live option-propagation tests.

## 6. Documentation and Drift Guards

- [x] 6.1 Update `docs/features.md` to list all popup-backed read-only Ex commands, popup controls, message-history behavior, compact-feedback boundaries, and non-goals.
- [x] 6.2 Update runtime help/docs-drift metadata and tests so stale claims that only `:features keybindings` opens a popup fail validation.
- [x] 6.3 Update docs-drift tests for popup docs anchors, parser-backed command coverage, diagnostic action metadata, and keybinding recipe/preset references.
- [x] 6.4 Update or remove the completed `TODOS.md` item after implementation lands.

## 7. Validation

- [x] 7.1 Run `bun test`.
- [x] 7.2 Run `bun run check-types`.
- [x] 7.3 Run `bun run lint`.
- [x] 7.4 Run `bun run format:check`.
- [x] 7.5 Run `openspec validate --specs --strict`.
