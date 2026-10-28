import { type AbilityKey, isAbilityKey, SPELLCASTING_ABILITIES, type SpellcastingAbility } from "@/lib/constants/abilities";
import { proficiencyForChallenge, xpForChallenge } from "@/lib/constants/challenge";
import { resolveAbilities } from "@/lib/utils/abilities/build/resolve";
import { getAbilityModifier, getProficiencyBonus } from "@/lib/utils/common/calculations";
import type { ResolvedAbility } from "@/types/abilities";

export function isMonster5e<T extends { cr?: number | null }>(u: T): u is T & { cr: number } {
  return u.cr !== null && u.cr !== undefined;
}

export function unitXp(u: { cr?: number | null; xp?: number | null }): number | null {
  if (u.xp !== null && u.xp !== undefined) return u.xp;

  return isMonster5e(u) ? xpForChallenge(u.cr) : null;
}

export function bestMentalAbility(scores: Record<SpellcastingAbility, number>): SpellcastingAbility {
  return SPELLCASTING_ABILITIES.reduce<SpellcastingAbility>((best, k) => (scores[k] > scores[best] ? k : best), "intelligence");
}

export function monsterSaveDc(saveDcBase: number, proficiencyBonus: number, scores: Record<SpellcastingAbility, number>): number {
  return saveDcBase + proficiencyBonus + getAbilityModifier(scores[bestMentalAbility(scores)]);
}

export function readSaveProficiencies(raw: unknown): AbilityKey[] {
  return Array.isArray(raw) ? raw.filter(isAbilityKey) : [];
}

export function multiattackAbilities(unit: { id: string; name: string; multiattack?: number | null }): ResolvedAbility[] {
  const extra = (unit.multiattack ?? 1) - 1;

  if (extra < 1) return [];

  return resolveAbilities({ type: "unit", id: unit.id, name: unit.name }, [
    { id: "multiattack", name: `Мультиатака ×${extra + 1}`, trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attacksPerAction", flat: extra }] },
  ]);
}

export function resolveUnitProficiency(u: { proficiencyBonus?: number | null; cr?: number | null; level: number }): number {
  if (u.proficiencyBonus) return u.proficiencyBonus;

  if (isMonster5e(u)) return proficiencyForChallenge(u.cr);

  return u.proficiencyBonus === 0 ? getProficiencyBonus(u.level) : 2;
}
