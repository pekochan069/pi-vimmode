import { existsSync } from "node:fs";
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
        const docsDir = join(distDir, "docs");
        if (!existsSync(docsDir)) {
          await this.fs.mkdir(docsDir, { recursive: true });
        }

        const packageJson = await JSON.parse(
          await this.fs.readFile("package.json", {
            encoding: "utf8",
          }),
        );
        delete packageJson.scripts;
        delete packageJson.devDependencies;

        packageJson.type = "module";
        packageJson.main = "./index.js";
        packageJson.module = "./index.js";
        packageJson.exports = {
          ".": "./index.js",
          "./config": { types: "./config.d.ts" },
        };
        packageJson.files = [
          "index.js",
          "config.d.ts",
          "README.md",
          "LICENSE",
          "docs/features.md",
          "docs/settings.md",
        ];
        packageJson.pi = { extensions: ["./index.js"] };

        await Promise.all([
          this.fs.writeFile(
            join(distDir, "package.json"),
            `${JSON.stringify(packageJson, null, 2)}\n`,
          ),
          this.fs.copyFile("README.md", join(distDir, "README.md")),
          this.fs.copyFile("LICENSE", join(distDir, "LICENSE")),
          this.fs.copyFile("src/vim-config.d.ts", join(distDir, "config.d.ts")),
          distDocs.map((doc) => this.fs.copyFile(doc, join(distDir, doc))),
        ]);
      },
    },
  ],
});
