import { requestDigest } from "../intent-store";
import type { AssistantActionDef, EffectKind } from "../types";

import "server-only";
import { characterResult } from "@/lib/server/characters/action-service";
import { withCharacterOperation } from "@/lib/server/characters/operation-context";
import { PROGRESSION_INPUTS, progressionReads, progressionState, runCharacterProgression } from "@/lib/server/characters/progression-service";

const alwaysHuman = new Set(["progression.reset", "progression.unlearn", "choices", "resources", "inventory.patch", "stash.apply"]);

export const CHARACTER_PROGRESSION_ACTIONS: readonly AssistantActionDef[] = Object.entries(PROGRESSION_INPUTS).map(([operation, input]): AssistantActionDef => {
  const read = progressionReads.has(operation);

  const base = {
    id: `characters.${operation}`,
    title: `Персонажі: ${operation}`,
    description: operation === "roll" ? "Серверний кидок чинною формулою, результат лише після виконання" : "Чинні Choices, прогрес, ресурси та інвентар",
    input,
    need: { access: "dm" as const, scope: read ? "characters:read" as const : "characters:write" as const },
  };

  if (read) return { ...base, effect: "read", execute: (caller, raw) => runCharacterProgression(caller.actor, operation, input.parse(raw) as Record<string, unknown>) };

  return {
    ...base,
    effect: "write",
    confirmation: alwaysHuman.has(operation) ? "always" : "standard",
    prepare: (caller, raw) => {
      const value = input.parse(raw) as Record<string, unknown>;

      return withCharacterOperation(caller.actor.campaignId, operation, value, async () => {
        const state = await progressionState(caller.actor, value, operation);

        const targets = state.characters.map(row => ({ domain: "characters", id: row.id, name: row.name }));

        const target = targets[0] ?? { domain: "characters", id: caller.actor.campaignId, name: "Персонажі" };

        const before = state.characters.map(({ notes, ...row }: { notes?: unknown; id: string }) => ({ ...row, notesHash: requestDigest(notes ?? null) }));

        const kind: EffectKind = operation === "progression.reset" || operation === "progression.unlearn" || (operation === "resources" && value.reset) ? "erase-progress" : "update";

        return {
          summary: `Персонажі: ${operation}`,
          targets,
          changes: [{ target, path: operation, before: characterResult(before, target.id).data, after: characterResult(value, target.id).data }],
          warnings: ["Спорядження та гроші передісторії залишаються вручну; additionalSpells не підтримується.", ...(operation === "roll" ? ["Кубики кине сервер один раз під час виконання; результат ще невідомий."] : [])],
          preconditions: { fingerprint: requestDigest(state) },
          effects: [{ kind, targets, description: operation }],
        };
      });
    },
    execute: (ctx, raw) => runCharacterProgression(ctx.caller.actor, operation, input.parse(raw) as Record<string, unknown>, (ctx.expected as { fingerprint: string }).fingerprint),
  };
});
