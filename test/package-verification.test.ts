import { describe, expect, test } from "bun:test";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { verifyPackageInventory, withPackageConsumer } from "../scripts/verify-package.ts";

const requiredFiles = {
  "index.js": "export {};\n",
  "package.json": JSON.stringify({ version: "0.9.0" }),
  LICENSE: "MIT\n",
  "README.md": "README\n",
  "docs/features.md": "Features\n",
  "docs/settings.md": "Settings\n",
};
const requiredManifestFiles = Object.keys(requiredFiles).filter((file) => file !== "package.json");

async function fixture(
  files: Record<string, string> = requiredFiles,
  version = "0.9.0",
  manifestFiles = requiredManifestFiles,
) {
  const directory = await mkdtemp(join(tmpdir(), "pi-vimmode-package-test-"));
  for (const [path, content] of Object.entries(files)) {
    const filePath = join(directory, path);
    await mkdir(join(filePath, ".."), { recursive: true });
    await writeFile(
      filePath,
      path === "package.json" ? JSON.stringify({ version, files: manifestFiles }) : content,
    );
  }
  return directory;
}

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("package artifact verification", () => {
  test("accepts complete baseline inventory", async () => {
    const directory = await fixture();
    try {
      await expect(verifyPackageInventory(directory, "0.9.0")).resolves.toBeUndefined();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("reports missing required artifacts", async () => {
    const files: Record<string, string> = { ...requiredFiles };
    delete files["docs/settings.md"];
    const directory = await fixture(files);
    try {
      await expect(verifyPackageInventory(directory, "0.9.0")).rejects.toThrow(
        "Missing required package files: docs/settings.md",
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("reports built manifest version mismatch", async () => {
    const directory = await fixture(requiredFiles, "0.8.1");
    try {
      await expect(verifyPackageInventory(directory, "0.9.0")).rejects.toThrow(
        "Package version mismatch: expected 0.9.0, found 0.8.1",
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("reports required files omitted from manifest packaging", async () => {
    const directory = await fixture(requiredFiles, "0.9.0", [
      "index.js",
      "README.md",
      "LICENSE",
      "docs/features.md",
    ]);
    try {
      await expect(verifyPackageInventory(directory, "0.9.0")).rejects.toThrow(
        "Manifest missing packaged files: docs/settings.md",
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("reports forbidden benchmark, corpus, profile, and result paths", async () => {
    const directory = await fixture({
      ...requiredFiles,
      "benchmark-results-2026/summary.json": "{}",
      "benchmark_corpus/prompts.json": "[]",
      "profiles/cpu.json": "{}",
      "results/summary.json": "{}",
    });
    try {
      await expect(verifyPackageInventory(directory, "0.9.0")).rejects.toThrow(
        "Forbidden package files: benchmark-results-2026/summary.json, benchmark_corpus/prompts.json, profiles/cpu.json, results/summary.json",
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("does not let repository files mask missing package artifacts", async () => {
    const files: Record<string, string> = { ...requiredFiles };
    delete files["README.md"];
    const directory = await fixture(files);
    try {
      await expect(verifyPackageInventory(directory, "0.9.0")).rejects.toThrow(
        "Missing required package files: README.md",
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("reports consumer command failures and cleans temporary consumer", async () => {
    const sourceDirectory = await fixture();
    let consumerCwd = "";
    try {
      await expect(
        withPackageConsumer(sourceDirectory, async (consumer) => {
          consumerCwd = consumer.cwd;
          await consumer.run(["--no-install", "-e", "process.exit(7)"]);
        }),
      ).rejects.toThrow("Package consumer command failed (exit 7)");
      expect(await exists(consumerCwd)).toBe(false);
    } finally {
      await rm(sourceDirectory, { recursive: true, force: true });
    }
  });

  test("rejects temporary consumers inside repository root", async () => {
    const sourceDirectory = await fixture();
    try {
      await expect(withPackageConsumer(sourceDirectory, () => {}, tmpdir())).rejects.toThrow(
        "Temporary consumer must be outside repository",
      );
    } finally {
      await rm(sourceDirectory, { recursive: true, force: true });
    }
  });

  test("runs assertions from temporary cwd using copied artifact", async () => {
    const sourceDirectory = await fixture();
    try {
      await withPackageConsumer(sourceDirectory, async (consumer) => {
        expect(consumer.cwd).not.toBe(process.cwd());
        expect(await readFile(join(consumer.packageDir, "README.md"), "utf8")).toBe("README\n");
        await consumer.run(["--no-install", "-e", "await import('./package/index.js')"]);
      });
    } finally {
      await rm(sourceDirectory, { recursive: true, force: true });
    }
  });
});
