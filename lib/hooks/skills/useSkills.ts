import { useQuery } from "@tanstack/react-query";

import { skillKeys } from "./keys";

import {
  createSkill,
  deleteAllSkills,
  deleteSkill,
  duplicateSkill,
  getSkill,
  getSkills,
  getSkillsByMainSkill,
  updateSkill,
} from "@/lib/api/skills";
import { useCrudMutation } from "@/lib/hooks/common";
import type { SkillPayload, SkillUpdatePayload } from "@/types/api";
import type { PersonalSkillOption, Skill } from "@/types/skills";

export function useSkills(campaignId: string, options: { initialData?: Skill[] } = {}) {
  return useQuery<Skill[]>({
    queryKey: skillKeys.list(campaignId),
    queryFn: () => getSkills(campaignId),
    initialData: options.initialData,
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

export function useCreateSkill(campaignId: string) {
  return useCrudMutation({
    mutationFn: (data: SkillPayload) => createSkill(campaignId, data),
    invalidateKeys: [skillKeys.list(campaignId)],
  });
}

export function useDeleteSkill(campaignId: string) {
  return useCrudMutation({
    mutationFn: (skillId: string) => deleteSkill(campaignId, skillId),
    invalidateKeys: [skillKeys.list(campaignId)],
  });
}

/** Копія з новим id, назва + " (копія)" */
export function useDuplicateSkill(campaignId: string) {
  return useCrudMutation({
    mutationFn: (skillId: string) => duplicateSkill(campaignId, skillId),
    invalidateKeys: [skillKeys.list(campaignId)],
    errorText: "Не вдалося дублювати скіл. Спробуйте ще раз.",
  });
}

export function useUpdateSkill(campaignId: string) {
  return useCrudMutation({
    mutationFn: ({ skillId, data }: { skillId: string; data: SkillUpdatePayload }) => updateSkill(campaignId, skillId, data),
    invalidateKeys: (_data, { skillId }) => [skillKeys.list(campaignId), skillKeys.detail(campaignId, skillId)],
  });
}

export function useDeleteAllSkills(campaignId: string) {
  return useCrudMutation({
    mutationFn: () => deleteAllSkills(campaignId),
    invalidateKeys: [skillKeys.list(campaignId)],
  });
}
