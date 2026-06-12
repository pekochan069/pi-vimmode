import { describe, expect, test } from "bun:test";

import type { ExMessage, ModalState } from "../src/modal/types.ts";

import { DEFAULT_VIM_OPTIONS } from "../src/config.ts";
import {
  appendMessageHistory,
  MESSAGE_HISTORY_LIMIT,
  runtimeMessagesMessage,
  vimmodeInspectMessage,
} from "../src/modal/inspect.ts";

const cursor = { line: 1, col: 2 };
const snapshot = { text: "secret prompt text", lines: ["secret", "prompt text"], cursor };

describe("modal inspect diagnostics", () => {
  test("summarizes prompt-local state without dumping prompt text", () => {
    const state: ModalState = {
      mode: "visual",
      visualAnchor: { line: 0, col: 1 },
      register: { type: "char", text: "very secret register content" },
      namedRegisters: { a: { type: "line", text: "hidden line" } },
      clipboardRegisters: { "+": { type: "char", text: "clipboard secret" } },
      marks: { a: { line: 0, col: 0 } },
      macros: { q: ["i", "x", "\x1b"] },
      recordingSlot: "q",
      lastSearch: { query: "secret", direction: "forward", matcherMode: "literal" },
      searchHighlight: { query: "secret", current: { line: 0, col: 0 } },
      exHistory: ["%s/a/b/g"],
      messageHistory: [{ kind: "error", text: "Pattern not found: secret" }],
    };

    const message = vimmodeInspectMessage({
      state,
      snapshot,
      options: DEFAULT_VIM_OPTIONS,
      diagnostics: { warnings: ["bad keymap"] },
      render: { width: 40, terminalRows: 12, cursorStyle: "block" },
    });

    expect(message).toContain("inspect: mode=visual");
    expect(message).toContain("cursor=2:3");
    expect(message).toContain("selection=visual@1:2");
    expect(message).toContain("registers=unnamed-char:28,named-1(a),clipboard-(+:char:16)");
    expect(message).toContain("macros=q:3,recording=q");
    expect(message).toContain("search=last=forward:literal:6");
    expect(message).toContain("warnings=1");
    expect(message).toContain(
      "render=visual:true,search:true,workbench:false,size=40x12,cursor=block",
    );
    expect(message).not.toContain("secret prompt text");
    expect(message).not.toContain("very secret register content");
    expect(message).not.toContain("hidden line");
    expect(message).not.toContain("clipboard secret");
  });

  test("message history is bounded and retained message output is redacted", () => {
    const history = Array.from({ length: MESSAGE_HISTORY_LIMIT + 3 }, (_, index) => ({
      kind: "info" as const,
      text: `message ${index} with a long payload that should not fully render`,
    })).reduce<readonly ExMessage[] | undefined>(
      (messages, message) => appendMessageHistory(messages, message),
      undefined,
    );

    expect(history).toHaveLength(MESSAGE_HISTORY_LIMIT);
    expect(history?.[0]?.text).toStartWith("message 3");
    const rendered = runtimeMessagesMessage(history);
    expect(rendered).toContain(`messages: ${MESSAGE_HISTORY_LIMIT} retained`);
    expect(rendered).toContain("latest: message 22 with a long payload that should not …");
    expect(rendered).not.toContain("should not fully render");
  });
});
