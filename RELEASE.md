# v0.9.0

## What's new

- Added trusted JavaScript configuration via `~/.pi/agent/pi-vimmode.config.js`. Configure presets, leader, cursor mode, UI, macros, marks, search, Ex command, prompt structures/transforms, action presets, prompt/insert actions, replay mappings, and scoped unmaps with a small `vim` API. Configuration writes are validated and staged atomically; defaults, global JSON, JavaScript, and project JSON compile into one immutable scoped plan before activation. Project JSON remains final authority, and failed config files leave existing settings unchanged.

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

- Added `piVimMode.ui.status.position` to place the complete editor-border status group on the left or right side of the editor. [#21](https://github.com/pekochan069/pi-vimmode/pull/21) [@alanpog](https://github.com/alanpog)

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

- Added configurable EasyMotion-style character jumps. Bind the `easymotion` command, enter a target character, then press one of up to 52 case-insensitive labels to jump across the prompt. Set `piVimMode.easymotion.labelColor` to customize the ANSI label color. [#49](https://github.com/pekochan069/pi-vimmode/pull/49) [@tecfu](https://github.com/tecfu)

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
