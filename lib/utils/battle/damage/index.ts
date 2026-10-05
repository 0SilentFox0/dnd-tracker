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
export {
  computeDamageBreakdown,
  computeDamageBreakdownMultiTarget,
} from "./breakdown";
export { applyResistance } from "./resist";

export function calculateDamageWithModifiers(
  attacker: BattleParticipant,
  baseDamage: number,
  statModifier: number,
  attackType: AttackType,
  context?: Parameters<typeof calculateDamageWithModifiersImpl>[4],
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
