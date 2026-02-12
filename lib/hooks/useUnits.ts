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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; damageModifier?: string | null }) =>
      createUnitGroup(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unitGroups", campaignId] });
    },
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteAllUnits(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units", campaignId] });
      queryClient.invalidateQueries({
        queryKey: ["unitGroups", campaignId],
      });
    },
  });
}

export function useDeleteUnitsByLevel(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (level: number) => deleteUnitsByLevel(campaignId, level),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units", campaignId] });
    },
  });
}

export function useDeleteUnit(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (unitId: string) => deleteUnit(campaignId, unitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units", campaignId] });
    },
  });
}

export function useRenameUnitGroup(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      groupId: string;
      name: string;
      damageModifier?: string | null;
    }) => renameUnitGroup(campaignId, data.groupId, data.name, data.damageModifier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units", campaignId] });
      queryClient.invalidateQueries({
        queryKey: ["unitGroups", campaignId],
      });
    },
  });
}

export function useRemoveAllUnitsFromGroup(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) =>
      removeAllUnitsFromGroup(campaignId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units", campaignId] });
    },
  });
}

export function useUpdateUnit(campaignId: string, unitId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Unit>) =>
      updateUnit(campaignId, unitId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units", campaignId] });
      queryClient.invalidateQueries({
        queryKey: ["unit", campaignId, unitId],
      });
    },
  });
}

/** Оновлення будь-якого юніта за id (для drag-and-drop між групами/рівнями) */
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
