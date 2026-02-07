import type { SkillPayload, SkillUpdatePayload } from "@/types/api";
import type { Skill } from "@/types/skills";

export async function getSkill(
  campaignId: string,
  skillId: string
): Promise<Skill> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/skills/${skillId}`,
    { cache: "no-store" }
  );
  if (!response.ok) {
    if (response.status === 404) throw new Error("Skill not found");
    throw new Error("Failed to fetch skill");
  }
  return response.json();
}

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

export async function duplicateSkill(
  campaignId: string,
  skillId: string
): Promise<Skill> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/skills/${skillId}/duplicate`,
    { method: "POST" }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to duplicate skill");
  }

  return response.json();
}
