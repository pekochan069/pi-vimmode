import { cp, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_PACKAGE_FILES = [
  "index.js",
  "config.d.ts",
  "package.json",
  "LICENSE",
  "README.md",
  "docs/config.md",
  "docs/features.md",
  "docs/settings.md",
  "examples/pi-vimmode.config.js",
  "examples/keymaps.config.js",
  "examples/async.config.js",
  "examples/imported-preset.config.js",
  "examples/presets/markdown.js",
] as const;

const FORBIDDEN_PACKAGE_PREFIXES = ["benchmark", "corpus", "profile", "result"];

type PackageJson = { files?: unknown; version?: unknown; exports?: unknown };

export type PackageConsumer = {
  cwd: string;
  packageDir: string;
  run: (args: string[]) => Promise<string>;
};

async function packageFiles(packageDir: string): Promise<string[]> {
  const files: string[] = [];

  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile()) {
        files.push(relative(packageDir, path).split(sep).join("/"));
      }
    }
  }

  await visit(packageDir);
  return files.sort();
}

export async function verifyPackageInventory(
  packageDir: string,
  expectedVersion: string,
): Promise<void> {
  const files = await packageFiles(packageDir);
  const missing = REQUIRED_PACKAGE_FILES.filter((file) => !files.includes(file));
  const forbidden = files.filter((file) =>
    file
      .split("/")
      .some((segment) =>
        FORBIDDEN_PACKAGE_PREFIXES.some((prefix) => segment.toLowerCase().startsWith(prefix)),
      ),
  );
  const manifestPath = join(packageDir, "package.json");
  let manifest: PackageJson | undefined;

  if (!missing.includes("package.json")) {
    manifest = JSON.parse(await readFile(manifestPath, "utf8")) as PackageJson;
  }

  const manifestFiles = Array.isArray(manifest?.files)
    ? manifest.files.filter((file): file is string => typeof file === "string")
    : [];
  const manifestMissing = REQUIRED_PACKAGE_FILES.filter(
    (file) =>
      file !== "package.json" &&
      !manifestFiles.some((entry) => file === entry || file.startsWith(`${entry}/`)),
  );
  const manifestForbidden = manifestFiles.filter((file) =>
    file
      .split("/")
      .some((segment) =>
        FORBIDDEN_PACKAGE_PREFIXES.some((prefix) => segment.toLowerCase().startsWith(prefix)),
      ),
  );
  const configRuntimeFiles = files.filter((file) => /(?:^|\/)config\.(?:cjs|js|mjs)$/.test(file));
  const packageExports = manifest?.exports;
  const rootExport =
    packageExports && typeof packageExports === "object" && !Array.isArray(packageExports)
      ? (packageExports as Record<string, unknown>)["."]
      : undefined;
  const configExport =
    packageExports && typeof packageExports === "object" && !Array.isArray(packageExports)
      ? (packageExports as Record<string, unknown>)["./config"]
      : undefined;

  const errors: string[] = [];
  if (missing.length > 0) errors.push(`Missing required package files: ${missing.join(", ")}`);
  if (manifestMissing.length > 0) {
    errors.push(`Manifest missing packaged files: ${manifestMissing.join(", ")}`);
  }
  if (manifest?.version !== expectedVersion) {
    errors.push(
      `Package version mismatch: expected ${expectedVersion}, found ${String(manifest?.version)}`,
    );
  }
  if (forbidden.length > 0) errors.push(`Forbidden package files: ${forbidden.join(", ")}`);
  if (manifestForbidden.length > 0) {
    errors.push(`Forbidden manifest files: ${manifestForbidden.join(", ")}`);
  }
  if (configRuntimeFiles.length > 0) {
    errors.push(`Config subpath must not include runtime files: ${configRuntimeFiles.join(", ")}`);
  }
  if (rootExport !== "./index.js") {
    errors.push(`Manifest root export mismatch: expected ./index.js, found ${String(rootExport)}`);
  }
  if (
    !configExport ||
    typeof configExport !== "object" ||
    Array.isArray(configExport) ||
    Object.keys(configExport).length !== 1 ||
    (configExport as Record<string, unknown>).types !== "./config.d.ts"
  ) {
    errors.push("Manifest ./config export must contain only types: ./config.d.ts");
  }

  if (errors.length > 0) throw new Error(errors.join("\n"));
}

function isInside(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return path === "" || (!path.startsWith(`..${sep}`) && path !== "..");
}

