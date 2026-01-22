/**
 * API функції для роботи з деревом навиків
 */

import type { SkillTree } from "@/types/skill-tree";
import type { UpdateSkillTreeParams, UpdateSkillTreeResponse } from "@/types/api";

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
