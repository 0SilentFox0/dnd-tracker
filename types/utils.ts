/**
 * Типи для утиліт
 */

// API Auth
export interface AuthResult {
  userId: string;
  authUser: {
    id: string;
    email?: string | null;
    user_metadata?: {
      full_name?: string;
      name?: string;
      avatar_url?: string;
      picture?: string;
    } | null;
  };
}

export interface CampaignAccessResult extends AuthResult {
  campaign: {
    id: string;
    maxLevel: number;
    xpMultiplier: number;
    members: Array<{ userId: string; role: string }>;
  };
}

// Battle Utils
export interface AttackRollResult {
  d20Roll: number;
  advantageRoll?: number;
  totalAttackValue: number;
  isCritical: boolean;
  isCriticalFail: boolean;
}

export interface AttackResult {
  isHit: boolean;
  totalDamage: number;
  damageBreakdown: string;
  isCritical: boolean;
  isCriticalFail: boolean;
}

export interface StartOfTurnResult {
  effectsApplied: Array<{
    effectId: string;
    effectName: string;
  }>;
  dotDamage?: {
    total: number;
    breakdown: string;
  };
}

export { AttackType } from "@/lib/constants/battle";

export interface MoraleCheckResult {
  shouldSkipTurn: boolean;
  hasExtraTurn: boolean;
  message: string;
}

export interface DamageCalculationResult {
  totalDamage: number;
  breakdown: string;
  resistedDamage?: number;
  finalDamage: number;
}

export interface ResistanceResult {
  resistedAmount: number;
  finalDamage: number;
  breakdown: string;
}

export interface SpellCalculationResult {
  totalDamage?: number;
  totalHealing?: number;
  damageBreakdown?: string;
  healingBreakdown?: string;
}

export interface VictoryCheckResult {
  isVictory: boolean;
  winnerSide: "ally" | "enemy" | null;
  message: string;
}

// Battle Process
export interface ProcessAttackParams {
  attacker: unknown; // BattleParticipant
  target: unknown; // BattleParticipant
  attackData: {
    attackRoll: number;
    advantageRoll?: number;
    damageRolls: number[];
    attackId?: string;
  };
}

export interface ProcessAttackResult {
  isHit: boolean;
  totalDamage: number;
  damageBreakdown: string;
  isCritical: boolean;
  isCriticalFail: boolean;
  updatedAttacker: unknown; // BattleParticipant
  updatedTarget: unknown; // BattleParticipant
}

export interface BattleSpell {
  id: string;
  name: string;
  level: number;
  type: string;
  damageType: string;
  damageModifier: string | null;
  healModifier: string | null;
  diceCount: number | null;
  diceType: string | null;
  savingThrow: {
    ability: string;
    onSuccess: string;
  } | null;
  target: string | null;
  description: string;
}

export interface ProcessSpellParams {
  caster: unknown; // BattleParticipant
  spell: BattleSpell;
  targets: unknown[]; // BattleParticipant[]
  damageRolls: number[];
  savingThrows?: Array<{
    participantId: string;
    roll: number;
  }>;
  additionalRollResult?: number;
}

export interface ProcessSpellResult {
  totalDamage?: number;
  totalHealing?: number;
  damageBreakdown?: string;
  healingBreakdown?: string;
  updatedCaster: unknown; // BattleParticipant
  updatedTargets: unknown[]; // BattleParticipant[]
  appliedEffects: Array<{
    targetId: string;
    effectId: string;
    effectName: string;
    duration: number;
  }>;
}

// Spell Slots
export interface SpellSlots {
  [level: string]: {
    max: number;
    current: number;
  };
}
