# prompt-native-structure-editing Specification

## Purpose

TBD - created by archiving change prompt-native-structure-objects-and-transforms. Update Purpose after archive.
## Requirements
### Requirement: Prompt-native structures resolve to deterministic ranges

The Vim editor SHALL resolve prompt-native structures in the current prompt using deterministic, line-oriented rules for Markdown code fences, Markdown heading sections, list items, XML-ish tags, and pasted error blocks.

#### Scenario: Markdown code fence range resolves

- **WHEN** the cursor is inside a Markdown triple-backtick or triple-tilde code fence
- **THEN** the editor resolves an inner range containing the fenced content and an around range containing the opening fence, content, and closing fence

#### Scenario: Markdown heading section range resolves

- **WHEN** the cursor is on a Markdown ATX heading or inside the content under that heading
- **THEN** the editor resolves an inner range from the first body line through the line before the next heading of the same or higher level, and an around range that also includes the heading line

#### Scenario: Markdown list item range resolves

- **WHEN** the cursor is on a Markdown bullet, ordered-list marker, task-list marker, or continuation line belonging to that item
- **THEN** the editor resolves an inner range for the item content and an around range containing the marker line and continuation lines

#### Scenario: XML-ish tag range resolves

- **WHEN** the cursor is inside matching XML-ish opening and closing tags with the same tag name
- **THEN** the editor resolves an inner range between the tags and an around range including both tags

#### Scenario: Pasted error block range resolves

- **WHEN** the cursor is inside a contiguous pasted error block containing an error headline, stack frames, traceback lines, log severity lines, or file-location lines
- **THEN** the editor resolves a range containing that contiguous error block without including unrelated prose before or after it

#### Scenario: Missing or malformed structure is safe

- **WHEN** the cursor is not inside the requested prompt-native structure or the structure is malformed
- **THEN** the editor leaves prompt text, cursor position, registers, and mode unchanged

### Requirement: Operators support prompt-native text objects

The Vim editor SHALL support prompt-native text objects after delete, change, and yank operators using the existing inner and around text-object flow.

#### Scenario: Delete around code fence

- **WHEN** the editor is in normal mode with the cursor inside a Markdown code fence and the user presses `daf`
- **THEN** the full code fence is removed, copied to the unnamed character register, and the editor remains in normal mode

#### Scenario: Change inner heading section

- **WHEN** the editor is in normal mode with the cursor inside a Markdown heading section and the user presses `cih`
- **THEN** the section body excluding the heading line is removed, copied to the unnamed character register, and the editor enters insert mode

#### Scenario: Yank around list item

- **WHEN** the editor is in normal mode with the cursor inside a Markdown list item and the user presses `yal`
- **THEN** the marker line and continuation lines for that list item are copied to the unnamed character register without changing prompt text

#### Scenario: Delete inner XML-ish tag

- **WHEN** the editor is in normal mode with the cursor inside matching XML-ish tags and the user presses `dit`
- **THEN** the tag contents are removed, copied to the unnamed character register, and the surrounding tags remain

#### Scenario: Yank around error block

- **WHEN** the editor is in normal mode with the cursor inside a pasted error block and the user presses `yae`
- **THEN** the contiguous error block is copied to the unnamed character register without changing prompt text

#### Scenario: Prompt-native text object miss clears pending operator safely

- **WHEN** the editor is in normal mode with a pending operator and the requested prompt-native text object does not exist around the cursor
- **THEN** prompt text, cursor position, registers, and mode are unchanged, and pending operator state clears

#### Scenario: Prompt-native text object keys are configurable

- **WHEN** settings configure `piVimMode.keymap.textObjects.kinds` or `piVimMode.keymap.textObjects.targets`
- **THEN** operators use the configured text-object kind and target keys while preserving existing default behavior for unspecified keys

#### Scenario: Prompt-native structure targets can be disabled

- **WHEN** settings disable `piVimMode.promptStructures.enabled` or an individual `piVimMode.promptStructures.targets.*` entry
- **THEN** the corresponding prompt-native text object acts as a safe no-op without changing prompt text, cursor, registers, or mode

### Requirement: Ex transforms reshape prompt ranges safely

The Vim editor SHALL provide Ex transform commands for current-line, explicit-line-range, and visual-line-range prompt editing.

#### Scenario: Quote visual range

- **WHEN** the editor has a captured visual range and the user executes `:'<,'>quote`
- **THEN** each selected line is prefixed with Markdown quote syntax `> ` and the editor returns to normal mode with the transformed text

#### Scenario: Unquote visual range

