import { getCachedSummonPool } from "@/lib/cache/reference-data";
import { findParticipant, updateParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { cooldownLeft, withinCountLimits } from "@/lib/utils/abilities/engine/core/usage";
import { legendaryAttack } from "@/lib/utils/battle/actions/legendary";
import { legendaryAbilities, legendaryBlocker, legendaryCostOf, spendLegendary } from "@/lib/utils/battle/actions/legendary-options";
import type { LegendaryActionBody } from "@/lib/utils/battle/actions/schema";
import { abilityRunContext } from "@/lib/utils/battle/pipeline/ability-use";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, battleActionToEvent, BattleRuleError, systemEvent } from "@/lib/utils/battle/store";
import { applyAbilitySummons, type SummonDeps } from "@/lib/utils/battle/summon/ability-summons";
import { assertAbilityTargets } from "@/lib/utils/battle/validation/ability-targets";
import { abilityOnMap } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

const defaultDeps: SummonDeps = { loadPool: getCachedSummonPool };

function assertLegendaryAllowed(ctx: BattleMutationContext, actor: BattleParticipant, cost: number): void {
  const blocker = legendaryBlocker(actor, ctx.participants[ctx.scene.turnIndex], cost);

  if (blocker) throw new BattleRuleError("action_rejected", blocker);
}

const counter = (p: BattleParticipant) => `${p.battleData.legendary?.actionsLeft ?? 0}/${p.battleData.legendary?.actions ?? 0}`;

export function createLegendaryMutation(deps: SummonDeps = defaultDeps) {
  return async (ctx: BattleMutationContext, body: LegendaryActionBody): Promise<MutationResult> => {
    if (!ctx.isDM) throw new BattleAccessError(403, "Легендарні дії — лише для ДМ");

    const actor = findParticipant(ctx.participants, body.participantId);

    if (!actor) throw new BattleAccessError(404, "Учасника немає в бою");

    const { id, name } = actor.basicInfo;

    const { round } = ctx.scene;

    const { option } = body;

    if (option.kind === "attack") {
      assertLegendaryAllowed(ctx, actor, 1);

      const out = legendaryAttack({ participants: ctx.participants, actorId: id, attackIndex: option.attackIndex, targetId: option.targetId, map: ctx.meta.map, rules: ctx.meta.rules, round, rng: ctx.rng ?? Math.random, battleId: ctx.scene.id });

      const participants = updateParticipant(out.participants, id, (p) => spendLegendary(p, 1));

      const after = findParticipant(participants, id) ?? actor;

      return { participants, pending: ctx.pending, events: [systemEvent(round, `👑 ${name}: легендарна дія — ${out.attackName} (${counter(after)})`), battleActionToEvent(out.action)] };
    }

    const ability = legendaryAbilities(actor).find((a) => a.key === option.abilityKey);

    if (!ability) throw new BattleRuleError("action_rejected", "У учасника немає такої легендарної дії");

    const cost = legendaryCostOf(ability);

    assertLegendaryAllowed(ctx, actor, cost);

    if (!withinCountLimits(actor, ability)) throw new BattleRuleError("ability_limit", "Ліміт використань вичерпано");

    const wait = cooldownLeft(actor, ability, round);

    if (wait > 0) throw new BattleRuleError("ability_limit", `Перезарядка: ще ${wait} р.`);

    const targetIds = assertAbilityTargets(ability, ctx.participants, option.targetIds ?? [], { owner: actor, onMap: abilityOnMap(ctx.meta.map, actor) });

    const run = runAbilities(ctx.participants, { type: "action", actorId: id, abilityKey: ability.key, targetIds }, abilityRunContext(ctx));

    const summoned = await applyAbilitySummons(run.summons, run.participants, { campaignId: ctx.scene.campaignId, battleId: ctx.scene.id, rng: ctx.rng ?? Math.random, rules: ctx.meta.rules, deps });

    const participants = updateParticipant(summoned.order, id, (p) => spendLegendary(p, cost));

    const after = findParticipant(participants, id) ?? actor;

    const text = run.fired.length ? [...run.messages, ...summoned.messages].join(" | ") : `${ability.name}: не спрацювало`;

    return {
      participants,
      pending: ctx.pending,
      events: [
        {
          type: "ability",
          round,
          actorId: id,
          resultText: `👑 ${name}: легендарна дія «${ability.name}» (${counter(after)}) — ${text}`,
          details: { actorName: name, actorSide: actor.basicInfo.side, actionDetails: { abilityKey: ability.key, skillName: ability.name } },
        },
      ],
    };
  };
}

export const legendaryMutation = createLegendaryMutation();
