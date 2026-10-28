import { API_ERRORS } from "@/lib/constants/api-errors";
import { findParticipant, isActive, updateParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import type { AbilityRunContext } from "@/lib/utils/abilities/engine/core/types";
import { cooldownLeft, withinCountLimits } from "@/lib/utils/abilities/engine/core/usage";
import { canActNow } from "@/lib/utils/battle/common/control";
import { applyMainActionUsed } from "@/lib/utils/battle/participant";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";
import { applyAbilitySummons, type SummonDeps } from "@/lib/utils/battle/summon/ability-summons";
import { assertCanAct } from "@/lib/utils/battle/turn";
import { assertAbilityAim } from "@/lib/utils/battle/validation/ability-aim";
import { assertAbilityTargets } from "@/lib/utils/battle/validation/ability-targets";
import { abilityOnMap } from "@/lib/utils/battle/view";
import type { BattleParticipant, GridPoint } from "@/types/battle";

export type AbilityUseTrigger = "action" | "bonusAction";

export interface AbilityUseRequest {
  participantId: string;
  abilityKey: string;
  targetIds: string[];
  targetCell?: GridPoint;
}

const USAGE: Record<AbilityUseTrigger, { used: (p: BattleParticipant) => boolean; error: { code: "action_used"; message: string }; spendFirst: boolean }> = {
  action: { used: (p) => p.actionFlags.hasUsedAction, error: { code: "action_used", message: API_ERRORS.ACTION_USED }, spendFirst: true },
  bonusAction: { used: (p) => p.actionFlags.hasUsedBonusAction, error: { code: "action_used", message: "Бонусну дію вже використано цього ходу" }, spendFirst: false },
};

const spend: Record<AbilityUseTrigger, (p: BattleParticipant) => BattleParticipant> = {
  action: applyMainActionUsed,
  bonusAction: (p) => ({ ...p, actionFlags: { ...p.actionFlags, hasUsedBonusAction: true } }),
};

export const abilityRunContext = (ctx: BattleMutationContext): AbilityRunContext => ({ round: ctx.scene.round, rng: ctx.rng ?? Math.random, map: ctx.meta.map, rules: ctx.meta.rules });

export async function runAbilityUse(ctx: BattleMutationContext, req: AbilityUseRequest, trigger: AbilityUseTrigger, deps: SummonDeps): Promise<MutationResult> {
  const participant = findParticipant(ctx.participants, req.participantId);

  if (!participant) throw new BattleAccessError(404, "Учасника немає в бою");

  if (!canActNow(ctx, participant, ctx.participants[ctx.scene.turnIndex])) throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

  if (!isActive(participant)) throw new BattleRuleError("participant_dead", "Учасник не може діяти");

  assertCanAct(ctx, participant.basicInfo.id);

  const ability = (participant.battleData.resolvedAbilities ?? []).find((a) => a.key === req.abilityKey && a.trigger.event === trigger);

  if (!ability) throw new BattleRuleError("action_rejected", "У учасника немає такого вміння");

  if (ability.limits?.legendaryCost) throw new BattleRuleError("action_rejected", "Це вміння — легендарна дія, її використовують поза своїм ходом");

  const usage = USAGE[trigger];

  if (usage.used(participant)) throw new BattleRuleError(usage.error.code, usage.error.message);

  if (!withinCountLimits(participant, ability)) throw new BattleRuleError("ability_limit", "Ліміт використань вичерпано");

  const wait = cooldownLeft(participant, ability, ctx.scene.round);

  if (wait > 0) throw new BattleRuleError("ability_limit", `Перезарядка: ще ${wait} р.`);

  const targetCell = assertAbilityAim(ability, ctx.meta.map, participant, req.targetCell);

  const targetIds = assertAbilityTargets(ability, ctx.participants, req.targetIds, { owner: participant, onMap: abilityOnMap(ctx.meta.map, participant) });

  const id = participant.basicInfo.id;

  const order = usage.spendFirst ? updateParticipant(ctx.participants, id, spend[trigger]) : ctx.participants;

  const run = runAbilities(order, { type: trigger, actorId: id, abilityKey: ability.key, targetIds, ...(targetCell && { targetCell }) }, abilityRunContext(ctx));

  const summoned = await applyAbilitySummons(run.summons, run.participants, { campaignId: ctx.scene.campaignId, battleId: ctx.scene.id, rng: ctx.rng ?? Math.random, rules: ctx.meta.rules, deps });

  const participants = usage.spendFirst ? summoned.order : updateParticipant(summoned.order, id, spend[trigger]);

  const text = run.fired.length ? [...run.messages, ...summoned.messages].join(" | ") : `${ability.name}: не спрацювало`;

  return {
    participants,
    pending: ctx.pending,
    events: [
      {
        type: "ability",
        round: ctx.scene.round,
        actorId: id,
        resultText: text || ability.name,
        details: { actorName: participant.basicInfo.name, actorSide: participant.basicInfo.side, actionDetails: { abilityKey: ability.key, skillName: ability.name } },
      },
    ],
  };
}
