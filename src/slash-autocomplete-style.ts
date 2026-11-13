import type { EditorTheme } from "@earendil-works/pi-tui";

import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const PRIMARY_COLUMN_GAP = 2;
const MIN_DESCRIPTION_WIDTH = 10;
const MIN_PRIMARY_COLUMN_WIDTH = 12;
const MAX_PRIMARY_COLUMN_WIDTH = 32;

export type PassiveSlashPrimarySegment = {
  text: string;
  tone?: "accent" | "muted";
};

export type PassiveSlashRow = {
  primary: string;
  primarySegments?: readonly PassiveSlashPrimarySegment[];
  description?: string;
};

type SlashSelectListTheme = Pick<
  EditorTheme["selectList"],
  "description" | "scrollInfo" | "selectedText"
>;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(value, maximum));
}

function normalizeDescription(description: string): string {
  return description.replace(/[\r\n]+/g, " ").trim();
}

function primaryColumnWidth(rows: readonly PassiveSlashRow[]): number {
  const widest = rows.reduce(
    (width, row) => Math.max(width, visibleWidth(row.primary) + PRIMARY_COLUMN_GAP),
    0,
  );
  return clamp(widest, MIN_PRIMARY_COLUMN_WIDTH, MAX_PRIMARY_COLUMN_WIDTH);
}

function padToWidth(text: string, width: number): string {
  return text + " ".repeat(Math.max(0, width - visibleWidth(text)));
}

function stylePrimary(row: PassiveSlashRow, maxWidth: number, theme: SlashSelectListTheme): string {
  const primary = truncateToWidth(row.primary, maxWidth, "");
  if (!row.primarySegments) return primary;

  let remaining = visibleWidth(primary);
  return row.primarySegments
    .map(({ text, tone }) => {
      const segment = truncateToWidth(text, remaining, "");
      remaining -= visibleWidth(segment);
      if (!segment) return "";
      if (tone === "accent") return theme.selectedText(segment);
      if (tone === "muted") return theme.description(segment);
      return segment;
    })
    .join("");
}

function renderPassiveSlashRow(
  row: PassiveSlashRow,
  width: number,
  columnWidth: number,
  theme: SlashSelectListTheme,
): string {
  const prefix = "  ";
  const prefixWidth = visibleWidth(prefix);
  const description = row.description ? normalizeDescription(row.description) : undefined;
  if (description && width > 40) {
    const effectiveColumnWidth = Math.max(1, Math.min(columnWidth, width - prefixWidth - 4));
    const primaryWidth = Math.max(1, effectiveColumnWidth - PRIMARY_COLUMN_GAP);
    const primary = stylePrimary(row, primaryWidth, theme);
    const spacing = " ".repeat(Math.max(1, effectiveColumnWidth - visibleWidth(primary)));
    const remainingWidth = width - prefixWidth - visibleWidth(primary) - spacing.length - 2;
    if (remainingWidth > MIN_DESCRIPTION_WIDTH) {
      const truncated = truncateToWidth(description, remainingWidth, "");
      return padToWidth(prefix + primary + theme.description(spacing + truncated), width);
    }
  }
  return padToWidth(prefix + stylePrimary(row, width - prefixWidth - 2, theme), width);
}

export function renderPassiveSlashRows(
  rows: readonly PassiveSlashRow[],
  width: number,
  theme: SlashSelectListTheme,
): string[] {
  const columnWidth = primaryColumnWidth(rows);
  return rows.map((row) => renderPassiveSlashRow(row, width, columnWidth, theme));
}

export function renderPassiveSlashOverflow(
  hidden: number,
  width: number,
  theme: SlashSelectListTheme,
): string {
  return padToWidth(theme.scrollInfo(truncateToWidth(`  +${hidden} more`, width - 2, "")), width);
}
