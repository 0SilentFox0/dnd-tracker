/**
 * Типи для розрахунку урону
 */

export interface DamageCalculationResult {
  baseDamage: number;
  skillPercentBonus: number;
  skillFlatBonus: number;
  artifactPercentBonus: number;
  artifactFlatBonus: number;
  passiveAbilityBonus: number;
  additionalDamage: Array<{ type: string; value: number }>;
  totalDamage: number;
  breakdown: string[];
}
