"use client";

import { useMemo, useState } from "react";

import { useBattle } from "../useBattles";
import { useBalanceSuggestions } from "./useBalanceSuggestions";
import { useBattleForm } from "./useBattleForm";
import { useBattleParticipants } from "./useBattleParticipants";
import { useFairBalance } from "./useFairBalance";
import { useNewBattleData } from "./useNewBattleData";

import { CharacterType } from "@/lib/constants/characters";
import { sharedEnemyRace } from "@/lib/utils/battle/balance/setup";
import type { BattlePreparationParticipant } from "@/types/battle";

export interface BattleSetupInitial {
  name: string;
  description: string;
  participants: BattlePreparationParticipant[];
}

export function useBattleSetup(campaignId: string, battleId?: string, initial?: BattleSetupInitial) {
  const [formData, setFormData] = useState({ name: initial?.name ?? "", description: initial?.description ?? "" });

  const { characters, units, entityStats, loadingData, races } = useNewBattleData(campaignId);

  const participantsBag = useBattleParticipants(initial?.participants);

  const form = useBattleForm({ campaignId, battleId, formData, participants: participantsBag.participants });

  const balanceBag = useBalanceSuggestions({
    campaignId,
    participants: participantsBag.participants,
    allyParticipants: participantsBag.allyParticipants,
    hasAllies: participantsBag.hasAllies,
    setParticipants: participantsBag.setParticipants,
  });

  const enemyRaceId = useMemo(() => sharedEnemyRace(participantsBag.participants, entityStats), [participantsBag.participants, entityStats]);

  const fair = useFairBalance(participantsBag.participants, entityStats, battleId ? enemyRaceId : balanceBag.balanceRace);

  const playerCharacters = characters.filter((c) => c.type === CharacterType.PLAYER && c.controlledBy !== null);

  const npcCharacters = characters.filter((c) => c.type === CharacterType.NPC_HERO);

  return {
    campaignId,
    battleId,
    loadingData,
    formData,
    setFormData,
    characters,
    units,
    races,
    entityStats,
    ...participantsBag,
    ...balanceBag,
    ...form,
    fair,
    playerCharacters,
    npcCharacters,
  };
}

export type BattleSetup = ReturnType<typeof useBattleSetup>;

export function useBattleSetupInitial(campaignId: string, battleId: string) {
  const { data: battle, isLoading } = useBattle(campaignId, battleId, { pauseRefetchWhen: true });

  const initial = useMemo<BattleSetupInitial | undefined>(
    () =>
      battle
        ? { name: battle.name || "", description: (battle.description as string) || "", participants: (battle.participants ?? []) as unknown as BattlePreparationParticipant[] }
        : undefined,
    [battle],
  );

  return { initial, loading: isLoading };
}
