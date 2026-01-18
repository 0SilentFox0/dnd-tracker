import type { Skill } from "@/lib/types/skills";

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
  data: {
    name: string;
    description?: string;
    icon?: string;
    races: string[];
    isRacial: boolean;
    bonuses: Record<string, number>;
    damage?: number;
    armor?: number;
    speed?: number;
    physicalResistance?: number;
    magicalResistance?: number;
    spellId?: string;
    spellGroupId?: string;
  }
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
  data: {
    name?: string;
    description?: string;
    icon?: string | null;
    races?: string[];
    isRacial?: boolean;
    bonuses?: Record<string, number>;
    damage?: number | null;
    armor?: number | null;
    speed?: number | null;
    physicalResistance?: number | null;
    magicalResistance?: number | null;
    spellId?: string | null;
    spellGroupId?: string | null;
    mainSkillId?: string | null;
  }
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
