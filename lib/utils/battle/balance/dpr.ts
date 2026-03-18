/**
 * DPR (Damage per Round) від скілів: магія та немагічні основні навички
 */

import {
  DPR_BY_LEVEL_MAGIC,
  DPR_BY_LEVEL_NON_MAGIC,
  MAGIC_MAIN_SKILL_IDS,
} from "@/lib/constants/dpr-by-main-skill";
import { SkillLevel } from "@/lib/types/skill-tree";

export { MAGIC_MAIN_SKILL_IDS, type MagicMainSkillId } from "@/lib/constants/dpr-by-main-skill";

type SkillTreeProgress = Record<
  string,
  { level?: string; unlockedSkills?: string[] }
>;

/** Мапа skillTreeId → id основних навичок у цьому дереві */
export type TreeIdToMainSkillIds = Record<string, string[]>;

function normalizeSkillLevel(
  level: string | number | undefined,
): SkillLevel {
  if (level === SkillLevel.EXPERT || level === "expert" || level === 3 || level === "3")
    return SkillLevel.EXPERT;

  if (level === SkillLevel.ADVANCED || level === "advanced" || level === 2 || level === "2")
    return SkillLevel.ADVANCED;

  return SkillLevel.BASIC;
}

function hasMagicSchoolInUnlockedSkills(
  unlockedSkills: string[] | undefined,
): boolean {
  if (!unlockedSkills?.length) return false;

  const lower = unlockedSkills.join(" ").toLowerCase();

  return MAGIC_MAIN_SKILL_IDS.some((id) => lower.includes(id));
}

function isMagicMainSkill(
  id: string,
  magicMainSkillIds?: Set<string> | null,
): boolean {
  return (
    (MAGIC_MAIN_SKILL_IDS as readonly string[]).includes(id) ||
    (magicMainSkillIds?.has(id) ?? false)
  );
}

export function getSpellDprFromProgress(
  skillTreeProgress: SkillTreeProgress | null | undefined,
  treeIdToMainSkillIds?: TreeIdToMainSkillIds | null,
  magicMainSkillIds?: Set<string> | null,
): number {
  if (!skillTreeProgress || typeof skillTreeProgress !== "object") return 0;

  let bestDpr = 0;

  for (const [key, progress] of Object.entries(skillTreeProgress)) {
    const hasProgress = progress?.unlockedSkills?.length || progress?.level;

    if (!hasProgress) continue;

    const level = normalizeSkillLevel(progress.level as string | number | undefined);

    const dpr = DPR_BY_LEVEL_MAGIC[level] ?? DPR_BY_LEVEL_MAGIC[SkillLevel.BASIC];

    if (dpr <= bestDpr) continue;

    const isMagicByMainSkillId = isMagicMainSkill(key, magicMainSkillIds);

    const mainSkillIdsInTree = treeIdToMainSkillIds?.[key];

    const treeHasMagic =
      mainSkillIdsInTree?.some((id) => isMagicMainSkill(id, magicMainSkillIds)) ?? false;

    const inferredMagicFromSkills =
      !isMagicByMainSkillId && !treeHasMagic && mainSkillIdsInTree === undefined
        ? hasMagicSchoolInUnlockedSkills(progress?.unlockedSkills)
        : false;

    if (isMagicByMainSkillId || treeHasMagic || inferredMagicFromSkills)
      bestDpr = dpr;
  }

  return bestDpr;
}

export function getNonMagicMainSkillDprFromProgress(
  skillTreeProgress: SkillTreeProgress | null | undefined,
  treeIdToMainSkillIds?: TreeIdToMainSkillIds | null,
  magicMainSkillIds?: Set<string> | null,
): number {
  if (!skillTreeProgress || typeof skillTreeProgress !== "object") return 0;

  let total = 0;

  for (const [key, progress] of Object.entries(skillTreeProgress)) {
    const hasProgress = progress?.unlockedSkills?.length || progress?.level;

    if (!hasProgress) continue;

    const isMagicByMainSkillId = isMagicMainSkill(key, magicMainSkillIds);

    const mainSkillIdsInTree = treeIdToMainSkillIds?.[key];

    const treeHasMagic =
      mainSkillIdsInTree?.some((id) =>
        isMagicMainSkill(id, magicMainSkillIds),
      ) ?? false;

    if (!Array.isArray(mainSkillIdsInTree) || mainSkillIdsInTree.length === 0)
      continue;

    if (isMagicByMainSkillId || treeHasMagic) continue;

    const level = normalizeSkillLevel(progress.level as string | number | undefined);

    const dpr =
      DPR_BY_LEVEL_NON_MAGIC[level] ?? DPR_BY_LEVEL_NON_MAGIC[SkillLevel.BASIC];

    total += dpr;
  }

  return total;
}
