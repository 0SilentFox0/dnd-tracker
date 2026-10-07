"use client";

import { useCallback, useState } from "react";

import { useBattleBalance } from "../useBattleSetupQueries";

import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import type { BattlePreparationParticipant } from "@/types/battle";
import type { SuggestedEnemy } from "@/types/battle-setup";

interface AllyParticipants {
  characterIds: string[];
  units: { id: string; quantity: number }[];
}

interface UseBalanceSuggestionsParams {
  campaignId: string;
  participants: BattlePreparationParticipant[];
  allyParticipants: AllyParticipants;
  hasAllies: boolean;
  setParticipants: React.Dispatch<React.SetStateAction<BattlePreparationParticipant[]>>;
}

export function useBalanceSuggestions({
  participants,
  campaignId,
  allyParticipants,
  hasAllies,
  setParticipants,
}: UseBalanceSuggestionsParams) {
  const balance = useBattleBalance(campaignId);

  const { mutate: requestBalance } = balance;

  const [suggestedEnemies, setSuggestedEnemies] = useState<SuggestedEnemy[]>([]);

  const [suggestDone, setSuggestDone] = useState(false);

  const [balanceRace, setBalanceRace] = useState("");

  const suggestEnemies = useCallback(() => {
    if (!hasAllies) return;

    setSuggestedEnemies([]);
    setSuggestDone(false);
    requestBalance(
      { allyParticipants, suggest: true, raceId: balanceRace || undefined },
      {
        onSuccess: (data) => {
          setSuggestedEnemies((data.suggestedEnemies ?? []) as SuggestedEnemy[]);
          setSuggestDone(true);
        },
      },
    );
  }, [requestBalance, allyParticipants, hasAllies, balanceRace]);

  const applySuggestedEnemies = useCallback(() => {
    const allies = participants.filter((p) => p.side === ParticipantSide.ALLY);

    const newEnemies: BattlePreparationParticipant[] = suggestedEnemies.map((s) => ({
      id: s.unitId,
      type: ParticipantSourceType.UNIT,
      side: ParticipantSide.ENEMY,
      quantity: s.quantity,
    }));

    setParticipants([...allies, ...newEnemies]);
    setSuggestedEnemies([]);
  }, [participants, suggestedEnemies, setParticipants]);

  return {
    balanceLoading: balance.isPending,
    suggestedEnemies,
    suggestDone,
    balanceRace,
    setBalanceRace,
    suggestEnemies,
    applySuggestedEnemies,
  };
}
