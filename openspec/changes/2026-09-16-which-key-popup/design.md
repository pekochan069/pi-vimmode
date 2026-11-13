## Rendering

The preview is part of `VimEditor.render()` and appears below the editor as an editor-owned bordered panel. It contains a title border, a selected-style typed-key row, and candidate rows. The title border replaces the editor's normal lower border, and the normal status line is rendered directly after the panel's last candidate or overflow row. The title uses the deepest matching configured group label, or `WHICH-KEY` at root. It never captures input. Its rows reduce the prompt viewport by their count before prompt rendering. If even the minimal title, typed-key, and candidate/overflow panel cannot preserve four editor rows, it is suppressed.

## Matching

Only resolved Normal-mode action bindings participate. The preview appears when the pending sequence begins with the configured leader. It lists direct continuations and collapses multiple bindings with the same next token. `groups` names a collapsed resolved prefix; unnamed groups show their actual count. Candidate rows copy Pi's passive unselected slash-autocomplete layout and styling. A `pi.command` leaf primary text always begins with its slash command. Its description comes from the current autocomplete provider, with binding `desc` as fallback.

## Input

The existing modal resolver retains ownership of every key. When `whichKey.enabled` is true, Backspace on a leader sequence uses `mappingSequencePrefixes` to remove one complete token. At the bare leader it preserves pending state, matching which-key.nvim's root behavior. When disabled, Backspace stays with the existing keymap resolver. Escape uses the existing pending-state cancellation path.

## Configuration

`whichKey.enabled` is false by default for additive adoption. `whichKey.groups` maps key sequences, including `<leader>` notation, to labels. JSON and trusted JavaScript use the same validation path.
