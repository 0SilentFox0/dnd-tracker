import type { ComputeHitDamageResult } from "./compute";

import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { newBattleAction } from "@/lib/utils/battle/common/new-action";
import { immunityNote } from "@/lib/utils/battle/resistance";
import type { AttackRollResult } from "@/lib/utils/battle/types/attack";
import { lowerFirst } from "@/lib/utils/common/text";
import type { BattleAction, BattleAttack, BattleParticipant } from "@/types/battle";

const critDetails = (effect: CriticalEffect, flavor?: string) => ({ id: effect.id, name: effect.name, description: effect.description, type: effect.type, flavor });

const critSummary = (effect: CriticalEffect, flavor: string | undefined, isFail: boolean) =>
  `${isFail ? `Критична невдача — ${effect.name}.` : `Критичне влучання — ${effect.name}!`}${flavor ? ` ${flavor}` : ""}`;

const rollDetails = (attack: BattleAttack, d20Roll: number, attackRoll: AttackRollResult, targetAC: number) => ({
  weaponName: attack.name,
  attackKind: attackKindOf(attack.type),
  attackRoll: d20Roll,
  attackBonus: attackRoll.attackBonus,
  totalAttackValue: attackRoll.totalAttackValue,
  targetAC,
});

const damageRollDetails = (attack: BattleAttack, rolls: number[]) =>
  rolls.map((roll) => ({ dice: attack.damageDice, results: [roll], total: roll, damageType: attack.damageType }));

interface AttackActionBase {
  attacker: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  d20Roll: number;
  attackRoll: AttackRollResult;
  targetAC: number;
  messages: string[];
  battleId: string;
  currentRound: number;
}

export interface BuildCriticalFailActionParams extends AttackActionBase {
  criticalEffect: CriticalEffect;
  critFlavorText?: string;
}

export function buildBattleActionForCriticalFail(p: BuildCriticalFailActionParams): BattleAction {
  const { attacker, target, criticalEffect, critFlavorText } = p;

  return newBattleAction(attacker, "attack", { battleId: p.battleId, round: p.currentRound, targets: [target] }, {
    actionDetails: {
      ...rollDetails(p.attack, p.d20Roll, p.attackRoll, p.targetAC),
      isHit: false,
      isCritical: false,
      isCriticalFail: true,
      criticalEffect: critDetails(criticalEffect, critFlavorText),
    },
    resultText: [`${attacker.basicInfo.name}: ${lowerFirst(critSummary(criticalEffect, critFlavorText, true))}`, ...p.messages].filter(Boolean).join(" | "),
  });
}

export interface BuildMissActionParams extends AttackActionBase {
  /** Ціль після гарантованої шкоди промаху */
  targetAfter: BattleParticipant;
  guaranteedDamage: number;
}

export function buildBattleActionForMiss(p: BuildMissActionParams): BattleAction {
  const { attacker, target, guaranteedDamage } = p;

  return newBattleAction(attacker, "attack", { battleId: p.battleId, round: p.currentRound, targets: [target] }, {
    actionDetails: {
      ...rollDetails(p.attack, p.d20Roll, p.attackRoll, p.targetAC),
      isHit: false,
      isCritical: false,
      isCriticalFail: p.attackRoll.isCriticalFail,
    },
    resultText: [
      `${attacker.basicInfo.name} → ${target.basicInfo.name}: промах`,
      ...((p.attack.guaranteedDamage ?? 0) > 0 ? [`гарантована шкода: ${guaranteedDamage}`] : []),
      ...p.messages,
    ].filter(Boolean).join(" | "),
    hpChanges:
      guaranteedDamage > 0
        ? [{ participantId: target.basicInfo.id, participantName: target.basicInfo.name, oldHp: target.combatStats.currentHp, newHp: p.targetAfter.combatStats.currentHp, change: guaranteedDamage }]
        : [],
  });
}

export interface BuildHitActionParams extends AttackActionBase {
  damageRolls: number[];
  hitDamage: ComputeHitDamageResult;
  vampirismHeal: number;
  critFlavorText?: string;
}

