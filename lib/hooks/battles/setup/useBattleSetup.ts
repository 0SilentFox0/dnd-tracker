"use client";

import { useMemo, useState } from "react";

import { useBattle } from "../useBattles";
import { useBalanceSuggestions } from "./useBalanceSuggestions";
import { useBattleForm } from "./useBattleForm";
import { useBattleMapEditor } from "./useBattleMapEditor";
import { useBattleParticipants } from "./useBattleParticipants";
import { useFairBalance } from "./useFairBalance";
import { useNewBattleData } from "./useNewBattleData";

import { CharacterType } from "@/lib/constants/characters";
import { sharedEnemyRace } from "@/lib/utils/battle/balance/setup";
import type { BattleMapConfig, BattlePreparationParticipant } from "@/types/battle";

export interface BattleSetupInitial {
  name: string;
  description: string;
  participants: BattlePreparationParticipant[];
  map?: BattleMapConfig | null;
}

export function useBattleSetup(campaignId: string, battleId?: string, initial?: BattleSetupInitial) {
  const [formData, setFormData] = useState({ name: initial?.name ?? "", description: initial?.description ?? "" });

  const { characters, units, entityStats, loadingData, races } = useNewBattleData(campaignId);

  const participants = useBattleParticipants(initial?.participants);

  const mapEditor = useBattleMapEditor(initial?.map);

  const form = useBattleForm({ campaignId, battleId, formData, participants: participants.list, map: mapEditor.state.value });

  const balance = useBalanceSuggestions({ campaignId, participants: participants.list, allies: participants.allies, setParticipants: participants.setList });

  const enemyRaceId = useMemo(() => sharedEnemyRace(participants.list, entityStats), [participants.list, entityStats]);

  const fair = useFairBalance(participants.list, entityStats, battleId ? enemyRaceId : balance.race);

  const playerCharacters = characters.filter((c) => c.type === CharacterType.PLAYER && c.controlledBy !== null);

  const npcCharacters = characters.filter((c) => c.type === CharacterType.NPC_HERO);

  return {
    campaignId,
    battleId,
    loading: loadingData,
    details: { data: formData, set: setFormData },
    data: { characters, units, races, entityStats, playerCharacters, npcCharacters },
    participants,
    balance,
    form,
    mapEditor,
    fair,
  };
}

export type BattleSetup = ReturnType<typeof useBattleSetup>;

export function useBattleSetupInitial(campaignId: string, battleId: string) {
  const { data: battle, isLoading } = useBattle(campaignId, battleId, { pauseRefetchWhen: true });

  const initial = useMemo<BattleSetupInitial | undefined>(
    () =>
      battle
        ? { name: battle.name || "", description: (battle.description as string) || "", participants: (battle.participants ?? []) as unknown as BattlePreparationParticipant[], map: battle.map ?? null }
        : undefined,
    [battle],
  );

  return { initial, loading: isLoading };
}
