import type { AssistantActionDef, EffectKind } from "../types";

import "server-only";
import { getTranslator } from "@/lib/i18n/translator";
import { withCharacterOperation } from "@/lib/server/characters/operation-context";
import { PROGRESSION_INPUTS, progressionReads, progressionState, runCharacterProgression } from "@/lib/server/characters/progression-service";
import { requestDigest } from "@/lib/utils/battle/store/stable-json";
import { jsonContent } from "@/lib/utils/common/json";

const alwaysHuman = new Set(["progression.reset", "progression.unlearn", "choices", "resources", "inventory.patch", "stash.apply"]);

export const CHARACTER_PROGRESSION_ACTIONS: readonly AssistantActionDef[] = Object.entries(PROGRESSION_INPUTS).map(([operation, input]): AssistantActionDef => {
  const read = progressionReads.has(operation);

  const base = {
    id: `characters.${operation}`,
    title: `Characters: ${operation}`,
    description: operation === "roll" ? "A server-side roll with the current formula; the result appears only after execution" : "Current choices, progression, resources and inventory",
    input,
    need: { access: "dm" as const, scope: read ? "characters:read" as const : "characters:write" as const },
  };

  if (read) return { ...base, effect: "read", execute: (caller, raw) => runCharacterProgression(caller.actor, operation, input.parse(raw) as Record<string, unknown>, undefined, caller.locale) };

  return {
    ...base,
    effect: "write",
    confirmation: alwaysHuman.has(operation) ? "always" : "standard",
    prepare: async (caller, raw) => {
      const t = await getTranslator(caller.locale, "assistant");

      const value = input.parse(raw) as Record<string, unknown>;

      return withCharacterOperation(caller.actor.campaignId, operation, value, async () => {
        const state = await progressionState(caller.actor, value, operation);

        const targets = state.characters.map(row => ({ domain: "characters", id: row.id, name: row.name }));

        const target = targets[0] ?? { domain: "characters", id: caller.actor.campaignId, name: t("results.characters") };

        const before = state.characters.map(({ notes, ...row }: { notes?: unknown; id: string }) => ({ ...row, notesHash: requestDigest(notes ?? null) }));

        const kind: EffectKind = operation === "progression.reset" || operation === "progression.unlearn" || (operation === "resources" && value.reset) ? "erase-progress" : "update";

        return {
          summary: t("summary.characters", { operation }),
          targets,
          changes: [{ target, path: operation, before: jsonContent(before), after: jsonContent(value) }],
          warnings: [t("warnings.characterManual"), ...(operation === "roll" ? [t("warnings.serverRoll")] : [])],
          preconditions: { fingerprint: requestDigest(state) },
          effects: [{ kind, targets, description: operation }],
        };
      });
    },
    execute: (ctx, raw) => runCharacterProgression(ctx.caller.actor, operation, input.parse(raw) as Record<string, unknown>, (ctx.expected as { fingerprint: string }).fingerprint, ctx.caller.locale),
  };
});
