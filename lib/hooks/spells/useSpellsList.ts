"use client";

import { useMemo } from "react";

import { useDeleteAllSpells, useMoveSpellToGroup, useRemoveSpellFromGroup, useSpellGroups, useSpells } from "./useSpells";

import { convertGroupedSpellsToArray, groupSpellsByGroupAndLevel } from "@/lib/utils/spells/spells";
import type { Spell } from "@/types/spells";

export function useSpellsList(campaignId: string, initialSpells: Spell[]) {
  const { data: spells = initialSpells, isLoading } = useSpells(campaignId, { initialData: initialSpells });

  const { data: spellGroups = [] } = useSpellGroups(campaignId);

  const removeFromGroup = useRemoveSpellFromGroup(campaignId);

  const moveToGroup = useMoveSpellToGroup(campaignId);

  const deleteAll = useDeleteAllSpells(campaignId);

  const groups = useMemo(() => convertGroupedSpellsToArray(groupSpellsByGroupAndLevel(spells)), [spells]);

  return {
    spells,
    isLoading,
    view: { groups, spellGroups },
    actions: {
      removeFromGroup: (spellId: string) => removeFromGroup.mutate(spellId),
      moveToGroup: (spellId: string, groupId: string | null) => moveToGroup.mutate({ spellId, groupId }),
      removeAll: () => deleteAll.mutateAsync(),
    },
  };
}
