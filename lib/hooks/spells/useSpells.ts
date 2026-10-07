import { useQuery } from "@tanstack/react-query";

import { spellKeys } from "./keys";

import {
  createSpell,
  createSpellGroup,
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
import { useCrudMutation } from "@/lib/hooks/common";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { Spell, SpellGroup } from "@/types/spells";

export type { Spell, SpellGroup };

export function useSpells(campaignId: string, opts?: { initialData?: Spell[]; enabled?: boolean }) {
  return useQuery<Spell[]>({
    queryKey: spellKeys.list(campaignId),
    queryFn: () => getSpells(campaignId),
    staleTime: REFERENCE_STALE_MS,
    ...(opts?.initialData !== undefined && { initialData: opts.initialData }),
    enabled: !!campaignId && (opts?.enabled ?? true),
  });
}

export function useSpellGroups(campaignId: string, opts?: { enabled?: boolean }) {
  return useQuery<SpellGroup[]>({
    queryKey: spellKeys.groups(campaignId),
    queryFn: () => getSpellGroups(campaignId),
    staleTime: REFERENCE_STALE_MS,
    enabled: opts?.enabled ?? true,
  });
}

export function useCreateSpellGroup(campaignId: string) {
  return useCrudMutation({
    mutationFn: (name: string) => createSpellGroup(campaignId, { name }),
    invalidateKeys: [spellKeys.groups(campaignId)],
  });
}

export function useRenameSpellGroup(campaignId: string) {
  return useCrudMutation({
    mutationFn: (data: { groupId: string; name: string }) =>
      renameSpellGroup(campaignId, data.groupId, data.name),
    invalidateKeys: [
      spellKeys.list(campaignId),
      spellKeys.groups(campaignId),
    ],
  });
}

export function useRemoveAllSpellsFromGroup(campaignId: string) {
  return useCrudMutation({
    mutationFn: (groupId: string) =>
      removeAllSpellsFromGroup(campaignId, groupId),
    invalidateKeys: [spellKeys.list(campaignId)],
  });
}

export function useRemoveSpellFromGroup(campaignId: string) {
  return useCrudMutation({
    mutationFn: (spellId: string) => removeSpellFromGroup(campaignId, spellId),
    invalidateKeys: [spellKeys.list(campaignId)],
  });
}

export function useMoveSpellToGroup(campaignId: string) {
  return useCrudMutation({
    mutationFn: (data: { spellId: string; groupId: string | null }) =>
      moveSpellToGroup(campaignId, data.spellId, data.groupId),
    invalidateKeys: [spellKeys.list(campaignId)],
  });
}

export function useDeleteAllSpells(campaignId: string) {
  return useCrudMutation({
    mutationFn: () => deleteAllSpells(campaignId),
    invalidateKeys: [
      spellKeys.list(campaignId),
      spellKeys.groups(campaignId),
    ],
  });
}

export function useSpell(campaignId: string, spellId: string) {
  return useQuery<Spell>({
    queryKey: spellKeys.detail(campaignId, spellId),
    queryFn: () => getSpell(campaignId, spellId),
  });
}

export function useCreateSpell(campaignId: string) {
  return useCrudMutation({
    mutationFn: (
      data: Partial<Spell> & {
        name: string;
        description: string;
        type: string;
        damageType: string;
      },
    ) => createSpell(campaignId, data),
    invalidateKeys: [spellKeys.list(campaignId)],
  });
}

export function useUpdateSpell(campaignId: string, spellId: string) {
  return useCrudMutation({
    mutationFn: (data: Partial<Spell>) => updateSpell(campaignId, spellId, data),
    invalidateKeys: [
      spellKeys.detail(campaignId, spellId),
      spellKeys.list(campaignId),
    ],
  });
}

export function useDeleteSpell(campaignId: string, spellId: string) {
  return useCrudMutation({
    mutationFn: () => deleteSpell(campaignId, spellId),
    invalidateKeys: [spellKeys.list(campaignId)],
  });
}

export function useDeleteSpellsByLevel(campaignId: string) {
  return useCrudMutation({
    mutationFn: (level: number) => deleteSpellsByLevel(campaignId, level),
    invalidateKeys: [spellKeys.list(campaignId)],
  });
}
