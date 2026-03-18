/**
 * Утиліти для розрахунку урону з урахуванням всіх модифікаторів та breakdown
 */

import { measureTiming } from "../battle-timing";
import type { DamageCalculationResult } from "../types/damage-calculations";
import { calculateDamageWithModifiersImpl } from "./impl";

import { AttackType } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

export type {
  ComputeDamageBreakdownParams,
  DamageBreakdownMultiTargetResult,
  DamageBreakdownResult,
  DamageBreakdownTargetResult,
} from "../types/damage-breakdown";
export type { DamageCalculationResult } from "../types/damage-calculations";
export { calculateArtifactDamageBonus, calculatePassiveAbilityDamageBonus } from "./bonuses";
export {
  computeDamageBreakdown,
  computeDamageBreakdownMultiTarget,
} from "./breakdown";
export { applyResistance } from "./resist";
export {
  calculateSkillDamageFlatBonus,
  calculateSkillDamagePercentBonus,
  getSkillDamageFlatBreakdownEntries,
  getSkillDamagePercentBreakdownEntries,
} from "./skill";

export function calculateDamageWithModifiers(
  attacker: BattleParticipant,
  baseDamage: number,
  statModifier: number,
  attackType: AttackType,
  context?: {
    allParticipants?: BattleParticipant[];
    additionalDamage?: Array<{ type: string; value: number }>;
    heroLevelPart?: number;
    heroDicePart?: number;
    heroDiceNotation?: string;
    weaponDiceNotation?: string;
  },
): DamageCalculationResult {
  return measureTiming(
    "calculateDamageWithModifiers",
    () =>
      calculateDamageWithModifiersImpl(
        attacker,
        baseDamage,
        statModifier,
        attackType,
        context,
      ),
    { attackType },
  );
}
