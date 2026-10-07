import { AttackType } from "@/lib/constants/battle";
import type { RawTree } from "@/lib/utils/skills/progression";

export interface ProgressionSkillDto {
  name: string;
  icon: string | null;
  summary: string[];
  description: string;
  spellGroupId: string | null;
  newSpellId: string | null;
  damageAffinity: { affectsDamage: boolean; damageType: AttackType | "magic" | null };
}
export interface ProgressionBranchDto { name: string; color: string; icon: string | null; spellGroupId: string | null }
export interface CharacterProgressionDto {
  treeId: string | null;
  tree: RawTree | null;
  race: string;
  raceIcon: string | null;
  level: number;
  seenLevel: number | null;
  isOwner: boolean;
  isDM: boolean;
  unlocked: string[];
  skills: Record<string, ProgressionSkillDto>;
  branches: Record<string, ProgressionBranchDto>;
}
