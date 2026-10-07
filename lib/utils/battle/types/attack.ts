import type { CriticalEffect } from "@/lib/constants/critical-effects";

export interface AttackRollResult {
  isHit: boolean;
  isCritical: boolean;
  isCriticalFail: boolean;
  totalAttackValue: number;
  attackBonus: number;
  criticalEffect?: CriticalEffect;
  advantageUsed: boolean;
  /** другий d20 для переваги/недоліку; serverRolled — якщо клієнт його не надіслав */
  secondRoll?: { mode: "advantage" | "disadvantage"; value: number; serverRolled: boolean };
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
}
