"use client";

import { useMemo } from "react";

import { useCharacterSheet } from "@/lib/hooks/characters";
import type { HitLocation } from "@/lib/utils/rules/systems";
import { armourAp } from "@/lib/utils/rules/systems/wfrp/equipment";
import { ARMOUR_SL_PER_AP } from "@/lib/utils/rules/systems/wfrp/magic/constants";
import type { SheetArtifact } from "@/types/characters";

export interface EquippedAp {
  ap: Record<HitLocation, number>;
  flexible: boolean;
  penalty: number;
  shield: number;
}

export function equippedApOf(artifacts: SheetArtifact[]): EquippedAp {
  const worn = artifacts.filter((a) => !a.carried);

  const { ap, flexible, shield } = armourAp(worn.map((a) => ({ slot: a.slot, systemStats: a.systemStats })));

  return { ap, flexible, penalty: flexible ? 0 : Math.max(ap.head, ap.body) * ARMOUR_SL_PER_AP, shield };
}

export function useEquippedAp(campaignId: string, characterId: string): EquippedAp | null {
  const { data: sheet } = useCharacterSheet(campaignId, characterId);

  const grid = sheet?.items.grid;

  return useMemo(() => (grid ? equippedApOf(Object.values(grid).filter((a): a is SheetArtifact => !!a)) : null), [grid]);
}
