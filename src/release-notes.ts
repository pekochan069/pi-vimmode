import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const RELEASE_ASSET_FILE = "release-notes.json";

const REPOSITORY_RELEASES_URL = "https://github.com/pekochan069/pi-vimmode/releases";

type ReleaseAsset = {
  version: string;
  content: string;
};

export type CurrentRelease = {
  available: boolean;
  content: string;
  releaseUrl: string;
  version: string;
};

type Heading = {
  index: number;
  text: string;
};

function invalidRelease(message: string): never {
  throw new Error(`Invalid RELEASE.md: ${message}`);
}

function fenceMarker(line: string): string | undefined {
  return line.match(/^\s*(`{3,}|~{3,})/)?.[1];
}

function closesFence(line: string, fence: string): boolean {
  return new RegExp(`^\\s*${fence[0]}{${fence.length},}\\s*$`).test(line);
}

function nextTopLevelHeading(lines: readonly string[], startIndex: number): Heading | undefined {
  let fence: string | undefined;

  for (let index = startIndex; index < lines.length; index++) {
    const line = lines[index]!;
    if (fence) {
      if (closesFence(line, fence)) fence = undefined;
      continue;
    }

    const marker = fenceMarker(line);
    if (marker) {
      fence = marker;
      continue;
    }
    if (/^#(?!#)\s+/.test(line)) return { index, text: line };
  }

  if (fence) invalidRelease("contains unclosed fenced code block");
}

function validateReleaseContent(content: string): void {
  let fence: string | undefined;
  let hasSection = false;
  let hasContent = false;

  for (const line of content.split("\n")) {
    if (fence) {
      if (closesFence(line, fence)) fence = undefined;
      else if (line.trim()) hasContent = true;
      continue;
    }

    const marker = fenceMarker(line);
    if (marker) {
      fence = marker;
      continue;
    }
    if (/^#(?!#)\s+/.test(line)) invalidRelease("contains an unexpected top-level heading");
    if (/^##(?!#)\s+\S/.test(line)) hasSection = true;
    else if (line.trim() && !/^#{1,6}\s+/.test(line)) hasContent = true;
  }

  if (fence) invalidRelease("contains unclosed fenced code block");
  if (!hasSection) invalidRelease("must contain at least one second-level section");
  if (!hasContent) invalidRelease("must contain non-empty content");
}

export function parseCurrentRelease(releaseSource: string, version: string): string {
  const lines = releaseSource.replace(/\r\n?/g, "\n").split("\n");
  if (!releaseSource.trim()) invalidRelease("is empty");

  const expectedHeading = `# v${version}`;
  const firstLine = lines[0] ?? "";
  if (firstLine !== expectedHeading) {
    if (firstLine.startsWith("# v")) {
      invalidRelease(`version mismatch: expected ${expectedHeading}, found ${firstLine}`);
    }
    invalidRelease(`must begin with ${expectedHeading}`);
  }

  const next = nextTopLevelHeading(lines, 1);
  if (next && !/^# v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(next.text)) {
    invalidRelease(`malformed release boundary: ${next.text}`);
  }

  const content = lines.slice(1, next?.index).join("\n").trim();
  validateReleaseContent(content);
  return content;
}

export function currentReleaseAsset(releaseSource: string, version: string): string {
  const asset: ReleaseAsset = { version, content: parseCurrentRelease(releaseSource, version) };
  return `${JSON.stringify(asset, null, 2)}\n`;
}

function releaseUrl(version: string): string {
  return `${REPOSITORY_RELEASES_URL}/tag/v${version}`;
}

function unavailable(version?: string): CurrentRelease {
  const url = version ? releaseUrl(version) : REPOSITORY_RELEASES_URL;
  return {
    available: false,
    content: version
      ? `Changelog unavailable for v${version}\n${url}`
      : `Changelog unavailable\n${url}`,
    releaseUrl: url,
    version: version ?? "unknown",
  };
}

function packageVersion(packageDirectory: string): string | undefined {
  try {
    const manifest = JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8")) as {
      version?: unknown;
    };
    return typeof manifest.version === "string" ? manifest.version : undefined;
  } catch {
    return undefined;
  }
}

function defaultPackageDirectory(): string {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  return packageVersion(moduleDirectory) ? moduleDirectory : dirname(moduleDirectory);
}

export function loadCurrentRelease(packageDirectory = defaultPackageDirectory()): CurrentRelease {
  const version = packageVersion(packageDirectory);
  if (!version) return unavailable();

  try {
    const asset = JSON.parse(readFileSync(join(packageDirectory, RELEASE_ASSET_FILE), "utf8")) as {
      version?: unknown;
      content?: unknown;
    };
    if (asset.version !== version || typeof asset.content !== "string") return unavailable(version);
    validateReleaseContent(asset.content);
    return { available: true, content: asset.content, releaseUrl: releaseUrl(version), version };
  } catch {
    return unavailable(version);
  }
}
