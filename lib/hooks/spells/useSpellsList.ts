"use client";

import { useMemo } from "react";

import { useDeleteAllSpells, useMoveSpellToGroup, useRemoveSpellFromGroup, useSpellGroups, useSpells } from "./useSpells";

import { useSearch } from "@/lib/hooks/common";
import { convertGroupedSpellsToArray, groupSpellsByGroupAndLevel } from "@/lib/utils/spells/spells";
import type { Spell } from "@/types/spells";

const spellFields = (spell: Spell) => [spell.name, spell.spellGroup?.name];

export function useSpellsList(campaignId: string) {
  const { data: spells = [], isLoading } = useSpells(campaignId);

  const { data: spellGroups = [] } = useSpellGroups(campaignId);

  const removeFromGroup = useRemoveSpellFromGroup(campaignId);

  const moveToGroup = useMoveSpellToGroup(campaignId);

  const deleteAll = useDeleteAllSpells(campaignId);

  const search = useSearch(spells, spellFields);

  const groups = useMemo(() => convertGroupedSpellsToArray(groupSpellsByGroupAndLevel(search.items)), [search.items]);

  return {
    spells,
    isLoading,
    search,
    view: { groups, spellGroups },
    actions: {
      removeFromGroup: (spellId: string) => removeFromGroup.mutate(spellId),
      moveToGroup: (spellId: string, groupId: string | null) => moveToGroup.mutate({ spellId, groupId }),
      removeAll: () => deleteAll.mutateAsync(),
    },
  };
}
