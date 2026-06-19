## ADDED Requirements

### Requirement: Normal and visual modes support paragraph motions

The Vim editor SHALL support prompt-local paragraph motions using blank-line-separated paragraph runs while preserving finite prompt-editing scope.

#### Scenario: Forward paragraph motion moves to next paragraph

- **WHEN** the editor is in normal mode with the cursor inside a nonblank paragraph and the user presses `}` while a later paragraph exists
- **THEN** the cursor moves to the first column of the next paragraph's first nonblank line

#### Scenario: Forward paragraph motion reaches prompt end

- **WHEN** the editor is in normal mode with the cursor inside the last nonblank paragraph and the user presses `}`
- **THEN** the cursor moves to the end of the prompt or remains there when already at the prompt end

#### Scenario: Backward paragraph motion moves to paragraph start

- **WHEN** the editor is in normal mode with the cursor inside a nonblank paragraph and the user presses `{`
- **THEN** the cursor moves to the first column of the current paragraph, or to the previous paragraph start when already at the current paragraph start

#### Scenario: Counted paragraph motion repeats targets

- **WHEN** the editor is in normal mode and the user presses `2}` or `2{`
- **THEN** the paragraph motion repeats twice and clamps safely at the prompt boundary when fewer paragraph targets exist

#### Scenario: Visual paragraph motion extends selection

- **WHEN** the editor is in visual character, visual line, or visual block mode with an active selection and the user presses `{` or `}`
- **THEN** the visual anchor remains unchanged and the active cursor moves using the same paragraph target semantics as normal mode

### Requirement: Operators support paragraph motions and paragraph text objects

The Vim editor SHALL allow motion-capable operators to target paragraph motions and SHALL support paragraph text objects with `ip` and `ap` defaults.

#### Scenario: Delete by forward paragraph motion

- **WHEN** the editor is in normal mode inside a paragraph and the user presses `d}`
- **THEN** text from the cursor through the resolved forward paragraph boundary is removed, copied to the unnamed character register, and the editor remains in normal mode

#### Scenario: Change by backward paragraph motion

- **WHEN** the editor is in normal mode inside a paragraph and the user presses `c{`
- **THEN** text from the resolved backward paragraph boundary through the cursor is removed, copied to the unnamed character register, and the editor enters insert mode at the removed range start

#### Scenario: Yank by paragraph motion preserves prompt text

- **WHEN** the editor is in normal mode inside a paragraph and the user presses `y}` or `y{`
- **THEN** the addressed paragraph-motion range is copied to the unnamed character register without changing prompt text or mode

#### Scenario: Delete inner paragraph

- **WHEN** the editor is in normal mode with the cursor inside a nonblank paragraph and the user presses `dip`
- **THEN** the paragraph body is removed without adjacent blank separator lines, copied to the unnamed character register, and the editor remains in normal mode

#### Scenario: Delete around paragraph

- **WHEN** the editor is in normal mode with the cursor inside a nonblank paragraph and the user presses `dap`
- **THEN** the paragraph body plus one adjacent blank separator group when present is removed and copied to the unnamed character register

#### Scenario: Missing paragraph text object is safe

- **WHEN** the editor is in normal mode on an empty prompt or only whitespace separator lines and the user presses `dip` or `dap`
- **THEN** prompt text, cursor position, registers, and mode are unchanged, and pending operator state clears

#### Scenario: Paragraph changes are repeatable

- **WHEN** a delete or change paragraph motion or paragraph text-object command changes prompt text and the user later presses `.` in normal mode at another valid paragraph location
- **THEN** the same supported paragraph change is applied at the new location using the recorded operation and count

### Requirement: Paragraph keybindings are documented and validated

The change SHALL include automated validation and user-facing documentation for paragraph motions and paragraph text objects.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover paragraph motions, counts, operator paragraph motions, paragraph text objects, visual extension, safe no-op behavior, dot-repeat for paragraph changes, and existing Vim behavior

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide documents paragraph behavior

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents `{` / `}` paragraph motions, `ip` / `ap` paragraph text objects, blank-line-only paragraph semantics, supported operator usage, and non-goals compared with full Vim paragraph grammar
