"use client";

import { useMemo } from "react";

import { useBattleBalanceStats, useSetupRoster } from "../useBattleSetupQueries";

import { useRaces } from "@/lib/hooks/races";
import type { SetupUnit } from "@/types/battle-setup";

export function useNewBattleData(campaignId: string) {
  const { data: races = [] } = useRaces(campaignId);

  const roster = useSetupRoster(campaignId);

  const { data: entityStats = null } = useBattleBalanceStats(campaignId);

  const units = useMemo<SetupUnit[]>(() => {
    const names = new Map(races.map((r) => [r.id, r.name]));

    return roster.units.map((u) => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      level: u.level,
      raceId: u.raceId,
      raceName: u.raceId ? (names.get(u.raceId) ?? null) : null,
    }));
  }, [roster.units, races]);

  return { characters: roster.characters, units, entityStats, loadingData: roster.isPending, races };
}