export async function withPackageConsumer<T>(
  packageDir: string,
  assertion: (consumer: PackageConsumer) => Promise<T> | T,
  repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url))),
): Promise<T> {
  const cwd = await mkdtemp(join(tmpdir(), "pi-vimmode-package-"));
  const consumerPackageDir = join(cwd, "node_modules", "pi-vimmode");

  try {
    if (isInside(repositoryRoot, cwd)) {
      throw new Error(`Temporary consumer must be outside repository: ${cwd}`);
    }
    await mkdir(join(cwd, "node_modules"), { recursive: true });
    await cp(packageDir, consumerPackageDir, { recursive: true });
    const run = async (args: string[]): Promise<string> => {
      const command = [process.execPath, ...args];
      const processResult = Bun.spawn(command, {
        cwd,
        env: { ...process.env, NODE_PATH: join(repositoryRoot, "node_modules") },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(processResult.stdout).text(),
        new Response(processResult.stderr).text(),
        processResult.exited,
      ]);

      if (exitCode !== 0) {
        const details = (stderr || stdout).trim();
        throw new Error(
          `Package consumer command failed (exit ${exitCode}): ${command.join(" ")}\n${details}`,
        );
      }
      return stdout;
    };

    return await assertion({ cwd, packageDir: consumerPackageDir, run });
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}

export async function verifyPackageSmoke(packageDir: string): Promise<void> {
  await withPackageConsumer(packageDir, async ({ run }) => {
    await run(["--no-install", "-e", "await import('pi-vimmode')"]);
    try {
      await run(["--no-install", "-e", "await import('pi-vimmode/config')"]);
    } catch (error) {
      if (!String(error).includes("pi-vimmode/config")) throw error;
      return;
    }
    throw new Error("Runtime config subpath must not resolve");
  });
}

const TYPE_CONSUMER = `import type {
  VimConfig,
  VimConfigApi,
  VimActionDescriptor,
} from "pi-vimmode/config";
import basicExample from "./examples/pi-vimmode.config.js";
import keymapExample from "./examples/keymaps.config.js";
import asyncExample from "./examples/async.config.js";
import importedPresetExample from "./examples/imported-preset.config.js";

const helper = (vim: VimConfigApi): void => {
  vim.preset = "prompt-safe";
  vim.g.mapleader = " ";
  vim.startMode = "normal";
  vim.cursor.normal = "bar";
  vim.ui.status.enabled = true;
  vim.keymap.set("n", "dd", vim.action.operator.delete());
  vim.keymap.set("v", "zq", vim.action.prompt.transform.reflow({ width: 88 }));
  const descriptor: VimActionDescriptor = vim.prompt.quote();
  vim.keymap.set(["n", "x"], "zq", descriptor, { desc: "quote" });
};

const syncConfig: VimConfig = helper;
const asyncConfig: VimConfig = async (vim) => {
  helper(vim);
  vim.prompt.fence({ language: "ts" });
};
const checkedExamples: VimConfig[] = [
  basicExample,
  keymapExample,
  asyncExample,
  importedPresetExample,
];
void syncConfig;
void asyncConfig;
void checkedExamples;
`;

async function verifyPackageTypesForMode(
  run: PackageConsumer["run"],
  cwd: string,
  module: "ESNext" | "NodeNext",
  moduleResolution: "Bundler" | "NodeNext",
  repositoryRoot: string,
): Promise<void> {
  await symlink(join(cwd, "node_modules/pi-vimmode/examples"), join(cwd, "examples"));
  await writeFile(join(cwd, "consumer.ts"), TYPE_CONSUMER);
  await writeFile(join(cwd, "package.json"), JSON.stringify({ type: "module" }));
  await writeFile(
    join(cwd, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module,
        moduleResolution,
        strict: true,
        noEmit: true,
        allowJs: true,
        checkJs: true,
        skipLibCheck: true,
      },
      files: [
        "consumer.ts",
        "examples/pi-vimmode.config.js",
        "examples/keymaps.config.js",
        "examples/async.config.js",
        "examples/imported-preset.config.js",
        "examples/presets/markdown.js",
      ],
    }),
  );
  await run([
    join(repositoryRoot, "node_modules/typescript/lib/tsc.js"),
    "--project",
    join(cwd, "tsconfig.json"),
  ]);
}

export async function verifyPackageTypes(
  packageDir: string,
  repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url))),
): Promise<void> {
  await withPackageConsumer(
    packageDir,
    (consumer) =>
      verifyPackageTypesForMode(consumer.run, consumer.cwd, "ESNext", "Bundler", repositoryRoot),
    repositoryRoot,
  );
  await withPackageConsumer(
    packageDir,
    (consumer) =>
      verifyPackageTypesForMode(consumer.run, consumer.cwd, "NodeNext", "NodeNext", repositoryRoot),
    repositoryRoot,
  );
}

async function main(): Promise<void> {
  const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  const rootManifest = JSON.parse(
    await readFile(join(repositoryRoot, "package.json"), "utf8"),
  ) as PackageJson;
  const expectedVersion = rootManifest.version;
  if (typeof expectedVersion !== "string") throw new Error("Root package.json has no version");

  const packageDir = join(repositoryRoot, "dist");
  await verifyPackageInventory(packageDir, expectedVersion);
  await verifyPackageSmoke(packageDir);
  await verifyPackageTypes(packageDir, repositoryRoot);
  console.log(`\n\u001b[32m✔\u001b[0m Package verification passed for v${expectedVersion}`);
}

if (import.meta.main) await main();
