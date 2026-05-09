/**
 * React Query hooks для роботи з основними навиками
 */

import { useQuery } from "@tanstack/react-query";

import {
  createMainSkill,
  deleteMainSkill,
  getMainSkills,
  updateMainSkill,
} from "@/lib/api/main-skills";
import { useCrudMutation } from "@/lib/hooks/common";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { MainSkillFormData } from "@/types/main-skills";

/**
 * Отримує список основних навиків кампанії
 * @param options.enabled - якщо false, запит не виконується (наприклад, коли дані передані з сервера)
 */
export function useMainSkills(
  campaignId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["main-skills", campaignId],
    queryFn: () => getMainSkills(campaignId),
    staleTime: REFERENCE_STALE_MS,
    enabled: options?.enabled !== false,
  });
}

/** Створює новий основний навик */
export function useCreateMainSkill(campaignId: string) {
  return useCrudMutation({
    mutationFn: (data: MainSkillFormData) => createMainSkill(campaignId, data),
    invalidateKeys: [["main-skills", campaignId]],
  });
}

/** Оновлює основний навик */
export function useUpdateMainSkill(campaignId: string) {
  return useCrudMutation({
    mutationFn: ({
      mainSkillId,
      data,
    }: {
      mainSkillId: string;
      data: Partial<MainSkillFormData>;
    }) => updateMainSkill(campaignId, mainSkillId, data),
    invalidateKeys: [["main-skills", campaignId]],
  });
}

/** Видаляє основний навик */
export function useDeleteMainSkill(campaignId: string) {
  return useCrudMutation({
    mutationFn: (mainSkillId: string) =>
      deleteMainSkill(campaignId, mainSkillId),
    // Також оновлюємо скіли, оскільки вони можуть посилатися на видалений mainSkill.
    invalidateKeys: [
      ["main-skills", campaignId],
      ["skills", campaignId],
    ],
  });
}
