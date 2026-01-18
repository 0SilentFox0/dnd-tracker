/**
 * React Query hooks для роботи з основними навиками
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMainSkills,
  createMainSkill,
  updateMainSkill,
  deleteMainSkill,
} from "@/lib/api/main-skills";
import type { MainSkill, MainSkillFormData } from "@/lib/types/main-skills";

/**
 * Отримує список основних навиків кампанії
 */
export function useMainSkills(campaignId: string) {
  return useQuery({
    queryKey: ["main-skills", campaignId],
    queryFn: () => getMainSkills(campaignId),
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
