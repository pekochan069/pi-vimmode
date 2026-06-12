import type { PromptTransform, PromptTransformAction, VimMode } from "./types.ts";

export type PromptTransformActionCategory = "prompt-transform";
export type PromptTransformActionTarget = "prompt-lines";
export type PromptTransformActionRepeatability = "not-dot-repeatable";

export type PromptTransformActionArg = {
  name: "language" | "width";
  type: "string" | "integer";
  required: boolean;
  description: string;
};

export type PromptTransformActionEntry = {
  id: `prompt.transform.${PromptTransformAction}`;
  action: PromptTransformAction;
  title: string;
  description: string;
  category: PromptTransformActionCategory;
  modes: readonly Extract<VimMode, "normal" | "visual" | "visualLine" | "visualBlock">[];
  targets: readonly PromptTransformActionTarget[];
  args: readonly PromptTransformActionArg[];
  countBehavior: string;
  visualBehavior: string;
  repeatability: PromptTransformActionRepeatability;
  docsAnchor: string;
};

const ACTION_MODES = ["normal", "visual", "visualLine", "visualBlock"] as const;
const ACTION_TARGETS = ["prompt-lines"] as const;

function entry(
  action: PromptTransformAction,
  title: string,
  description: string,
  args: readonly PromptTransformActionArg[] = [],
): PromptTransformActionEntry {
  return {
    id: `prompt.transform.${action}`,
    action,
    title,
    description,
    category: "prompt-transform",
    modes: ACTION_MODES,
    targets: ACTION_TARGETS,
    args,
    countBehavior: "normal counts extend the line range; visual counts are ignored",
    visualBehavior: "visual selections transform touched prompt lines linewise",
    repeatability: "not-dot-repeatable",
    docsAnchor: `#prompt-transform-action-${action}`,
  };
}

export const PROMPT_TRANSFORM_ACTIONS = [
  entry("quote", "Quote prompt lines", "Prefix prompt lines with Markdown quote markers."),
  entry("unquote", "Unquote prompt lines", "Remove Markdown quote markers from prompt lines."),
  entry("bulletize", "Bulletize prompt lines", "Prefix prompt lines with Markdown list markers."),
  entry("fence", "Fence prompt lines", "Wrap prompt lines in a Markdown code fence.", [
    {
      name: "language",
      type: "string",
      required: false,
      description: "Optional code fence language without whitespace.",
    },
  ]),
  entry("indent", "Indent prompt lines", "Indent prompt lines by one shift width."),
  entry("dedent", "Dedent prompt lines", "Dedent prompt lines by one shift width."),
  entry("reflow", "Reflow prompt prose", "Reflow prompt prose to a target width.", [
    {
      name: "width",
      type: "integer",
      required: false,
      description: "Optional prose width from 20 through 240 columns.",
    },
  ]),
] as const satisfies readonly PromptTransformActionEntry[];

export type PromptTransformActionId = (typeof PROMPT_TRANSFORM_ACTIONS)[number]["id"];
export type BindablePromptTransformActionId = PromptTransformActionId;

export type ActionArgInput =
  | { source: "ex"; action: PromptTransformAction; rest: string }
  | { source: "keymap"; actionId: BindablePromptTransformActionId; args?: unknown };

export type ActionArgResult =
  | { ok: true; transform: PromptTransform }
  | { ok: false; message: string };

const ACTION_BY_ID = new Map<string, PromptTransformActionEntry>(
  PROMPT_TRANSFORM_ACTIONS.map((action) => [action.id, action]),
);

export function bindablePromptTransformActionIds(): BindablePromptTransformActionId[] {
  return PROMPT_TRANSFORM_ACTIONS.map((action) => action.id);
}

export function promptTransformActionEntryForId(
  id: string,
): PromptTransformActionEntry | undefined {
  return ACTION_BY_ID.get(id);
}

export function promptTransformActionForId(id: string): PromptTransformAction | undefined {
  return promptTransformActionEntryForId(id)?.action;
}

export function canonicalPromptTransformActionIdForShortName(
  action: PromptTransformAction,
): BindablePromptTransformActionId {
  return `prompt.transform.${action}` as BindablePromptTransformActionId;
}

function plainObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function validateFenceLanguage(value: unknown): ActionArgResult {
  if (value === undefined || value === "") return { ok: true, transform: { action: "fence" } };
  if (typeof value !== "string" || /\s/.test(value)) {
    return { ok: false, message: "Invalid fence language" };
  }
  return { ok: true, transform: { action: "fence", language: value } };
}

function validateReflowWidth(value: unknown): ActionArgResult {
  if (value === undefined) return { ok: true, transform: { action: "reflow" } };
  if (typeof value !== "number" || !Number.isInteger(value) || value < 20 || value > 240) {
    return { ok: false, message: "Invalid reflow width" };
  }
  return { ok: true, transform: { action: "reflow", width: value } };
}

function validateKeymapArgs(action: PromptTransformAction, args: unknown): ActionArgResult {
  if (args === undefined) return normalizeShortAction(action, {});
  const object = plainObject(args);
  if (!object) return { ok: false, message: "Invalid action args" };
  const keys = Object.keys(object);
  if (action === "fence") {
    const unknown = keys.find((key) => key !== "language");
    if (unknown) return { ok: false, message: `Unknown action arg: ${unknown}` };
    return validateFenceLanguage(object.language);
  }
  if (action === "reflow") {
    const unknown = keys.find((key) => key !== "width");
    if (unknown) return { ok: false, message: `Unknown action arg: ${unknown}` };
    return validateReflowWidth(object.width);
  }
  if (keys.length > 0) return { ok: false, message: "Unexpected action args" };
  return { ok: true, transform: { action } };
}

function normalizeShortAction(
  action: PromptTransformAction,
  args: Record<string, unknown>,
): ActionArgResult {
  if (action === "fence") return validateFenceLanguage(args.language);
  if (action === "reflow") return validateReflowWidth(args.width);
  if (Object.keys(args).length > 0) return { ok: false, message: "Unexpected action args" };
  return { ok: true, transform: { action } };
}

export function normalizePromptTransformActionArgs(input: ActionArgInput): ActionArgResult {
  if (input.source === "keymap") {
    const action = promptTransformActionForId(input.actionId);
    if (!action) return { ok: false, message: `Unknown action ID: ${input.actionId}` };
    return validateKeymapArgs(action, input.args);
  }

  const args = input.rest.trim();
  if (input.action === "fence") {
    if (/\s/.test(args)) return { ok: false, message: "Invalid fence language" };
    return {
      ok: true,
      transform: args ? { action: "fence", language: args } : { action: "fence" },
    };
  }
  if (input.action === "reflow") {
    if (args.length === 0) return { ok: true, transform: { action: "reflow" } };
    if (!/^\d+$/.test(args)) return { ok: false, message: "Invalid reflow width" };
    return validateReflowWidth(Number(args));
  }
  if (args.length > 0) return { ok: false, message: "Unexpected Ex command arguments" };
  return { ok: true, transform: { action: input.action } };
}
