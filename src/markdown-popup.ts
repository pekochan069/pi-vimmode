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

export function renderMarkdownRows(
  markdown: string,
  width: number,
  style: MarkdownStyle,
): string[] {
  const safeWidth = Math.max(1, width);
  const rows: string[] = [];
  let fence: string | undefined;

  for (const line of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    if (fence) {
      if (new RegExp(`^\\s*${fence[0]}{${fence.length},}\\s*$`).test(line)) {
        fence = undefined;
      } else {
        rows.push(style.dim(truncateToWidth(line, safeWidth, "")));
      }
      continue;
    }

    const marker = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
    if (marker) {
      fence = marker;
      continue;
    }
    if (!line.trim()) {
      rows.push("");
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      rows.push(...wrapped(style.bold(heading[2]!), safeWidth));
      continue;
    }

    const bullet = /^(\s*)([-*+]\s+|\d+[.)]\s+)(.+)$/.exec(line);
    if (bullet) {
      const marker = bullet[2]!.trim();
      const rawPrefix = `${bullet[1] ?? ""}${/^\d/.test(marker) ? marker : "•"} `;
      const prefix = truncateToWidth(rawPrefix, safeWidth, "");
      const continuation = " ".repeat(visibleWidth(prefix));
      const contentWidth = Math.max(1, safeWidth - visibleWidth(prefix));
      rows.push(
        ...wrapped(inlineMarkdown(bullet[3]!, style), contentWidth).map(
          (row, index) => (index === 0 ? prefix : continuation) + row,
        ),
      );
      continue;
    }

    rows.push(...wrapped(inlineMarkdown(line, style), safeWidth));
  }

  return rows.length ? rows : ["(no output)"];
}
