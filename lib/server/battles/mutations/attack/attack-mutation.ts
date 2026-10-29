import type { Spell } from "@prisma/client";
import type { z } from "zod";

import { getCachedSpells, getCachedSummonPool } from "@/lib/cache/reference-data";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { attackBodySchema } from "@/lib/schemas/battles";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { canUseInspiration, spendInspiration } from "@/lib/utils/battle/attack/inspiration";
import { findAttack, requestedTargetIds } from "@/lib/utils/battle/attack-phase/request";
import { runAttackPhase } from "@/lib/utils/battle/attack-phase/run-attack-phase";
import { runWithCritChoice } from "@/lib/utils/battle/crit-choice/run-with-crit-choice";
import type { CritResume } from "@/lib/utils/battle/crit-choice/types";
import { heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import { attackReachError } from "@/lib/utils/battle/grid";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { toCastableSpell } from "@/lib/utils/battle/spell/to-castable";
import { battleActionToEvent,BattleRuleError } from "@/lib/utils/battle/store";
import { applyAbilitySummons, type SummonDeps } from "@/lib/utils/battle/summon/ability-summons";
import { advanceTurn, assertCanAct } from "@/lib/utils/battle/turn";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { assertAttackRolls } from "@/lib/utils/battle/validation/dice-checks";


export type AttackBody = z.infer<typeof attackBodySchema>;

function assertAttackInput(ctx: BattleMutationContext, data: Omit<AttackBody, "endTurn">): void {
  const attacker = findParticipant(ctx.participants, data.attackerId);

  const attack = attacker && findAttack(attacker, data.attackId, data.offHand);

  // без атакуючого чи атаки помилку дасть сама фаза атаки
  if (!attacker || !attack) return;

  const targetIds = requestedTargetIds(data);

  // клієнт героя кидає кубики зброї разом із кубиками рівня (PlayerTurnViewDialogs)
  assertAttackRolls(heroAttackDamageParts(attacker, attack).formula, { damageRolls: data.damageRolls, targetCount: targetIds.length });

  const targets = targetIds.flatMap((id) => findParticipant(ctx.participants, id) ?? []);

  const reach = attackReachError(ctx.meta.map, ctx.participants, attacker, attack, targets);

  if (reach) throw new BattleRuleError("action_rejected", reach);
}

export interface AttackMutationDeps extends SummonDeps {
  loadSpells(campaignId: string, ids: string[]): Promise<Spell[]>;
}

const defaultDeps: AttackMutationDeps = {
  loadPool: getCachedSummonPool,
  loadSpells: async (campaignId, ids) => (await getCachedSpells(campaignId)).filter((s) => ids.includes(s.id)),
};

async function loadHitSpells(ctx: BattleMutationContext, attackerId: string, deps: AttackMutationDeps): Promise<Map<string, CastableSpell>> {
  const attacker = findParticipant(ctx.participants, attackerId);

  if (!attacker) return new Map();

  const ids = [...new Set(findFlags(withSelf(ctx.participants, attacker), attackerId, "castSpellOnHit").flatMap((f) => f.spellIds))];

  if (ids.length === 0) return new Map();

  const rows = await deps.loadSpells(ctx.scene.campaignId, ids);

  return new Map(rows.map((r) => [r.id, toCastableSpell(r)]));
}

export function createAttackMutation(deps: AttackMutationDeps = defaultDeps, options: { serverRolls?: boolean } = {}) {
  return async (ctx: BattleMutationContext, body: AttackBody, resume?: CritResume, replay: { serverRolls?: boolean } = {}): Promise<MutationResult> => {
    const serverRolls = replay.serverRolls ?? options.serverRolls;

    const { endTurn, ...data } = body;

    assertAttackInput(ctx, data);
    assertCanAct(ctx, data.attackerId);

    let participants = ctx.participants;

    if (data.useInspiration) {
      if (!canUseInspiration(findParticipant(participants, data.attackerId), ctx.meta.rules)) throw new BattleRuleError("action_rejected", API_ERRORS.NO_INSPIRATION);

      participants = spendInspiration(participants, data.attackerId);
    }

    const hitSpells = await loadHitSpells(ctx, data.attackerId, deps);

    return runWithCritChoice(ctx, {
      action: "attack",
      actorId: data.attackerId,
      request: body,
      enabled: ctx.meta.critChoiceByDm,
      serverRolls,
      resume,
      run: async ({ rng, crit }) => {
        const phase = runAttackPhase({
          battle: { initiativeOrder: participants, currentRound: ctx.scene.round, currentTurnIndex: ctx.scene.turnIndex },
          data,
          battleId: ctx.scene.id,
          userId: ctx.userId,
          isDM: ctx.isDM,
          rng,
          crit,
          serverRolls,
          map: ctx.meta.map,
          rules: ctx.meta.rules,
          hitSpells,
        });

        const summoned = await applyAbilitySummons(phase.summons, phase.finalInitiativeOrder, { campaignId: ctx.scene.campaignId, battleId: ctx.scene.id, rng, rules: ctx.meta.rules, deps });

        const order = summoned.order;

        const actions = phase.allBattleActions.map((a, i, all) => (i === all.length - 1 && summoned.messages.length > 0 ? { ...a, resultText: [a.resultText, ...summoned.messages].join(" | ") } : a));

        const events = actions.map(battleActionToEvent);

        if (!endTurn) return { participants: order, pending: ctx.pending, events };

        const advanced = advanceTurn({ participants: order, pending: ctx.pending, scene: ctx.scene, rng, map: ctx.meta.map, rules: ctx.meta.rules });

        return {
          participants: advanced.participants,
          pending: advanced.pending,
          scene: advanced.scene,
          events: [...events, ...advanced.actions.map(battleActionToEvent)],
        };
      },
    });
  };
}

export const attackMutation = createAttackMutation();
