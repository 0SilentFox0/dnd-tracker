import { computeHitDamage, type ComputeHitDamageResult } from "./compute";
import { applyDamageToTarget } from "./damage";
import { fireWaveVictims } from "./fire-wave";
import { splitGuardedDamage } from "./guard";
import { applyVampirism } from "./hit-effects";
import { castHitSpell } from "./hit-spell";

import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { type ActionFlow, applyFlowDamage, fire, getP, put, settleDowned } from "@/lib/utils/battle/common/action-flow";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { dealResistedHits } from "@/lib/utils/battle/damage/resisted-ability-damage";
import type { AttackRollResult } from "@/lib/utils/battle/types/attack";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { BattleAttack } from "@/types/battle";

export interface ResolveHitParams {
  flow: ActionFlow;
  attackerId: string;
  targetId: string;
  attack: BattleAttack;
  damageRolls: number[];
  attackRoll: AttackRollResult;
  damageMultiplier?: number;
  currentRound: number;
  actionModifiers?: StaticEffect[];
  bonusPercent?: number;
  bonusLabel?: string;
  offTurn?: boolean;
  obstacle?: boolean;
  hitSpells?: ReadonlyMap<string, CastableSpell>;
  battleId: string;
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
    bonusLabel: p.bonusLabel,
    offTurn: p.offTurn,
    obstacle: p.obstacle,
    rng: flow.ctx.rng,
  });

  put(flow, hitDamage.updatedAttacker);
  put(flow, hitDamage.updatedTarget);

  const guarded = splitGuardedDamage(flow.ps, targetId, hitDamage.totalFinalDamage);

  const targetBefore = getP(flow, targetId);

  put(flow, applyDamageToTarget(targetBefore, guarded.targetDamage).updatedTarget);
  applyFlowDamage(flow, targetBefore, guarded.targetDamage, p.attackRoll.isCritical);

  if (guarded.guardianId) {
    const guardian = getP(flow, guarded.guardianId);

    put(flow, applyDamageToTarget(guardian, guarded.guardianDamage).updatedTarget);
    applyFlowDamage(flow, guardian, guarded.guardianDamage, p.attackRoll.isCritical);
    flow.messages.push(`🛡 ${guardian.basicInfo.name} приймає ${guarded.guardianDamage} шкоди — захищає: ${getP(flow, targetId).basicInfo.name}`);
    settleDowned(flow, guarded.guardianId, attackerId);
  }

  settleDowned(flow, targetId, attackerId);

  fire(flow, {
    type: "hit",
    actorId: attackerId,
    targetId,
    attackKind: attackKindOf(attack.type),
    damage: Math.min(hitDamage.resistanceResult.finalDamage, hitDamage.totalFinalDamage),
  });

  applyFireWave(flow, attackerId, targetId, hitDamage.totalFinalDamage);

  if (p.hitSpells && p.hitSpells.size > 0 && isActive(getP(flow, targetId))) {
    const cast = castHitSpell({
      attacker: getP(flow, attackerId),
      targetId,
      participants: flow.ps,
      spells: p.hitSpells,
      round: p.currentRound,
      battleId: p.battleId,
      attackKind: attackKindOf(attack.type),
      rng: flow.ctx.rng,
    });

    flow.ps = cast.participants;
    flow.messages.push(...cast.messages);
  }

  const vampirism = applyVampirism(flow.ps, attackerId, hitDamage.totalFinalDamage, attack.type);

  if (vampirism.updatedAttacker) put(flow, vampirism.updatedAttacker);

  return { hitDamage, vampirismHeal: vampirism.vampirismHeal };
}

function applyFireWave(flow: ActionFlow, attackerId: string, targetId: string, hitDamage: number): void {
  for (const f of findFlags(flow.ps, attackerId, "fireWave")) {
    const amount = Math.floor((hitDamage * f.percent) / 100);

    if (amount <= 0) continue;

    const victims = fireWaveVictims(flow.ctx.map, flow.ps, getP(flow, attackerId), targetId, f.size);

    const r = dealResistedHits(flow.ps, victims.map((targetId) => ({ targetId, amount })), { actorId: attackerId, damageType: "fire", rules: flow.ctx.rules, rng: flow.ctx.rng });

    flow.ps = r.participants;
    flow.messages.push(...r.messages);

    const parts = r.results.map(({ targetId: id, dealt }) => `${getP(flow, id).basicInfo.name} (−${dealt})`);

    for (const d of r.downed) settleDowned(flow, d.victimId, attackerId);

    if (parts.length > 0) flow.messages.push(`🔥 Вогняна хвиля: ${parts.join(", ")}`);
  }
}
