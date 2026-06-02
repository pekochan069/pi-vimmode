import { describe, expect, test } from "bun:test";

import { resolvePromptStructureRange } from "../src/prompt-structures.ts";

const p = (line: number, col: number) => ({ line, col });

function sliceRange(
  text: string,
  range: { start: number; endExclusive: number } | undefined,
): string {
  if (!range) return "";
  return text.slice(range.start, range.endExclusive);
}

describe("prompt-native structure ranges", () => {
  test("resolves inner and around Markdown code fences", () => {
    const backtick = "before\n```ts\nconst x = 1;\n```\nafter";
    expect(
      sliceRange(
        backtick,
        resolvePromptStructureRange(backtick, p(2, 3), { kind: "inner", target: "codeFence" }),
      ),
    ).toBe("const x = 1;");
    expect(
      sliceRange(
        backtick,
        resolvePromptStructureRange(backtick, p(2, 3), { kind: "around", target: "codeFence" }),
      ),
    ).toBe("```ts\nconst x = 1;\n```");

    const tilde = "~~~\nbody\n~~~";
    expect(
      sliceRange(
        tilde,
        resolvePromptStructureRange(tilde, p(1, 1), { kind: "around", target: "codeFence" }),
      ),
    ).toBe("~~~\nbody\n~~~");
  });

  test("resolves heading sections with nested headings and end-of-prompt sections", () => {
    const text = "# One\nintro\n## Child\ndetail\n# Two\nlast";
    expect(
      sliceRange(
        text,
        resolvePromptStructureRange(text, p(1, 0), { kind: "inner", target: "headingSection" }),
      ),
    ).toBe("intro\n## Child\ndetail");
    expect(
      sliceRange(
        text,
        resolvePromptStructureRange(text, p(3, 0), { kind: "around", target: "headingSection" }),
      ),
    ).toBe("## Child\ndetail");
    expect(
      sliceRange(
        text,
        resolvePromptStructureRange(text, p(5, 0), { kind: "inner", target: "headingSection" }),
      ),
    ).toBe("last");
  });

  test("resolves list items with bullets, ordered markers, tasks, and continuations", () => {
    const text = "- first\n  continued\n- [x] done\n1. ordered\nplain";
    expect(
      sliceRange(
        text,
        resolvePromptStructureRange(text, p(1, 3), { kind: "around", target: "listItem" }),
      ),
    ).toBe("- first\n  continued");
    expect(
      sliceRange(
        text,
        resolvePromptStructureRange(text, p(0, 2), { kind: "inner", target: "listItem" }),
      ),
    ).toBe("first\n  continued");
    expect(
      sliceRange(
        text,
        resolvePromptStructureRange(text, p(2, 4), { kind: "inner", target: "listItem" }),
      ),
    ).toBe("done");
    expect(
      sliceRange(
        text,
        resolvePromptStructureRange(text, p(3, 3), { kind: "around", target: "listItem" }),
      ),
    ).toBe("1. ordered");
  });

  test("resolves XML-ish tags and treats malformed tags as missing", () => {
    const text = 'before <tool name="x">\nbody\n</tool> after';
    expect(
      sliceRange(
        text,
        resolvePromptStructureRange(text, p(1, 1), { kind: "inner", target: "tag" }),
      ),
    ).toBe("\nbody\n");
    expect(
      sliceRange(
        text,
        resolvePromptStructureRange(text, p(1, 1), { kind: "around", target: "tag" }),
      ),
    ).toBe('<tool name="x">\nbody\n</tool>');
    expect(
      resolvePromptStructureRange("<tool>body", p(0, 3), { kind: "around", target: "tag" }),
    ).toBeUndefined();
    expect(
      resolvePromptStructureRange("<a><b>x</a></b>", p(0, 6), { kind: "around", target: "tag" }),
    ).toBeUndefined();
  });

  test("resolves pasted error blocks without unrelated prose", () => {
    const text =
      "intro\nTypeError: boom\n    at fn (x.ts:2:1)\n    at main (x.ts:3:1)\nnext paragraph";
    expect(
      sliceRange(
        text,
        resolvePromptStructureRange(text, p(2, 5), { kind: "around", target: "errorBlock" }),
      ),
    ).toBe("TypeError: boom\n    at fn (x.ts:2:1)\n    at main (x.ts:3:1)");
    expect(
      resolvePromptStructureRange(text, p(0, 0), { kind: "around", target: "errorBlock" }),
    ).toBeUndefined();
  });
});
