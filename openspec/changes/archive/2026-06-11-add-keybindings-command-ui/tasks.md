## 1. Keybinding catalog helpers

- [x] 1.1 Add focused tests for keybinding catalog summary output: default commands/motions/operators/text objects/macros/marks/searches, prompt transform action bindings, diagnostic/help metadata, and protected shortcut categories.
- [x] 1.2 Add focused tests for `:keybindings <query>` detail matching by action ID, description, key sequence, Ex command name, diagnostic/help metadata ID, protected shortcut, and finite no-match result.
- [x] 1.3 Implement source-backed catalog/detail helper(s) using `actionEntriesForKeymap`, effective resolved options, prompt transform action bindings, diagnostic action metadata, retained warnings, and protected shortcut metadata.
- [x] 1.4 Add a `keybindingsPopup(options, diagnostics, query?)` builder returning existing `ReadOnlyPopup` shape with bounded lines, canonical IDs, non-bindable metadata labels, protected shortcut wording, and no runtime `:map` claims.
- [x] 1.5 Keep `:features keybindings` popup behavior working and add regression coverage that old entry point still opens source-backed keybinding discovery output.

## 2. Ex parser and read-only popup execution

- [x] 2.1 Add parser tests for `keybindings`, `keybindings redo`, `keybindings ctrl+p`, and unsupported names such as `keybinding`, `keys`, `map`, and `nmap`.
- [x] 2.2 Extend `src/ex.ts` types and finite parser to return a read-only keybindings parse result with optional query text.
- [x] 2.3 Add modal tests for `:keybindings` from normal Ex mode opening a read-only popup without editing prompt text, cursor, registers, marks, macros, search highlights, or dot-repeat state.
- [x] 2.4 Add modal tests for `:keybindings <query>` preserving retained runtime message history when popup opens, scrolls, and dismisses.
- [x] 2.5 Add modal tests for visual Ex source mode restoring original visual mode, anchor, cursor, and highlight while opening the keybindings popup.
- [x] 2.6 Wire `src/modal/ex-command-line.ts` to open `keybindingsPopup(...)` through the existing read-only popup effect path.
- [x] 2.7 Update popup command metadata such as `READ_ONLY_POPUP_COMMANDS` so drift tests can validate `:keybindings` coverage.

## 3. Configurable semantic keybinding command

- [x] 3.1 Add config tests showing `piVimMode.keymap.commands.showKeybindings` defaults to `[]`, accepts a valid binding, rejects protected shortcuts, rejects exact conflicts, and rejects prefix-shadow conflicts while preserving valid siblings.
- [x] 3.2 Add type/config support for `VimCommandAction` `showKeybindings` across `src/types.ts`, `src/config.ts` defaults, clone/merge helpers, conflict detection, descriptions, and keymap diagnostics.
- [x] 3.3 Add command resolver tests proving configured `showKeybindings` resolves through the existing finite command parser and does not split prefix handling from other semantic commands.
- [x] 3.4 Add modal tests proving configured `showKeybindings` opens the same read-only popup from normal mode and does not mutate prompt text, registers, search state, dot-repeat, or retained diagnostics.
- [x] 3.5 Add insert-mode regression test proving the configured key delegates to Pi default behavior in insert mode.
- [x] 3.6 Add live `VimEditor` construction test proving resolved `commands.showKeybindings` survives option cloning without dropping other command, motion, operator, macro, mark, search, UI, or prompt-transform options.
- [x] 3.7 Ensure metadata-only IDs such as `vimmode.keybindings`, `vimmode.keymap`, and `vimmode.help` remain rejected from `piVimMode.keymap.actions` with warnings and no dispatch path.

## 4. Adapter and overlay integration

- [x] 4.1 Add adapter tests proving `:keybindings` launches the existing centered read-only overlay and does not append keybinding rows to normal editor render output.
- [x] 4.2 Add adapter tests proving a configured `showKeybindings` normal-mode key launches the same overlay shell as the Ex command.
- [x] 4.3 Reuse `ReadOnlyPopupOverlayComponent` for keybindings output and keep row width, body-row cap, local `j`/`k`/arrow scrolling, and `Esc`/`Ctrl-C`/`Ctrl-G` dismissal behavior unchanged.
- [x] 4.4 Verify popup source/title/query fields distinguish `:keybindings` from `:features keybindings` while sharing content where intended.

## 5. Runtime help, metadata, and docs drift

- [x] 5.1 Add `vimmode.keybindings` diagnostic/help metadata as metadata-only/not-bindable, or document why existing popup command metadata is sufficient, then update tests accordingly.
- [x] 5.2 Update runtime help/feature discovery summaries so users can discover `:keybindings` directly while `:features keybindings` remains supported.
- [x] 5.3 Update `docs/features.md` with `:keybindings`, `:keybindings <query>`, popup controls, read-only state boundaries, examples, and non-goals.
- [x] 5.4 Update `docs/settings.md` with `piVimMode.keymap.commands.showKeybindings`, default `[]`, validation rules, protected shortcuts, conflict behavior, and insert-mode delegation.
- [x] 5.5 Keep README as quickstart/index only; avoid duplicating the full keybindings reference there unless a short pointer is needed.
- [x] 5.6 Update docs-drift tests to validate `:keybindings` parser/popup/docs/spec/test anchors, non-goal wording, source-backed action IDs, and protected shortcut coverage.
- [x] 5.7 Run `graphify update .` after code/doc changes to refresh the project graph.

## 6. Validation

- [x] 6.1 Run `bun test`.
- [x] 6.2 Run `bun run check-types`.
- [x] 6.3 Run `bun run lint`.
- [x] 6.4 Run `bun run format:check`.
- [x] 6.5 Run `openspec validate add-keybindings-command-ui --strict`.
- [x] 6.6 Run `openspec validate --specs --strict`.
