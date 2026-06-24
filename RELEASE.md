# v0.6.0

## What's new

### Insert-mode edit and movement keybindings

- Added configurable insert-mode editing and movement actions:
  - `deleteWordBackward`
  - `deleteWordForward`
  - `deleteLineBackward`
  - `deleteLineForward`
  - `moveWordBackward`
  - `moveWordForward`
  - `moveLineStart`
  - `moveLineEnd`
- Insert-mode bindings stay opt-in and preserve default insert typing behavior.

```json
{
  "piVimMode": {
    "keymap": {
      "insert": {
        "deleteWordBackward": [],
        "deleteWordForward": [],
        "deleteLineBackward": [],
        "deleteLineForward": [],
        "moveWordBackward": [],
        "moveWordForward": [],
        "moveLineStart": [],
        "moveLineEnd": []
      }
    }
  }
}
```

## Bug fixes

- Fixed legacy terminal Alt input for insert-mode bindings: `ESC+d` and `ESC+f` now normalize to `alt+d` and `alt+f`.
- Kept legacy Alt decoding insert-scoped so normal-mode and Ex command parsing behavior does not change.
- Fixed normal-mode arrow keys so Left/Down/Up/Right move like `h`/`j`/`k`/`l`, including counts, visual selections, and operator motions.
