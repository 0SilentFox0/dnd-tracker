import { DPR_BY_LEVEL_MAGIC, DPR_BY_LEVEL_NON_MAGIC } from "@/lib/constants/dpr-by-main-skill";
import type { BranchLevel } from "@/lib/utils/skills/progression";

const isMagic = (id: string, magicMainSkillIds: Set<string>) => magicMainSkillIds.has(id);

export function getSpellDprFromBranchLevels(levels: Record<string, BranchLevel>, magicMainSkillIds: Set<string>): number {
  return Object.entries(levels).reduce((best, [id, level]) => (isMagic(id, magicMainSkillIds) ? Math.max(best, DPR_BY_LEVEL_MAGIC[level] ?? 0) : best), 0);
}

export function getNonMagicBranchDpr(levels: Record<string, BranchLevel>, magicMainSkillIds: Set<string>): number {
  return Object.entries(levels).reduce((sum, [id, level]) => (isMagic(id, magicMainSkillIds) ? sum : sum + (DPR_BY_LEVEL_NON_MAGIC[level] ?? 0)), 0);
}
