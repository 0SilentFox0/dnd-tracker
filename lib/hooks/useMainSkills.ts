/**
 * React Query hooks для роботи з основними навиками
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createMainSkill,
  deleteMainSkill,
  getMainSkills,
  updateMainSkill,
} from "@/lib/api/main-skills";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { MainSkillFormData } from "@/types/main-skills";

/**
 * Отримує список основних навиків кампанії
 * @param options.enabled - якщо false, запит не виконується (наприклад, коли дані передані з сервера)
 */
export function useMainSkills(
  campaignId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["main-skills", campaignId],
    queryFn: () => getMainSkills(campaignId),
    staleTime: REFERENCE_STALE_MS,
    enabled: options?.enabled !== false,
  });
}

/**
 * Створює новий основний навик
 */
export function useCreateMainSkill(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MainSkillFormData) =>
      createMainSkill(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["main-skills", campaignId],
      });
    },
  });
}

/**
 * Оновлює основний навик
 */
export function useUpdateMainSkill(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      mainSkillId,
      data,
    }: {
      mainSkillId: string;
      data: Partial<MainSkillFormData>;
    }) => updateMainSkill(campaignId, mainSkillId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["main-skills", campaignId],
      });
    },
  });
}

/**
 * Видаляє основний навик
 */
export function useDeleteMainSkill(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mainSkillId: string) =>
      deleteMainSkill(campaignId, mainSkillId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["main-skills", campaignId],
      });
      // Також оновлюємо скіли, оскільки вони можуть посилатися на видалений mainSkill
      queryClient.invalidateQueries({
        queryKey: ["skills", campaignId],
      });
    },
  });
}
