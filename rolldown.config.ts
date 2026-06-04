import { builtinModules } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
  packageJson.pi = { extensions: ["./index.js"] };

  await mkdir(distDir, { recursive: true });
  await writeFile(join(distDir, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
}

export default defineConfig({
  input: "./src/index.ts",
  platform: "node",
  transform: {
    target: "es2022",
  },
  external: isExternal,
  output: {
    dir: distDir,
    entryFileNames: "index.js",
    format: "esm",
    codeSplitting: false,
  },
  plugins: [
    {
      name: "dist-package-json",
      async writeBundle() {
        await writeDistPackageJson();
      },
    },
  ],
});