- **WHEN** the editor has a captured visual range containing Markdown quote prefixes and the user executes `:'<,'>unquote`
- **THEN** one leading Markdown quote marker is removed from each selected quoted line without removing other content

#### Scenario: Bulletize explicit range

- **WHEN** the user executes `:2,4bulletize`
- **THEN** each nonblank line in lines 2 through 4 is converted to a Markdown bullet line while preserving relative indentation

#### Scenario: Wrap range in code fence

- **WHEN** the user executes `:'<,'>fence ts` with a captured visual range
- **THEN** the selected lines are wrapped in a Markdown code fence whose opening fence is ` ```ts ` and whose closing fence is ` ``` `

#### Scenario: Indent and dedent range

- **WHEN** the user executes `:indent` or `:dedent` for the current line or a supported range
- **THEN** `:indent` adds one configured indent unit to each targeted line and `:dedent` removes at most one indent unit from each targeted line without deleting non-whitespace content

#### Scenario: Reflow prose range

- **WHEN** the user executes `:reflow 72` for a prose range
- **THEN** prose paragraphs in the targeted range are rewrapped so nonblank prose lines do not exceed 72 columns when possible, while fenced code and pasted error blocks inside the range are preserved

#### Scenario: Transform with invalid arguments is safe

- **WHEN** the user executes a prompt transform with invalid arguments such as a nonnumeric reflow width
- **THEN** the editor reports an Ex error, leaves prompt text unchanged, and remains usable

#### Scenario: Transform commands are configurable

- **WHEN** settings disable `piVimMode.promptTransforms.enabled`, disable an individual transform action, or configure `piVimMode.promptTransforms.commands.*`
- **THEN** the Ex parser honors enabled command names only, rejects disabled transform commands as unsupported, and preserves existing default names for unspecified actions

### Requirement: Prompt-native structure editing is documented and validated

The change SHALL include automated validation and user-facing documentation for prompt-native structures and transforms.

#### Scenario: Automated validation runs

- **WHEN** `bun test` is executed
- **THEN** tests cover structure range resolution, operator text objects, Ex transform parsing, transform edit results, safe no-op behavior, and existing Vim behavior

#### Scenario: Typecheck runs

- **WHEN** `bun run check-types` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide documents prompt-native editing

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents prompt-native text objects, Ex transform commands, examples, limitations, and validation commands

### Requirement: Prompt transforms can be invoked by action keybindings

The Vim editor SHALL allow existing prompt transform behavior to be invoked by accepted action keybindings in supported modal contexts.

#### Scenario: Normal current-line transform executes

- **WHEN** `prompt.transform.quote` is bound to `g>` and the editor is in normal mode
- **THEN** pressing `g>` quotes the current prompt line using existing prompt transform behavior

#### Scenario: Counted line-range transform executes

- **WHEN** `prompt.transform.bulletize` is bound to `g*` and the user presses `3g*` in normal mode
- **THEN** the current line and next two prompt lines are bulletized

#### Scenario: Fence action uses configured language arg

- **WHEN** `prompt.transform.fence` is bound to `gT` with `{ "language": "ts" }`
- **THEN** pressing `gT` wraps the target range in a code fence whose opening fence includes `ts`

#### Scenario: Reflow action uses configured width arg

- **WHEN** `prompt.transform.reflow` is bound to `gq` with `{ "width": 72 }`
- **THEN** pressing `gq` reflows the target prose using width 72 according to existing reflow rules

#### Scenario: Visual character action transforms touched lines

- **WHEN** the editor is in characterwise visual mode and the user invokes a keybound prompt transform action
- **THEN** the action transforms all prompt lines touched by the visual selection

#### Scenario: Visual-line action transforms selected lines

- **WHEN** the editor is in visual-line mode and the user invokes a keybound prompt transform action
- **THEN** the action transforms the selected prompt lines

#### Scenario: Visual-block action transforms touched lines

- **WHEN** the editor is in visual-block mode and the user invokes a keybound prompt transform action
- **THEN** the action transforms the touched prompt lines linewise rather than transforming only rectangular cells

#### Scenario: Visual action ignores count

- **WHEN** the editor is in any visual mode, a visual selection is active, and the user invokes a keybound prompt transform action with a numeric count
- **THEN** the action transforms the selected touched lines once and ignores the count

#### Scenario: Visual action exits visual mode after recognized action

- **WHEN** the editor is in any visual mode and a keybound prompt transform action is recognized, whether or not it changes prompt text
- **THEN** the editor returns to normal mode and clears the visual selection

#### Scenario: Unsupported action target is safe

- **WHEN** an action is invoked in a mode or target context it does not support
- **THEN** prompt text remains unchanged and feedback is emitted only according to resolved feedback settings

