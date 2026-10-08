import type { AbilityScoreKey, LibraryUnit } from "./types";

export function proficiencyForTier(tier: number): number {
  if (tier <= 2) return 2;

  if (tier <= 4) return 3;

  if (tier <= 6) return 4;

  return 5;
}

export function abilityScores(unit: Pick<LibraryUnit, "tier" | "attackBonus" | "hp" | "attacks">): Record<AbilityScoreKey, number> {
  const main = Math.max(8, 10 + 2 * (unit.attackBonus - proficiencyForTier(unit.tier)));

  const ranged = unit.attacks[0]?.type === "ranged";

  return {
    strength: ranged ? 10 : main,
    dexterity: ranged ? main : 10,
    constitution: 10 + 2 * Math.min(5, Math.floor(unit.hp / 40)),
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  };
}
