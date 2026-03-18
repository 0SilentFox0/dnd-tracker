/**
 * Типи для результатів атаки (Attack Roll, повна атака)
 */

import type { CriticalEffect } from "@/lib/constants/critical-effects";

export interface AttackRollResult {
  isHit: boolean;
  isCritical: boolean;
  isCriticalFail: boolean;
  totalAttackValue: number;
  attackBonus: number;
  criticalEffect?: CriticalEffect;
  advantageUsed: boolean;
}

export interface AttackResult {
  attackRoll: AttackRollResult;
  damageResult?: {
    totalDamage: number;
    finalDamage: number;
    breakdown: string[];
    resistanceBreakdown: string[];
  };
  targetHpChange: {
    oldHp: number;
    newHp: number;
    oldTempHp: number;
    newTempHp: number;
  };
  criticalEffectApplied?: CriticalEffect;
  reactionTriggered: boolean;
}
