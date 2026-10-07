/**
 * Утиліти для розрахунку урону з урахуванням всіх модифікаторів та breakdown
 */

import type { DamageCalculationResult } from "../types/damage-calculations";
import { calculateDamageWithModifiersImpl } from "./impl";

import { AttackType } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

export type {
  ComputeDamageBreakdownParams,
  DamageBreakdownResult,
} from "../types/damage-breakdown";
export type { DamageCalculationResult } from "../types/damage-calculations";
export { computeDamageBreakdown } from "./breakdown";

export function calculateDamageWithModifiers(
  attacker: BattleParticipant,
  baseDamage: number,
  statModifier: number,
  attackType: AttackType,
  context?: Parameters<typeof calculateDamageWithModifiersImpl>[4],
): DamageCalculationResult {
  return calculateDamageWithModifiersImpl(
    attacker,
    baseDamage,
    statModifier,
    attackType,
    context,
  );
}
