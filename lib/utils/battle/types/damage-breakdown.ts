/**
 * Типи для breakdown урону
 */

import type { BattleAttack, BattleParticipant } from "@/types/battle";

export interface DamageBreakdownResult {
  breakdown: string[];
  totalDamage: number;
  targetBreakdown: string[];
  finalDamage: number;
}

export interface ComputeDamageBreakdownParams {
  attacker: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  damageRolls: number[];
  allParticipants: BattleParticipant[];
  isCritical?: boolean;
}

export interface DamageBreakdownTargetResult {
  targetId: string;
  targetName: string;
  targetBreakdown: string[];
  finalDamage: number;
}

export interface DamageBreakdownMultiTargetResult {
  breakdown: string[];
  totalDamage: number;
  targets: DamageBreakdownTargetResult[];
}
