## Why

Pi prompts are increasingly structured: users paste Markdown plans, fenced code, XML-ish tool snippets, error blocks, and lists for agents to consume. pi-vimmode already covers broad Vim parity, but prompt editing needs first-class structure-aware objects and transforms so users can reshape agent prompts faster and with less manual selection.

## What Changes

- Add prompt-native text objects for Markdown code fences, headings/sections, list items, XML-ish tags, and pasted error blocks.
- Add prompt-native transforms for selected or targeted prompt structures: quote/unquote, bulletize, wrap in code fence, indent/dedent, and reflow.
- Expose structure operations through normal/operator/visual flows without requiring users to leave the prompt editor.
- Preserve safe no-op behavior when a structure target is missing or malformed.
- Document supported structures, transforms, limitations, and validation commands.

## Capabilities

### New Capabilities

- `prompt-native-structure-editing`: Covers prompt-specific structural text objects and transforms for Markdown, list, tag, and error-block editing inside pi-vimmode.

### Modified Capabilities

## Impact

- Affected code: `src/buffer.ts`, `src/modal/engine.ts`, `src/modal/types.ts`, `src/modal/state.ts`, `src/commands.ts`, and focused tests under `test/`.
- Affected docs: `docs/features.md`, README-supported behavior sections if needed.
- No new runtime dependencies expected.
- No breaking changes to existing Vim keybindings or Pi editor delegation.
