import { computeHitDamage, type ComputeHitDamageResult } from "./compute";
import { applyDamageToTarget } from "./damage";
import { fireWaveVictims } from "./fire-wave";
import { splitGuardedDamage } from "./guard";
import { applyVampirism } from "./hit-effects";
import { castHitSpell } from "./hit-spell";

import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import type { CunningStrikeEffect, StaticEffect } from "@/lib/utils/abilities/schema";
import { applyCunningStrikeEffects, cunningStrikeCost, cunningStrikeOffer } from "@/lib/utils/battle/attack/cunning-strike";
import { eventRollMode } from "@/lib/utils/battle/attack/roll";
import { attackSourceOf } from "@/lib/utils/battle/attack/source";
import { type ActionFlow, applyFlowDamage, fire, getP, put, settleDowned } from "@/lib/utils/battle/common/action-flow";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { dealResistedHits } from "@/lib/utils/battle/damage/resisted-ability-damage";
import type { AttackRollResult } from "@/lib/utils/battle/types/attack";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { BattleAttack } from "@/types/battle";
import type { LogLine } from "@/types/text";

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
  cunningStrike?: CunningStrikeEffect[];
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

  put(flow, applyDamageToTarget(targetBefore, guarded.targetDamage));
  applyFlowDamage(flow, targetBefore, guarded.targetDamage, p.attackRoll.isCritical);

  if (guarded.guardianId) {
    const guardian = getP(flow, guarded.guardianId);

    put(flow, applyDamageToTarget(guardian, guarded.guardianDamage));
    applyFlowDamage(flow, guardian, guarded.guardianDamage, p.attackRoll.isCritical);
    flow.messages.push(`🛡 ${guardian.basicInfo.name} приймає ${guarded.guardianDamage} шкоди — захищає: ${getP(flow, targetId).basicInfo.name}`);
    settleDowned(flow, guarded.guardianId, attackerId);
  }

  settleDowned(flow, targetId, attackerId);

  const hpBeforeHit = getP(flow, targetId).combatStats.currentHp;

  const messagesBeforeHit = flow.messages.length;

  const offer = p.cunningStrike?.length ? cunningStrikeOffer(getP(flow, attackerId), p.currentRound) : null;

  const cunningCost = p.cunningStrike?.length ? cunningStrikeCost(offer, p.cunningStrike) : 0;

  const forgo = typeof cunningCost === "number" ? cunningCost : 0;

  const { fired } = fire(flow, {
    type: "hit",
    actorId: attackerId,
    targetId,
    attackKind: attackKindOf(attack.type),
    ...attackSourceOf(attack),
    damage: Math.min(hitDamage.resistanceResult.finalDamage, hitDamage.totalFinalDamage),
    ...eventRollMode(p.attackRoll),
    ...(forgo > 0 && { cunningDice: forgo }),
  });

  if (p.cunningStrike?.length && offer && forgo > 0 && fired.includes(offer.sneakKey)) {
    applyCunningStrikeEffects(flow, attackerId, targetId, p.cunningStrike);
    settleDowned(flow, targetId, attackerId);
  }

  const abilityDamage = Math.max(0, hpBeforeHit - getP(flow, targetId).combatStats.currentHp);

  const abilityLines = abilityDamage > 0 ? abilityDamageLines(flow.messages.slice(messagesBeforeHit), getP(flow, targetId).basicInfo.name, abilityDamage) : [];

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

  if (abilityDamage <= 0) return { hitDamage, vampirismHeal: vampirism.vampirismHeal };

  const total = hitDamage.damageCalculation.totalDamage + abilityDamage;

  return {
    hitDamage: {
      ...hitDamage,
      physicalDamage: hitDamage.physicalDamage + abilityDamage,
      totalFinalDamage: hitDamage.totalFinalDamage + abilityDamage,
      damageCalculation: { ...hitDamage.damageCalculation, totalDamage: total, breakdown: [...hitDamage.damageCalculation.breakdown, ...abilityLines] },
    },
    vampirismHeal: vampirism.vampirismHeal,
  };
}

const ABILITY_HIT_LINE = /^💥 (.+?): .+ −(\d+) HP$/;

function abilityDamageLines(messages: LogLine[], targetName: string, total: number): string[] {
  const lines = messages.flatMap((m) => {
    if (typeof m !== "string") return [];

    const match = ABILITY_HIT_LINE.exec(m);

    return match && m.includes(`${match[1]}: ${targetName} −`) ? [`${match[1]}: +${match[2]}`] : [];
  });

  return lines.length > 0 ? lines : [`Вміння: +${total}`];
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
