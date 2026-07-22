export const PACKAGE_DOCS = ["docs/config.md", "docs/features.md", "docs/settings.md"] as const;

export const PACKAGE_MANIFEST_FILES = [
  "index.js",
  "config.d.ts",
  "README.md",
  "LICENSE",
  ...PACKAGE_DOCS,
] as const;

export const REQUIRED_PACKAGE_FILES = [
  "index.js",
  "config.d.ts",
  "package.json",
  "LICENSE",
  "README.md",
  ...PACKAGE_DOCS,
] as const;
