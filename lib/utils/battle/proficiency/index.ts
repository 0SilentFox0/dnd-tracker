import type { AbilityKey } from "@/lib/constants/abilities";
import { textRef } from "@/lib/i18n/text-ref";
import { hasShield, wornArmorCategory } from "@/lib/utils/artifacts/worn-armor";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

export const ARMOR_PENALTY_LABEL = textRef("battleLog.rollMode.armorPenalty");

export type ArmorProficiency = { light: boolean; medium: boolean; heavy: boolean; shield: boolean };

export type WeaponProficiency = { simple: boolean; martial: boolean; martialTraits: string[] };

const has = (lines: readonly string[], word: string) => lines.some((l) => new RegExp(`\\b${word}\\b`, "i").test(l));

export function parseArmorProficiency(lines: readonly string[]): ArmorProficiency {
  return { light: has(lines, "light"), medium: has(lines, "medium"), heavy: has(lines, "heavy"), shield: has(lines, "shields?") };
}

/** "Martial weapons that have the Finesse or Light property" — мартіал лише з цими властивостями. */
export function parseWeaponProficiency(lines: readonly string[]): WeaponProficiency {
  const martialLines = lines.filter((l) => /\bmartial\b/i.test(l));

  const restricted = martialLines.filter((l) => /\bproperty\b/i.test(l));

  const full = martialLines.some((l) => !/\bproperty\b/i.test(l));

  const martialTraits = restricted.flatMap((l) => (["finesse", "light"] as const).filter((t) => new RegExp(`\\b${t}\\b`, "i").test(l)));

  return { simple: has(lines, "simple"), martial: full, martialTraits };
}

const listed = (p: BattleParticipant) => p.abilities.proficiencies;

export function isArmorProficient(p: BattleParticipant): boolean {
  const prof = listed(p);

  if (!prof) return true;

  const known = parseArmorProficiency(prof.armor);

  const worn = wornArmorCategory(p);

  return worn === "none" || known[worn];
}

export function isShieldProficient(p: BattleParticipant): boolean {
  const prof = listed(p);

  return !prof || parseArmorProficiency(prof.armor).shield;
}

/** Броня або щит без володіння: перешкода на Сил/Спр, без заклинань. */
export function armorPenalty(p: BattleParticipant): boolean {
  const prof = listed(p);

  if (!prof) return false;

  return !isArmorProficient(p) || (hasShield(p) && !isShieldProficient(p));
}

export function armorPenaltyAffects(ability: AbilityKey): boolean {
  return ability === "strength" || ability === "dexterity";
}

export function isWeaponProficient(p: BattleParticipant, attack: Pick<BattleAttack, "weaponCategory" | "traits">): boolean {
  const prof = listed(p);

  if (!prof || !attack.weaponCategory) return true;

  const known = parseWeaponProficiency(prof.weapons);

  if (attack.weaponCategory === "simple") return known.simple;

  return known.martial || known.martialTraits.some((t) => (attack.traits as readonly string[] | undefined)?.includes(t));
}
