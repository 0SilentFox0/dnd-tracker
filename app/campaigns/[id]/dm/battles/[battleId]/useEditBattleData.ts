"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getCharacters } from "@/lib/api/characters";
import { getUnits } from "@/lib/api/units";
import { ParticipantSide } from "@/lib/constants/battle";
import {
  useBattle,
  useDeleteBattle,
  useUpdateBattle,
} from "@/lib/hooks/battles";
import type { BattlePreparationParticipant } from "@/types/battle";

export interface EditBattleCharacter {
  id: string;
  name: string;
  type: string;
  controlledBy: string | null;
  avatar: string | null;
}

export interface EditBattleUnit {
  id: string;
  name: string;
  groupId: string | null;
  avatar: string | null;
}

export function useEditBattleData(campaignId: string, battleId: string) {
  const router = useRouter();

  const { data: battle, isLoading: loadingBattle } = useBattle(
    campaignId,
    battleId,
  );

  const updateBattleMutation = useUpdateBattle(campaignId, battleId);

  const deleteBattleMutation = useDeleteBattle(campaignId);

  const [characters, setCharacters] = useState<EditBattleCharacter[]>([]);

  const [units, setUnits] = useState<EditBattleUnit[]>([]);

  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState({ name: "", description: "" });

  const [participants, setParticipants] = useState<
    BattlePreparationParticipant[]
  >([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [chars, unitsData] = await Promise.all([
          getCharacters(campaignId),
          getUnits(campaignId),
        ]);

        setCharacters(chars as EditBattleCharacter[]);
        setUnits(unitsData as EditBattleUnit[]);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [campaignId]);

  useEffect(() => {
    if (battle) {
      setFormData({
        name: battle.name || "",
        description: (battle.description as string) || "",
      });
      setParticipants(
        (battle.participants ?? []) as BattlePreparationParticipant[],
      );
    }
  }, [battle]);

  const handleParticipantToggle = (
    participantId: string,
    type: "character" | "unit",
    checked: boolean,
  ) => {
    if (checked) {
      setParticipants((prev) => [
        ...prev,
        { id: participantId, type, side: ParticipantSide.ALLY },
      ]);
    } else {
      setParticipants((prev) => prev.filter((p) => p.id !== participantId));
    }
  };

  const handleSideChange = (
    participantId: string,
    side: BattlePreparationParticipant["side"],
  ) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === participantId ? { ...p, side } : p)),
    );
  };

  const handleQuantityChange = (participantId: string, quantity: number) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === participantId ? { ...p, quantity } : p)),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (participants.length === 0) {
      alert("Оберіть хоча б одного учасника");

      return;
    }

    updateBattleMutation.mutate(
      {
        name: formData.name,
        description: formData.description,
        participants,
      },
      {
        onSuccess: () => {
          router.push(`/campaigns/${campaignId}/dm/battles`);
          router.refresh();
        },
        onError: (error) => {
          console.error("Error updating battle:", error);
          alert("Помилка при оновленні бою");
        },
      },
    );
  };

  const handleDelete = () => {
    if (!confirm("Ви впевнені, що хочете видалити цю сцену бою?")) return;

    deleteBattleMutation.mutate(battleId, {
      onSuccess: () => {
        router.push(`/campaigns/${campaignId}/dm/battles`);
        router.refresh();
      },
      onError: (error) => {
        console.error("Error deleting battle:", error);
        alert("Помилка при видаленні бою");
      },
    });
  };

  const isParticipantSelected = (id: string) =>
    participants.some((p) => p.id === id);

  const getParticipantQuantity = (id: string): number =>
    participants.find((p) => p.id === id)?.quantity ?? 1;

  const playerCharacters = characters.filter(
    (c) => c.type === "player" && c.controlledBy !== null,
  );

  const npcCharacters = characters.filter((c) => c.type === "npc");

  return {
    campaignId,
    battleId,
    battle,
    loading: loadingData || loadingBattle,
    formData,
    setFormData,
    participants,
    characters,
    units,
    playerCharacters,
    npcCharacters,
    handleParticipantToggle,
    handleSideChange,
    handleQuantityChange,
    handleSubmit,
    handleDelete,
    isParticipantSelected,
    getParticipantQuantity,
    updateBattleMutation,
    deleteBattleMutation,
  };
}
