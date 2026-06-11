## ADDED Requirements

### Requirement: Operators support line-local character search targets

The Vim editor SHALL allow motion-capable normal-mode operators to target current-line character search commands using the resolved `findCharForward`, `findCharBackward`, `tillCharForward`, and `tillCharBackward` bindings.

#### Scenario: Delete through forward character search target

- **WHEN** the editor is in normal mode and the user presses `df)` while a later `)` exists on the current line
- **THEN** text from the cursor through that `)` is removed, copied to the unnamed character register, and the editor remains in normal mode

#### Scenario: Delete until forward character search target

- **WHEN** the editor is in normal mode and the user presses `dt,` while a later `,` exists on the current line after at least one intervening character
- **THEN** text from the cursor up to but not including that `,` is removed, copied to the unnamed character register, and the editor remains in normal mode

#### Scenario: Change through backward character search target

- **WHEN** the editor is in normal mode and the user presses `cF:` while an earlier `:` exists on the current line
- **THEN** text from that `:` through the cursor is removed, copied to the unnamed character register, and the editor enters insert mode at the removed range start

#### Scenario: Yank until backward character search target

- **WHEN** the editor is in normal mode and the user presses `yT[` while an earlier `[` exists on the current line before at least one intervening character
- **THEN** text after that `[` through the cursor is copied to the unnamed character register without changing prompt text or mode

#### Scenario: Counted operator character search target

- **WHEN** the editor is in normal mode and the user presses `d2f,` while at least two later `,` characters exist on the current line
- **THEN** text from the cursor through the second later `,` is removed and copied to the unnamed character register

#### Scenario: Empty till range is safe

- **WHEN** the editor is in normal mode and the user presses `dt,` while the next character is `,`
- **THEN** prompt text, cursor position, registers, and mode are unchanged, and pending operator state clears

#### Scenario: Missing character search target is safe

- **WHEN** the editor is in normal mode with a pending delete, change, or yank operator and the requested character search target does not exist in the addressed direction on the current line
- **THEN** prompt text, cursor position, registers, and mode are unchanged, and pending operator state clears

#### Scenario: Successful operator character search updates repeat state

- **WHEN** a delete or change operator successfully uses a character search target and the user later presses `.` in normal mode at another valid location
- **THEN** the same operator character-search change is applied again using the recorded target command and character

#### Scenario: Successful operator character search updates last character search

- **WHEN** an operator successfully uses `f`, `F`, `t`, or `T` with a target character
- **THEN** subsequent `;` and `,` commands repeat that character search using the same rules as a normal-mode character search

#### Scenario: Operators target repeated character search

- **WHEN** a previous character search exists and the user presses `d;`, `c,`, or `y;` in normal mode
- **THEN** the operator uses the repeated character-search target, with delete/change writing the unnamed character register and change entering insert mode on a changed range

### Requirement: Operators support range-safe normal motions

The Vim editor SHALL allow motion-capable normal-mode operators to target every supported normal motion with finite range semantics: `h`, `j`, `k`, `l`, `w`, `b`, `e`, `0`, `^`, `$`, `gg`, `G`, and `%`.

#### Scenario: Characterwise horizontal operator motions

- **WHEN** the editor is in normal mode and the user presses `dl` or `dh`
- **THEN** the addressed characterwise range is removed and copied to the unnamed character register without involving raw adapter movement

#### Scenario: Linewise vertical and buffer operator motions

- **WHEN** the editor is in normal mode and the user presses `dj`, `dk`, `dgg`, or `dG`
- **THEN** the addressed whole-line range is removed and copied to the unnamed line register

#### Scenario: Matching-pair operator motion

- **WHEN** the editor is in normal mode and the user presses `d%` while the cursor is on a matched pair delimiter
- **THEN** the text through the matching delimiter is removed and copied to the unnamed character register

#### Scenario: Count after operator applies to supported motions

- **WHEN** the editor is in normal mode and the user presses `d2w`, `d2j`, or `d2;`
- **THEN** the after-operator count is applied to that finite operator target
