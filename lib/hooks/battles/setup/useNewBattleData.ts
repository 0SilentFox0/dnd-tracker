"use client";

import { useBattleBalanceStats, useSetupRoster } from "../useBattleSetupQueries";

import { useRaces } from "@/lib/hooks/races";

export function useNewBattleData(campaignId: string) {
  const { data: races = [] } = useRaces(campaignId);

  const roster = useSetupRoster(campaignId);

  const { data: entityStats = null } = useBattleBalanceStats(campaignId);

  return { characters: roster.characters, units: roster.units, entityStats, loadingData: roster.isPending, races };
}
