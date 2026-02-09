"use client";

import { use, useState } from "react";

import { useBalanceSuggestions } from "./useBalanceSuggestions";
import { useBattleForm } from "./useBattleForm";
import { useBattleParticipants } from "./useBattleParticipants";
import { useNewBattleData } from "./useNewBattleData";

export function useNewBattlePage(params: Promise<{ id: string }>) {
  const { id } = use(params);

  const [formData, setFormData] = useState({ name: "", description: "" });

  const { characters, units, entityStats, loadingData, races } =
    useNewBattleData(id);

  const participantsBag = useBattleParticipants();

  const { loading, handleSubmit } = useBattleForm({
    campaignId: id,
    formData,
    setFormData,
    participants: participantsBag.participants,
  });

  const balanceBag = useBalanceSuggestions({
    campaignId: id,
    participants: participantsBag.participants,
    allyParticipants: participantsBag.allyParticipants,
    hasAllies: participantsBag.hasAllies,
    setParticipants: participantsBag.setParticipants,
  });

  const playerCharacters = characters.filter(
    (c) => c.type === "player" && c.controlledBy !== null,
  );

  const npcCharacters = characters.filter((c) => c.type === "npc");

  return {
    id,
    loading,
    loadingData,
    formData,
    setFormData,
    characters,
    units,
    races,
    entityStats,
    ...participantsBag,
    ...balanceBag,
    handleSubmit,
    playerCharacters,
    npcCharacters,
  };
}
