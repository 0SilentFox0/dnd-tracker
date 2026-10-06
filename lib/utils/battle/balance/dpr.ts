/**
 * DPR (Damage per Round) від скілів: магія та немагічні основні навички
 */

import { DPR_BY_LEVEL_MAGIC, DPR_BY_LEVEL_NON_MAGIC } from "@/lib/constants/dpr-by-main-skill";
import { isMagicMainSkill } from "@/lib/utils/battle/balance/magic-school";
import type { BranchLevel } from "@/lib/utils/skills/progression";

export { MAGIC_MAIN_SKILL_IDS, type MagicMainSkillId } from "@/lib/constants/dpr-by-main-skill";

const isMagic = (id: string, magicMainSkillIds?: Set<string> | null) => isMagicMainSkill({ id }) || (magicMainSkillIds?.has(id) ?? false);

export function getSpellDprFromBranchLevels(levels: Record<string, BranchLevel>, magicMainSkillIds?: Set<string> | null): number {
  return Object.entries(levels).reduce((best, [id, level]) => (isMagic(id, magicMainSkillIds) ? Math.max(best, DPR_BY_LEVEL_MAGIC[level] ?? 0) : best), 0);
}

export function getNonMagicBranchDpr(levels: Record<string, BranchLevel>, magicMainSkillIds?: Set<string> | null): number {
  return Object.entries(levels).reduce((sum, [id, level]) => (isMagic(id, magicMainSkillIds) ? sum : sum + (DPR_BY_LEVEL_NON_MAGIC[level] ?? 0)), 0);
}
