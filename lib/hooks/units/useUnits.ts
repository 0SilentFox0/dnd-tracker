import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createUnit, deleteAllUnits, deleteUnit, getUnit, getUnits, updateUnit } from "@/lib/api/units";
import { useCrudMutation } from "@/lib/hooks/common";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { Unit } from "@/types/units";

export type { Unit };

export function useUnits(campaignId: string, initialUnits?: Unit[], opts?: { enabled?: boolean }) {
  return useQuery<Unit[]>({
    queryKey: ["units", campaignId],
    queryFn: () => getUnits(campaignId),
    staleTime: REFERENCE_STALE_MS,
    ...(initialUnits !== undefined && { initialData: initialUnits }),
    enabled: !!campaignId && (opts?.enabled ?? true),
  });
}

export function useUnit(campaignId: string, unitId: string) {
  return useQuery<Unit>({
    queryKey: ["unit", campaignId, unitId],
    queryFn: () => getUnit(campaignId, unitId),
    staleTime: REFERENCE_STALE_MS,
  });
}

export function useCreateUnit(campaignId: string) {
  return useCrudMutation({
    mutationFn: (data: Partial<Unit>) => createUnit(campaignId, data),
    invalidateKeys: [["units", campaignId]],
  });
}

export function useDeleteAllUnits(campaignId: string) {
  return useCrudMutation({
    mutationFn: () => deleteAllUnits(campaignId),
    invalidateKeys: [["units", campaignId]],
  });
}

export function useDeleteUnit(campaignId: string) {
  return useCrudMutation({
    mutationFn: (unitId: string) => deleteUnit(campaignId, unitId),
    invalidateKeys: [["units", campaignId]],
  });
}

export function useUpdateUnit(campaignId: string, unitId: string) {
  return useCrudMutation({
    mutationFn: (data: Partial<Unit>) => updateUnit(campaignId, unitId, data),
    invalidateKeys: [
      ["units", campaignId],
      ["unit", campaignId, unitId],
    ],
  });
}

// invalidates ["unit", campaignId, unitId] from variables, so not useCrudMutation
export function useUpdateUnitAny(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      unitId,
      data,
    }: {
      unitId: string;
      data: Partial<Unit>;
    }) => updateUnit(campaignId, unitId, data),
    onSuccess: (_, { unitId }) => {
      queryClient.invalidateQueries({ queryKey: ["units", campaignId] });
      queryClient.invalidateQueries({
        queryKey: ["unit", campaignId, unitId],
      });
    },
  });
}
