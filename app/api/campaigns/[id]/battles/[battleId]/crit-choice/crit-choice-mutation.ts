import { attackMutation } from "../attack/attack-mutation";
import type { AttackBody } from "../attack/attack-mutation";
import type { SpellRequestData } from "../spell/cast-spell-schema";
import { createSpellMutation } from "../spell/spell-mutation";

import type { CritChoiceBody } from "@/lib/schemas";
import { getCritEffect } from "@/lib/utils/battle/crit-choice/catalog";
import type { CritResume } from "@/lib/utils/battle/crit-choice/types";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError } from "@/lib/utils/battle/store";

type Resumable<T> = (ctx: BattleMutationContext, request: T, resume: CritResume) => Promise<MutationResult>;

interface CritChoiceDeps {
  attack: Resumable<AttackBody>;
  spell: Resumable<SpellRequestData>;
}

export function createCritChoiceMutation(deps: CritChoiceDeps) {
  return async (ctx: BattleMutationContext, body: CritChoiceBody): Promise<MutationResult> => {
    const pending = ctx.scene.pendingCritChoice;

    if (!pending) throw new BattleRuleError("action_rejected", "Немає вибору крита");

    const triggers = new Map(pending.triggers.map((t) => [t.key, t]));

    const keys = Object.keys(body.choices);

    if (keys.length !== triggers.size || keys.some((k) => !triggers.has(k))) {
      throw new BattleRuleError("action_rejected", "Потрібно обрати ефект для кожного крита");
    }

    const choices: Record<string, number> = {};

    for (const [key, choice] of Object.entries(body.choices)) {
      if (choice === "random") continue;

      const trigger = triggers.get(key)!;

      if (!getCritEffect(trigger.source, trigger.kind, choice)) throw new BattleRuleError("action_rejected", "Невідомий ефект крита");

      choices[key] = choice;
    }

    const resume = { seed: pending.seed, choices };

    return pending.action === "attack" ? deps.attack(ctx, pending.request as AttackBody, resume) : deps.spell(ctx, pending.request as SpellRequestData, resume);
  };
}

export const critChoiceMutation = createCritChoiceMutation({ attack: attackMutation, spell: createSpellMutation() });
