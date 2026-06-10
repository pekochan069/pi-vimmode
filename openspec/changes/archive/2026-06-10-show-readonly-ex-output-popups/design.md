## Context

pi-vimmode currently has two read-only output paths for Ex help and diagnostics:

- Most read-only commands (`:help`, `:features` except keybinding discovery, `:actions`, `:keymap`, `:mapcheck`, `:messages`, `:vimmode inspect`, `:vimdoctor`) exit Ex command-line mode and place a compact informational message in the existing workbench/message row.
- `:features keybindings` already returns an `openHelpPopup` modal effect that `VimEditor` applies with `tui.showOverlay()` and `KeybindingDiscoveryOverlayComponent`.

The existing keybinding popup proves the desired architecture: modal code chooses a finite source-backed read-only result, while the Pi adapter owns TUI overlay creation. The remaining work is to generalize that path so every valid read-only help/diagnostic Ex output uses the popup UI instead of inline rows.

Constraints:

- Keep pi-vimmode scoped to practical Pi prompt editing, not full Vim/Neovim help parity.
- Keep `src/ex.ts` finite; do not add arbitrary command dispatch or Vimscript behavior.
- Keep `src/modal/*` pure with typed effects; no TUI calls outside `VimEditor`.
- Preserve existing prompt-editing side effects: registers, marks, search highlights, dot-repeat, cursor placement, macro state, visual restoration, and Pi delegation remain explicit and tested.
- No new config surface is planned, so `src/config.ts`, `src/types.ts`, `VimEditor` `cloneOptions`, and live editor tests should only change if implementation discovers an unavoidable option propagation need.
- User-facing behavior changes must update `docs/features.md` and docs-drift tests because behavior source of truth flows through OpenSpec, source-backed runtime help metadata, docs, and tests.

## Goals / Non-Goals

**Goals:**

- Provide one reusable popup UI for all valid read-only Ex help/diagnostic outputs listed in the proposal.
- Preserve the existing `:features keybindings` popup behavior while removing keybinding-specific coupling from generic overlay code.
- Keep mutating Ex commands and edit feedback on their existing edit/workbench paths.
- Keep popup display and popup-local input read-only: no prompt text edits, cursor movement, register writes, mark changes, macro recording/playback changes, search-state changes, dot-repeat updates, or Pi shortcut delegation.
- Restore the original normal/visual source mode after a read-only Ex command opens the popup, matching existing diagnostic source-mode restoration semantics.
- Prevent popup content and popup scroll/dismiss events from polluting retained runtime message history; retain only pre-existing bounded history semantics that are intentionally separate from popup content.
- Document and validate popup controls, command coverage, source-backed finite content, and non-goals.

**Non-Goals:**

- No full Vim help tags, help pager, `:map`, `:action`, command palette, recursive mappings, Vimscript, Neovim Lua, `.vimrc`, plugin API, or diagnostic/help action keybinding dispatch.
- No new runtime dependencies.
- No new settings by default.
- No change to substitution preview/apply, line-editing Ex commands, prompt transforms, `:noh`, or parser-error handling.
- No persistent help log and no raw prompt/register/macro dump in popup content.

## Decisions

### Decision 1: Generalize popup data and component instead of adding more inline rows

**Target seams:** `src/keybinding-discovery-popup.ts`, `src/keybinding-discovery-overlay.ts`, `src/modal/types.ts`, `src/vim-editor.ts`.

Create a generic read-only popup model such as `ExHelpPopup` with fields for title, lines, source command/category, docs anchor, and scroll offset. Rename or wrap the current keybinding-specific builder/component into a reusable `ExHelpOverlayComponent`. Keep keybinding discovery as one content builder that produces the generic model.

**Alternatives considered:**

- Keep appending multiline rows in `VimEditor.render()`: rejected because it looks like an expanded Ex workbench area, shrinks prompt viewport unpredictably, and contradicts the existing real-overlay pattern.
- Add a separate overlay class for each command: rejected because scroll/dismiss/width behavior would drift and tests would duplicate the same UI contract.
- Keep the current keybinding-specific type and overload it for every command: rejected because fixed fields like `query: "keybindings"` and keybinding docs anchors would make generic diagnostics misleading.

### Decision 2: Route valid read-only command results through one modal popup effect

**Target seams:** `src/modal/ex-command-line.ts`, `src/modal/types.ts`, `src/vim-editor.ts`.

Add or rename a modal effect such as `openReadOnlyPopup` / `openHelpPopup` that carries the generic popup model. `executeExCommand` should convert successful parsed read-only commands into popup content after applying the existing source-mode restoration logic. `VimEditor` remains the only layer that calls `tui.showOverlay()`.

Covered read-only command groups:

- Runtime help: `:help`, `:help <topic>`, `:features`, `:features <query>`.
- Customization diagnostics: `:actions <query>`, `:keymap <action>`, `:mapcheck <key>`, `:vimdoctor`.
- Inspectability: `:messages`, `:vimmode inspect`.

**Alternatives considered:**

- Let runtime-help builders call TUI directly: rejected because modal modules must not depend on Pi/TUI runtime APIs.
- Add a new parser command class for popups: rejected because parsing already distinguishes runtime help, diagnostics, and inspectability; popup is display policy, not syntax.
- Treat `:messages` as a persistent log view: rejected because existing requirements keep message history bounded, prompt-local, and non-pager-like.

### Decision 3: Preserve compact workbench feedback for edit flows, parser errors, and `:noh`

**Target seams:** `src/modal/ex-command-line.ts`, `src/vim-editor.ts`, `src/render.ts`.

