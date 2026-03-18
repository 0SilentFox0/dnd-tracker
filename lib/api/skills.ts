import {
  ApiError,
  campaignDelete,
  campaignGet,
  campaignPatch,
  campaignPost,
} from "@/lib/api/client";
import type { SkillPayload, SkillUpdatePayload } from "@/types/api";
import type { Skill } from "@/types/skills";

export async function updateSkillAppearance(
  campaignId: string,
  skillId: string,
  appearanceDescription: string | null,
): Promise<Skill> {
  return campaignPatch<Skill>(campaignId, `/skills/${skillId}`, {
    appearanceDescription,
  });
}

export async function getSkill(
  campaignId: string,
  skillId: string,
): Promise<Skill> {
  try {
    return await campaignGet<Skill>(campaignId, `/skills/${skillId}`, {
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      throw new Error("Skill not found");
    }

    throw err;
  }
}

export async function getSkills(campaignId: string): Promise<Skill[]> {
  return campaignGet<Skill[]>(campaignId, "/skills", {
    cache: "no-store",
  });
}

export async function createSkill(
  campaignId: string,
  data: SkillPayload,
): Promise<Skill> {
  return campaignPost<Skill>(campaignId, "/skills", data);
}

export async function updateSkill(
  campaignId: string,
  skillId: string,
  data: SkillUpdatePayload,
): Promise<Skill> {
  return campaignPatch<Skill>(campaignId, `/skills/${skillId}`, data);
}

export async function deleteSkill(
  campaignId: string,
  skillId: string,
): Promise<void> {
  await campaignDelete<void>(campaignId, `/skills/${skillId}`);
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
