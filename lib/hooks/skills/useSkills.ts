import { useQuery } from "@tanstack/react-query";

import {
  deleteAllSkills,
  deleteSkill,
  duplicateSkill,
  getSkills,
  updateSkill,
} from "@/lib/api/skills";
import { useCrudMutation } from "@/lib/hooks/common";
import type { SkillUpdatePayload } from "@/types/api";
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
    queryFn: () => getSkills(campaignId),
    initialData,
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
