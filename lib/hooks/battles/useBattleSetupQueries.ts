"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { battleKeys } from "./keys";

import { getBattleBalance, getBattleBalanceStats } from "@/lib/api/battles";
import type { BattleBalanceBody } from "@/lib/api/battles-types";
import { useCharacters } from "@/lib/hooks/characters";
import { useUnits } from "@/lib/hooks/units";
import type { EntityStats, SetupCharacter, UnitEntityStats } from "@/types/battle-setup";

export function useSetupRoster(campaignId: string) {
  const characters = useCharacters(campaignId, { compact: true });

  const units = useUnits(campaignId);

  return {
    characters: (characters.data ?? []) as unknown as SetupCharacter[],
    units: units.data ?? [],
    isPending: characters.isPending || units.isPending,
  };
}

export function useBattleBalanceStats(campaignId: string) {
  return useQuery({
    queryKey: battleKeys.balance(campaignId),
    queryFn: () => getBattleBalanceStats(campaignId),
    select: (d): { characterStats: Record<string, EntityStats>; unitStats: Record<string, UnitEntityStats> } | null =>
      d.characterStats != null || d.unitStats != null ? { characterStats: d.characterStats ?? {}, unitStats: d.unitStats ?? {} } : null,
    enabled: !!campaignId,
  });
}

export function useBattleBalance(campaignId: string) {
  return useMutation({ mutationFn: (body: BattleBalanceBody) => getBattleBalance(campaignId, body) });
}
