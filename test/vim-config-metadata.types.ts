import type { VimConfigPropertyMetadata, VimPublicActionMetadata } from "../src/config-metadata.ts";
import type {
  VimActionApi,
  VimConfigApi,
  VimFiniteActionId,
  VimMappingMode,
  VimPromptApi,
} from "../src/vim-config.d.ts";

import { VIM_ACTION_METADATA, VIM_CONFIG_PROPERTY_METADATA } from "../src/config-metadata.ts";

type Assert<Value extends true> = Value;
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type ValueAtPath<Value, Path extends string> = Path extends keyof Value
  ? Value[Path]
  : Path extends `${infer Head}.${infer Tail}`
    ? Head extends keyof Value
      ? ValueAtPath<Value[Head], Tail>
      : never
    : never;

type MetadataPropertyPaths = VimConfigPropertyMetadata["configPath"];
type DeclaredPropertyPaths =
  | "preset"
  | "leader"
  | "startMode"
  | `cursor.${keyof VimConfigApi["cursor"] & string}`
  | `ui.status.${keyof VimConfigApi["ui"]["status"] & string}`
  | `ui.mode.${keyof VimConfigApi["ui"]["mode"] & string}`
  | `ui.selection.${keyof VimConfigApi["ui"]["selection"] & string}`
  | `ui.cursorPosition.${keyof VimConfigApi["ui"]["cursorPosition"] & string}`
  | `ui.workbench.${keyof VimConfigApi["ui"]["workbench"] & string}`
  | `macros.${keyof VimConfigApi["macros"] & string}`
  | `marks.${keyof VimConfigApi["marks"] & string}`
  | `search.${keyof VimConfigApi["search"] & string}`
  | `exCommand.${keyof VimConfigApi["exCommand"] & string}`
  | `feedback.${keyof VimConfigApi["feedback"] & string}`
  | `promptStructures.${keyof VimConfigApi["promptStructures"] & string}`
  | `promptTransforms.${keyof VimConfigApi["promptTransforms"] & string}`
  | "keymap.actionPresets"
  | "keymap.operatorMotions";
type PropertyCoverage = Assert<Equal<MetadataPropertyPaths, DeclaredPropertyPaths>>;

type MetadataProperty<Path extends MetadataPropertyPaths> = Extract<
  VimConfigPropertyMetadata,
  { configPath: Path }
>;
type ExpectedPropertyShape<Path extends DeclaredPropertyPaths> = Path extends "preset"
  ? '"minimal" | "prompt-safe" | "vim-heavy"'
  : Path extends "leader"
    ? "one printable character or null"
    : Path extends "startMode"
      ? '"insert" | "normal"'
      : Path extends `cursor.${string}`
        ? '"block" | "bar" | "underline"'
        : Path extends "keymap.actionPresets"
          ? 'readonly ("paragraph-editing" | "markdown-wrapping")[]'
          : Path extends "keymap.operatorMotions"
            ? "partial record of operator names to motion-name arrays"
            : Path extends "ui.status.position"
              ? '"left" | "right"'
              : Path extends "ui.status.items"
                ? 'readonly ("mode" | "pendingOperator" | "selection" | "cursorPosition")[]'
                : Path extends "ui.selection.previewMaxChars" | "search.maxHighlights"
                  ? "non-negative integer"
                  : Path extends "ui.cursorPosition.base"
                    ? "0 | 1"
                    : Path extends "ui.workbench.reservedRows"
                      ? "integer from 0 through 5"
                      : Path extends "macros.slots" | "marks.slots"
                        ? "readonly lowercase register-name[]"
                        : Path extends "macros.maxReplaySteps"
                          ? "positive integer"
                          : Path extends "feedback.noop"
                            ? '"off" | "status"'
                            : Path extends "ui.mode.labels" | "ui.mode.narrowLabels"
                              ? "partial record of Vim modes to strings"
                              : Path extends "promptStructures.targets"
                                ? "partial record of prompt-structure targets to booleans"
                                : Path extends "promptTransforms.actions"
                                  ? "partial record of prompt-transform actions to booleans"
                                  : Path extends "promptTransforms.commands"
                                    ? "partial record of prompt-transform actions to string arrays"
                                    : Path extends "ui.cursorPosition.format"
                                      ? "string"
                                      : "boolean";
type ExpectedPropertyAliases<Path extends DeclaredPropertyPaths> = Path extends "leader"
  ? readonly ["vim.g.mapleader"]
  : readonly [];
