import type { AttackRollResult } from "./attack";

import type { CriticalEffect } from "@/lib/constants/critical-effects";
import type { SummonRequest } from "@/lib/utils/abilities/engine/types";
import type { BattleAction, BattleAttack, BattleParticipant } from "@/types/battle";

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
  bonusPercent?: number;
  bonusLabel?: string;
  rng?: () => number;
}

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
  battleAction: BattleAction;
  summons: SummonRequest[];
}
