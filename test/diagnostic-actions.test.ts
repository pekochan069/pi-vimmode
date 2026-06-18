import { describe, expect, test } from "bun:test";

import {
  DIAGNOSTIC_ACTIONS,
  diagnosticActionMessage,
  searchDiagnosticActions,
} from "../src/diagnostic-actions.ts";

describe("diagnostic/help action metadata", () => {
  test("registry contains finite metadata-only vimmode actions", () => {
    expect(DIAGNOSTIC_ACTIONS.map((entry) => entry.id)).toEqual([
      "vimmode.doctor",
      "vimmode.actions",
      "vimmode.keymap",
      "vimmode.keybindings",
      "vimmode.mapcheck",
      "vimmode.help",
      "vimmode.features",
      "vimmode.messages",
      "vimmode.inspect",
    ]);

    const ids = new Set<string>();
    for (const entry of DIAGNOSTIC_ACTIONS) {
      expect(entry.id).toStartWith("vimmode.");
      expect(ids.has(entry.id)).toBe(false);
      ids.add(entry.id);
      expect(entry.bindable).toBe(false);
      expect(entry.command.length).toBeGreaterThan(0);
      expect(entry.topics.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.examples.length).toBeGreaterThan(0);
      expect("docsAnchor" in entry).toBe(false);
      expect("specAnchor" in entry).toBe(false);
      expect("testAnchors" in entry).toBe(false);
      expect("dispatch" in entry).toBe(false);
    }
  });

  test("searches IDs, commands, topics, descriptions, and examples", () => {
    expect(searchDiagnosticActions("vimmode.doctor")[0]?.id).toBe("vimmode.doctor");
    expect(searchDiagnosticActions("vimdoctor")[0]?.id).toBe("vimmode.doctor");
    expect(searchDiagnosticActions("metadata-only")[0]?.id).toBeTruthy();
    expect(searchDiagnosticActions(":features redo")[0]?.id).toBe("vimmode.features");
    expect(searchDiagnosticActions("vimmode.dump")).toEqual([]);
  });

  test("formats compact metadata-only messages", () => {
    const message = diagnosticActionMessage(searchDiagnosticActions("vimmode.help")[0]!);
    expect(message).toContain("vimmode.help");
    expect(message).toContain("runtimeHelp");
    expect(message).toContain("command=:help");
    expect(message).toContain("metadata-only");
    expect(message).toContain("not bindable");
  });
});
