import { useQuery } from "@tanstack/react-query";

import { unitKeys, unitWriteKeys } from "./keys";

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
    invalidateKeys: unitWriteKeys(campaignId),
  });
}

export function useDeleteAllUnits(campaignId: string) {
  return useCrudMutation({
    mutationFn: () => deleteAllUnits(campaignId),
    invalidateKeys: unitWriteKeys(campaignId),
  });
}

export function useDeleteUnit(campaignId: string) {
  return useCrudMutation({
    mutationFn: (unitId: string) => deleteUnit(campaignId, unitId),
    invalidateKeys: unitWriteKeys(campaignId),
  });
}

export function useUpdateUnit(campaignId: string) {
  return useCrudMutation({
    mutationFn: ({ unitId, data }: { unitId: string; data: Partial<Unit> }) => updateUnit(campaignId, unitId, data),
    invalidateKeys: (_, { unitId }) => [...unitWriteKeys(campaignId), unitKeys.detail(campaignId, unitId)],
  });
}
