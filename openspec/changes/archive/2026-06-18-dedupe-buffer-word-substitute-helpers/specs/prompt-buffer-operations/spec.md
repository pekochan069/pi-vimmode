## ADDED Requirements

### Requirement: Prompt buffer word helpers preserve small-word and WORD semantics

The prompt buffer SHALL preserve existing small-word and WORD navigation and operator-range behavior when word-motion helper logic is shared internally.

#### Scenario: Small-word navigation preserves punctuation boundaries

- **WHEN** caller requests lowercase word navigation over punctuation-heavy prompt text such as `foo/bar baz qux`, `--flag value`, or `/tmp/a-b next`
- **THEN** the prompt buffer treats keyword runs and punctuation runs as separate small-word targets for `w`, `e`, `b`, and `ge`

#### Scenario: WORD navigation preserves whitespace boundaries

- **WHEN** caller requests uppercase WORD navigation over punctuation-heavy prompt text such as `foo/bar baz qux`, `--flag value`, or `/tmp/a-b next`
- **THEN** the prompt buffer treats each contiguous non-whitespace span as one WORD target for `W`, `E`, `B`, and `gE`

#### Scenario: Counted previous-end navigation preserves boundaries

- **WHEN** caller requests counted `ge` or `gE` navigation from within or after prompt tokens
- **THEN** the prompt buffer repeats previous-end target resolution using the requested small-word or WORD boundary model and stops safely at prompt boundaries

#### Scenario: Operator ranges use the same word boundary model as navigation

- **WHEN** caller requests delete, change, or yank by small-word or WORD motion
- **THEN** the prompt buffer computes the characterwise operator range using the same boundary model as the corresponding navigation target and preserves existing register, cursor, and no-op semantics

### Requirement: Prompt buffer substitution helpers preserve line-range semantics

The prompt buffer SHALL preserve existing literal and regex substitution line-range behavior when traversal and result assembly are shared internally.

#### Scenario: Literal line-range substitution preserves counts ranges and cursor

- **WHEN** caller requests literal substitution over a bounded prompt line range with global or non-global matching
- **THEN** the prompt buffer replaces only addressed line matches, reports the same match count, reports preview ranges on the original line positions, clamps the cursor to the resulting prompt text, and sets `changed` according to text equality

#### Scenario: Regex line-range substitution preserves success shape and literal replacement

- **WHEN** caller requests regex substitution over a bounded prompt line range with a valid pattern
- **THEN** the prompt buffer returns an `ok: true` result with the same edit, match count, preview ranges, literal replacement text behavior, and cursor clamping as before

#### Scenario: Regex substitution errors remain hard failures

- **WHEN** caller requests regex substitution with an invalid pattern, empty pattern, pattern that can match empty text, too-long pattern or subject, or too many matches
- **THEN** the prompt buffer returns the existing `ok: false` message shape without edit data and does not partially apply replacements

#### Scenario: Missing and identical substitution matches preserve no-op behavior

- **WHEN** caller requests literal or regex substitution that finds no matches or replaces text with identical content
- **THEN** the prompt buffer preserves the original prompt text, reports the existing match count semantics, clamps the cursor safely, and reports `changed: false`
