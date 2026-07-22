export const PACKAGE_DOCS = ["docs/config.md", "docs/features.md", "docs/settings.md"] as const;

export const PACKAGE_EXAMPLES = [
  "examples/pi-vimmode.config.js",
  "examples/keymaps.config.js",
  "examples/async.config.js",
  "examples/imported-preset.config.js",
  "examples/presets/markdown.js",
] as const;

export const PACKAGE_MANIFEST_FILES = [
  "index.js",
  "config.d.ts",
  "README.md",
  "LICENSE",
  ...PACKAGE_DOCS,
  "examples",
] as const;

export const REQUIRED_PACKAGE_FILES = [
  "index.js",
  "config.d.ts",
  "package.json",
  "LICENSE",
  "README.md",
  ...PACKAGE_DOCS,
  ...PACKAGE_EXAMPLES,
] as const;
