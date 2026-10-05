"use client";

import { useCallback, useState } from "react";

import { getBattleBalance } from "@/lib/api/battles";
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
  const [allyStats, setAllyStats] = useState<AllyStats | null>(null);

  const [balanceLoading, setBalanceLoading] = useState(false);

  const [suggestedEnemies, setSuggestedEnemies] = useState<SuggestedEnemy[]>([]);

  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  const [minTier, setMinTier] = useState(1);

  const [maxTier, setMaxTier] = useState(10);

  const [balanceRace, setBalanceRace] = useState("");

  const fetchAllyStats = useCallback(async () => {
    if (!hasAllies) return;

    setBalanceLoading(true);
    try {
      const data = await getBattleBalance(campaignId, { allyParticipants });

      setAllyStats((data.allyStats ?? null) as AllyStats | null);
    } catch (e) {
      console.error(e);
    } finally {
      setBalanceLoading(false);
    }
  }, [campaignId, allyParticipants, hasAllies]);

  const suggestEnemies = useCallback(async () => {
    if (!hasAllies) return;

    setBalanceLoading(true);
    setSuggestedEnemies([]);
    try {
      const data = await getBattleBalance(campaignId, {
        allyParticipants,
        difficulty,
        minTier,
        maxTier,
        race: balanceRace || undefined,
      });

      setAllyStats((data.allyStats ?? null) as AllyStats | null);
      setSuggestedEnemies((data.suggestedEnemies ?? []) as SuggestedEnemy[]);
    } catch (e) {
      console.error(e);
    } finally {
      setBalanceLoading(false);
    }
  }, [
    campaignId,
    allyParticipants,
    hasAllies,
    difficulty,
    minTier,
    maxTier,
    balanceRace,
  ]);

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
    balanceLoading,
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
