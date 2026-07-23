import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  VIM_ACTION_METADATA,
  VIM_CONFIG_PROPERTY_METADATA,
  type VimActionMetadata,
  type VimConfigPropertyMetadata,
} from "../src/config-metadata.ts";

export const CONFIG_REFERENCE_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "docs",
  "config.md",
);

export const PROPERTY_MARKERS = {
  begin: "<!-- BEGIN GENERATED CONFIG PROPERTIES -->",
  end: "<!-- END GENERATED CONFIG PROPERTIES -->",
} as const;

export const ACTION_MARKERS = {
  begin: "<!-- BEGIN GENERATED CONFIG ACTIONS -->",
  end: "<!-- END GENERATED CONFIG ACTIONS -->",
} as const;

type PublicActionMetadata = VimActionMetadata & {
  factoryPath: string;
  publicScopes: readonly string[];
  args: readonly { name: string; type: string; required: boolean; description: string }[];
  aliases: readonly string[];
  anchor: string;
};

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) result.add(value);
    seen.add(value);
  }
  return [...result];
}

function stableValue(value: unknown): string {
  if (value === undefined) return "unset";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(", ")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}: ${stableValue(child)}`).join(", ")}}`;
}

function inlineCode(value: string): string {
  const longestRun = Math.max(...(value.match(/`+/g) ?? []).map((run) => run.length), 0);
  const delimiter = "`".repeat(longestRun + 1);
  const padding = value.includes("`") || value.startsWith(" ") || value.endsWith(" ") ? " " : "";
  return `${delimiter}${padding}${value}${padding}${delimiter}`;
}

function expectedPropertyPaths(): string[] {
  return VIM_CONFIG_PROPERTY_METADATA.map(({ path }) => path);
}

function expectedActionIds(): string[] {
  return VIM_ACTION_METADATA.filter(({ bindable }) => bindable).map(({ id }) => id);
}

function expectedJsonPaths(): Set<string> {
  return new Set(VIM_CONFIG_PROPERTY_METADATA.map(({ configPath }) => `piVimMode.${configPath}`));
}

function addDuplicateErrors(errors: string[], label: string, values: readonly string[]): void {
  for (const value of duplicates(values)) errors.push(`duplicate ${label}: ${value}`);
}

function addSetDifferenceErrors(
  errors: string[],
  expected: readonly string[],
  actual: readonly string[],
  missing: string,
  unknown: string,
): void {
  for (const value of expected.filter((value) => !actual.includes(value)))
    errors.push(`${missing}: ${value}`);
  for (const value of actual.filter((value) => !expected.includes(value)))
    errors.push(`${unknown}: ${value}`);
}

function addPropertyErrors(
  errors: string[],
  properties: readonly VimConfigPropertyMetadata[],
  jsonPaths: ReadonlySet<string>,
): void {
  for (const property of properties) {
    const path = property.path;
    if (!property.acceptedShape) errors.push(`missing accepted shape: ${path}`);
    if (!property.assignment) errors.push(`missing assignment semantics: ${path}`);
    if (!property.anchor) errors.push(`missing property anchor: ${path}`);
    for (const jsonPath of property.jsonPaths)
      if (!jsonPaths.has(jsonPath)) errors.push(`unsupported JSON crosswalk: ${jsonPath}`);
  }
}

function addActionErrors(errors: string[], actions: readonly PublicActionMetadata[]): void {
  for (const action of actions) {
    if (!action.factoryPath) errors.push(`missing factory path: ${action.id}`);
    if (!action.publicScopes) errors.push(`missing public scopes: ${action.id}`);
    if (!action.args) errors.push(`missing argument metadata: ${action.id}`);
    if (action.args)
      for (const name of duplicates(action.args.map(({ name }) => name)))
        errors.push(`duplicate argument name for ${action.id}: ${name}`);
    if (!action.anchor) errors.push(`missing action anchor: ${action.id}`);
  }
}

export function validateMetadata(
  properties: readonly VimConfigPropertyMetadata[] = VIM_CONFIG_PROPERTY_METADATA,
  actions: readonly VimActionMetadata[] = VIM_ACTION_METADATA,
): void {
  const propertyPaths = properties.map(({ path }) => path);
  const publicActions = actions.filter(({ bindable }) => bindable) as PublicActionMetadata[];
  const actionIds = publicActions.map(({ id }) => id);
  const errors: string[] = [];
  addDuplicateErrors(errors, "property path", propertyPaths);
  addDuplicateErrors(
    errors,
    "property anchor",
    properties.map(({ anchor }) => anchor),
  );
  addDuplicateErrors(errors, "action ID", actionIds);
  addDuplicateErrors(
    errors,
    "action anchor",
    publicActions.map(({ anchor }) => anchor ?? ""),
  );
  addSetDifferenceErrors(
    errors,
    expectedPropertyPaths(),
    propertyPaths,
    "missing public property metadata",
    "unknown public property metadata",
  );
  addSetDifferenceErrors(
    errors,
    expectedActionIds(),
    actionIds,
    "missing public action metadata",
    "unknown public action metadata",
  );
  addPropertyErrors(errors, properties, expectedJsonPaths());
  addActionErrors(errors, publicActions);
  for (const id of actions
    .filter(({ source }) => source === "diagnostic-registry")
    .map(({ id }) => id))
    if (actionIds.includes(id)) errors.push(`non-bindable diagnostic exposed as action: ${id}`);
  if (errors.length > 0)
    throw new Error(`Config reference metadata invalid:\n- ${errors.join("\n- ")}`);
}

function renderAliases(aliases: readonly string[], anchor: string): string {
  return aliases.length === 0
    ? "none"
    : aliases.map((alias) => `[\`${alias}\`](#${anchor})`).join(", ");
}

function groupByCategory<T>(entries: readonly T[], category: (entry: T) => string) {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    const key = category(entry);
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }
  return groups;
}

export function renderPropertyReference(
  properties: readonly VimConfigPropertyMetadata[] = VIM_CONFIG_PROPERTY_METADATA,
): string {
  const sorted = [...properties].sort((left, right) => left.path.localeCompare(right.path));
  return [
    ...groupByCategory(sorted, (property) =>
      property.configPath.includes(".") ? (property.configPath.split(".")[0] ?? "") : "",
    ),
  ]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([category, entries]) => `### \`${category ? `vim.${category}` : "vim"}\`

${entries
  .map(
    (property) => `#### \`${property.path}\`

<a id="${property.anchor}"></a>

- Accepted shape: \`${property.acceptedShape}\`
- Built-in default: \`${stableValue(property.defaultValue)}\`
- Assignment semantics: ${property.assignment}
- JSON crosswalk: ${property.jsonPaths.length ? property.jsonPaths.map((path) => `\`${path}\``).join(", ") : "none"}
- Compatibility aliases: ${renderAliases(property.aliases, property.anchor)}
`,
  )
  .join("\n")}`,
    )
    .join("\n");
}

