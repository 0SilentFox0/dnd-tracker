/**
 * Канонічний список базових навиків (MainSkill).
 * Усі посилання на категорію/навик мають зводитись до цих назв.
 */

/** Код категорії (англ.) → назва базового навику в UI та БД */
export const MAIN_SKILL_BY_CATEGORY: Record<string, string> = {
  Attack: "Напад",
  Ranged: "Стрільба",
  Defense: "Захист",
  MagicLight: "Магія Світла",
  MagicDark: "Магія Темряви",
  MagicChaos: "Магія Хаосу",
  MagicSummon: "Магія Призиву",
  Leadership: "Лідерство",
  Race: "Раса",
  Ultimate: "Ультимат",
  Personal: "Персональні",
};

/** Аліаси (різні написання) → канонічна назва базового навику */
export const MAIN_SKILL_ALIASES: Record<string, string> = {
  "Темна Магія": "Магія Темряви",
  "Темна магія": "Магія Темряви",
  "Темрява": "Магія Темряви",
  "Світло": "Магія Світла",
  "Хаос": "Магія Хаосу",
  "Призив": "Магія Призиву",
};

/** Усі канонічні назви базових навиків (для валідації) */
export const MAIN_SKILL_NAMES = new Set([
  ...Object.values(MAIN_SKILL_BY_CATEGORY),
]);

/**
 * Повертає канонічну назву базового навику за кодом категорії або аліасом.
 */
export function getCanonicalMainSkillName(
  categoryOrAlias: string,
  mainSkillFromSkill?: string
): string {
  if (mainSkillFromSkill?.trim()) {
    const alias = MAIN_SKILL_ALIASES[mainSkillFromSkill.trim()];

    if (alias) return alias;

    if (MAIN_SKILL_NAMES.has(mainSkillFromSkill.trim()))
      return mainSkillFromSkill.trim();
  }

  const byCategory = MAIN_SKILL_BY_CATEGORY[categoryOrAlias];

  if (byCategory) return byCategory;

  const byAlias = MAIN_SKILL_ALIASES[categoryOrAlias];

  if (byAlias) return byAlias;

  return categoryOrAlias;
}

/** Усі варіанти назв для канонічної назви (сама назва + аліаси, що на неї вказують) */
export function getMainSkillNameVariants(canonicalName: string): string[] {
  const aliases = Object.entries(MAIN_SKILL_ALIASES)
    .filter(([, v]) => v === canonicalName)
    .map(([k]) => k);

  return [canonicalName, ...aliases];
}
