/**
 * Побудова BattleAction для різних результатів атаки (критичний промах, промах, попадання)
 */

import type { DamageCalculationResult } from "../../types/damage-calculations";
import type { AttackRollResult } from "..";
import type { ComputeHitDamageResult } from "./compute";

import { AttackType } from "@/lib/constants/battle";
import type { CriticalEffect } from "@/lib/constants/critical-effects";
import type { BattleAction, BattleAttack, BattleParticipant, DamageStep } from "@/types/battle";

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
  damageSteps: DamageStep[];
  beforeMessages: string[];
  afterMessages: string[];
  vampirismHeal: number;
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
    damageSteps,
    beforeMessages,
    afterMessages,
    vampirismHeal,
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
      damageSteps: { [target.basicInfo.id]: damageSteps },
    },
    resultText: [
      `${attacker.basicInfo.name} завдав ${totalFinalDamage} урону ${target.basicInfo.name}${attackRoll.isCritical ? " (КРИТИЧНЕ ПОПАДАННЯ!)" : ""}${criticalEffectApplied ? ` [d10: ${criticalEffectApplied.id}] ${criticalEffectApplied.name}` : ""}${vampirismHeal > 0 ? ` | Вампіризм: ${attacker.basicInfo.name} відновив ${vampirismHeal} HP` : ""}`,
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
    actionDetails: { weaponName: attack.name, attackKind: attack.type === AttackType.RANGED ? "ranged" : "melee", isHit: false },
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
}

export function buildRetaliationAction(p: BuildRetaliationParams): BattleAction {
  const { retaliator, target, attack, attackRoll, hit } = p;

  const d20 = attackRoll.totalAttackValue - attackRoll.attackBonus;

  const crit = hit?.hitDamage.criticalEffectApplied;

  const summary = `Відсіч: ${retaliator.basicInfo.name} → ${target.basicInfo.name}: d20 ${d20}, ${
    hit ? `${hit.hitDamage.totalFinalDamage} урону${attackRoll.isCritical ? " (КРИТИЧНЕ ПОПАДАННЯ!)" : ""}` : "промах"
  }`;

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
      attackKind: attack.type === AttackType.RANGED ? "ranged" : "melee",
      attackRoll: d20,
      attackBonus: attackRoll.attackBonus,
      totalAttackValue: attackRoll.totalAttackValue,
      targetAC: p.targetAC,
      isHit: !!hit,
      isCritical: !!hit && attackRoll.isCritical,
      isCriticalFail: attackRoll.isCriticalFail,
      ...(crit && { criticalEffect: { id: crit.id, name: crit.name, description: crit.description, type: crit.type } }),
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
