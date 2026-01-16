import { useQuery } from "@tanstack/react-query";
import type { Skill } from "@/lib/types/skills";

export interface SkillFromLibrary {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  races?: string[];
  isRacial?: boolean;
  bonuses?: Record<string, number>;
  damage?: number;
  armor?: number;
  speed?: number;
  physicalResistance?: number;
  magicalResistance?: number;
  spellId?: string;
  spellGroupId?: string;
  spellGroupName?: string;
}

export function useSkills(campaignId: string, initialData?: Skill[]) {
  return useQuery<Skill[]>({
    queryKey: ["skills", campaignId],
    queryFn: async () => {
      const response = await fetch(`/api/campaigns/${campaignId}/skills`);
      if (!response.ok) {
        throw new Error("Failed to fetch skills");
      }
      return response.json();
    },
    initialData,
  });
}