type PropertyShapeCoverage = Assert<
  Equal<
    {
      [Path in DeclaredPropertyPaths]: MetadataProperty<Path>["acceptedShape"];
    },
    { [Path in DeclaredPropertyPaths]: ExpectedPropertyShape<Path> }
  >
>;
type PropertyAliasCoverage = Assert<
  Equal<
    { [Path in DeclaredPropertyPaths]: MetadataProperty<Path>["aliases"] },
    { [Path in DeclaredPropertyPaths]: ExpectedPropertyAliases<Path> }
  >
>;
type PropertyValueCoverage = Assert<
  Equal<
    {
      [Path in DeclaredPropertyPaths]: ValueAtPath<VimConfigApi, Path>;
    },
    {
      preset: VimConfigApi["preset"];
      leader: VimConfigApi["leader"];
      startMode: VimConfigApi["startMode"];
      "cursor.insert": VimConfigApi["cursor"]["insert"];
      "cursor.normal": VimConfigApi["cursor"]["normal"];
      "cursor.visual": VimConfigApi["cursor"]["visual"];
      "cursor.visualLine": VimConfigApi["cursor"]["visualLine"];
      "cursor.visualBlock": VimConfigApi["cursor"]["visualBlock"];
      "keymap.actionPresets": VimConfigApi["keymap"]["actionPresets"];
      "keymap.operatorMotions": VimConfigApi["keymap"]["operatorMotions"];
      "ui.status.enabled": boolean;
      "ui.status.position": VimConfigApi["ui"]["status"]["position"];
      "ui.status.items": VimConfigApi["ui"]["status"]["items"];
      "ui.mode.enabled": boolean;
      "ui.mode.labels": VimConfigApi["ui"]["mode"]["labels"];
      "ui.mode.narrowLabels": VimConfigApi["ui"]["mode"]["narrowLabels"];
      "ui.selection.enabled": boolean;
      "ui.selection.previewMaxChars": number;
      "ui.cursorPosition.enabled": boolean;
      "ui.cursorPosition.base": 0 | 1;
      "ui.cursorPosition.format": string;
      "ui.workbench.reservedRows": number;
      "macros.enabled": boolean;
      "macros.slots": readonly string[];
      "macros.maxReplaySteps": number;
      "marks.enabled": boolean;
      "marks.slots": readonly string[];
      "search.highlight": boolean;
      "search.highlightCurrent": boolean;
      "search.clearOnCancel": boolean;
      "search.clearOnInsert": boolean;
      "search.maxHighlights": number;
      "exCommand.autocomplete": boolean;
      "feedback.noop": VimConfigApi["feedback"]["noop"];
      "promptStructures.enabled": boolean;
      "promptStructures.targets": VimConfigApi["promptStructures"]["targets"];
      "promptTransforms.enabled": boolean;
      "promptTransforms.actions": VimConfigApi["promptTransforms"]["actions"];
      "promptTransforms.commands": VimConfigApi["promptTransforms"]["commands"];
    }
  >
>;

type PublicMetadata = Extract<VimPublicActionMetadata, { bindable: true }>;
type MetadataActionIds = PublicMetadata["id"];
type DeclaredActionIds =
  | "escape"
  | `operator.${keyof VimActionApi["operator"] & string}`
  | `motion.${keyof VimActionApi["motion"] & string}`
  | `command.${keyof VimActionApi["command"] & string}`
  | `macro.${keyof VimActionApi["macro"] & string}`
  | `mark.${keyof VimActionApi["mark"] & string}`
  | `insert.${keyof VimActionApi["insert"] & string}`
  | `textObject.kind.${keyof VimActionApi["textObject"]["kind"] & string}`
  | `textObject.target.${keyof VimActionApi["textObject"]["target"] & string}`
  | `prompt.transform.${keyof VimActionApi["prompt"]["transform"] & string}`;
type ActionCoverage = Assert<Equal<MetadataActionIds, DeclaredActionIds>>;
type MetadataAction<Id extends MetadataActionIds> = Extract<PublicMetadata, { id: Id }>;
type ExpectedFactory<Id extends DeclaredActionIds> = Id extends "command.easymotion"
  ? "vim.action.command.easymotion.goToChar()"
  : `vim.action.${Id}()`;
type ExpectedAlias<Id extends DeclaredActionIds> = Id extends "command.easymotion"
  ? readonly ["vim.action.command.easymotion()"]
  : Id extends `insert.${infer Action}` | `prompt.transform.${infer Action}`
    ? readonly [`vim.prompt.${Action}()`]
    : readonly [];
