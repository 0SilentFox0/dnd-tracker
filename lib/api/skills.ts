import type { SkillPayload, SkillUpdatePayload } from "@/types/api";
import type { Skill } from "@/types/skills";

export async function getSkills(campaignId: string): Promise<Skill[]> {
  const response = await fetch(`/api/campaigns/${campaignId}/skills`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch skills");
  }

  return response.json();
}

export async function createSkill(
  campaignId: string,
  data: SkillPayload
): Promise<Skill> {
  const response = await fetch(`/api/campaigns/${campaignId}/skills`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to create skill");
  }

  return response.json();
}

export async function updateSkill(
  campaignId: string,
  skillId: string,
  data: SkillUpdatePayload
): Promise<Skill> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/skills/${skillId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to update skill");
  }

  return response.json();
}

export async function deleteSkill(
  campaignId: string,
  skillId: string
): Promise<void> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/skills/${skillId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Failed to delete skill");
  }
}
