"use client";

import { use } from "react";
import Link from "next/link";

import { AvailableCharactersCard } from "./AvailableCharactersCard";
import { AvailableUnitsCard } from "./AvailableUnitsCard";
import { EditBattleBasicInfoCard } from "./EditBattleBasicInfoCard";
import { EditBattlePageHeader } from "./EditBattlePageHeader";
import { ParticipantSideCard } from "./ParticipantSideCard";
import { useEditBattleData } from "./useEditBattleData";

import { Button } from "@/components/ui/button";

export default function EditBattlePage({
  params,
}: {
  params: Promise<{ id: string; battleId: string }>;
}) {
  const { id, battleId } = use(params);

  const {
    campaignId,
    loading,
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
  } = useEditBattleData(id, battleId);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <p>Завантаження...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <EditBattlePageHeader
        campaignId={campaignId}
        onDelete={handleDelete}
        isDeleting={deleteBattleMutation.isPending}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <EditBattleBasicInfoCard
          formData={formData}
          onChange={(data) =>
            setFormData((prev) => ({ ...prev, ...data }))
          }
        />

        <div className="grid gap-6 md:grid-cols-2">
          <ParticipantSideCard
            side="ally"
            participants={participants}
            characters={characters}
            units={units}
            onSideChange={handleSideChange}
          />
          <ParticipantSideCard
            side="enemy"
            participants={participants}
            characters={characters}
            units={units}
            onSideChange={handleSideChange}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <AvailableCharactersCard
            playerCharacters={playerCharacters}
            npcCharacters={npcCharacters}
            isParticipantSelected={isParticipantSelected}
            onParticipantToggle={handleParticipantToggle}
          />
          <AvailableUnitsCard
            units={units}
            isParticipantSelected={isParticipantSelected}
            getParticipantQuantity={getParticipantQuantity}
            onParticipantToggle={handleParticipantToggle}
            onQuantityChange={handleQuantityChange}
          />
        </div>

        <div className="flex gap-4 justify-end">
          <Link href={`/campaigns/${campaignId}/dm/battles`}>
            <Button type="button" variant="outline">
              Скасувати
            </Button>
          </Link>
          <Button type="submit" disabled={updateBattleMutation.isPending}>
            {updateBattleMutation.isPending
              ? "Збереження..."
              : "Зберегти зміни"}
          </Button>
        </div>
      </form>
    </div>
  );
}
