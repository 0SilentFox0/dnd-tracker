import type { AttackRollResult } from "./attack";

import type { CriticalEffect } from "@/lib/constants/critical-effects";
import type { SummonRequest } from "@/lib/utils/abilities/engine/core/types";
import type { BattleAction, BattleAttack, BattleParticipant } from "@/types/battle";

export interface ProcessAttackParams {
  attacker: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  d20Roll: number;
  advantageRoll?: number;
  disadvantageRoll?: number;
  /** Вибір гравця; діє лише коли навички не задають перевагу/недолік */
  rollMode?: "normal" | "advantage" | "disadvantage";
  damageRolls: number[];
  allParticipants: BattleParticipant[];
  currentRound: number;
  battleId: string;
  damageMultiplier?: number;
  bonusPercent?: number;
  bonusLabel?: string;
  /** Наступні удари залпу: основну дію вже витратив перший удар */
  actionSpent?: boolean;
  /** «Перешкода»: шкода влучання ×0.5 після всіх модифікаторів і опорів */
  obstacle?: boolean;
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
