/**
 * API функції для роботи з деревом навиків
 */

import { campaignGet, campaignPatch } from "@/lib/api/client";
import type {
  UpdateSkillTreeParams,
  UpdateSkillTreeResponse,
} from "@/types/api";

export interface SkillTree {
  id: string;
  campaignId: string;
  [key: string]: unknown;
}

export async function getSkillTrees(
  campaignId: string,
): Promise<SkillTree[]> {
  return campaignGet<SkillTree[]>(campaignId, "/skill-trees");
}

/**
 * Оновлює дерево навиків
 */
export async function updateSkillTree({
  campaignId,
  treeId,
  skills,
}: UpdateSkillTreeParams): Promise<UpdateSkillTreeResponse> {
  return campaignPatch<UpdateSkillTreeResponse>(
    campaignId,
    `/skill-trees/${treeId}`,
    { skills },
  );
}
