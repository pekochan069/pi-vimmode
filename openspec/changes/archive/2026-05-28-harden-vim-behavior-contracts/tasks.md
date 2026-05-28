## 1. Contract Baseline

- [x] 1.1 Add or update test-only real-editor helpers that construct `VimEditor`, feed input, and assert prompt text, cursor, mode/status, and visible effects without adding production seams
- [x] 1.2 Add focused modal-engine coverage for any behavior contract fixed through real-editor scenarios so failures retain locality

## 2. Mark Configuration Propagation

- [x] 2.1 Add real-editor scenario proving disabled marks do not set pending mark state or jump in live `VimEditor` behavior
- [x] 2.2 Add real-editor scenario proving restricted mark slots allow configured slots and reject non-configured slots in live `VimEditor` behavior
- [x] 2.3 Preserve `marks` in `VimEditor` option cloning so adapter construction honors resolved mark configuration

## 3. Dot-Repeat Contract

- [x] 3.1 Add tests showing `.` repeats successful `dd` and counted `dd` line deletes at the current line and updates the unnamed line register
- [x] 3.2 Add tests showing `.` repeats supported line change commands (`cc` and/or `S`) after returning to normal mode and re-enters insert mode at the new location
- [x] 3.3 Fix line-command repeat recording so documented completed line edit commands repeat only when they changed the prompt
- [x] 3.4 Verify unsupported or no-op actions still do not replace the previous repeatable change contract

## 4. Documentation Alignment

- [x] 4.1 Update README limitations so counts, text objects, line-local character search, and other supported roadmap keybindings are not listed as unsupported
- [x] 4.2 Keep prompt search (`/`, `?`, `n`, `N`) and command mode / Ex-style commands documented as deferred or unsupported
- [x] 4.3 Use glossary terms consistently: prompt buffer, line-local character search, and prompt search

## 5. Validation

- [x] 5.1 Run `openspec status --change harden-vim-behavior-contracts` and confirm all required artifacts are complete
- [x] 5.2 Run `bun test`
- [x] 5.3 Run `bun run check-types`
- [x] 5.4 Run `bun run lint`
- [x] 5.5 Run `bun run format:check` only as a read-only check; do not run formatting commands that rewrite files
