"use client";

import { useCallback, useState } from "react";

import { useBattleBalance } from "../useBattleSetupQueries";

import type { AllyStats, Difficulty, SetupParticipant, SuggestedEnemy } from "@/types/battle-setup";

interface AllyParticipants {
  characterIds: string[];
  units: { id: string; quantity: number }[];
}

interface UseBalanceSuggestionsParams {
  campaignId: string;
  participants: SetupParticipant[];
  allyParticipants: AllyParticipants;
  hasAllies: boolean;
  setParticipants: React.Dispatch<React.SetStateAction<SetupParticipant[]>>;
}

export function useBalanceSuggestions({
  campaignId,
  participants,
  allyParticipants,
  hasAllies,
  setParticipants,
}: UseBalanceSuggestionsParams) {
  const balance = useBattleBalance(campaignId);

  const { mutate: requestBalance } = balance;

  const [allyStats, setAllyStats] = useState<AllyStats | null>(null);

  const [suggestedEnemies, setSuggestedEnemies] = useState<SuggestedEnemy[]>([]);

  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  const [minTier, setMinTier] = useState(1);

  const [maxTier, setMaxTier] = useState(10);

  const [balanceRace, setBalanceRace] = useState("");

  const fetchAllyStats = useCallback(() => {
    if (!hasAllies) return;

    requestBalance({ allyParticipants }, { onSuccess: (data) => setAllyStats((data.allyStats ?? null) as AllyStats | null) });
  }, [requestBalance, allyParticipants, hasAllies]);

  const suggestEnemies = useCallback(() => {
    if (!hasAllies) return;

    setSuggestedEnemies([]);
    requestBalance(
      { allyParticipants, difficulty, minTier, maxTier, race: balanceRace || undefined },
      {
        onSuccess: (data) => {
          setAllyStats((data.allyStats ?? null) as AllyStats | null);
          setSuggestedEnemies((data.suggestedEnemies ?? []) as SuggestedEnemy[]);
        },
      },
    );
  }, [requestBalance, allyParticipants, hasAllies, difficulty, minTier, maxTier, balanceRace]);

  const applySuggestedEnemies = useCallback(() => {
    const allies = participants.filter((p) => p.side === "ally");

    const newEnemies: SetupParticipant[] = suggestedEnemies.map((s) => ({
      id: s.unitId,
      type: "unit",
      side: "enemy",
      quantity: s.quantity,
    }));

    setParticipants([...allies, ...newEnemies]);
    setSuggestedEnemies([]);
  }, [participants, suggestedEnemies, setParticipants]);

  return {
    allyStats,
    balanceLoading: balance.isPending,
    suggestedEnemies,
    difficulty,
    setDifficulty,
    minTier,
    setMinTier,
    maxTier,
    setMaxTier,
    balanceRace,
    setBalanceRace,
    fetchAllyStats,
    suggestEnemies,
    applySuggestedEnemies,
  };
}
