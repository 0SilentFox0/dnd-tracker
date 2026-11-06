"use client";

import { useMemo } from "react";

import { useCharacterSheet } from "@/lib/hooks/characters";
import { type HitLocation, RULE_SYSTEM_REGISTRY } from "@/lib/utils/rules/systems";
import { armourAp, parseWfrpStats, qualityValue } from "@/lib/utils/rules/systems/wfrp/equipment";
import { ARMOUR_SL_PER_AP } from "@/lib/utils/rules/systems/wfrp/magic/constants";
import type { SheetArtifact } from "@/types/characters";

const SHIELD_SLOTS = new Set(["shield", "weapon", "range_weapon"]);

export interface EquippedAp {
  ap: Record<HitLocation, number>;
  flexible: boolean;
  penalty: number;
  shield: number;
}

export function equippedApOf(artifacts: SheetArtifact[]): EquippedAp {
  const worn = artifacts.filter((a) => !a.carried);

  const { ap, flexible } = RULE_SYSTEM_REGISTRY.wfrp.equipment?.armourAp(worn.map((a) => ({ slot: a.slot, systemStats: a.systemStats }))) ?? armourAp([]);

  const shield = worn.reduce((sum, a) => {
    const stats = SHIELD_SLOTS.has(a.slot) ? parseWfrpStats(a.systemStats) : null;

    return sum + (stats && stats.type !== "armour" ? (qualityValue(stats.qualities, "shield") ?? 0) : 0);
  }, 0);

  return { ap, flexible, penalty: flexible ? 0 : Math.max(ap.head, ap.body) * ARMOUR_SL_PER_AP, shield };
}

export function useEquippedAp(campaignId: string, characterId: string): EquippedAp | null {
  const { data: sheet } = useCharacterSheet(campaignId, characterId);

  const grid = sheet?.items.grid;

  return useMemo(() => (grid ? equippedApOf(Object.values(grid).filter((a): a is SheetArtifact => !!a)) : null), [grid]);
}
