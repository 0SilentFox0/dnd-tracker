"use client";

import { use } from "react";
import Link from "next/link";

import { AvailableCharactersCard } from "./AvailableCharactersCard";
import { AvailableUnitsCard } from "./AvailableUnitsCard";
import { EditBattleBasicInfoCard } from "./EditBattleBasicInfoCard";
import { ParticipantSideCard } from "./ParticipantSideCard";

import { BATTLE_FORM_TAB, type BattleFormTabId } from "@/components/battle/battle-form-tabs";
import { BalanceSummary } from "@/components/battle/setup/BalanceSummary";
import { LoadingState } from "@/components/common/states";
import { HudForm, HudFormPage, type HudTab } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { useEditBattleData } from "@/lib/hooks/battles";

const TITLE = "Редагувати сцену бою";

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
    fair,
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
      <HudFormPage title={TITLE} className="max-w-6xl">
        <div className="px-4 py-3">
          <LoadingState label="Завантаження..." />
        </div>
      </HudFormPage>
    );
  }

  const tabs: HudTab<BattleFormTabId>[] = [
    {
      id: BATTLE_FORM_TAB.basic,
      label: "Основне",
      content: (
        <EditBattleBasicInfoCard
          formData={formData}
          onChange={(data) => setFormData((prev) => ({ ...prev, ...data }))}
        />
      ),
    },
    {
      id: BATTLE_FORM_TAB.heroes,
      label: "Герої",
      content: (
        <AvailableCharactersCard
          playerCharacters={playerCharacters}
          npcCharacters={npcCharacters}
          isParticipantSelected={isParticipantSelected}
          onParticipantToggle={handleParticipantToggle}
        />
      ),
    },
    {
      id: BATTLE_FORM_TAB.units,
      label: "Юніти",
      content: (
        <AvailableUnitsCard
          units={units}
          isParticipantSelected={isParticipantSelected}
          getParticipantQuantity={getParticipantQuantity}
          onParticipantToggle={handleParticipantToggle}
          onQuantityChange={handleQuantityChange}
        />
      ),
    },
    {
      id: BATTLE_FORM_TAB.roster,
      label: `Склад · ${participants.length}`,
      content: (
        <div>
          <BalanceSummary fair={fair} />
          <div className="grid gap-4 md:grid-cols-2">
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
        </div>
      ),
    },
  ];

  return (
    <HudFormPage title={TITLE} aside="Оновіть учасників та їх ролі в битві" className="max-w-6xl">
      <HudForm
        id="battle-edit-form"
        onSubmit={handleSubmit}
        tabs={tabs}
        actions={
          <>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteBattleMutation.isPending}
            >
              {deleteBattleMutation.isPending ? "Видалення..." : "Видалити"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={`/campaigns/${campaignId}/dm/battles`}>Скасувати</Link>
            </Button>
            <Button type="submit" disabled={updateBattleMutation.isPending}>
              {updateBattleMutation.isPending ? "Збереження..." : "Зберегти зміни"}
            </Button>
          </>
        }
      />
    </HudFormPage>
  );
}
