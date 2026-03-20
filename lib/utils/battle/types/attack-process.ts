/**
 * Типи для обробки атаки в бою
 */

import type { AttackRollResult } from "./attack";

import type { CriticalEffect } from "@/lib/constants/critical-effects";
import type { BattleAction, BattleAttack, BattleParticipant } from "@/types/battle";

/** Параметри для обробки атаки */
export interface ProcessAttackParams {
  attacker: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  d20Roll: number;
  advantageRoll?: number;
  disadvantageRoll?: number;
  damageRolls: number[];
  allParticipants: BattleParticipant[];
  currentRound: number;
  battleId: string;
  damageMultiplier?: number;
  /** Урон відповіді цілі (контратака), якщо передано з клієнта */
  reactionDamageOverride?: number;
}

/** Результат обробки атаки */
export interface ProcessAttackResult {
  success: boolean;
  attackRoll: AttackRollResult;
  damage?: {
    totalDamage: number;
    finalDamage: number;
    breakdown: string[];
    resistanceBreakdown: string[];
    additionalDamageBreakdown: string[];
  };
  targetUpdated: BattleParticipant;
  attackerUpdated: BattleParticipant;
  allParticipantsUpdated?: BattleParticipant[];
  criticalEffectApplied?: CriticalEffect;
  reactionTriggered: boolean;
  reactionDamage?: number;
  battleAction: BattleAction;
}
