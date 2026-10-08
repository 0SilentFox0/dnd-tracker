import type { DamageCalculationResult } from "../../types/damage-calculations";
import type { AttackRollResult } from "..";
import type { ComputeHitDamageResult } from "./compute";

import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import type { BattleAction, BattleAttack, BattleParticipant, DamageStep } from "@/types/battle";

const critDetails = (effect: CriticalEffect, flavor?: string) => ({ id: effect.id, name: effect.name, description: effect.description, type: effect.type, flavor });

const critSummary = (effect: CriticalEffect, flavor: string | undefined, isFail: boolean) =>
  `${isFail ? `Критична невдача — ${effect.name}.` : `Критичне влучання — ${effect.name}!`}${flavor ? ` ${flavor}` : ""}`;

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

export function buildBattleActionForCriticalFail(
  attacker: BattleParticipant,
  target: BattleParticipant,
  attack: BattleAttack,
  d20Roll: number,
  attackRoll: AttackRollResult,
  targetAC: number,
  criticalEffectApplied: CriticalEffect,
  beforeMessages: string[],
  afterMessages: string[],
  battleId: string,
  currentRound: number,
  critFlavorText?: string,
): BattleAction {
  const action: BattleAction = {
    id: `attack-${attacker.basicInfo.id}-${Date.now()}`,
    battleId,
    round: currentRound,
    actionIndex: 0,
    timestamp: new Date(),
    actorId: attacker.basicInfo.id,
    actorName: attacker.basicInfo.name,
    actorSide: attacker.basicInfo.side,
    actionType: "attack",
    targets: [
      {
        participantId: target.basicInfo.id,
        participantName: target.basicInfo.name,
      },
    ],
    actionDetails: {
      weaponName: attack.name,
      attackKind: attackKindOf(attack.type),
      attackRoll: d20Roll,
      attackBonus: attackRoll.attackBonus,
      totalAttackValue: attackRoll.totalAttackValue,
      targetAC,
      isHit: false,
      isCritical: false,
      isCriticalFail: true,
      criticalEffect: critDetails(criticalEffectApplied, critFlavorText),
    },
    resultText: [
      `${attacker.basicInfo.name}: ${lowerFirst(critSummary(criticalEffectApplied, critFlavorText, true))}`,
      ...beforeMessages,
      ...afterMessages,
    ].filter(Boolean).join(" | "),
    hpChanges: [],
    isCancelled: false,
  };

  return action;
}

export function buildBattleActionForMiss(
  attacker: BattleParticipant,
  target: BattleParticipant,
  updatedTargetOnMiss: BattleParticipant,
  attack: BattleAttack,
  d20Roll: number,
  attackRoll: AttackRollResult,
  targetAC: number,
  actualGuaranteedDamage: number,
  beforeMessages: string[],
  afterMessages: string[],
  battleId: string,
  currentRound: number,
): BattleAction {
  const guaranteedDamage = attack.guaranteedDamage ?? 0;

  return {
    id: `attack-${attacker.basicInfo.id}-${Date.now()}`,
    battleId,
    round: currentRound,
    actionIndex: 0,
    timestamp: new Date(),
    actorId: attacker.basicInfo.id,
    actorName: attacker.basicInfo.name,
    actorSide: attacker.basicInfo.side,
    actionType: "attack",
    targets: [
      {
        participantId: target.basicInfo.id,
        participantName: target.basicInfo.name,
      },
    ],
    actionDetails: {
      weaponName: attack.name,
      attackKind: attackKindOf(attack.type),
      attackRoll: d20Roll,
      attackBonus: attackRoll.attackBonus,
      totalAttackValue: attackRoll.totalAttackValue,
      targetAC,
      isHit: false,
      isCritical: false,
      isCriticalFail: attackRoll.isCriticalFail,
    },
    resultText: [
      `${attacker.basicInfo.name} → ${target.basicInfo.name}: промах`,
      ...(guaranteedDamage > 0
        ? [`гарантована шкода: ${actualGuaranteedDamage}`]
        : []),
      ...beforeMessages,
      ...afterMessages,
    ].filter(Boolean).join(" | "),
    hpChanges:
      actualGuaranteedDamage > 0
        ? [
            {
              participantId: target.basicInfo.id,
              participantName: target.basicInfo.name,
              oldHp: target.combatStats.currentHp,
              newHp: updatedTargetOnMiss.combatStats.currentHp,
              change: actualGuaranteedDamage,
            },
          ]
        : [],
    isCancelled: false,
  };
}

export interface BuildHitActionParams {
  attacker: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  d20Roll: number;
  damageRolls: number[];
  attackRoll: AttackRollResult;
  targetAC: number;
  damageCalculation: DamageCalculationResult;
  physicalDamage: number;
  totalFinalDamage: number;
  resistanceResult: { finalDamage: number; breakdown: string[] };
  criticalEffectApplied?: CriticalEffect;
  damageSteps: DamageStep[];
  beforeMessages: string[];
  afterMessages: string[];
  vampirismHeal: number;
  oldHp: number;
  battleId: string;
  currentRound: number;
  critFlavorText?: string;
}

