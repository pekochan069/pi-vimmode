## 1. Ex State and Parser

- [x] 1.1 Add Ex command-line state types for active command input, source mode, captured visual range, and transient messages.
- [x] 1.2 Add Ex command parser tests for empty commands, exact `s`/`substitute` names, unsupported commands, whitespace trimming, and lowercase-only flags.
- [x] 1.3 Implement Ex range parsing for implicit current line, `%`, `'<,'>`, numeric addresses, `.`, `$`, and comma ranges.
- [x] 1.4 Add Ex range tests for invalid ranges, visual marker without capture, deleted visual marker fallback, and count-prefilled concrete ranges.
- [x] 1.5 Implement substitution argument parsing for valid delimiters, delimiter/backslash escapes, omitted final delimiter without flags, empty replacement, and empty-pattern errors.

## 2. Prompt Buffer Substitution

- [x] 2.1 Add prompt-buffer operation for line-local literal substitution over a resolved line range.
- [x] 2.2 Support first-match-per-line, `g` all-matches, `i` case-insensitive matching, and non-overlapping match counting.
- [x] 2.3 Preserve original cursor intent by clamping the original cursor after substitution output is computed.
- [x] 2.4 Avoid edit effects when substitution output is identical while still returning substitution counts.
- [x] 2.5 Add focused buffer tests for substitution counts, unchanged output, empty replacement, case-insensitive matching, global matching, and pattern-not-found.

## 3. Modal Engine Integration

- [x] 3.1 Add semantic `startExCommand` command action with default `:` binding and config validation support.
- [x] 3.2 Route normal-mode `:` and configured Ex entry keys into Ex command-line mode.
- [x] 3.3 Route visual-mode Ex entry keys into Ex command-line mode with captured selected-line range and editable `'<,'>` prefill.
- [x] 3.4 Implement minimal Ex input handling for printable input, Backspace, Enter/Return, and Escape.
- [x] 3.5 Execute parsed Ex substitution with Ex error handling, success messages, search-highlight clearing on text-changing edits, no register writes, and no dot-repeat updates.
- [x] 3.6 Add modal tests for normal entry, visual entry/cancel, Ex execution, Ex errors, search-highlight clearing, cursor preservation, and message clearing on next input.

## 4. Rendering and UI

- [x] 4.1 Render a dedicated Ex row below the prompt box while Ex input or transient Ex messages are visible.
- [x] 4.2 Shrink prompt/visual/search-highlight viewport height by one row while the Ex row is visible.
- [x] 4.3 Keep visual selection highlights visible while Ex command-line mode is active from visual modes.
- [x] 4.4 Add render/vim-editor tests for width safety, extra row layout, viewport shrink, visual selection composition, and search highlight composition.

## 5. Macro and Documentation

- [x] 5.1 Ensure macro recording captures Ex entry, command text, Enter, and Escape tokens through the existing recording rules.
- [x] 5.2 Ensure macro replay replays Ex command-line interactions and continues after Ex errors according to existing replay behavior.
- [x] 5.3 Update README with Ex command-line mode, substitution syntax, range grammar, flags, literal limitations, Ex row behavior, keymap action, macro behavior, and deferred features.
- [x] 5.4 Add tests for configured Ex keymap entry, protected key rejection, insert-mode delegation, and macro record/replay.

## 6. Validation

- [x] 6.1 Run `bun test` and fix failures.
- [x] 6.2 Run `bun run check-types` and fix failures.
- [x] 6.3 Run OpenSpec validation for `add-ex-command-line-substitution` and fix proposal/spec/task issues.
