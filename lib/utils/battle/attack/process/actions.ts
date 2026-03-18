/**
 * Побудова BattleAction для різних результатів атаки (критичний промах, промах, попадання)
 */

import type { DamageCalculationResult } from "../../types/damage-calculations";
import type { AttackRollResult } from "..";

import { AttackType } from "@/lib/constants/battle";
import type { CriticalEffect } from "@/lib/constants/critical-effects";
import type { BattleAction, BattleAttack, BattleParticipant } from "@/types/battle";

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
      attackKind: (attack.type === AttackType.MELEE ? "melee" : "ranged") as "melee" | "ranged",
      attackRoll: d20Roll,
      attackBonus: attackRoll.attackBonus,
      totalAttackValue: attackRoll.totalAttackValue,
      targetAC,
      isHit: false,
      isCritical: false,
      isCriticalFail: true,
      criticalEffect: {
        id: criticalEffectApplied.id,
        name: criticalEffectApplied.name,
        description: criticalEffectApplied.description,
        type: criticalEffectApplied.type,
      },
    },
    resultText: [
      `${attacker.basicInfo.name} критично промахнувся! [d10: ${criticalEffectApplied.id}] ${criticalEffectApplied.name}: ${criticalEffectApplied.description}`,
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
      attackKind: (attack.type === AttackType.MELEE ? "melee" : "ranged") as "melee" | "ranged",
      attackRoll: d20Roll,
      attackBonus: attackRoll.attackBonus,
      totalAttackValue: attackRoll.totalAttackValue,
      targetAC,
      isHit: false,
      isCritical: false,
      isCriticalFail: attackRoll.isCriticalFail,
    },
    resultText: [
      `${attacker.basicInfo.name} промахнувся по ${target.basicInfo.name}`,
      ...(guaranteedDamage > 0
        ? [`але завдав ${actualGuaranteedDamage} гарантованої шкоди`]
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
  beforeMessages: string[];
  afterMessages: string[];
  vampirismHeal: number;
  reactionTriggered: boolean;
  reactionDamage: number;
  reactionBaseDamage: number;
  reactionBonusPercent: number;
  reactionAttackerHpChange: { oldHp: number; newHp: number } | null;
  oldHp: number;
  battleId: string;
  currentRound: number;
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
    beforeMessages,
    afterMessages,
    vampirismHeal,
    reactionTriggered,
    reactionDamage,
    reactionBaseDamage,
    reactionBonusPercent,
    reactionAttackerHpChange,
    oldHp,
    battleId,
    currentRound,
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
      attackKind: (attack.type === AttackType.MELEE ? "melee" : "ranged") as "melee" | "ranged",
      attackRoll: d20Roll,
      attackBonus: attackRoll.attackBonus,
      totalAttackValue: attackRoll.totalAttackValue,
      targetAC,
      isHit: true,
      isCritical: attackRoll.isCritical,
      isCriticalFail: false,
      criticalEffect: criticalEffectApplied
        ? {
            id: criticalEffectApplied.id,
            name: criticalEffectApplied.name,
            description: criticalEffectApplied.description,
            type: criticalEffectApplied.type,
          }
        : undefined,
      damageRolls: damageRolls.map((roll) => ({
        dice: attack.damageDice,
        results: [roll],
        total: roll,
        damageType: attack.damageType,
      })),
      totalDamage: physicalDamage,
      damageBreakdown: damageCalculation.breakdown.join("; "),
      ...(reactionTriggered && {
        counterReactionDamage: reactionDamage,
        counterReactionBaseDamage: reactionBaseDamage,
        counterReactionBonusPercent: reactionBonusPercent,
      }),
    },
    resultText: [
      `${attacker.basicInfo.name} завдав ${totalFinalDamage} урону ${target.basicInfo.name}${attackRoll.isCritical ? " (КРИТИЧНЕ ПОПАДАННЯ!)" : ""}${criticalEffectApplied ? ` [d10: ${criticalEffectApplied.id}] ${criticalEffectApplied.name}` : ""}${vampirismHeal > 0 ? ` | Вампіризм: ${attacker.basicInfo.name} відновив ${vampirismHeal} HP` : ""}${reactionTriggered ? ` | ${target.basicInfo.name} виконав контр-удар на ${reactionDamage} урону` : ""}`,
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
      ...(reactionTriggered && reactionAttackerHpChange
        ? [
            {
              participantId: attacker.basicInfo.id,
              participantName: attacker.basicInfo.name,
              oldHp: reactionAttackerHpChange.oldHp,
              newHp: reactionAttackerHpChange.newHp,
              change: reactionDamage,
            },
          ]
        : []),
    ],
    isCancelled: false,
  };
}
