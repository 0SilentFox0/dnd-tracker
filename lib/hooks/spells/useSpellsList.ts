"use client";

import { useMemo, useState } from "react";

import { useDeleteAllSpells, useMoveSpellToGroup, useRemoveSpellFromGroup, useSpellGroups, useSpells } from "./useSpells";

import { convertGroupedSpellsToArray, groupSpellsByGroupAndLevel } from "@/lib/utils/spells/spells";

export function useSpellsList(campaignId: string) {
  const { data: spells = [], isLoading } = useSpells(campaignId);

  const { data: spellGroups = [] } = useSpellGroups(campaignId);

  const removeFromGroup = useRemoveSpellFromGroup(campaignId);

  const moveToGroup = useMoveSpellToGroup(campaignId);

  const deleteAll = useDeleteAllSpells(campaignId);

  const [listTag, setListTag] = useState<string | null>(null);

  const tags = useMemo(() => [...new Set(spells.flatMap((s) => s.lists ?? []))].sort((a, b) => a.localeCompare(b)), [spells]);

  const shown = useMemo(() => (listTag ? spells.filter((s) => s.lists?.includes(listTag)) : spells), [spells, listTag]);

  const groups = useMemo(() => convertGroupedSpellsToArray(groupSpellsByGroupAndLevel(shown)), [shown]);

  return {
    spells,
    isLoading,
    view: { groups, spellGroups },
    listFilter: { tags, value: listTag, set: setListTag },
    actions: {
      removeFromGroup: (spellId: string) => removeFromGroup.mutate(spellId),
      moveToGroup: (spellId: string, groupId: string | null) => moveToGroup.mutate({ spellId, groupId }),
      removeAll: () => deleteAll.mutateAsync(),
    },
  };
}
