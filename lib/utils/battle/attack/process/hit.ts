import type { AttackRollResult } from "../../types/attack";
import { type AttackFlow, fire, getP, put, settleDowned } from "./ability-flow";
import { computeHitDamage, type ComputeHitDamageResult } from "./compute";
import { applyDamageToTarget } from "./damage";
import { splitGuardedDamage } from "./guard";
import { applyVampirism } from "./hit-effects";

import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import type { BattleAttack } from "@/types/battle";

export interface ResolveHitParams {
  flow: AttackFlow;
  attackerId: string;
  targetId: string;
  attack: BattleAttack;
  damageRolls: number[];
  attackRoll: AttackRollResult;
  damageMultiplier?: number;
  currentRound: number;
  actionModifiers?: StaticEffect[];
  bonusPercent?: number;
}

export function resolveHit(p: ResolveHitParams): { hitDamage: ComputeHitDamageResult; vampirismHeal: number } {
  const { flow, attackerId, targetId, attack } = p;

  const hitDamage = computeHitDamage({
    attacker: getP(flow, attackerId),
    target: getP(flow, targetId),
    attack,
    damageRolls: p.damageRolls,
    allParticipants: flow.ps,
    attackRoll: p.attackRoll,
    damageMultiplier: p.damageMultiplier,
    currentRound: p.currentRound,
    actionModifiers: p.actionModifiers,
    bonusPercent: p.bonusPercent,
    rng: flow.ctx.rng,
  });

  put(flow, hitDamage.updatedAttacker);
  put(flow, hitDamage.updatedTarget);

  const guarded = splitGuardedDamage(flow.ps, targetId, hitDamage.totalFinalDamage);

  put(flow, applyDamageToTarget(getP(flow, targetId), guarded.targetDamage).updatedTarget);

  if (guarded.guardianId) {
    const guardian = getP(flow, guarded.guardianId);

    put(flow, applyDamageToTarget(guardian, guarded.guardianDamage).updatedTarget);
    flow.messages.push(`🛡 ${guardian.basicInfo.name} приймає ${guarded.guardianDamage} шкоди за ${getP(flow, targetId).basicInfo.name}`);
    settleDowned(flow, guarded.guardianId, attackerId);
  }

  settleDowned(flow, targetId, attackerId);

  fire(flow, {
    type: "hit",
    actorId: attackerId,
    targetId,
    attackKind: attackKindOf(attack.type),
    damage: hitDamage.resistanceResult.finalDamage,
  });

  const vampirism = applyVampirism(getP(flow, attackerId), hitDamage.totalFinalDamage, attack.type);

  put(flow, vampirism.updatedAttacker);

  return { hitDamage, vampirismHeal: vampirism.vampirismHeal };
}
