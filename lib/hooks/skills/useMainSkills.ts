import { useQuery } from "@tanstack/react-query";

import { skillKeys } from "./keys";

import {
  createMainSkill,
  deleteMainSkill,
  getMainSkills,
  updateMainSkill,
} from "@/lib/api/main-skills";
import { useCrudMutation } from "@/lib/hooks/common";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { MainSkill, MainSkillFormData } from "@/types/main-skills";

export function useMainSkills(
  campaignId: string,
  options: { enabled?: boolean; initialData?: MainSkill[] } = {},
) {
  return useQuery({
    queryKey: skillKeys.mainSkills(campaignId),
    queryFn: () => getMainSkills(campaignId),
    staleTime: REFERENCE_STALE_MS,
    enabled: options.enabled !== false,
    initialData: options.initialData,
  });
}

export function useCreateMainSkill(campaignId: string) {
  return useCrudMutation({
    mutationFn: (data: MainSkillFormData) => createMainSkill(campaignId, data),
    invalidateKeys: [skillKeys.mainSkills(campaignId)],
    awaitInvalidation: true,
  });
}

export function useUpdateMainSkill(campaignId: string) {
  return useCrudMutation({
    mutationFn: ({
      mainSkillId,
      data,
    }: {
      mainSkillId: string;
      data: Partial<MainSkillFormData>;
    }) => updateMainSkill(campaignId, mainSkillId, data),
    invalidateKeys: [skillKeys.mainSkills(campaignId)],
  });
}

export function useDeleteMainSkill(campaignId: string) {
  return useCrudMutation({
    mutationFn: (mainSkillId: string) =>
      deleteMainSkill(campaignId, mainSkillId),
    errorText: "Помилка при видаленні основного навику",
    // скіли посилаються на видалений mainSkill
    invalidateKeys: [
      skillKeys.mainSkills(campaignId),
      skillKeys.list(campaignId),
    ],
  });
}
