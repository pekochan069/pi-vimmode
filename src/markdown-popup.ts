import { truncateToWidth, visibleWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";

type MarkdownStyle = {
  accent: (text: string) => string;
  bold: (text: string) => string;
  dim: (text: string) => string;
};

function inlineMarkdown(source: string, style: MarkdownStyle): string {
  return source
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) =>
      style.accent(`${label} (${url})`),
    )
    .replace(/\*\*([^*]+)\*\*/g, (_match, text: string) => style.bold(text))
    .replace(/__([^_]+)__/g, (_match, text: string) => style.bold(text))
    .replace(/\*([^*]+)\*/g, (_match, text: string) => style.dim(text))
    .replace(/_([^_]+)_/g, (_match, text: string) => style.dim(text))
    .replace(/`([^`]+)`/g, (_match, text: string) => style.accent(text));
}

function wrapped(source: string, width: number): string[] {
  return wrapTextWithAnsi(source, width);
}

function renderMarkdownLine(
  line: string,
  safeWidth: number,
  style: MarkdownStyle,
  fence: string | undefined,
): { rows: string[]; fence: string | undefined } {
  if (fence) {
    return new RegExp(`^\\s*${fence[0]}{${fence.length},}\\s*$`).test(line)
      ? { rows: [], fence: undefined }
      : { rows: [style.dim(truncateToWidth(line, safeWidth, ""))], fence };
  }
  const marker = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
  if (marker) return { rows: [], fence: marker };
  if (!line.trim()) return { rows: [""], fence };
  const heading = /^(#{1,6})\s+(.+)$/.exec(line);
  if (heading) return { rows: wrapped(style.bold(heading[2]!), safeWidth), fence };
  const bullet = /^(\s*)([-*+]\s+|\d+[.)]\s+)(.+)$/.exec(line);
  if (!bullet) return { rows: wrapped(inlineMarkdown(line, style), safeWidth), fence };
  const bulletMarker = bullet[2]!.trim();
  const rawPrefix = `${bullet[1] ?? ""}${/^\d/.test(bulletMarker) ? bulletMarker : "•"} `;
  const prefix = truncateToWidth(rawPrefix, safeWidth, "");
  const continuation = " ".repeat(visibleWidth(prefix));
  const contentWidth = Math.max(1, safeWidth - visibleWidth(prefix));
  const rows = wrapped(inlineMarkdown(bullet[3]!, style), contentWidth).map(
    (row, index) => (index === 0 ? prefix : continuation) + row,
  );
  return { rows, fence };
}

export function renderMarkdownRows(
  markdown: string,
  width: number,
  style: MarkdownStyle,
): string[] {
  const safeWidth = Math.max(1, width);
  const rows: string[] = [];
  let fence: string | undefined;
  for (const line of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const rendered = renderMarkdownLine(line, safeWidth, style, fence);
    rows.push(...rendered.rows);
    fence = rendered.fence;
  }
  return rows.length ? rows : ["(no output)"];
}
