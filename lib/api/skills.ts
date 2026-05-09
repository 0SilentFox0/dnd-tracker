import {
  ApiError,
  campaignDelete,
  campaignPatch,
  campaignPost,
  createCampaignCrudApi,
} from "@/lib/api/client";
import type { SkillPayload, SkillUpdatePayload } from "@/types/api";
import type { Skill } from "@/types/skills";

const skillsApi = createCampaignCrudApi<
  Skill,
  SkillPayload,
  SkillUpdatePayload,
  void
>("/skills", { listCache: "no-store", getCache: "no-store" });

export const getSkills = skillsApi.list;
export const createSkill = skillsApi.create;
export const updateSkill = skillsApi.update;

export async function getSkill(
  campaignId: string,
  skillId: string,
): Promise<Skill> {
  try {
    return await skillsApi.get(campaignId, skillId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      throw new Error("Skill not found");
    }

    throw err;
  }
}

export async function deleteSkill(
  campaignId: string,
  skillId: string,
): Promise<void> {
  await campaignDelete<void>(campaignId, `/skills/${skillId}`);
}

export async function updateSkillAppearance(
  campaignId: string,
  skillId: string,
  appearanceDescription: string | null,
): Promise<Skill> {
  return campaignPatch<Skill>(campaignId, `/skills/${skillId}`, {
    appearanceDescription,
  });
}

export async function duplicateSkill(
  campaignId: string,
  skillId: string,
): Promise<Skill> {
  return campaignPost<Skill>(campaignId, `/skills/${skillId}/duplicate`, {});
}

export async function deleteAllSkills(
  campaignId: string,
): Promise<{ success?: boolean; deleted?: number }> {
  return campaignDelete<{ success?: boolean; deleted?: number }>(
    campaignId,
    "/skills",
  );
}
