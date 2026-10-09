import { AttackType, ParticipantSourceType } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

export function clampHeroDamageMultiplier(raw: number | undefined | null): number {
  const x = raw ?? 1;

  if (!Number.isFinite(x)) return 1;

  return Math.max(0.1, Math.min(3, x));
}

export function archetypeLabel(p: BattleParticipant): string {
  return p.abilities.archetypeName ? `архетип: ${p.abilities.archetypeName}` : "архетип";
}

export function heroMagicMultiplier(p: BattleParticipant): number {
  if (p.basicInfo.sourceType !== ParticipantSourceType.CHARACTER) return 1;

  return clampHeroDamageMultiplier(p.abilities.magicMultiplier);
}

/**
 * Після модифікаторів скілів/артефактів; перед дробленням по цілях / опором.
 */
export function applyHeroDmDamageMultiplier(
  attacker: BattleParticipant,
  attackType: AttackType,
  physicalDamage: number,
): { damage: number; breakdownLine: string | null; multiplier: number } {
  if (attacker.basicInfo.sourceType !== ParticipantSourceType.CHARACTER) {
    return { damage: physicalDamage, breakdownLine: null, multiplier: 1 };
  }

  const mult =
    attackType === AttackType.MELEE
      ? clampHeroDamageMultiplier(attacker.abilities.meleeMultiplier)
      : clampHeroDamageMultiplier(attacker.abilities.rangedMultiplier);

  if (mult === 1) {
    return { damage: physicalDamage, breakdownLine: null, multiplier: 1 };
  }

  const damage = Math.floor(physicalDamage * mult);

  return {
    damage,
    breakdownLine: `× ${mult} (${archetypeLabel(attacker)}) = ${damage}`,
    multiplier: mult,
  };
}
