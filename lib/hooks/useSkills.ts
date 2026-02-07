import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteSkill, duplicateSkill } from "@/lib/api/skills";
import type { Skill } from "@/types/skills";

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

/**
 * Видаляє окремий скіл
 */
export function useDeleteSkill(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skillId: string) => deleteSkill(campaignId, skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["skills", campaignId],
      });
    },
  });
}

/**
 * Дублює скіл (створює копію з новим id, назва + " (копія)")
 */
export function useDuplicateSkill(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skillId: string) => duplicateSkill(campaignId, skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["skills", campaignId],
      });
    },
  });
}

/**
 * Видаляє всі скіли кампанії
 */
export function useDeleteAllSkills(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/campaigns/${campaignId}/skills`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Помилка при видаленні скілів");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["skills", campaignId],
      });
    },
  });
}
