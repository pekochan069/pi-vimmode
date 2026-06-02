## 1. Structure Range Resolver

- [x] 1.1 Add pure prompt-native structure types and range resolver module for code fences, heading sections, list items, XML-ish tags, and error blocks
- [x] 1.2 Add focused tests for inner/around code fence ranges, including triple-backtick and triple-tilde fences
- [x] 1.3 Add focused tests for heading section ranges across nested headings and end-of-prompt sections
- [x] 1.4 Add focused tests for list item ranges covering bullets, ordered lists, task lists, and continuation lines
- [x] 1.5 Add focused tests for XML-ish tag ranges covering single-line, multi-line, nested-safe, and malformed-tag cases
- [x] 1.6 Add focused tests for pasted error block detection and unrelated prose boundaries

## 2. Prompt-Native Operator Text Objects

- [x] 2.1 Extend `VimTextObjectTarget` and text-object key parsing for `f`, `h`, `l`, `t`, and `e` targets after operator + `i`/`a`
- [x] 2.2 Wire prompt-native ranges into existing yank/delete/change text-object operations without changing existing word/quote/bracket behavior
- [x] 2.3 Add modal tests for `daf`, `cih`, `yal`, `dit`, `yae`, and missing-target safe no-op behavior
- [x] 2.4 Verify dot-repeat behavior for changed prompt-native text objects matches existing repeatable text-object semantics

## 3. Ex Transform Parsing

- [x] 3.1 Extend Ex parse result types for `quote`, `unquote`, `bulletize`, `fence [language]`, `indent`, `dedent`, and `reflow [width]`
- [x] 3.2 Add Ex parser tests for current-line, explicit-range, visual-range, valid transform arguments, and invalid transform arguments
- [x] 3.3 Preserve existing Ex substitution, line command, copy/move, join, and nohlsearch parser behavior

## 4. Transform Operations

- [x] 4.1 Implement pure range transform operations for quote and unquote with Markdown `> ` semantics
- [x] 4.2 Implement pure range transform operation for bulletize while preserving indentation and blank lines
- [x] 4.3 Implement pure range transform operation for code fence wrapping with optional language argument
- [x] 4.4 Implement pure range transform operations for indent and dedent with one indent unit and safe whitespace-only removal
- [x] 4.5 Implement prose reflow with explicit width support while preserving fenced code and pasted error blocks inside the range
- [x] 4.6 Add transform operation tests for changed text, cursor placement, register preservation, no-op cases, and final newline behavior

## 5. Modal Integration

- [x] 5.1 Execute parsed transform Ex commands from normal mode against the current line or parsed range
- [x] 5.2 Execute parsed transform Ex commands from visual mode using the captured visual range and return to normal mode
- [x] 5.3 Report transform argument errors through existing Ex error/status path without mutating prompt text
- [x] 5.4 Add integration tests for visual `:'<,'>quote`, explicit `:2,4bulletize`, `:'<,'>fence ts`, `:indent`, `:dedent`, and `:reflow 72`

## 6. Configuration

- [x] 6.1 Add configurable text object kind/target keys for prompt-native objects
- [x] 6.2 Add configurable prompt-native structure target enablement
- [x] 6.3 Add configurable prompt transform enablement and command names
- [x] 6.4 Add config, parser, and buffer tests for configurable prompt-native features

## 7. Documentation and Validation

- [x] 7.1 Update `docs/features.md` with prompt-native text object keys, transform commands, examples, and limitations
- [x] 7.2 Update README supported-behavior links or summaries if needed
- [x] 7.3 Run `bun test` and fix failures
- [x] 7.4 Run `bun run check-types` and fix failures
- [x] 7.5 Run `bun run lint` and `bun run format:check` and fix failures
