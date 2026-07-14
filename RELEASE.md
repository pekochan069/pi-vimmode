# v0.9.0

## What's new

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
