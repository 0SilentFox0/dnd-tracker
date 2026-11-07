"use client";

import { useMemo } from "react";

import { useCharacterSheet, useStash } from "@/lib/hooks/characters";
import { CHARACTERISTIC_KEYS, DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { type Encumbrance, encumbrance } from "@/lib/utils/rules/systems/wfrp/equipment";
import type { SheetArtifact } from "@/types/characters";

export function useEncumbrance(campaignId: string, characterId: string): Encumbrance | null {
  const { data: sheet } = useCharacterSheet(campaignId, characterId);

  const canSeeStash = !!sheet && (sheet.viewer.isDM || sheet.viewer.isOwner);

  const { data: stash } = useStash(campaignId, characterId, { enabled: canSeeStash });

  const block = sheet?.wfrp;

  const grid = sheet?.items.grid;

  const backpack = stash?.artifacts;

  return useMemo(() => {
    if (!block || !grid) return null;

    const base = { ...DEFAULT_CHARACTERISTICS.base };

    for (const c of block.characteristics) base[c.key] = c.value;

    const items = [...Object.values(grid).filter((a): a is SheetArtifact => !!a), ...(backpack ?? [])];

    return encumbrance(items.map((a) => ({ systemStats: a.systemStats })), { base, advances: DEFAULT_CHARACTERISTICS.advances });
  }, [block, grid, backpack]);
}