export function buildBattleActionForHit(params: BuildHitActionParams): BattleAction {
  const {
    attacker,
    target,
    attack,
    d20Roll,
    damageRolls,
    attackRoll,
    targetAC,
    damageCalculation,
    physicalDamage,
    totalFinalDamage,
    criticalEffectApplied,
    damageSteps,
    beforeMessages,
    afterMessages,
    vampirismHeal,
    oldHp,
    battleId,
    currentRound,
    critFlavorText,
  } = params;

  return {
    id: `attack-${attacker.basicInfo.id}-${Date.now()}`,
    battleId,
    round: currentRound,
    actionIndex: 0,
    timestamp: new Date(),
    actorId: attacker.basicInfo.id,
    actorName: attacker.basicInfo.name,
    actorSide: attacker.basicInfo.side,
    actionType: "attack",
    targets: [
      {
        participantId: target.basicInfo.id,
        participantName: target.basicInfo.name,
      },
    ],
    actionDetails: {
      weaponName: attack.name,
      attackKind: attackKindOf(attack.type),
      attackRoll: d20Roll,
      attackBonus: attackRoll.attackBonus,
      totalAttackValue: attackRoll.totalAttackValue,
      targetAC,
      isHit: true,
      isCritical: attackRoll.isCritical,
      isCriticalFail: false,
      criticalEffect: criticalEffectApplied ? critDetails(criticalEffectApplied, critFlavorText) : undefined,
      damageRolls: damageRolls.map((roll) => ({
        dice: attack.damageDice,
        results: [roll],
        total: roll,
        damageType: attack.damageType,
      })),
      totalDamage: physicalDamage,
      damageBreakdown: damageCalculation.breakdown.join("; "),
      damageSteps: { [target.basicInfo.id]: damageSteps },
    },
    resultText: [
      `${attacker.basicInfo.name} → ${target.basicInfo.name}: ${totalFinalDamage} шкоди${criticalEffectApplied ? `. ${critSummary(criticalEffectApplied, critFlavorText, false)}` : attackRoll.isCritical ? " (КРИТИЧНЕ ПОПАДАННЯ!)" : ""}${vampirismHeal > 0 ? ` | Вампіризм: ${attacker.basicInfo.name} +${vampirismHeal} HP` : ""}`,
      ...beforeMessages,
      ...afterMessages,
    ].filter(Boolean).join(" | "),
    hpChanges: [
      {
        participantId: target.basicInfo.id,
        participantName: target.basicInfo.name,
        oldHp,
        newHp: params.target.combatStats.currentHp,
        change: totalFinalDamage,
      },
      ...(vampirismHeal > 0
        ? [
            {
              participantId: attacker.basicInfo.id,
              participantName: attacker.basicInfo.name,
              oldHp: attacker.combatStats.currentHp - vampirismHeal,
              newHp: params.attacker.combatStats.currentHp,
              change: -vampirismHeal,
            },
          ]
        : []),
    ],
    isCancelled: false,
  };
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
  return {
    id: `attack-${attacker.basicInfo.id}-${Date.now()}`,
    battleId,
    round: currentRound,
    actionIndex: 0,
    timestamp: new Date(),
    actorId: attacker.basicInfo.id,
    actorName: attacker.basicInfo.name,
    actorSide: attacker.basicInfo.side,
    actionType: "attack",
    targets: [{ participantId: target.basicInfo.id, participantName: target.basicInfo.name }],
    actionDetails: { weaponName: attack.name, attackKind: attackKindOf(attack.type), isHit: false },
    resultText: [`${attacker.basicInfo.name} → ${target.basicInfo.name}: ціль загинула до атаки`, ...messages].join(" | "),
    hpChanges: [],
    isCancelled: false,
  };
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

  return {
    id: `retaliation-${retaliator.basicInfo.id}-${Date.now()}`,
    battleId: p.battleId,
    round: p.currentRound,
    actionIndex: 0,
    timestamp: new Date(),
    actorId: retaliator.basicInfo.id,
    actorName: retaliator.basicInfo.name,
    actorSide: retaliator.basicInfo.side,
    actionType: "retaliation",
    targets: [{ participantId: target.basicInfo.id, participantName: target.basicInfo.name }],
    actionDetails: {
      weaponName: attack.name,
      attackKind: attackKindOf(attack.type),
      attackRoll: d20,
      attackBonus: attackRoll.attackBonus,
      totalAttackValue: attackRoll.totalAttackValue,
      targetAC: p.targetAC,
      isHit: !!hit,
      isCritical: !!hit && attackRoll.isCritical,
      isCriticalFail: attackRoll.isCriticalFail,
      ...(crit && { criticalEffect: critDetails(crit, p.critFlavorText) }),
      ...(hit && {
        damageRolls: hit.damageRolls.map((roll) => ({ dice: attack.damageDice, results: [roll], total: roll, damageType: attack.damageType })),
        totalDamage: hit.hitDamage.physicalDamage,
        damageBreakdown: hit.hitDamage.damageCalculation.breakdown.join("; "),
        damageSteps: { [target.basicInfo.id]: hit.hitDamage.damageSteps },
      }),
    },
    resultText: [summary, ...p.messages].filter(Boolean).join(" | "),
    hpChanges: [],
    isCancelled: false,
  };
}
