import { useQuery } from "@tanstack/react-query";

import { classKeys } from "./keys";

import { createClass, deleteClass, getClass, getClasses, updateClass } from "@/lib/api/classes";
import { characterKeys } from "@/lib/hooks/characters/keys";
import { useCrudMutation } from "@/lib/hooks/common";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { ClassFormData, GameClassData } from "@/types/classes";

const classDependentKeys = (campaignId: string) => [classKeys.list(campaignId), characterKeys.lists(campaignId)];

export function useClasses(campaignId: string, opts?: { enabled?: boolean }) {
  return useQuery<GameClassData[]>({
    queryKey: classKeys.list(campaignId),
    staleTime: REFERENCE_STALE_MS,
    queryFn: () => getClasses(campaignId),
    enabled: opts?.enabled ?? true,
  });
}

export function useClass(campaignId: string, classId: string) {
  return useQuery<GameClassData>({
    queryKey: classKeys.detail(campaignId, classId),
    staleTime: REFERENCE_STALE_MS,
    queryFn: () => getClass(campaignId, classId),
  });
}

export function useCreateClass(campaignId: string) {
  return useCrudMutation({
    mutationFn: (data: ClassFormData) => createClass(campaignId, data),
    invalidateKeys: [classKeys.list(campaignId)],
  });
}

export function useUpdateClass(campaignId: string) {
  return useCrudMutation({
    mutationFn: ({ classId, data }: { classId: string; data: Partial<ClassFormData> }) => updateClass(campaignId, classId, data),
    invalidateKeys: classDependentKeys(campaignId),
  });
}

export function useDeleteClass(campaignId: string) {
  return useCrudMutation({
    mutationFn: (classId: string) => deleteClass(campaignId, classId),
    invalidateKeys: classDependentKeys(campaignId),
  });
}
