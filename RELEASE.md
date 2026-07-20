# v0.9.0

## What's new

- Added trusted JavaScript configuration via `~/.pi/agent/pi-vimmode.config.js`. Configure presets, leader, prompt actions, insert actions, replay mappings, and scoped unmaps with a small `vim` API. Configuration writes are staged atomically, then defaults, global JSON, JavaScript, and project JSON compile into one immutable scoped plan before activation. Failed config files leave existing settings unchanged.

```js
export default (vim) => {
  vim.g.mapleader = " ";
  vim.keymap.set("n", "<leader>q", vim.prompt.quote());
  vim.keymap.set("n", "zq", null);
};
```

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

- Added configurable EasyMotion-style character jumps. Bind the `easymotion` command, enter a target character, then press one of up to 52 case-insensitive labels to jump across the prompt. Set `piVimMode.easymotion.labelColor` to customize the ANSI label color. #49 @tecfu

```json
{
  "piVimMode": {
    "keymap": {
      "commands": {
        "easymotion": ["<leader><leader>"]
      }
    },
    "easymotion": {
      "labelColor": "\u001b[31m"
    }
  }
}
```

## Bug fixes

- Fixed character-search repeats: `,` now keeps opposite original `f`, `F`, `t`, or `T` direction, and `;` now advances `t` and `T` searches.
- Fixed normal-mode `a` crossing into the next logical line when invoked at end of line, including on wrapped prompts followed by a blank line.
