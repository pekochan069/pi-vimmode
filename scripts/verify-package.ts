import { cp, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_PACKAGE_FILES = [
  "index.js",
  "package.json",
  "LICENSE",
  "README.md",
  "docs/features.md",
  "docs/settings.md",
] as const;

const FORBIDDEN_PACKAGE_PREFIXES = ["benchmark", "corpus", "profile", "result"];

type PackageJson = { files?: unknown; version?: unknown };

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
    (file) => file !== "package.json" && !manifestFiles.includes(file),
  );
  const manifestForbidden = manifestFiles.filter((file) =>
    file
      .split("/")
      .some((segment) =>
        FORBIDDEN_PACKAGE_PREFIXES.some((prefix) => segment.toLowerCase().startsWith(prefix)),
      ),
  );

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
  const consumerPackageDir = join(cwd, "package");

  try {
    if (isInside(repositoryRoot, cwd)) {
      throw new Error(`Temporary consumer must be outside repository: ${cwd}`);
    }
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
    await run(["--no-install", "-e", "await import('./package/index.js')"]);
  });
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
  console.log(`\n\u001b[32m✔\u001b[0m Package verification passed for v${expectedVersion}`);
}

if (import.meta.main) await main();
