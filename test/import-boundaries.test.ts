import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return await Bun.file(path).text();
}

describe("import boundaries", () => {
  test("read-only popup consumers do not import popup state through keybinding content", async () => {
    const consumers = [
      "src/modal/types.ts",
      "src/keybinding-discovery-overlay.ts",
      "src/modal/engine.ts",
    ];

    for (const path of consumers) {
      expect(await source(path)).not.toMatch(/keybinding-discovery-popup\.ts/);
    }
  });

  test("shared read-only popup seam stays independent of feature content and modal state", async () => {
    expect(await source("src/read-only-popup.ts")).not.toMatch(
      /modal\/inspect|modal\/types|keybinding-discovery-popup|runtime-help|customization/,
    );
  });
});
