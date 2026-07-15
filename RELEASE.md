# v0.9.0

## What's new

- Added configurable Vim leader mappings. Set `piVimMode.leader` in JSON or `vim.g.mapleader` in trusted JavaScript, then use `<leader>` at the start of mapping keys. Project settings can override or clear inherited leaders.

```json
{
  "piVimMode": {
    "leader": " ",
    "keymap": {
      "commands": {
        "visualBlock": ["<leader>v"]
      }
    }
  }
}
```

- Added `piVimMode.ui.status.position` to place the complete editor-border status group on the left or right side of the editor. #21 @alanpog

```json
{
  "piVimMode": {
    "ui": {
      "status": {
        "position": "right"
      }
    }
  }
}
```

## Bug fixes

- Fixed normal-mode `a` crossing into the next logical line when invoked at end of line, including on wrapped prompts followed by a blank line.
