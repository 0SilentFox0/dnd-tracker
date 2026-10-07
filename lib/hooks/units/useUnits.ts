import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unitKeys } from "./keys";

import { createUnit, deleteAllUnits, deleteUnit, getUnit, getUnits, updateUnit } from "@/lib/api/units";
import { useCrudMutation } from "@/lib/hooks/common";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { Unit } from "@/types/units";

export type { Unit };

export function useUnits(campaignId: string, initialUnits?: Unit[], opts?: { enabled?: boolean }) {
  return useQuery<Unit[]>({
    queryKey: unitKeys.list(campaignId),
    queryFn: () => getUnits(campaignId),
    staleTime: REFERENCE_STALE_MS,
    ...(initialUnits !== undefined && { initialData: initialUnits }),
    enabled: !!campaignId && (opts?.enabled ?? true),
  });
}

export function useUnit(campaignId: string, unitId: string) {
  return useQuery<Unit>({
    queryKey: unitKeys.detail(campaignId, unitId),
    queryFn: () => getUnit(campaignId, unitId),
    staleTime: REFERENCE_STALE_MS,
  });
}

export function useCreateUnit(campaignId: string) {
  return useCrudMutation({
    mutationFn: (data: Partial<Unit>) => createUnit(campaignId, data),
    invalidateKeys: [unitKeys.list(campaignId)],
  });
}

export function useDeleteAllUnits(campaignId: string) {
  return useCrudMutation({
    mutationFn: () => deleteAllUnits(campaignId),
    invalidateKeys: [unitKeys.list(campaignId)],
  });
}

export function useDeleteUnit(campaignId: string) {
  return useCrudMutation({
    mutationFn: (unitId: string) => deleteUnit(campaignId, unitId),
    invalidateKeys: [unitKeys.list(campaignId)],
  });
}

export function useUpdateUnit(campaignId: string, unitId: string) {
  return useCrudMutation({
    mutationFn: (data: Partial<Unit>) => updateUnit(campaignId, unitId, data),
    invalidateKeys: [
      unitKeys.list(campaignId),
      unitKeys.detail(campaignId, unitId),
    ],
  });
}

// invalidates unitKeys.detail(campaignId, unitId) from variables, so not useCrudMutation
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
      queryClient.invalidateQueries({ queryKey: unitKeys.list(campaignId) });
      queryClient.invalidateQueries({
        queryKey: unitKeys.detail(campaignId, unitId),
      });
    },
  });
}
