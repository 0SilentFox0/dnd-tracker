/**
 * Коефіцієнти melee/ranged DM для героїв (збіг з damage-preview API).
 */

import { AttackType } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

export function clampHeroDamageMultiplier(raw: number | undefined | null): number {
  const x = raw ?? 1;

  if (!Number.isFinite(x)) return 1;

  return Math.max(0.1, Math.min(3, x));
}

/**
 * Після модифікаторів скілів/артефактів; перед дробленням по цілях / опором.
 */
export function applyHeroDmDamageMultiplier(
  attacker: BattleParticipant,
  attackType: AttackType,
  physicalDamage: number,
): { damage: number; breakdownLine: string | null } {
  if (attacker.basicInfo.sourceType !== "character") {
    return { damage: physicalDamage, breakdownLine: null };
  }

  const mult =
    attackType === AttackType.MELEE
      ? clampHeroDamageMultiplier(attacker.abilities.meleeMultiplier)
      : clampHeroDamageMultiplier(attacker.abilities.rangedMultiplier);

  if (mult === 1) {
    return { damage: physicalDamage, breakdownLine: null };
  }

  const damage = Math.floor(physicalDamage * mult);

  return {
    damage,
    breakdownLine: `× ${mult} (коеф. DM) = ${damage}`,
  };
}
