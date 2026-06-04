---
title: Pi extension source root with dist publish package metadata
date: 2026-06-04
category: docs/solutions/tooling-decisions
module: pi-vimmode
problem_type: tooling_decision
component: tooling
severity: low
applies_when:
  - "Pi extension supports git install from the repository root"
  - "Build output publishes from dist"
  - "Root package and published package need different pi.extensions entrypoints"
tags:
  - pi-extension
  - package-json
  - rolldown
  - npm-publish
  - git-install
  - build-output
---

# Pi extension source root with dist publish package metadata

## Context

`pi-vimmode` needed to support both Pi install paths:

- Git install from the repository root, where Pi can load TypeScript source through `index.ts`.
- npm install from a published `dist` package, where Pi should load built JavaScript through `./index.js` relative to that package root.

A single root `package.json` cannot make `pi.extensions` point to `./index.ts` for git installs and `./index.js` for npm installs. The durable split is to keep the root package source-oriented, then generate a dist-local `package.json` during build.

Session history search found no relevant prior sessions for this specific packaging decision.

## Guidance

Keep the root `package.json` usable for git installs:

```json
{
  "pi": {
    "extensions": ["./index.ts"]
  }
}
```

Bundle the extension into `dist/index.js` with Rolldown, externalizing Node builtins and Pi core packages so the published extension does not embed duplicate Pi runtime classes:

```ts
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
```

Publish from `dist`, not from the repository root:

```sh
bun run build
cd dist
npm publish
```

The generated package metadata should point every runtime entry at the bundled file:

```json
{
  "type": "module",
  "main": "./index.js",
  "module": "./index.js",
  "exports": "./index.js",
  "pi": {
    "extensions": ["./index.js"]
  }
}
```

## Why This Matters

Git installs and npm installs resolve package resources from different physical package roots:

- Git install sees the repository root and can use `./index.ts` as a source entry.
- npm install sees the packed/published package root. If publishing from `dist`, that package root needs `./index.js`.

Generating `dist/package.json` avoids two failure modes:

- Root package points at `./dist/index.js`, forcing git installs to depend on committed build artifacts.
- Published package points at `./index.ts`, forcing npm installs to include source files or rely on TypeScript loading from the published tarball.

It also keeps publish metadata from drifting manually: one build step rewrites entry fields and strips dev-only fields before publication.

## When to Apply

- Pi extension supports both direct git install and npm registry install.
- Repository root should remain source-first for local development and git consumers.
- npm package should be published from `dist` and expose built JavaScript only.
- `pi.extensions` needs a different path in source package vs published package.
- Build tool can run a post-bundle hook to write package metadata.

## Examples

Expected file layout after build:

```text
index.ts                 # root source shim for git install
src/index.ts             # extension source entry
dist/index.js            # bundled npm entry
dist/package.json        # publish metadata pointing at ./index.js
```

Root source shim:

```ts
export { default } from "./src/index.ts";
```

Install behavior:

```text
git install -> root package.json -> ./index.ts
npm install -> dist/package.json -> ./index.js
```

Before publishing, verify the generated package and packed contents:

```sh
bun run build
cat dist/package.json
(cd dist && npm pack --dry-run)
```

The `pi.extensions` field in `dist/package.json` should be:

```json
{
  "pi": {
    "extensions": ["./index.js"]
  }
}
```

## Related

- [Pi vimmode auto activation reliability](../developer-experience/pi-vimmode-auto-activation-2026-05-26.md) — related entrypoint guidance; keep `index.ts` thin and delegate runtime behavior.
- [Pi Vim mode UI config as single source of truth](./pi-vimmode-ui-config-single-source-of-truth-2026-05-27.md) — related tooling decision about avoiding competing configuration surfaces.

GitHub issue searches for `pi extension package publishing rolldown`, `npm git install dist package.json`, `pi.extensions index.ts dist index.js`, and `Rolldown package.json dist index.js` returned no directly related issues.
