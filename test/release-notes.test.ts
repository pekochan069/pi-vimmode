import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadCurrentRelease, parseCurrentRelease } from "../src/release-notes.ts";

const repositoryReleaseUrl = "https://github.com/pekochan069/pi-vimmode/releases/tag/v0.9.0";

async function packageDirectory(asset?: string) {
  const directory = await mkdtemp(join(tmpdir(), "pi-vimmode-release-notes-"));
  await writeFile(join(directory, "package.json"), JSON.stringify({ version: "0.9.0" }));
  if (asset !== undefined) await writeFile(join(directory, "release-notes.json"), asset);
  return directory;
}

describe("current release parsing", () => {
  test("extracts every current-release section through next release in source order", () => {
    const content = parseCurrentRelease(
      "# v0.9.0\n\n## Added\n\nFirst.\n\n## Fixed\n\n- Second\n\n# v0.8.0\n\n## Older\n",
      "0.9.0",
    );

    expect(content).toBe("## Added\n\nFirst.\n\n## Fixed\n\n- Second");
  });

  test("rejects invalid release sources", () => {
    expect(() => parseCurrentRelease("# v0.8.0\n\n## Added\n\nText", "0.9.0")).toThrow(
      "version mismatch",
    );
    expect(() => parseCurrentRelease("# v0.9.0\n\nText", "0.9.0")).toThrow("second-level section");
    expect(() => parseCurrentRelease("# v0.9.0\n\n## Added\n\n```ts\ntext", "0.9.0")).toThrow(
      "unclosed fenced code block",
    );
    expect(() => parseCurrentRelease("# v0.9.0\n\n## Added\n\n```\n```", "0.9.0")).toThrow(
      "non-empty content",
    );
  });

  test("keeps fence-prefixed code inside current release", () => {
    expect(
      parseCurrentRelease("# v0.9.0\n\n## Added\n\n```text\n```not-a-close\n```", "0.9.0"),
    ).toBe("## Added\n\n```text\n```not-a-close\n```");
  });
});

describe("packaged current release", () => {
  test("loads valid package-relative asset", async () => {
    const directory = await packageDirectory(
      JSON.stringify({ version: "0.9.0", content: "## Added\n\nText" }),
    );
    try {
      expect(loadCurrentRelease(directory)).toEqual({
        available: true,
        content: "## Added\n\nText",
        releaseUrl: repositoryReleaseUrl,
        version: "0.9.0",
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("returns unavailable content for missing, malformed, and stale assets", async () => {
    for (const asset of [
      undefined,
      "not json",
      JSON.stringify({ version: "0.8.0", content: "## Old\n\nText" }),
    ]) {
      const directory = await packageDirectory(asset);
      try {
        expect(loadCurrentRelease(directory)).toEqual({
          available: false,
          content: `Changelog unavailable for v0.9.0\n${repositoryReleaseUrl}`,
          releaseUrl: repositoryReleaseUrl,
          version: "0.9.0",
        });
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    }
  });
});
