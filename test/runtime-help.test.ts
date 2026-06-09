import { describe, expect, test } from "bun:test";

import { DEFAULT_VIM_OPTIONS, resolveVimOptions } from "../src/config.ts";
import { keybindingDiscoveryPopup } from "../src/keybinding-discovery-popup.ts";
import {
  runtimeFeaturesMessage,
  runtimeHelpEntries,
  runtimeHelpMessage,
} from "../src/runtime-help.ts";

const context = { options: DEFAULT_VIM_OPTIONS, diagnostics: { warnings: [] } };

describe("runtime help registry", () => {
  test("general help lists finite entry points", () => {
    const message = runtimeHelpMessage(undefined, context);

    expect(message).toContain(":help <topic>");
    expect(message).toContain(":features [query]");
    expect(message).toContain(":messages");
    expect(message).toContain(":actions");
    expect(message).toContain(":keymap");
    expect(message).toContain(":mapcheck");
    expect(message).toContain(":vimdoctor");
  });

  test("topic help reports supported behavior and limits", () => {
    expect(runtimeHelpMessage("search", context)).toContain("prompt search");
    expect(runtimeHelpMessage("search", context)).toContain("no cross-prompt history");
    expect(runtimeHelpMessage("ex", context)).toContain(":s");
    expect(runtimeHelpMessage("actions", context)).toContain("metadata-only");
    expect(runtimeHelpMessage("diagnostics", context)).toContain("not bindable");
    expect(runtimeHelpMessage("vimscript", context)).toBe("help: no match for vimscript");
  });

  test("feature discovery summarizes categories and supported commands", () => {
    const summary = runtimeFeaturesMessage(undefined, context);
    for (const category of [
      "modes",
      "motions",
      "editing",
      "search",
      "Ex",
      "transforms",
      "registers",
      "marks",
      "macros",
      "diagnostics",
      "runtime help",
      "settings",
    ]) {
      expect(summary).toContain(category);
    }

    expect(runtimeFeaturesMessage("nohlsearch", context)).toContain(
      ":noh/:nohlsearch supported; clears visible prompt search highlights; preserves n/N repeat-search state",
    );
  });

  test("feature discovery reports opt-in action keybinding recipes and presets", () => {
    const message = runtimeFeaturesMessage("keybindings", context);

    expect(message).toContain("piVimMode.keymap.actions");
    expect(message).toContain("piVimMode.keymap.actionPresets");
    expect(message).toContain("opt-in");
    expect(message).toContain("no defaults/plugin API");
    expect(message).toContain("paragraph editing");
    expect(message).toContain("paragraph-editing");
    expect(message).toContain("prompt.transform.reflow=gq");
    expect(message).toContain("prompt.transform.quote=g>");
    expect(message).toContain("prompt.transform.unquote=g<");
    expect(runtimeFeaturesMessage("action presets", context)).toContain("markdown-wrapping");
    expect(runtimeFeaturesMessage("markdown wrapping", context)).toContain(
      "prompt.transform.fence",
    );
    expect(runtimeFeaturesMessage("vimscript mappings", context)).toBe(
      "features: no match for vimscript mappings",
    );
  });

  test("keybinding discovery popup content is source-backed and finite", () => {
    const options = resolveVimOptions({
      piVimMode: { keymap: { actions: { "prompt.transform.reflow": ["gq"] } } },
    }).options;
    const popup = keybindingDiscoveryPopup(options);
    const text = [popup.title, ...popup.lines].join("\n");

    expect(popup.docsAnchor).toBe("runtime-help:keybinding-discovery-popup");
    expect(text).toContain("Keybinding discovery");
    expect(text).toContain("paragraph-editing");
    expect(text).toContain("markdown-wrapping");
    expect(text).toContain("prompt.transform.reflow");
    expect(text).toContain("gq");
    expect(text).toContain("piVimMode.keymap.actions");
    expect(text).toContain("piVimMode.keymap.actionPresets");
    expect(text).toContain("accepted bindings");
    expect(text).toContain("opt-in");
    expect(text).toContain("no defaults");
    expect(text).toContain("no plugin API");
    expect(text).toContain("no runtime :map");
    expect(text).toContain("no runtime :action");
    expect(text).toContain("no command palette");
    expect(text).toContain("no Vim help pager");
  });

  test("feature discovery reuses action and protected shortcut metadata", () => {
    expect(runtimeFeaturesMessage("redo", context)).toContain("command.redo ctrl+r");
    expect(runtimeFeaturesMessage("ctrl+p", context)).toContain(
      "protected for Pi command/model palette",
    );
    expect(runtimeFeaturesMessage("vimmode.doctor", context)).toContain("vimmode.doctor");
    expect(runtimeFeaturesMessage("vimdoctor", context)).toContain("metadata-only not bindable");
    expect(runtimeFeaturesMessage("vimmode.dump", context)).toBe(
      "features: no match for vimmode.dump",
    );

    const actions = resolveVimOptions({
      piVimMode: { keymap: { actions: { "prompt.transform.reflow": ["gq"] } } },
    }).options;
    expect(runtimeFeaturesMessage("reflow", { ...context, options: actions })).toContain("gq");
    expect(
      runtimeFeaturesMessage("promptTransform.reflow", { ...context, options: actions }),
    ).toContain("prompt.transform.reflow");
  });

  test("feature discovery reflects effective options", () => {
    const minimal = resolveVimOptions(undefined, { piVimMode: { preset: "minimal" } }).options;
    expect(runtimeFeaturesMessage("macros", { ...context, options: minimal })).toContain(
      "macros disabled",
    );

    const restricted = resolveVimOptions(undefined, {
      piVimMode: { marks: { enabled: true, slots: ["a", "b"] } },
    }).options;
    expect(runtimeFeaturesMessage("marks", { ...context, options: restricted })).toContain(
      "slots a,b",
    );

    const transforms = resolveVimOptions(undefined, {
      piVimMode: {
        promptTransforms: {
          actions: { reflow: false },
          commands: { quote: ["qte"] },
        },
      },
    }).options;
    expect(runtimeFeaturesMessage("reflow", { ...context, options: transforms })).toContain(
      "reflow disabled",
    );
    expect(runtimeFeaturesMessage("quote", { ...context, options: transforms })).toContain(":qte");
  });

  test("registry entries carry docs, spec, and test anchors", () => {
    for (const entry of runtimeHelpEntries(context)) {
      expect(entry.docsAnchor).toStartWith("runtime-help:");
      expect(entry.specAnchor).toContain("openspec/specs/");
      expect(entry.testAnchors.length).toBeGreaterThan(0);
    }
  });
});
