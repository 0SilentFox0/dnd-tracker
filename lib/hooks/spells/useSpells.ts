import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createSpell,
  deleteAllSpells,
  deleteSpell,
  deleteSpellsByLevel,
  getSpell,
  getSpellGroups,
  getSpells,
  moveSpellToGroup,
  removeAllSpellsFromGroup,
  removeSpellFromGroup,
  renameSpellGroup,
  updateSpell,
} from "@/lib/api/spells";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { Spell, SpellGroup } from "@/types/spells";

export type { Spell, SpellGroup };

export function useSpells(campaignId: string, initialSpells?: Spell[]) {
  return useQuery<Spell[]>({
    queryKey: ["spells", campaignId],
    queryFn: () => getSpells(campaignId),
    staleTime: REFERENCE_STALE_MS,
    ...(initialSpells !== undefined && { initialData: initialSpells }),
    enabled: !!campaignId,
  });
}

export function useSpellGroups(campaignId: string) {
  return useQuery<SpellGroup[]>({
    queryKey: ["spellGroups", campaignId],
    queryFn: () => getSpellGroups(campaignId),
    staleTime: REFERENCE_STALE_MS,
  });
}

export function useRenameSpellGroup(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { groupId: string; name: string }) =>
      renameSpellGroup(campaignId, data.groupId, data.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spells", campaignId] });
      queryClient.invalidateQueries({
        queryKey: ["spellGroups", campaignId],
      });
    },
  });
}

export function useRemoveAllSpellsFromGroup(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) =>
      removeAllSpellsFromGroup(campaignId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spells", campaignId] });
    },
  });
}

export function useRemoveSpellFromGroup(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (spellId: string) => removeSpellFromGroup(campaignId, spellId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spells", campaignId] });
    },
  });
}

export function useMoveSpellToGroup(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { spellId: string; groupId: string | null }) =>
      moveSpellToGroup(campaignId, data.spellId, data.groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spells", campaignId] });
    },
  });
}

export function useDeleteAllSpells(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteAllSpells(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spells", campaignId] });
      queryClient.invalidateQueries({
        queryKey: ["spellGroups", campaignId],
      });
    },
  });
}

export function useSpell(campaignId: string, spellId: string) {
  return useQuery<Spell>({
    queryKey: ["spell", campaignId, spellId],
    queryFn: () => getSpell(campaignId, spellId),
  });
}

export function useCreateSpell(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Spell> & { name: string; description: string; type: string; damageType: string }) =>
      createSpell(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spells", campaignId] });
    },
  });
}

export function useUpdateSpell(campaignId: string, spellId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Spell>) =>
      updateSpell(campaignId, spellId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["spell", campaignId, spellId],
      });
      queryClient.invalidateQueries({ queryKey: ["spells", campaignId] });
    },
  });
}

export function useDeleteSpell(campaignId: string, spellId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteSpell(campaignId, spellId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spells", campaignId] });
    },
  });
}

export function useDeleteSpellsByLevel(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (level: number) => deleteSpellsByLevel(campaignId, level),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spells", campaignId] });
    },
  });
}
