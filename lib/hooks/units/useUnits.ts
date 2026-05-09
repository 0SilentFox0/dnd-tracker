import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createUnitGroup,
  deleteAllUnits,
  deleteUnit,
  deleteUnitsByLevel,
  getUnit,
  getUnitGroups,
  getUnits,
  removeAllUnitsFromGroup,
  renameUnitGroup,
  updateUnit,
} from "@/lib/api/units";
import { useCrudMutation } from "@/lib/hooks/common";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { Unit, UnitGroup } from "@/types/units";

export type { Unit, UnitGroup };

export function useUnits(campaignId: string, initialUnits?: Unit[]) {
  return useQuery<Unit[]>({
    queryKey: ["units", campaignId],
    queryFn: () => getUnits(campaignId),
    staleTime: REFERENCE_STALE_MS,
    ...(initialUnits !== undefined && { initialData: initialUnits }),
    enabled: !!campaignId,
  });
}

export function useUnitGroups(campaignId: string) {
  return useQuery<UnitGroup[]>({
    queryKey: ["unitGroups", campaignId],
    queryFn: () => getUnitGroups(campaignId),
    staleTime: REFERENCE_STALE_MS,
  });
}

export function useCreateUnitGroup(campaignId: string) {
  return useCrudMutation({
    mutationFn: (data: { name: string; damageModifier?: string | null }) =>
      createUnitGroup(campaignId, data),
    invalidateKeys: [["unitGroups", campaignId]],
  });
}

export function useUnit(campaignId: string, unitId: string) {
  return useQuery<Unit>({
    queryKey: ["unit", campaignId, unitId],
    queryFn: () => getUnit(campaignId, unitId),
    staleTime: REFERENCE_STALE_MS,
  });
}

export function useDeleteAllUnits(campaignId: string) {
  return useCrudMutation({
    mutationFn: () => deleteAllUnits(campaignId),
    invalidateKeys: [
      ["units", campaignId],
      ["unitGroups", campaignId],
    ],
  });
}

export function useDeleteUnitsByLevel(campaignId: string) {
  return useCrudMutation({
    mutationFn: (level: number) => deleteUnitsByLevel(campaignId, level),
    invalidateKeys: [["units", campaignId]],
  });
}

export function useDeleteUnit(campaignId: string) {
  return useCrudMutation({
    mutationFn: (unitId: string) => deleteUnit(campaignId, unitId),
    invalidateKeys: [["units", campaignId]],
  });
}

export function useRenameUnitGroup(campaignId: string) {
  return useCrudMutation({
    mutationFn: (data: {
      groupId: string;
      name: string;
      damageModifier?: string | null;
    }) =>
      renameUnitGroup(campaignId, data.groupId, data.name, data.damageModifier),
    invalidateKeys: [
      ["units", campaignId],
      ["unitGroups", campaignId],
    ],
  });
}

export function useRemoveAllUnitsFromGroup(campaignId: string) {
  return useCrudMutation({
    mutationFn: (groupId: string) =>
      removeAllUnitsFromGroup(campaignId, groupId),
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

/**
 * Оновлення будь-якого юніта за id (для drag-and-drop між групами/рівнями).
 * Не через useCrudMutation, бо invalidate `["unit", campaignId, unitId]`
 * залежить від variables.unitId — потрібен динамічний onSuccess.
 */
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
