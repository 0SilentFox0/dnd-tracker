import type { AssistantActionDef } from "../types";
import { COMPENDIUM_NEED, COMPENDIUM_READ_INPUTS, readCompendiumSummary } from "./compendium-reads";
import { buildAssistantHandoff, HANDOFF_INPUTS, HANDOFF_REASONS } from "./handoff-navigation";

import "server-only";

export { COMPENDIUM_READ_INPUTS, type CompendiumRead, readCompendiumSummary } from "./compendium-reads";
export { buildAssistantHandoff, HANDOFF_INPUTS } from "./handoff-navigation";

const handoffs: AssistantActionDef[] = Object.entries(HANDOFF_INPUTS).map(
  ([kind, input]) => ({
    id: `handoff.${kind}`,
    title: `Відкрити у застосунку: ${kind}`,
    description: HANDOFF_REASONS[kind as keyof typeof HANDOFF_INPUTS],
    input,
    need: {
      access: "dm",
      scope:
        kind === "credentials" || kind === "player-draft"
          ? "campaign:read"
          : [
              "content-import",
              "ai-map",
              "compendium-preview",
              "compendium-confirm",
              "source-notes",
            ].includes(kind)
          ? "content:write"
          : kind === "slide-upload"
          ? "show:write"
          : kind === "track-upload"
          ? "content:write"
          : "campaign:read",
      sessionOnly: true,
    },
    effect: "handoff",
    execute: async (caller, raw) =>
      buildAssistantHandoff(caller.actor, kind, raw),
  })
);

/** Source-note text is intentionally absent from model-callable reads. Only the explicit UI selection invokes the session helper above. */
export const HANDOFF_ACTIONS: readonly AssistantActionDef[] = [
  ...handoffs,
  ...(["options", "reports", "entries"] as const).map(
    (operation): AssistantActionDef => ({
      id: `compendium.${operation}`,
      title: `Компендіум: ${operation}`,
      description:
        "Дозволений стислий підсумок; повні матеріали та примітки вибирає людина у застосунку.",
      input: COMPENDIUM_READ_INPUTS[operation],
      need: COMPENDIUM_NEED,
      effect: "read",
      handoff: async (caller) =>
        caller.actor.via === "token"
          ? buildAssistantHandoff(caller.actor, "source-notes")
          : null,
      execute: (caller, raw) =>
        readCompendiumSummary(caller.actor, operation, raw),
    })
  ),
];