type ExpectedArgs<Id extends DeclaredActionIds> = Id extends "prompt.transform.fence"
  ? readonly [{ name: "language"; type: "string"; required: false; description: string }]
  : Id extends "prompt.transform.reflow"
    ? readonly [{ name: "width"; type: "integer"; required: false; description: string }]
    : readonly [];
type NormalVisualScopes = readonly ["normal", "visual", "visualLine", "visualBlock"];
type ExpectedScopes<Id extends DeclaredActionIds> = Id extends "escape"
  ? readonly ["insert", "visual", "visualLine", "visualBlock", "operatorPending"]
  : Id extends `operator.${string}`
    ? NormalVisualScopes
    : Id extends "motion.halfPageDown" | "motion.halfPageUp"
      ? NormalVisualScopes
      : Id extends `motion.${string}`
        ? readonly ["normal", "visual", "visualLine", "visualBlock", "operatorPending"]
        : Id extends "command.insertLineStart" | "command.insertLineEnd"
          ? readonly ["normal", "visualBlock"]
          : Id extends "command.pasteAfter"
            ? readonly ["normal", "visualLine"]
            : Id extends
                  | "command.insertBefore"
                  | "command.insertAfter"
                  | "command.openLineBelow"
                  | "command.openLineAbove"
                  | "command.visualChar"
                  | "command.visualLine"
                  | "command.visualBlock"
                  | "command.deleteChar"
                  | "command.deleteCharBefore"
                  | "command.deleteToLineEnd"
                  | "command.changeToLineEnd"
                  | "command.yankLine"
                  | "command.joinLine"
                  | "command.toggleCase"
                  | "command.replaceChar"
                  | "command.startSearch"
                  | "command.startSearchBackward"
                  | "command.repeatSearch"
                  | "command.repeatSearchReverse"
                  | "command.startExCommand"
              ? NormalVisualScopes
              : Id extends `command.${string}` | `macro.${string}`
                ? readonly ["normal"]
                : Id extends "mark.set"
                  ? readonly ["normal"]
                  : Id extends `mark.${string}`
                    ? NormalVisualScopes
                    : Id extends `insert.${string}`
                      ? readonly ["insert"]
                      : Id extends `textObject.${string}`
                        ? readonly ["operatorPending"]
                        : NormalVisualScopes;
type FactoryCoverage = Assert<
  Equal<
    { [Id in DeclaredActionIds]: MetadataAction<Id>["factoryPath"] },
    { [Id in DeclaredActionIds]: ExpectedFactory<Id> }
  >
>;
type AliasCoverage = Assert<
  Equal<
    { [Id in DeclaredActionIds]: MetadataAction<Id>["aliases"] },
    { [Id in DeclaredActionIds]: ExpectedAlias<Id> }
  >
>;
type ArgumentCoverage = Assert<
  Equal<
    { [Id in DeclaredActionIds]: MetadataAction<Id>["args"] },
    { [Id in DeclaredActionIds]: ExpectedArgs<Id> }
  >
>;
type ScopeCoverage = Assert<
  Equal<
    { [Id in DeclaredActionIds]: MetadataAction<Id>["publicScopes"] },
    { [Id in DeclaredActionIds]: ExpectedScopes<Id> }
  >
>;
type ScopeCompatibility = Assert<
  PublicMetadata["publicScopes"][number] extends VimMappingMode | "operatorPending" ? true : false
>;

type PromptArgumentDeclarationCoverage = Assert<
  Equal<
    NonNullable<Parameters<VimActionApi["prompt"]["transform"]["fence"]>[0]>,
    { language?: string }
  >
> &
  Assert<
    Equal<
      NonNullable<Parameters<VimActionApi["prompt"]["transform"]["reflow"]>[0]>,
      { width?: number }
    >
  >;

declare const metadataPropertyValues: {
  [Path in MetadataPropertyPaths]: ValueAtPath<VimConfigApi, Path>;
};

void metadataPropertyValues;
void (null as unknown as
  | PropertyCoverage
  | PropertyShapeCoverage
  | PropertyAliasCoverage
  | PropertyValueCoverage
  | ActionCoverage
  | FactoryCoverage
  | AliasCoverage
  | ArgumentCoverage
  | ScopeCoverage
  | ScopeCompatibility
  | PromptArgumentDeclarationCoverage);
void (null as unknown as VimFiniteActionId);
void VIM_ACTION_METADATA;
void VIM_CONFIG_PROPERTY_METADATA;
void (null as unknown as VimPromptApi);
