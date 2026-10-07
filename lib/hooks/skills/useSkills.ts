import { useQuery } from "@tanstack/react-query";

import { skillKeys } from "./keys";

import {
  deleteAllSkills,
  deleteSkill,
  duplicateSkill,
  getSkill,
  getSkills,
  getSkillsByMainSkill,
  updateSkill,
} from "@/lib/api/skills";
import { useCrudMutation } from "@/lib/hooks/common";
import type { SkillUpdatePayload } from "@/types/api";
import type { PersonalSkillOption, Skill } from "@/types/skills";

export function useSkills(campaignId: string, initialData?: Skill[]) {
  return useQuery<Skill[]>({
    queryKey: skillKeys.list(campaignId),
    queryFn: () => getSkills(campaignId),
    initialData,
  });
}

export function usePersonalSkills(campaignId: string, mainSkillId: string | undefined) {
  return useQuery<PersonalSkillOption[]>({
    queryKey: skillKeys.byMainSkill(campaignId, mainSkillId ?? ""),
    queryFn: () => getSkillsByMainSkill(campaignId, mainSkillId as string),
    enabled: !!mainSkillId,
  });
}

export function useSkill(campaignId: string, skillId: string) {
  return useQuery({
    queryKey: skillKeys.detail(campaignId, skillId),
    queryFn: () => getSkill(campaignId, skillId),
    staleTime: 0,
  });
}

/** Видаляє окремий скіл */
export function useDeleteSkill(campaignId: string) {
  return useCrudMutation({
    mutationFn: (skillId: string) => deleteSkill(campaignId, skillId),
    invalidateKeys: [skillKeys.list(campaignId)],
  });
}

/** Дублює скіл (створює копію з новим id, назва + " (копія)") */
export function useDuplicateSkill(campaignId: string) {
  return useCrudMutation({
    mutationFn: (skillId: string) => duplicateSkill(campaignId, skillId),
    invalidateKeys: [skillKeys.list(campaignId)],
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
    invalidateKeys: [skillKeys.list(campaignId)],
  });
}

/** Видаляє всі скіли кампанії */
export function useDeleteAllSkills(campaignId: string) {
  return useCrudMutation({
    mutationFn: () => deleteAllSkills(campaignId),
    invalidateKeys: [skillKeys.list(campaignId)],
  });
}
