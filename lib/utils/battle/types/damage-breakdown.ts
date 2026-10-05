/**
 * Типи для breakdown урону
 */

import type { BattleAttack, BattleParticipant, DamageStep } from "@/types/battle";

export interface DamageBreakdownResult {
  breakdown: string[];
  totalDamage: number;
  targetBreakdown: string[];
  finalDamage: number;
  steps: DamageStep[];
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
  steps: DamageStep[];
}

export interface DamageBreakdownMultiTargetResult {
  breakdown: string[];
  totalDamage: number;
  targets: DamageBreakdownTargetResult[];
}
