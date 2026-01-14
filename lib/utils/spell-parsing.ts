import {
  SpellType,
  SpellDamageType,
  SpellSavingThrowAbility,
  SpellSavingThrowOnSuccess,
} from "@/lib/constants/spell-abilities";

/**
 * Ключові слова для визначення типу заклинання (AOE)
 */
const AOE_KEYWORDS = [
  "aoe",
  "area",
  "all",
  "circle",
  "line",
  "wall",
  "cone",
  "sphere",
  "cube",
];

/**
 * Ключові слова для визначення типу урону (лікування)
 */
const HEAL_KEYWORDS = [
  "heal",
  "healing",
  "cure",
  "restore",
  "regeneration",
  "resurrection",
  "revive",
  "revival",
];

/**
 * Мапінг характеристик для збереження
 */
const ABILITY_KEYWORDS: Record<SpellSavingThrowAbility, string[]> = {
  [SpellSavingThrowAbility.STRENGTH]: ["strength", "str"],
  [SpellSavingThrowAbility.DEXTERITY]: ["dexterity", "dex"],
  [SpellSavingThrowAbility.CONSTITUTION]: ["constitution", "con"],
  [SpellSavingThrowAbility.INTELLIGENCE]: ["intelligence", "int"],
  [SpellSavingThrowAbility.WISDOM]: ["wisdom", "wis"],
  [SpellSavingThrowAbility.CHARISMA]: ["charisma", "cha"],
};

/**
 * Визначає тип заклинання на основі опису ефекту
 */
export function determineSpellType(effect: string): SpellType {
  const lowerEffect = effect.toLowerCase();
  const isAOE = AOE_KEYWORDS.some((keyword) => lowerEffect.includes(keyword));
  return isAOE ? SpellType.AOE : SpellType.TARGET;
}

/**
 * Визначає тип урону на основі опису ефекту
 */
export function determineSpellDamageType(effect: string): SpellDamageType {
  const lowerEffect = effect.toLowerCase();
  const isHeal = HEAL_KEYWORDS.some((keyword) => lowerEffect.includes(keyword));
  return isHeal ? SpellDamageType.HEAL : SpellDamageType.DAMAGE;
}

/**
 * Витягує кубики урону з опису ефекту
 */
export function extractDamageDice(effect: string): string | undefined {
  const damageDiceMatch = effect.match(/(\d+d\d+[\s\+]*[\w]*)/i);
  return damageDiceMatch ? damageDiceMatch[1].trim() : undefined;
}

/**
 * Визначає характеристику збереження на основі опису ефекту
 */
export function determineSavingThrowAbility(
  effect: string
): SpellSavingThrowAbility | undefined {
  const lowerEffect = effect.toLowerCase();

  for (const [ability, keywords] of Object.entries(ABILITY_KEYWORDS)) {
    if (keywords.some((keyword) => lowerEffect.includes(keyword))) {
      return ability as SpellSavingThrowAbility;
    }
  }

  return undefined;
}

/**
 * Визначає результат збереження на основі опису ефекту
 */
export function determineSavingThrowOnSuccess(
  effect: string
): SpellSavingThrowOnSuccess {
  const lowerEffect = effect.toLowerCase();
  const hasHalf = lowerEffect.includes("half") || lowerEffect.includes("/2");
  return hasHalf ? SpellSavingThrowOnSuccess.HALF : SpellSavingThrowOnSuccess.NONE;
}

/**
 * Визначає чи заклинання потребує концентрації
 */
export function determineConcentration(effect: string): boolean {
  const lowerEffect = effect.toLowerCase();
  const concentrationKeywords = ["conc.", "concentration", "concentrate"];
  return concentrationKeywords.some((keyword) => lowerEffect.includes(keyword));
}

/**
 * Конвертує назву школи з CSV формату в стандартну назву
 */
export function normalizeSchoolName(schoolName: string): string {
  const normalized = schoolName.trim();
  const schoolMap: Record<string, string> = {
    Dark: "Necromancy",
    Destr: "Evocation",
    Summ: "Conjuration",
    Light: "Abjuration",
  };
  return schoolMap[normalized] || normalized;
}
