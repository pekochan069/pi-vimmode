import { describe, expect, test } from "bun:test";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PACKAGE_MANIFEST_FILES, REQUIRED_PACKAGE_FILES } from "../scripts/package-inventory.ts";
import {
  verifyPackageInventory,
  verifyPackageSmoke,
  verifyPackageTypes,
  withPackageConsumer,
} from "../scripts/verify-package.ts";

const requiredFiles = {
  "index.js": "export {};\n",
  "config.d.ts": await Bun.file(join(import.meta.dir, "../src/vim-config.d.ts")).text(),
  "package.json": JSON.stringify({ version: "0.9.0" }),
  LICENSE: "MIT\n",
  "README.md": "README\n",
  "docs/config.md": "Config\n",
  "docs/features.md": "Features\n",
  "docs/settings.md": "Settings\n",
  "examples/pi-vimmode.config.js": "export default () => {};\n",
  "examples/keymaps.config.js": "export default () => {};\n",
  "examples/async.config.js": "export default async () => {};\n",
  "examples/imported-preset.config.js": "export default () => {};\n",
  "examples/presets/markdown.js": "export default () => {};\n",
};
const requiredManifestFiles = [
  "index.js",
  "config.d.ts",
  "README.md",
  "LICENSE",
  "docs/config.md",
  "docs/features.md",
  "docs/settings.md",
  "examples",
];
const requiredExports = { ".": "./index.js", "./config": { types: "./config.d.ts" } };

async function fixture(
  files: Record<string, string> = requiredFiles,
  version = "0.9.0",
  manifestFiles = requiredManifestFiles,
  exports: unknown = requiredExports,
) {
  const directory = await mkdtemp(join(tmpdir(), "pi-vimmode-package-test-"));
  for (const [path, content] of Object.entries(files)) {
    const filePath = join(directory, path);
    await mkdir(join(filePath, ".."), { recursive: true });
    await writeFile(
      filePath,
      path === "package.json"
        ? JSON.stringify({ version, files: manifestFiles, exports })
        : content,
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

describe("package inventory", () => {
  test("keeps production package inventory aligned with independent test contract", () => {
    expect([...REQUIRED_PACKAGE_FILES].sort() as string[]).toEqual(
      Object.keys(requiredFiles).sort(),
    );
    expect([...PACKAGE_MANIFEST_FILES] as string[]).toEqual(requiredManifestFiles);
  });

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
    const directory = await fixture(
      requiredFiles,
      "0.9.0",
      requiredManifestFiles.filter((file) => file !== "docs/settings.md"),
    );
    try {
      await expect(verifyPackageInventory(directory, "0.9.0")).rejects.toThrow(
        "Manifest missing packaged files: docs/settings.md",
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("reports missing config declaration", async () => {
    const files: Record<string, string> = { ...requiredFiles };
    delete files["config.d.ts"];
    const directory = await fixture(files);
    try {
      await expect(verifyPackageInventory(directory, "0.9.0")).rejects.toThrow(
        "Missing required package files: config.d.ts",
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe("package manifest constraints", () => {
  test("reports inconsistent declaration export", async () => {
    const directory = await fixture(requiredFiles, "0.9.0", requiredManifestFiles, {
      ".": "./index.js",
      "./config": { types: "./wrong.d.ts" },
    });
    try {
      await expect(verifyPackageInventory(directory, "0.9.0")).rejects.toThrow(
        "Manifest ./config export must contain only types: ./config.d.ts",
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("rejects runtime config artifacts and exports", async () => {
    const directory = await fixture(
      { ...requiredFiles, "config.js": "export {};\n" },
      "0.9.0",
      [...requiredManifestFiles, "config.js"],
      {
        ".": "./index.js",
        "./config": { types: "./config.d.ts", import: "./config.js" },
      },
    );
    try {
      await expect(verifyPackageInventory(directory, "0.9.0")).rejects.toThrow(
        "Config subpath must not include runtime files: config.js",
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
});

describe("package consumers", () => {
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

  test("verifies runtime and type-only package consumers", async () => {
    const sourceDirectory = await fixture();
    try {
      await expect(verifyPackageSmoke(sourceDirectory)).resolves.toBeUndefined();
      await expect(verifyPackageTypes(sourceDirectory)).resolves.toBeUndefined();
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
        await consumer.run(["--no-install", "-e", "await import('pi-vimmode')"]);
      });
    } finally {
      await rm(sourceDirectory, { recursive: true, force: true });
    }
  });
});
