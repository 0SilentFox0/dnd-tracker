/**
 * Парсинг ID скілів та рівнів (mainSkillId_expert_level)
 */

/** Регулярка для формату ID рівня: ${mainSkillId}_basic_level, _advanced_level, _expert_level */
const MAIN_SKILL_LEVEL_RE = /_(basic|advanced|expert)_level$/;

/** Парсить level ID у mainSkillId та level. Експорт для start/add-participant route. */
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
export function inferLevelFromSkillName(name: string | null): string | null {
  const n = (name ?? "").toLowerCase();

  if (n.includes("експерт") || n.includes("expert")) return "expert";

  if (n.includes("просунут") || n.includes("advanced")) return "advanced";

  if (n.includes("базов") || n.includes("основ") || n.includes("basic"))
    return "basic";

  return null;
}