export function buildBattleActionForHit(p: BuildHitActionParams): BattleAction {
  const { attacker, target, attack, attackRoll, vampirismHeal, critFlavorText } = p;

  const { damageCalculation, physicalDamage, totalFinalDamage, criticalEffectApplied, damageSteps, oldHp } = p.hitDamage;

  const critText = criticalEffectApplied ? `. ${critSummary(criticalEffectApplied, critFlavorText, false)}` : attackRoll.isCritical ? " (КРИТИЧНЕ ПОПАДАННЯ!)" : "";

  return newBattleAction(attacker, "attack", { battleId: p.battleId, round: p.currentRound, targets: [target] }, {
    actionDetails: {
      ...rollDetails(attack, p.d20Roll, attackRoll, p.targetAC),
      isHit: true,
      isCritical: attackRoll.isCritical,
      isCriticalFail: false,
      criticalEffect: criticalEffectApplied ? critDetails(criticalEffectApplied, critFlavorText) : undefined,
      damageRolls: damageRollDetails(attack, p.damageRolls),
      totalDamage: physicalDamage,
      damageBreakdown: damageCalculation.breakdown.join("; "),
      damageSteps: { [target.basicInfo.id]: damageSteps },
    },
    resultText: [
      `${attacker.basicInfo.name} → ${target.basicInfo.name}: ${totalFinalDamage} шкоди${critText}${vampirismHeal > 0 ? ` | Вампіризм: ${attacker.basicInfo.name} +${vampirismHeal} HP` : ""}`,
      totalFinalDamage === 0 ? immunityNote(target.basicInfo.name, damageSteps) : "",
      ...p.messages,
    ].filter(Boolean).join(" | "),
    hpChanges: [
      { participantId: target.basicInfo.id, participantName: target.basicInfo.name, oldHp, newHp: target.combatStats.currentHp, change: totalFinalDamage },
      ...(vampirismHeal > 0
        ? [{ participantId: attacker.basicInfo.id, participantName: attacker.basicInfo.name, oldHp: attacker.combatStats.currentHp - vampirismHeal, newHp: attacker.combatStats.currentHp, change: -vampirismHeal }]
        : []),
    ],
  });
}

/** Ціль загинула від умінь до кидка атаки. */
export function buildAbortedAttackAction(
  attacker: BattleParticipant,
  target: BattleParticipant,
  attack: BattleAttack,
  messages: string[],
  battleId: string,
  currentRound: number,
): BattleAction {
  return newBattleAction(attacker, "attack", { battleId, round: currentRound, targets: [target] }, {
    actionDetails: { weaponName: attack.name, attackKind: attackKindOf(attack.type), isHit: false },
    resultText: [`${attacker.basicInfo.name} → ${target.basicInfo.name}: ціль загинула до атаки`, ...messages].join(" | "),
  });
}

export interface BuildRetaliationParams {
  retaliator: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  attackRoll: AttackRollResult;
  targetAC: number;
  hit: { damageRolls: number[]; hitDamage: ComputeHitDamageResult } | null;
  messages: string[];
  battleId: string;
  currentRound: number;
  critFlavorText?: string;
}

export function buildRetaliationAction(p: BuildRetaliationParams): BattleAction {
  const { retaliator, target, attack, attackRoll, hit } = p;

  const d20 = attackRoll.totalAttackValue - attackRoll.attackBonus;

  const crit = attackRoll.isCriticalFail ? attackRoll.criticalEffect : hit?.hitDamage.criticalEffectApplied;

  const critText = crit ? `. ${critSummary(crit, p.critFlavorText, attackRoll.isCriticalFail)}` : "";

  const summary = `Відсіч: ${retaliator.basicInfo.name} → ${target.basicInfo.name}: d20 ${d20}, ${
    hit ? `${hit.hitDamage.totalFinalDamage} шкоди${!crit && attackRoll.isCritical ? " (КРИТИЧНЕ ПОПАДАННЯ!)" : ""}` : "промах"
  }${critText}`;

  const immune = hit && hit.hitDamage.totalFinalDamage === 0 ? immunityNote(target.basicInfo.name, hit.hitDamage.damageSteps) : "";

  return newBattleAction(retaliator, "retaliation", { battleId: p.battleId, round: p.currentRound, targets: [target] }, {
    actionDetails: {
      ...rollDetails(attack, d20, attackRoll, p.targetAC),
      isHit: !!hit,
      isCritical: !!hit && attackRoll.isCritical,
      isCriticalFail: attackRoll.isCriticalFail,
      ...(crit && { criticalEffect: critDetails(crit, p.critFlavorText) }),
      ...(hit && {
        damageRolls: damageRollDetails(attack, hit.damageRolls),
        totalDamage: hit.hitDamage.physicalDamage,
        damageBreakdown: hit.hitDamage.damageCalculation.breakdown.join("; "),
        damageSteps: { [target.basicInfo.id]: hit.hitDamage.damageSteps },
      }),
    },
    resultText: [summary, immune, ...p.messages].filter(Boolean).join(" | "),
  });
}
