"use client";

import { useCallback, useState } from "react";

import { useBattleBalance } from "../useBattleSetupQueries";
import type { AllyParticipants } from "./useBattleParticipants";

import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import type { BattlePreparationParticipant } from "@/types/battle";
import type { SuggestedEnemy } from "@/types/battle-setup";

interface UseBalanceSuggestionsParams {
  campaignId: string;
  participants: BattlePreparationParticipant[];
  allies: { value: AllyParticipants; exists: boolean };
  setParticipants: React.Dispatch<React.SetStateAction<BattlePreparationParticipant[]>>;
}

export function useBalanceSuggestions({
  participants,
  campaignId,
  allies,
  setParticipants,
}: UseBalanceSuggestionsParams) {
  const balance = useBattleBalance(campaignId);

  const { mutate: requestBalance } = balance;

  const [suggestedEnemies, setSuggestedEnemies] = useState<SuggestedEnemy[]>([]);

  const [suggestDone, setSuggestDone] = useState(false);

  const [balanceRace, setBalanceRace] = useState("");

  const suggestEnemies = useCallback(() => {
    if (!allies.exists) return;

    setSuggestedEnemies([]);
    setSuggestDone(false);
    requestBalance(
      { allyParticipants: allies.value, suggest: true, raceId: balanceRace || undefined },
      {
        onSuccess: (data) => {
          setSuggestedEnemies((data.suggestedEnemies ?? []) as SuggestedEnemy[]);
          setSuggestDone(true);
        },
      },
    );
  }, [requestBalance, allies, balanceRace]);

  const applySuggestedEnemies = useCallback(() => {
    const allies = participants.filter((p) => p.side === ParticipantSide.ALLY);

    const newEnemies: BattlePreparationParticipant[] = suggestedEnemies.map((s) => {
      const reserved = Math.min(participants.find((p) => p.side === ParticipantSide.ENEMY && p.id === s.unitId)?.reserved ?? 0, s.quantity);

      return {
        id: s.unitId,
        type: ParticipantSourceType.UNIT,
        side: ParticipantSide.ENEMY,
        quantity: s.quantity,
        ...(reserved > 0 && { reserved }),
      };
    });

    setParticipants([...allies, ...newEnemies]);
    setSuggestedEnemies([]);
  }, [participants, suggestedEnemies, setParticipants]);

  return {
    loading: balance.isPending,
    suggested: suggestedEnemies,
    done: suggestDone,
    race: balanceRace,
    actions: { setRace: setBalanceRace, suggest: suggestEnemies, apply: applySuggestedEnemies },
  };
}

export type BalanceSuggestions = ReturnType<typeof useBalanceSuggestions>;
