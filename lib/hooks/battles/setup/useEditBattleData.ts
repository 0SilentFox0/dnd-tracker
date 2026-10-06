"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useBattle, useDeleteBattle, useUpdateBattle } from "../useBattles";
import { useSetupRoster } from "../useBattleSetupQueries";

import { ParticipantSide, type ParticipantSourceTypeValue } from "@/lib/constants/battle";
import { CharacterType } from "@/lib/constants/characters";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import type { BattlePreparationParticipant } from "@/types/battle";
import type { EditBattleCharacter, EditBattleUnit } from "@/types/battle-setup";

export function useEditBattleData(campaignId: string, battleId: string) {
  const notify = useNotify();

  const confirm = useConfirm();

  const router = useRouter();

  const { data: battle, isLoading: loadingBattle } = useBattle(
    campaignId,
    battleId,
  );

  const updateBattleMutation = useUpdateBattle(campaignId, battleId);

  const deleteBattleMutation = useDeleteBattle(campaignId);

  const roster = useSetupRoster(campaignId);

  const characters = roster.characters as EditBattleCharacter[];

  const units = roster.units as EditBattleUnit[];

  const [formData, setFormData] = useState({ name: "", description: "" });

  const [participants, setParticipants] = useState<
    BattlePreparationParticipant[]
  >([]);

  // Polling/refetches must not overwrite what the DM is editing.
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!battle || seededFor.current === battleId) return;

    seededFor.current = battleId;
    setFormData({ name: battle.name || "", description: (battle.description as string) || "" }); // eslint-disable-line react-hooks/set-state-in-effect -- seed from the first server snapshot
    setParticipants((battle.participants ?? []) as BattlePreparationParticipant[]);
  }, [battle, battleId]);

  const handleParticipantToggle = (
    participantId: string,
    type: ParticipantSourceTypeValue,
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
      void notify("Оберіть хоча б одного учасника");

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
        onError: () => void notify("Помилка при оновленні бою"),
      },
    );
  };

  const handleDelete = async () => {
    if (!(await confirm({ title: "Ви впевнені, що хочете видалити цю сцену бою?", confirmLabel: "Видалити", destructive: true }))) return;

    deleteBattleMutation.mutate(battleId, {
      onSuccess: () => {
        router.push(`/campaigns/${campaignId}/dm/battles`);
        router.refresh();
      },
      onError: () => void notify("Помилка при видаленні бою"),
    });
  };

  const isParticipantSelected = (id: string) =>
    participants.some((p) => p.id === id);

  const getParticipantQuantity = (id: string): number =>
    participants.find((p) => p.id === id)?.quantity ?? 1;

  const playerCharacters = characters.filter(
    (c) => c.type === CharacterType.PLAYER && c.controlledBy !== null,
  );

  const npcCharacters = characters.filter((c) => c.type === CharacterType.NPC_HERO);

  return {
    campaignId,
    battleId,
    battle,
    loading: roster.isPending || loadingBattle,
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