Only valid read-only help/diagnostic command output moves to popup. Mutating/editing Ex commands continue to produce edit effects and compact success/error feedback. Parser errors and unsupported command errors remain transient Ex/workbench messages because they are short command-line feedback, not read-only help content. `:noh` remains a compact no-op-style Ex command because it clears search highlights and has no informational body.

**Alternatives considered:**

- Put every Ex result, including edit successes and errors, in a popup: rejected because it would interrupt editing flows and blur read-only help with mutation feedback.
- Put parser errors in the popup: rejected because syntax errors are part of command-line correction, and existing transient row semantics are faster and sufficient.

### Decision 4: Popup content uses existing source-backed message builders, split into bounded lines

**Target seams:** `src/runtime-help.ts`, `src/customization.ts`, `src/diagnostic-actions.ts`, `src/modal/inspect.ts`, docs-drift tests.

Do not create a second source-of-truth registry for popup content. Reuse current source-backed runtime help entries, diagnostic action metadata, customization messages, and inspectability summaries, but expose popup-friendly line arrays/title metadata. Existing compact messages may remain as formatting helpers or fallback text, but docs/spec/test anchors must validate popup-backed behavior.

**Alternatives considered:**

- Duplicate current messages into popup-only strings: rejected because runtime help, docs, specs, and tests would drift.
- Generate unbounded multi-line output directly from registries: rejected because popup content must remain finite, width-safe, redacted, and scrollable.

### Decision 5: Popup-local controls stay inside overlay component

**Target seams:** generic overlay component and live `VimEditor` overlay tests.

The overlay component owns read-only input handling:

- Close: `Esc`, `Ctrl-C`, `Ctrl-G`.
- Scroll: `j`, `k`, Down, Up.
- Clamp scroll offset within content bounds.

The prompt editor must not receive these overlay-local keys while the overlay is focused. Popup input must not edit prompt text, change prompt cursor, update macro recording, affect search highlights, or append runtime messages.

**Alternatives considered:**

- Route popup scroll through modal state: rejected because scrolling is presentation-local and should not alter prompt modal semantics.
- Use prompt motions for popup scroll: rejected because it risks moving the prompt cursor or recording macro input.

### Decision 6: Small-terminal behavior is explicit and bounded

**Target seams:** `src/vim-editor.ts`, overlay options, live editor tests.

For supported terminal sizes, read-only command output opens the centered overlay. If the terminal cannot satisfy the minimum viable overlay viewport, the adapter should use a bounded fallback that does not edit prompt text or lose state, such as a compact transient message telling the user the terminal is too small for the popup. This fallback is a last-resort accessibility/visibility guard, not the normal display path.

**Alternatives considered:**

- Always attempt overlay even when invisible: rejected because users may receive no visible feedback.
- Force a one-cell-wide popup: rejected because content becomes unreadable and width-safety logic becomes brittle.

## Risks / Trade-offs

- **Message-history pollution** → Popup display, scroll, and dismissal must not append popup content to `messageHistory`. Preserve `:messages` special behavior where the output itself is not retained.
- **Visual source-mode regression** → Reuse existing `restoreVisualExState` behavior before opening popup and add live tests from visual mode for representative commands.
- **Naming drift from keybinding-specific types** → Rename generic model/effect/component or clearly separate generic fields from keybinding discovery content.
- **Docs-drift failures** → Update specs and `docs/features.md` together with source-backed runtime help/docs-drift tests; remove stale claims that only `:features keybindings` uses popup.
- **Overlay focus/input bugs** → Test that overlay-local keys close/scroll without changing prompt text, cursor, macro recording, registers, marks, search highlights, or dot-repeat source.
- **Too-small terminal ambiguity** → Define and test bounded fallback behavior so valid commands never silently disappear.
- **Overlarge diagnostic bodies** → Keep content finite and redacted; rely on popup scroll for overflow, not unbounded row emission.
- **Config propagation churn** → Avoid new settings. If implementation adds one, update `src/config.ts`, `src/types.ts`, `cloneOptions`, settings docs, config tests, and live editor propagation tests in the same change.

## Migration Plan

1. Introduce generic popup model/builders and adapt the existing keybinding discovery popup to use them.
2. Generalize overlay component rendering and local input handling without changing current keybinding popup behavior.
3. Rename or extend modal effect types and adapter handling to open generic read-only popups.
4. Route runtime help, customization diagnostics, and inspectability command outputs through the generic popup effect.
5. Preserve compact row behavior for mutating Ex commands, parser errors, unsupported commands, `:noh`, substitution preview/apply, and no-op feedback.
6. Update tests from narrow keybinding popup coverage to representative command groups, visual-source restoration, scroll/dismiss, history safety, and fallback behavior.
7. Update `docs/features.md` and docs-drift tests to reflect popup-backed read-only output.
8. Validate with `bun test`, `bun run check-types`, `bun run lint`, `bun run format:check`, and `openspec validate --specs --strict`.

Rollback strategy: if the generic popup path regresses, keep the reusable content builders but temporarily route affected command groups back to the prior compact message path while preserving `:features keybindings` overlay behavior and tests.

## Open Questions

- What exact minimum terminal width/height should qualify for overlay display, and should it match the current keybinding popup thresholds or be lowered for generic help output?
- Should popup titles use command names (`:help search`) or broader categories (`Runtime help`) when command output is a no-match/empty result?
- Should `:actions` with no query be popup-backed too? The TODO names `:actions <query>`, while current parser/runtime behavior supports optional query for `:actions`; implementation should either include the no-query form for consistency or explicitly document why it stays compact.
