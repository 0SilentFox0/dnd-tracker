import { useQuery } from "@tanstack/react-query";

import {
  deleteAllSkills,
  deleteSkill,
  duplicateSkill,
  getSkill,
  getSkills,
  updateSkill,
} from "@/lib/api/skills";
import { useCrudMutation } from "@/lib/hooks/common";
import type { SkillUpdatePayload } from "@/types/api";
import type { Skill } from "@/types/skills";

export function useSkills(campaignId: string, initialData?: Skill[]) {
  return useQuery<Skill[]>({
    queryKey: ["skills", campaignId],
    queryFn: () => getSkills(campaignId),
    initialData,
  });
}

export function useSkill(campaignId: string, skillId: string) {
  return useQuery({
    queryKey: ["skill", campaignId, skillId],
    queryFn: () => getSkill(campaignId, skillId),
    staleTime: 0,
  });
}

/** Видаляє окремий скіл */
export function useDeleteSkill(campaignId: string) {
  return useCrudMutation({
    mutationFn: (skillId: string) => deleteSkill(campaignId, skillId),
    invalidateKeys: [["skills", campaignId]],
  });
}

/** Дублює скіл (створює копію з новим id, назва + " (копія)") */
export function useDuplicateSkill(campaignId: string) {
  return useCrudMutation({
    mutationFn: (skillId: string) => duplicateSkill(campaignId, skillId),
    invalidateKeys: [["skills", campaignId]],
  });
}

/** Оновлює скіл (частковий PATCH) */
export function useUpdateSkill(campaignId: string) {
  return useCrudMutation({
    mutationFn: ({
      skillId,
      data,
    }: {
      skillId: string;
      data: SkillUpdatePayload;
    }) => updateSkill(campaignId, skillId, data),
    invalidateKeys: [["skills", campaignId]],
  });
}

/** Видаляє всі скіли кампанії */
export function useDeleteAllSkills(campaignId: string) {
  return useCrudMutation({
    mutationFn: () => deleteAllSkills(campaignId),
    invalidateKeys: [["skills", campaignId]],
  });
}
