import {
  SpellDamageType,
  SpellSavingThrowAbility,
  SpellSavingThrowOnSuccess,
  SpellType,
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
 * Визначає тип шкоди на основі опису ефекту
 */
export function determineSpellDamageType(effect: string): SpellDamageType {
  const lowerEffect = effect.toLowerCase();

  const isHeal = HEAL_KEYWORDS.some((keyword) => lowerEffect.includes(keyword));

  return isHeal ? SpellDamageType.HEAL : SpellDamageType.DAMAGE;
}

/**
 * Витягує кубики шкоди з опису ефекту (старий формат, для backward compatibility)
 */
export function extractDamageDice(effect: string): string | undefined {
  const damageDiceMatch = effect.match(/(\d+d\d+[\s\+]*[\w]*)/i);

  return damageDiceMatch ? damageDiceMatch[1].trim() : undefined;
}

/**
 * Парсить рядок кубиків (наприклад "2d6" або "1d8") на diceCount та diceType
 */
export function parseDiceString(diceString: string | undefined): { diceCount: number | null; diceType: string | null } {
  if (!diceString) {
    return { diceCount: null, diceType: null };
  }
  
  const match = diceString.match(/(\d+)d(\d+)/i);

  if (!match) {
    return { diceCount: null, diceType: null };
  }
  
  const count = parseInt(match[1], 10);

  const type = `d${match[2]}`;
  
  // Перевіряємо чи тип кубика валідний
  const validTypes = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"];

  if (!validTypes.includes(type)) {
    return { diceCount: null, diceType: null };
  }
  
  return { 
    diceCount: isNaN(count) || count < 0 || count > 10 ? null : count,
    diceType: type 
  };
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
