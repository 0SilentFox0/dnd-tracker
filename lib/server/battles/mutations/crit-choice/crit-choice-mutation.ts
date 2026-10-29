import { API_ERRORS } from "@/lib/constants/api-errors";
import { textRef } from "@/lib/i18n/text-ref";
import type { CritChoiceBody } from "@/lib/schemas";
import type { AttackBody } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { createAttackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import type { SpellRequestData } from "@/lib/server/battles/mutations/spell/cast-spell-schema";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { enabledCritEffects } from "@/lib/utils/battle/crit-choice/catalog";
import type { CritResume } from "@/lib/utils/battle/crit-choice/types";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError, dmEvent } from "@/lib/utils/battle/store";

type Resumable<T> = (ctx: BattleMutationContext, request: T, resume: CritResume, replay?: { serverRolls?: boolean }) => Promise<MutationResult>;

interface CritChoiceDeps {
  attack: Resumable<AttackBody>;
  spell: Resumable<SpellRequestData>;
}

export function createCritChoiceMutation(deps: CritChoiceDeps) {
  return async (ctx: BattleMutationContext, body: CritChoiceBody): Promise<MutationResult> => {
    const pending = ctx.scene.pendingCritChoice;

    if (!pending) throw new BattleRuleError("action_rejected", API_ERRORS.CRIT_CHOICE_NONE);

    if ("cancel" in body) {
      return { participants: ctx.participants, pending: ctx.pending, events: [dmEvent(ctx.scene.round, textRef("battleLog.dm.cancelled"))], scene: { pendingCritChoice: null } };
    }

    const triggers = new Map(pending.triggers.map((t) => [t.key, t]));

    const keys = Object.keys(body.choices);

    if (keys.length !== triggers.size || keys.some((k) => !triggers.has(k))) {
      throw new BattleRuleError("action_rejected", API_ERRORS.CRIT_CHOICE_INCOMPLETE);
    }

    const choices: Record<string, number> = {};

    for (const [key, choice] of Object.entries(body.choices)) {
      if (choice === "random") continue;

      const trigger = triggers.get(key)!;

      if (!enabledCritEffects(trigger.source, trigger.kind, { success: ctx.meta.rules.criticals.disabledSuccess, fail: ctx.meta.rules.criticals.disabledFail }).some((e) => e.id === choice)) throw new BattleRuleError("action_rejected", API_ERRORS.CRIT_EFFECT_UNKNOWN);

      choices[key] = choice;
    }

    const resume = { seed: pending.seed, choices };

    const requester = { ...ctx, userId: pending.userId, isDM: pending.isDM };

    return pending.action === "attack" ? deps.attack(requester, pending.request as AttackBody, resume, { serverRolls: pending.serverRolls }) : deps.spell(requester, pending.request as SpellRequestData, resume);
  };
}

export const critChoiceMutation = createCritChoiceMutation({ attack: (ctx, request, resume, replay) => createAttackMutation(undefined, replay)(ctx, request, resume), spell: createSpellMutation() });
