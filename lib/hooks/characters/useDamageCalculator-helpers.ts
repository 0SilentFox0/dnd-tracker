/**
 * Допоміжні функції для useDamageCalculator: парсинг mainSkillId_level, розв'язка unlockedSkills → скіл
 */

/** Формат ID рівня основної навички: ${mainSkillId}_basic_level, _advanced_level, _expert_level */
export const MAIN_SKILL_LEVEL_RE = /_(basic|advanced|expert)_level$/;

export function parseMainSkillLevelId(
  id: string,
): { mainSkillId: string; level: string } | null {
  const match = id.match(MAIN_SKILL_LEVEL_RE);

  if (!match) return null;

  const level = match[1];

  const mainSkillId = id.slice(0, match.index);

  return mainSkillId ? { mainSkillId, level } : null;
}

/** Визначає рівень скіла за назвою (Напад — Експерт → expert) */
export function inferLevelFromSkillName(name: string): string | null {
  const n = (name ?? "").toLowerCase();

  if (n.includes("експерт") || n.includes("expert")) return "expert";

  if (n.includes("просунут") || n.includes("advanced")) return "advanced";

  if (n.includes("базов") || n.includes("основ") || n.includes("basic")) return "basic";

  return null;
}

export type SkillForResolve = {
  id: string;
  basicInfo?: { name?: string };
  name?: string;
  mainSkillData?: { mainSkillId?: string };
  combatStats?: unknown;
  bonuses?: Record<string, number>;
};

/** Розв'язує id з unlockedSkills (прямий id або mainSkillId_level) у скіл зі списку */
export function resolveUnlockedIdToSkill(
  unlockedId: string,
  skillsList: SkillForResolve[],
): SkillForResolve | undefined {
  const byId = skillsList.find((s) => s.id === unlockedId);

  if (byId) return byId;

  const parsed = parseMainSkillLevelId(unlockedId);

  if (!parsed) return undefined;

  const { mainSkillId, level } = parsed;

  return skillsList.find((s) => {
    const msId =
      (s.mainSkillData as { mainSkillId?: string } | undefined)?.mainSkillId ??
      (s as { mainSkillId?: string }).mainSkillId;

    if (msId !== mainSkillId) return false;

    const name =
      (s.basicInfo as { name?: string } | undefined)?.name ??
      (s as { name?: string }).name ??
      "";

    return inferLevelFromSkillName(name) === level;
  });
}
