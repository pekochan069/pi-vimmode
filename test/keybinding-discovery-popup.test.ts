import { describe, expect, test } from "bun:test";

import { resolveVimOptions } from "../src/config.ts";
import { keybindingDiscoveryPopup, keybindingsPopup } from "../src/keybinding-discovery-popup.ts";

describe("keybinding discovery popups", () => {
  test("builds dedicated keybindings catalog popup", () => {
    const { options } = resolveVimOptions({
      piVimMode: {
        keymap: {
          commands: { redo: ["U"] },
          actions: { "prompt.transform.reflow": ["gq"] },
        },
      },
    });
    const popup = keybindingsPopup(options);
    const text = popup.lines.join("\n");

    expect(popup).toMatchObject({
      title: ":keybindings",
      source: "keybindings",
      scrollOffset: 0,
    });
    expect(text).not.toContain("Effective pi-vimmode keybindings");
    expect(text).toContain("▸ Commands");
    expect(text).toContain("Key            Mode        Action");
    expect(text).toContain("U              normal      command.redo");
    expect(text).toContain("gq             n/v         prompt.transform.reflow");
    expect(text).not.toContain("vimmode.keybindings metadata-only not bindable");
    expect(text).toContain("ctrl+p");
    expect(text).toContain("protected for Pi command/model palette");
    expect(text).toContain("no runtime :map");
  });

  test("builds dedicated keybindings detail popup", () => {
    const { options } = resolveVimOptions(undefined);
    const popup = keybindingsPopup(options, { warnings: [] }, "ctrl+p");

    expect(popup).toMatchObject({
      title: ":keybindings ctrl+p",
      source: "keybindings",
      query: "ctrl+p",
    });
    expect(popup.lines.join("\n")).toContain("protected for Pi command/model palette");
  });

  test("keeps features keybindings recipe popup distinct", () => {
    const { options } = resolveVimOptions(undefined);
    const popup = keybindingDiscoveryPopup(options);

    expect(popup).toMatchObject({
      title: "Keybinding discovery",
      source: "features",
      query: "keybindings",
    });
    expect(popup.lines.join("\n")).toContain("Source-backed prompt transform keybinding recipes");
  });
});
