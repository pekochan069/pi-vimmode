export const HELP_POPUP_BODY_ROWS = 10;

export type ReadOnlyPopupSource =
  | "help"
  | "features"
  | "keybindings"
  | "actions"
  | "keymap"
  | "mapcheck"
  | "vimdoctor"
  | "messages"
  | "inspect"
  | "changelog";

export type ReadOnlyPopup = {
  title: string;
  lines: readonly string[];
  source: ReadOnlyPopupSource;
  query?: string;
  scrollOffset: number;
  markdown?: string;
};

export type HelpPopup = ReadOnlyPopup;

export function scrollHelpPopup(popup: ReadOnlyPopup, delta: number): ReadOnlyPopup {
  const maxOffset = Math.max(0, popup.lines.length - HELP_POPUP_BODY_ROWS);
  const scrollOffset = Math.max(0, Math.min(maxOffset, popup.scrollOffset + delta));
  return scrollOffset === popup.scrollOffset ? popup : { ...popup, scrollOffset };
}

export function popupFromMessage(input: {
  title: string;
  source: ReadOnlyPopupSource;
  query?: string;
  message: string;
}): ReadOnlyPopup {
  return {
    title: input.title,
    source: input.source,
    query: input.query,
    scrollOffset: 0,
    lines: splitPopupMessage(input.message),
  };
}

export function splitPopupMessage(message: string): string[] {
  const lines = message
    .split(/\n|;\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? lines : ["(no output)"];
}
