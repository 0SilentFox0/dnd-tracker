/**
 * Типи для обробки заклинання в бою
 */

import type { BattleAction, BattleParticipant } from "@/types/battle";

/** Інтерфейс заклинання для бою */
export interface BattleSpell {
  id: string;
  name: string;
  level: number;
  type: "target" | "aoe" | "no_target";
  target?: "enemies" | "allies" | "all";
  damageType: "damage" | "heal" | "all";
  damageElement?: string | null;
  damageModifier?: string | null;
  healModifier?: string | null;
  diceCount?: number | null;
  diceType?: string | null;
  savingThrow?: {
    ability: string;
    onSuccess: "half" | "none";
    dc?: number;
  } | null;
  hitCheck?: { ability: string; dc: number } | null;
  description: string;
  duration?: string | null;
  castingTime?: string | null;
  effects?: string[] | null;
  effectDetails?: {
    duration?: number;
    effects?: Array<{ type: string; value: number; isPercentage?: boolean }>;
    /** DoT з самого заклинання (напр. Decay): урон протягом кількох раундів */
    additionalModifier?: {
      modifier?: string;
      duration?: number;
      damage?: number;
    };
  } | null;
  icon?: string | null;
}

/** Параметри для обробки заклинання */
export interface ProcessSpellParams {
  caster: BattleParticipant;
  spell: BattleSpell;
  targetIds: string[];
  allParticipants: BattleParticipant[];
  currentRound: number;
  battleId: string;
  damageRolls: number[];
  savingThrows?: Array<{
    participantId: string;
    roll: number;
  }>;
  additionalRollResult?: number;
  hitRoll?: number;
  /** DM накладає з сайдбару — не витрачати spell slot, ігнорувати перевірку слотів */
  isDMCast?: boolean;
}

/** Результат обробки заклинання */
export interface ProcessSpellResult {
  success: boolean;
  spellCalculation?: {
    totalDamage?: number;
    totalHealing?: number;
    breakdown: string[];
    resistanceBreakdown: string[];
  };
  targetsUpdated: BattleParticipant[];
  casterUpdated: BattleParticipant;
  battleAction: BattleAction;
}
