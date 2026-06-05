import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { builtinModules } from "node:module";
import { join } from "node:path";
import { defineConfig } from "rolldown";

const nodeBuiltins = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);
const piCorePackages = [
  "@earendil-works/pi-coding-agent",
  "@earendil-works/pi-agent-core",
  "@earendil-works/pi-ai",
  "@earendil-works/pi-tui",
  "typebox",
];
const distDir = "dist";
const distDocs = ["docs/features.md", "docs/settings.md"];

const isExternal = (id: string) =>
  nodeBuiltins.has(id) || piCorePackages.some((pkg) => id === pkg || id.startsWith(`${pkg}/`));

async function writeDistPackageJson() {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  delete packageJson.scripts;
  delete packageJson.devDependencies;

  packageJson.type = "module";
  packageJson.main = "./index.js";
  packageJson.module = "./index.js";
  packageJson.exports = "./index.js";
  packageJson.files = ["index.js", "README.md", "LICENSE", "docs/features.md", "docs/settings.md"];
  packageJson.pi = { extensions: ["./index.js"] };

  await writeFile(join(distDir, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
}

async function copyDistDocs() {
  await mkdir(join(distDir, "docs"), { recursive: true });
  await cp("README.md", join(distDir, "README.md"));
  await cp("LICENSE", join(distDir, "LICENSE"));
  await Promise.all(distDocs.map((doc) => cp(doc, join(distDir, doc))));
}

export default defineConfig({
  input: "./src/index.ts",
  platform: "node",
  transform: {
    target: "es2022",
  },
  external: isExternal,
  output: {
    cleanDir: true,
    codeSplitting: false,
    dir: distDir,
    entryFileNames: "index.js",
    format: "esm",
    minify: true,
  },
  plugins: [
    {
      name: "dist-package-files",
      async writeBundle() {
        await Promise.all([writeDistPackageJson(), copyDistDocs()]);
      },
    },
  ],
});
