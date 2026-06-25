import { describe, expect, test } from "bun:test";

import { DEFAULT_VIM_OPTIONS, resolveVimOptions } from "../src/config.ts";
import {
  diagnosticPopup,
  inspectPopup,
  keybindingDiscoveryPopup,
  runtimeHelpPopup,
} from "../src/keybinding-discovery-popup.ts";
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
    expect(runtimeHelpMessage("registers", context)).toContain('"+');
    expect(runtimeHelpMessage("registers", context)).toContain(
      "clipboard reads depend on platform tools",
    );
    expect(runtimeHelpMessage("clipboard", context)).toContain("mirror fallback");
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

    expect(popup.source).toBe("features");
    expect(popup.query).toBe("keybindings");
    expect(text).toContain("Keybinding discovery");
    expect(text).toContain("paragraph-editing");
    expect(text).toContain("markdown-wrapping");
    expect(text).toContain("prompt.transform.reflow");
    expect(text).toContain("gq");
    expect(text).not.toContain("promptTransform");
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

  test("read-only popup builders expose titles and bounded line arrays", () => {
    const help = runtimeHelpPopup({ command: "help", query: "search" }, DEFAULT_VIM_OPTIONS);
    const features = runtimeHelpPopup({ command: "features", query: "redo" }, DEFAULT_VIM_OPTIONS);
    const actions = diagnosticPopup({ command: "actions", query: "redo" }, DEFAULT_VIM_OPTIONS);
    const keymap = diagnosticPopup({ command: "keymap", query: "redo" }, DEFAULT_VIM_OPTIONS);
    const mapcheck = diagnosticPopup({ command: "mapcheck", query: "ctrl+p" }, DEFAULT_VIM_OPTIONS);
    const doctor = diagnosticPopup({ command: "vimdoctor" }, DEFAULT_VIM_OPTIONS);

    expect(help).toMatchObject({ title: ":help search", source: "help", query: "search" });
    expect(features).toMatchObject({ title: ":features redo", source: "features" });
    expect(actions).toMatchObject({ title: ":actions redo", source: "actions" });
    expect(keymap).toMatchObject({ title: ":keymap redo", source: "keymap" });
    expect(mapcheck).toMatchObject({ title: ":mapcheck ctrl+p", source: "mapcheck" });
    expect(doctor).toMatchObject({ title: ":vimdoctor", source: "vimdoctor" });
    for (const popup of [help, features, actions, keymap, mapcheck, doctor]) {
      expect(popup.scrollOffset).toBe(0);
      expect(popup.lines.length).toBeGreaterThan(0);
      expect(popup.lines.every((line) => line.trim().length > 0)).toBe(true);
    }
  });

  test("read-only popup builders keep no-match and empty states visible", () => {
    expect(
      runtimeHelpPopup({ command: "help", query: "vimscript" }, DEFAULT_VIM_OPTIONS).lines,
    ).toContain("help: no match for vimscript");
    expect(
      runtimeHelpPopup({ command: "features", query: "unsupported-query" }, DEFAULT_VIM_OPTIONS)
        .lines,
    ).toContain("features: no match for unsupported-query");
    expect(runtimeHelpPopup({ command: "messages" }, DEFAULT_VIM_OPTIONS).lines).toContain(
      "messages: none retained",
    );
  });

  test("inspect popup summarizes state without raw prompt text", () => {
    const popup = inspectPopup({
      state: { mode: "normal" },
      snapshot: {
        text: "secret raw prompt",
        lines: ["secret raw prompt"],
        cursor: { line: 0, col: 0 },
      },
      options: DEFAULT_VIM_OPTIONS,
      diagnostics: { warnings: [] },
    });

    expect(popup.title).toBe(":vimmode inspect");
    expect(popup.source).toBe("inspect");
    expect(popup.lines.join("\n")).toContain("mode=normal");
    expect(popup.lines.join("\n")).not.toContain("secret raw prompt");
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
      runtimeFeaturesMessage("prompt.transform.reflow", { ...context, options: actions }),
    ).toContain("gq");
    expect(runtimeFeaturesMessage("promptTransform.reflow", { ...context, options: actions })).toBe(
      "features: no match for promptTransform.reflow",
    );
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
    const reflowMessage = runtimeFeaturesMessage("reflow", { ...context, options: transforms });
    expect(reflowMessage).toContain("prompt.transform.reflow");
    expect(reflowMessage).toContain("disabled");
    expect(reflowMessage).toContain("width?:integer");
    expect(runtimeFeaturesMessage("quote", { ...context, options: transforms })).toContain(
      "ex=qte",
    );
  });

  test("registry entries carry drift anchors", () => {
    for (const entry of runtimeHelpEntries(context)) {
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.topics.length).toBeGreaterThan(0);
      expect(entry.summary.length).toBeGreaterThan(0);
      expect(entry.examples.length).toBeGreaterThan(0);
      expect(entry.limits.length).toBeGreaterThan(0);
      expect(entry.docsAnchor.length).toBeGreaterThan(0);
      expect(entry.specAnchor.length).toBeGreaterThan(0);
      expect(entry.testAnchors.length).toBeGreaterThanOrEqual(1);
    }
  });
});
