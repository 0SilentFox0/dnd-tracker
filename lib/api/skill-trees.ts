/**
 * API функції для роботи з деревом навиків
 */

import type { SkillTree } from "@/lib/types/skill-tree";

export interface UpdateSkillTreeParams {
  campaignId: string;
  treeId: string;
  skills: SkillTree;
}

export interface UpdateSkillTreeResponse {
  id: string;
  campaignId: string;
  race: string;
  skills: SkillTree | { mainSkills?: SkillTree["mainSkills"] };
  createdAt: string;
}

/**
 * Оновлює дерево навиків
 */
export async function updateSkillTree({
  campaignId,
  treeId,
  skills,
}: UpdateSkillTreeParams): Promise<UpdateSkillTreeResponse> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/skill-trees/${treeId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        skills,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update skill tree");
  }

  return response.json();
}