function renderArguments(action: PublicActionMetadata): string {
  if (action.args.length === 0) return "none";
  return action.args
    .map((arg) => `\`${arg.name}${arg.required ? "" : "?"}: ${arg.type}\` — ${arg.description}`)
    .join("; ");
}

export function renderActionReference(
  actions: readonly VimActionMetadata[] = VIM_ACTION_METADATA,
): string {
  const bindable = (actions.filter(({ bindable }) => bindable) as PublicActionMetadata[]).sort(
    (left, right) => left.id.localeCompare(right.id),
  );
  return [...groupByCategory(bindable, (action) => action.id.split(".")[0] ?? "action")]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([category, entries]) => `### \`vim.action.${category}\`

${entries
  .map(
    (action) => `#### \`${action.id}\`

<a id="${action.anchor}"></a>

- Canonical factory: \`${action.factoryPath}\`
- Supported mapping scopes: ${action.publicScopes.map((scope) => `\`${scope}\``).join(", ") || "none"}
- Arguments: ${renderArguments(action)}
- Default keys: ${action.defaults.length === 0 ? "none" : action.defaults.map(inlineCode).join(", ")}
- Compatibility aliases: ${renderAliases(action.aliases, action.anchor)}
`,
  )
  .join("\n")}`,
    )
    .join("\n");
}

function replaceRegion(
  document: string,
  markers: { begin: string; end: string },
  rendered: string,
): string {
  const beginCount = document.split(markers.begin).length - 1;
  const endCount = document.split(markers.end).length - 1;
  if (beginCount !== 1 || endCount !== 1) {
    throw new Error(
      `Expected one marker pair (${markers.begin}, ${markers.end}); found ${beginCount}/${endCount}`,
    );
  }
  const begin = document.indexOf(markers.begin);
  const end = document.indexOf(markers.end);
  if (end < begin + markers.begin.length)
    throw new Error(`Reversed generated markers: ${markers.begin}`);
  return `${document.slice(0, begin + markers.begin.length)}\n\n${rendered.trim()}\n\n${document.slice(end)}`;
}

export function replaceGeneratedRegions(
  document: string,
  blocks: { properties: string; actions: string },
): string {
  const withProperties = replaceRegion(document, PROPERTY_MARKERS, blocks.properties);
  return replaceRegion(withProperties, ACTION_MARKERS, blocks.actions);
}

export function validateLocalLinks(document: string): void {
  const anchorIds = [...document.matchAll(/<a id="([^"]+)"><\/a>/g)].map((match) => match[1]!);
  const duplicateAnchors = duplicates(anchorIds);
  if (duplicateAnchors.length > 0)
    throw new Error(`Duplicate document anchors: ${duplicateAnchors.join(", ")}`);
  const anchors = new Set(anchorIds);
  const missing = new Set<string>();
  for (const match of document.matchAll(/\]\(#([^)]+)\)/g)) {
    if (!anchors.has(match[1]!)) missing.add(match[1]!);
  }
  if (missing.size > 0) throw new Error(`Unresolved generated anchors: ${[...missing].join(", ")}`);
}

export function renderConfigReference(document: string): string {
  validateMetadata();
  const rendered = replaceGeneratedRegions(document, {
    properties: renderPropertyReference(),
    actions: renderActionReference(),
  });
  validateLocalLinks(rendered);
  return rendered;
}

export function generateConfigReference(
  options: { check?: boolean; filePath?: string } = {},
): void {
  const filePath = options.filePath ?? CONFIG_REFERENCE_PATH;
  const current = readFileSync(filePath, "utf8");
  const expected = renderConfigReference(current);
  if (options.check) {
    if (expected !== current) {
      throw new Error(
        `Generated config reference is stale. Run bun run generate:config-reference (${filePath})`,
      );
    }
    return;
  }
  if (expected !== current) writeFileSync(filePath, expected);
}

if (import.meta.main) {
  try {
    generateConfigReference({ check: process.argv.includes("--check") });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
