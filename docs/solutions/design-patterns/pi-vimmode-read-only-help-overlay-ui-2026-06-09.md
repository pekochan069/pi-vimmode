---
title: Pi vimmode read-only help overlay UI
date: 2026-06-09
category: docs/solutions/design-patterns
module: pi-vimmode
problem_type: design_pattern
component: tooling
severity: medium
applies_when:
  - "Showing read-only help or diagnostic content from pi-vimmode Ex commands"
  - "Avoiding fake popup UI implemented as appended editor/workbench rows"
  - "Keeping modal state pure while using Pi TUI adapter effects for real overlays"
  - "Expanding a bounded popup without turning runtime help into a full pager or command palette"
related_components:
  - modal-engine
  - editor-adapter
  - runtime-help
  - testing-framework
  - documentation
tags:
  - pi-vimmode
  - tui-overlay
  - runtime-help
  - ex-command-line
  - keybindings
  - modal-effect
  - developer-experience
  - docs-drift
---

# Pi vimmode read-only help overlay UI

## Context

`pi-vimmode` added source-backed keybinding discovery through `:features keybindings`, but the first UI shape was a fake popup: bounded rows appended below the prompt and Ex/workbench section. Even with borders, that still behaved like the Ex section got taller rather than like a dedicated popup.

The final fix moved the keybinding discovery surface to a real Pi TUI overlay. The modal layer still owns semantic state and emits a read-only effect, while `VimEditor` applies that effect with `tui.showOverlay()` and a focused overlay component. A follow-up refinement kept the centered overlay placement but made it roomier: 90% width, 90% max height, and 10 visible body rows so the default content fits without scrolling.

Session history search was requested, but this repository checkout does not include the `scripts/discover-sessions.sh` pipeline required by `/ce-sessions`, so no prior-session findings were incorporated.

## Guidance

Use a real TUI overlay for read-only help or diagnostic surfaces that need more than one compact feedback row. Do not simulate a popup by appending rows to `VimEditor.render()` unless the UI is intentionally part of the prompt/workbench surface.

The working split is:

- `src/keybinding-discovery-popup.ts` builds finite, source-backed content and scroll state.
- `src/modal/ex-command-line.ts` recognizes `:features keybindings` and returns an `openHelpPopup` effect instead of an inline message.
- `src/modal/types.ts` carries the adapter effect as part of the typed modal effect union.
- `src/vim-editor.ts` applies the effect by constructing `KeybindingDiscoveryOverlayComponent` and calling `this.tui.showOverlay()`.
- `src/keybinding-discovery-overlay.ts` owns overlay rendering, width-safe rows, local scrolling, and close handling.
- Tests verify both modal purity and adapter behavior.

The adapter application stays small:

```ts
private openHelpPopup(popup: HelpPopup): void {
  this.helpOverlay?.hide();
  let handle: OverlayHandle | undefined;
  const component = new KeybindingDiscoveryOverlayComponent(
    this.tui,
    popup,
    this.overlayTheme,
    () => {
      handle?.hide();
      if (this.helpOverlay === handle) this.helpOverlay = undefined;
      this.tui.requestRender();
    },
  );
  handle = this.tui.showOverlay(component, {
    anchor: "center",
    width: "90%",
    minWidth: 48,
    maxHeight: "90%",
    margin: 2,
    visible: (termWidth, termHeight) => termWidth >= 48 && termHeight >= 12,
  });
  this.helpOverlay = handle;
  const { helpPopup: _helpPopup, ...state } = this.modalState;
  this.modalState = state;
  this.invalidate();
}
```

The overlay component handles local read-only keys without involving prompt editing:

```ts
handleInput(data: string): void {
  if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c") || matchesKey(data, "ctrl+g")) {
    this.onClose();
    return;
  }
  if (data === "j" || matchesKey(data, "down")) {
    this.popup = scrollHelpPopup(this.popup, 1);
    this.tui.requestRender();
    return;
  }
  if (data === "k" || matchesKey(data, "up")) {
    this.popup = scrollHelpPopup(this.popup, -1);
    this.tui.requestRender();
  }
}
```

Keep the modal contract pure: opening and scrolling the popup must not edit prompt text, move the prompt cursor, mutate registers/marks/macros/search state, or pollute runtime message history.

## Why This Matters

A fake popup creates two problems:

1. **User perception:** appended rows look like Ex/workbench output, so the UI fails to communicate that the user is in a separate read-only help surface.
2. **Architecture drift:** render-row popups encourage modal/render coupling. Real overlays keep modal logic as semantic effects and leave Pi TUI details in the adapter.

The overlay pattern also makes future read-only surfaces easier to generalize. `:help`, `:features`, `:actions`, `:keymap`, `:mapcheck`, `:messages`, `:vimmode inspect`, and `:vimdoctor` can later share the same overlay shell while mutating Ex commands remain normal inline/editor operations.

## When to Apply

- Use an overlay when read-only Ex output is multi-line, scrollable, or conceptually separate from the prompt.
- Keep compact inline rows for short transient feedback such as substitution success, no-op notices, and errors.
- Keep mutating Ex commands out of the overlay path: `:s`, `:d`, `:y`, `:put`, `:copy`, `:move`, `:join`, prompt transforms, and `:noh` should continue through normal modal/editor effects.
- Add docs-drift tests whenever the overlay content advertises source-backed actions, settings, presets, or command names.

## Examples

Before: popup content appended to editor render output, shrinking prompt viewport and making the Ex section look taller.

```ts
const workbenchRows = renderWorkbenchRows(this.modalState, width, reservedRows);
const popupRows = renderHelpPopupRows(this.modalState, width);
lines.push(...popupRows, ...workbenchRows);
```

After: `VimEditor.render()` stays focused on the prompt/workbench rows, while `openHelpPopup` launches a real overlay and clears `helpPopup` from modal state after the adapter effect is applied.

```ts
case "openHelpPopup":
  this.openHelpPopup(effect.popup);
  return;
```

Test the distinction explicitly:

```ts
expect(overlay).toBeDefined();
expect(overlay?.options).toMatchObject({ anchor: "center", width: "90%", maxHeight: "90%" });
expect(editorLines.length).toBe(baseline.length);
expect(editorText).not.toContain("Keybinding discovery");
expect(overlayText).toContain("Keybinding discovery");
```

Then test bounded scrolling with content longer than the visible body rows:

```ts
typeKeys(overlay, ["j", "j", "j", "j", "j", "j"]);
expect(scrolled).toContain("prompt.transform.quote -> g7");
expect(scrolled).toContain("↑");
expect(scrolled).not.toContain("Source-backed");
```

## Related

- `docs/solutions/architecture-patterns/pi-vimmode-runtime-help-docs-drift-guard-2026-06-05.md` — source-backed runtime help registry and docs/spec/test anchors.
- `docs/solutions/developer-experience/action-keybinding-recipes-for-pivimmode-2026-06-09.md` — discoverable keybinding recipes surfaced through `:features keybindings`.
- `docs/solutions/architecture-patterns/pi-vimmode-typed-action-registry-keybindings-2026-06-09.md` — typed action registry and keybinding config source of truth.
- `docs/solutions/architecture-patterns/pi-vimmode-modal-feature-module-extraction-pattern-2026-06-05.md` — modal effect boundary for keeping adapter/runtime APIs out of semantic modal logic.
- `docs/solutions/architecture-patterns/pi-vimmode-ex-command-line-substitution-architecture-2026-05-28.md` — Ex command-line architecture and scope boundaries.
