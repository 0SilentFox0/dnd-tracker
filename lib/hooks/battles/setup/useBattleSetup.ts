"use client";

import { useMemo, useState } from "react";

import { useBattle } from "../useBattles";
import { useBalanceSuggestions } from "./useBalanceSuggestions";
import { useBattleForm } from "./useBattleForm";
import { useBattleMapEditor } from "./useBattleMapEditor";
import { useBattleParticipants } from "./useBattleParticipants";
import { useFairBalance } from "./useFairBalance";
import { useNewBattleData } from "./useNewBattleData";
import { useXpBalance } from "./useXpBalance";

import { CharacterType } from "@/lib/constants/characters";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { sharedEnemyRace } from "@/lib/utils/battle/balance/setup";
import { DEFAULT_RULES } from "@/lib/utils/rules";
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

  const { data: rules } = useCampaignRules(campaignId);

  const encounters = rules?.encounters ?? DEFAULT_RULES.encounters;

  const participants = useBattleParticipants(initial?.participants);

  const mapEditor = useBattleMapEditor(initial?.map);

  const form = useBattleForm({ campaignId, battleId, formData, participants: participants.list, map: mapEditor.state.value });

  const balance = useBalanceSuggestions({ campaignId, participants: participants.list, allies: participants.allies, setParticipants: participants.setList, encounters });

  const enemyRaceId = useMemo(() => sharedEnemyRace(participants.list, entityStats), [participants.list, entityStats]);

  const fair = useFairBalance(participants.list, entityStats, battleId ? enemyRaceId : balance.race);

  const xp = useXpBalance(participants.list, entityStats, encounters);

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
    encounters,
    xp,
  };
}

export type BattleSetup = ReturnType<typeof useBattleSetup>;

export function useBattleSetupInitial(campaignId: string, battleId: string) {
  const { data: battle, isLoading } = useBattle(campaignId, battleId, { pausePolling: true });

  const initial = useMemo<BattleSetupInitial | undefined>(
    () =>
      battle
        ? { name: battle.name || "", description: (battle.description as string) || "", participants: (battle.participants ?? []) as unknown as BattlePreparationParticipant[], map: battle.map ?? null }
        : undefined,
    [battle],
  );

  return { initial, loading: isLoading };
}
