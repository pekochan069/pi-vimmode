## Why

The configured `bar` cursor currently replaces the character at the cursor position with a bar glyph, hiding the text the user is editing. Bar cursor rendering should indicate insertion position without obscuring the underlying character.

## What Changes

- Preserve the character under the cursor when `piVimMode.cursor.<mode>` is `bar`.
- Keep bar cursor styling visually distinct from block and underline cursor styles.
- Keep rendered prompt width stable and safe for wrapped lines, empty cells, visual selections, and search highlights.
- Add regression coverage for bar cursor rendering so future cursor styling changes do not hide text.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vim-mode-visual-configuration`: Bar cursor rendering must preserve the character at the cursor position while remaining visually distinguishable and width-safe.

## Impact

- Affected code: `src/render.ts`, cursor restyling paths in `src/vim-editor.ts` if needed.
- Affected tests: `test/render.test.ts`, and any editor render tests that assert cursor output.
- APIs/config: no settings or public API changes; existing `piVimMode.cursor` values remain valid.
- Dependencies: none.
