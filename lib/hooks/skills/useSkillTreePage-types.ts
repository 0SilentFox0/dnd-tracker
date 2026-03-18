/**
 * Типи для useSkillTreePage
 */

import type { Race } from "@/types/races";
import type { SkillTree } from "@/types/skill-tree";

export interface UseSkillTreePageOptions {
  campaignId: string;
  skillTrees: (
    | SkillTree
    | {
        id: string;
        campaignId: string;
        race: string;
        skills: unknown;
        createdAt: Date;
      }
  )[];
  races?: Race[];
  defaultRace?: string;
}
