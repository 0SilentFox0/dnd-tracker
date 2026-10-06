/**
 * API функції для роботи з деревом навиків
 */

import { campaignGet, campaignPatch } from "@/lib/api/client";
import type { RawTree } from "@/lib/utils/skills/progression";

export interface SkillTreeRow { id: string; campaignId: string; race: string; skills: unknown; createdAt: string }

export async function getSkillTrees(campaignId: string): Promise<SkillTreeRow[]> {
  return campaignGet<SkillTreeRow[]>(campaignId, "/skill-trees");
}

export async function updateSkillTree(params: { campaignId: string; treeId: string; race: string; skills: RawTree }): Promise<{ id: string; race: string; skills: RawTree }> {
  return campaignPatch(params.campaignId, `/skill-trees/${params.treeId}`, { race: params.race, skills: params.skills });
}
