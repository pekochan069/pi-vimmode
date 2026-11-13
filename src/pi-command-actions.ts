import type { VimMode } from "./types.ts";

export type PiCommandActionId = "pi.command" | "pi.commandPrompt";
export type PiCommandActionArgs = { command: string };

export type PiCommandActionArg = {
  name: "command";
  type: "string";
  required: true;
  description: string;
};

export type PiCommandActionEntry = {
  id: PiCommandActionId;
  title: string;
  description: string;
  category: "pi-command";
  modes: readonly Extract<VimMode, "normal" | "visual" | "visualLine" | "visualBlock">[];
  targets: readonly ["pi-command" | "pi-command-prompt"];
  args: readonly [PiCommandActionArg];
  countBehavior: string;
  visualBehavior: string;
  repeatability: "not-dot-repeatable";
  docsAnchor: string;
};

export const PI_COMMAND_ACTIONS = [
  {
    id: "pi.command",
    title: "Dispatch Pi command",
    description: "Submit a configured Pi slash command while preserving the prompt draft.",
    category: "pi-command",
    modes: ["normal"],
    targets: ["pi-command"],
    args: [
      {
        name: "command",
        type: "string",
        required: true,
        description: "A non-empty single-line Pi slash command.",
      },
    ],
    countBehavior: "counts are ignored",
    visualBehavior: "not available in visual modes",
    repeatability: "not-dot-repeatable",
    docsAnchor: "config-action-pi-command",
  },
  {
    id: "pi.commandPrompt",
    title: "Prompt for Pi command arguments",
    description:
      "Prepare a configured Pi slash command and restore the prompt draft after cancel or submit.",
    category: "pi-command",
    modes: ["normal"],
    targets: ["pi-command-prompt"],
    args: [
      {
        name: "command",
        type: "string",
        required: true,
        description: "A non-empty single-line Pi slash command.",
      },
    ],
    countBehavior: "counts are ignored",
    visualBehavior: "not available in visual modes",
    repeatability: "not-dot-repeatable",
    docsAnchor: "config-action-pi-commandPrompt",
  },
] as const satisfies readonly PiCommandActionEntry[];

function plainObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

export function isPiCommandActionId(value: string): value is PiCommandActionId {
  return PI_COMMAND_ACTIONS.some((action) => action.id === value);
}

export function piCommandActionModes(actionId: PiCommandActionId): readonly VimMode[] {
  return PI_COMMAND_ACTIONS.find((action) => action.id === actionId)?.modes ?? [];
}

export function normalizePiCommandActionArgs(
  args: unknown,
): { ok: true; args: PiCommandActionArgs } | { ok: false; message: string } {
  const record = plainObject(args);
  if (!record) return { ok: false, message: "Invalid action args" };
  const unknown = Object.keys(record).find((key) => key !== "command");
  if (unknown) return { ok: false, message: `Unknown action arg: ${unknown}` };
  const command = record.command;
  if (typeof command !== "string" || command.length === 0 || !command.startsWith("/")) {
    return { ok: false, message: "Command must be a non-empty slash command" };
  }
  if (/\r|\n/.test(command)) return { ok: false, message: "Command must be a single line" };
  return { ok: true, args: { command } };
}
