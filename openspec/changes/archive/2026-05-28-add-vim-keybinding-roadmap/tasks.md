## 1. Parser and State Foundations

- [x] 1.1 Extend Vim action/type definitions for count-aware commands, word-end motion, numeric adjustment, replacement/substitution, character search, dot-repeat, and text-object operator targets
- [x] 1.2 Add command-parser tests for numeric count prefixes, `0` line-start preservation, invalid count clearing, and counted operator/command resolution
- [x] 1.3 Implement parser support for count prefixes and thread resolved counts through normal commands, motions, line commands, and operator targets
- [x] 1.4 Add modal state fields for last successful character search and last repeatable change without changing existing macro, register, mark, or visual state behavior

## 2. Phase 1 Editing Commands

- [x] 2.1 Add pure buffer helpers and tests for word-end movement and operator ranges using `e`
- [x] 2.2 Add default keymap/config support for the word-end motion and allowed operator-motion combinations
- [x] 2.3 Implement normal/visual/operator handling for `e`, including counted movement where applicable
- [x] 2.4 Add pure buffer helpers and tests for numeric increment/decrement on supported number formats
- [x] 2.5 Implement `Ctrl+A` and `Ctrl+X` in normal mode with count support and safe no-op behavior when no number is found
- [x] 2.6 Add pure buffer helpers and tests for `r{char}`, `s`, and `S`, including register updates and cursor placement
- [x] 2.7 Implement `r{char}`, `s`, and `S` in normal mode with count behavior where supported

## 3. Phase 2 Search and Repeat

- [x] 3.1 Add parser tests and pending-state handling for `f`, `F`, `t`, and `T` character targets
- [x] 3.2 Add pure buffer helpers and tests for line-local character search, till-search placement, reverse search, and missing-target no-ops
- [x] 3.3 Implement normal-mode `f`, `F`, `t`, `T`, `;`, and `,` using modal last-search state
- [x] 3.4 Define and test the first dot-repeat allowlist for completed change commands
- [x] 3.5 Implement `.` repeat for supported completed changes and safe no-op behavior for missing or unsupported repeat state

## 4. Phase 3 Text Objects

- [x] 4.1 Add parser tests for operator text-object targets: `iw`, `aw`, quote objects, and bracket objects
- [x] 4.2 Implement finite pending-state resolution for operator text-object targets and invalid text-object input clearing
- [x] 4.3 Add pure buffer helpers and tests for `iw` and `aw` range discovery, including boundary whitespace behavior
- [x] 4.4 Add pure buffer helpers and tests for quote and bracket inner/around range discovery, including unmatched delimiter no-ops
- [x] 4.5 Wire text-object ranges into delete, change, and yank operator handling with register and mode semantics

## 5. Configuration and Compatibility

- [x] 5.1 Extend default keymap resolution and validation tests for newly configurable roadmap motions and finite commands
- [x] 5.2 Verify `Ctrl+A` / `Ctrl+X` are explicitly owned only in supported Vim command contexts and other protected Pi shortcuts still delegate
- [x] 5.3 Add tests proving existing registers, macros, marks, visual modes, paste behavior, and Pi shortcut delegation still pass with new parser state

## 6. Documentation and Validation

- [x] 6.1 Update README keymap tables with counts, `Ctrl+A`, `Ctrl+X`, `e`, `r`, `s`, `S`, `f/F/t/T`, `;`, `,`, `.`, and supported text objects
- [x] 6.2 Document roadmap limitations, including numeric parsing subset, dot-repeat allowlist, configurable versus fixed roadmap keys, and deferred `/`, `?`, `n`, `N` search
- [x] 6.3 Run `bun test` and fix failures
- [x] 6.4 Run `bun run check-types`, `bun run lint`, and `bun run format:check` and fix failures
