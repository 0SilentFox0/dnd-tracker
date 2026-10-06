"use client";

import Link from "next/link";

import { AutopickCard } from "./AutopickCard";
import { BATTLE_FORM_TAB, type BattleFormTabId } from "./battle-form-tabs";
import { BattleFormBasicInfo } from "./BattleFormBasicInfo";
import { CharactersListCard } from "./CharactersListCard";
import { SidePanelCard } from "./SidePanelCard";
import { UnitsListCard } from "./UnitsListCard";

import { LoadingState } from "@/components/common/states";
import { HudForm, HudFormPage, type HudTab } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { ParticipantSourceType } from "@/lib/constants/battle";
import { useNewBattlePage } from "@/lib/hooks/battles";

export default function NewBattlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const {
    id,
    loading,
    loadingData,
    formData,
    setFormData,
    participants,
    characters,
    units,
    races,
    allyStats,
    balanceLoading,
    suggestedEnemies,
    difficulty,
    setDifficulty,
    minTier,
    setMinTier,
    maxTier,
    setMaxTier,
    balanceRace,
    setBalanceRace,
    entityStats,
    handleParticipantToggle,
    handleSideChange,
    handleAddToSide,
    handleRemoveParticipant,
    handleQuantityChange,
    handleSubmit,
    isParticipantSelected,
    getParticipantQuantity,
    getParticipantSide,
    hasAllies,
    fetchAllyStats,
    suggestEnemies,
    applySuggestedEnemies,
    playerCharacters,
    npcCharacters,
  } = useNewBattlePage(params);

  if (loadingData) {
    return (
      <HudFormPage title="Створити сцену бою" className="max-w-6xl">
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
        <BattleFormBasicInfo
          name={formData.name}
          description={formData.description}
          onNameChange={(value) => setFormData((prev) => ({ ...prev, name: value }))}
          onDescriptionChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
        />
      ),
    },
    {
      id: BATTLE_FORM_TAB.heroes,
      label: "Герої",
      content: (
        <CharactersListCard
          playerCharacters={playerCharacters}
          npcCharacters={npcCharacters}
          entityStats={entityStats?.characterStats ?? null}
          isParticipantSelected={isParticipantSelected}
          onParticipantToggle={handleParticipantToggle}
        />
      ),
    },
    {
      id: BATTLE_FORM_TAB.units,
      label: "Юніти",
      content: (
        <div className="space-y-4">
          <AutopickCard
            hasAllies={hasAllies}
            allyStats={allyStats}
            balanceLoading={balanceLoading}
            difficulty={difficulty}
            minTier={minTier}
            maxTier={maxTier}
            balanceRace={balanceRace}
            races={races}
            suggestedEnemies={suggestedEnemies}
            onDifficultyChange={setDifficulty}
            onMinTierChange={setMinTier}
            onMaxTierChange={setMaxTier}
            onBalanceRaceChange={setBalanceRace}
            onFetchAllyStats={fetchAllyStats}
            onSuggestEnemies={suggestEnemies}
            onApplySuggestedEnemies={applySuggestedEnemies}
          />
          <UnitsListCard
            units={units}
            entityStats={entityStats?.unitStats ?? null}
            isParticipantSelected={isParticipantSelected}
            getParticipantSide={getParticipantSide}
            getParticipantQuantity={getParticipantQuantity}
            onParticipantToggle={handleParticipantToggle}
            onAddToEnemies={(id, quantity) => handleAddToSide(id, ParticipantSourceType.UNIT, "enemy", quantity)}
            onMoveToAllies={(id) => handleAddToSide(id, ParticipantSourceType.UNIT, "ally")}
            onQuantityChange={handleQuantityChange}
          />
        </div>
      ),
    },
    {
      id: BATTLE_FORM_TAB.roster,
      label: `Склад · ${participants.length}`,
      content: (
        <div className="grid gap-4 md:grid-cols-2">
          <SidePanelCard
            side="ally"
            participants={participants}
            characters={characters}
            units={units}
            onSideChange={handleSideChange}
            onRemove={handleRemoveParticipant}
          />
          <SidePanelCard
            side="enemy"
            participants={participants}
            characters={characters}
            units={units}
            onSideChange={handleSideChange}
            onRemove={handleRemoveParticipant}
          />
        </div>
      ),
    },
  ];

  return (
    <HudFormPage title="Створити сцену бою" aside="Оберіть учасників та розподіліть їх на союзників та ворогів" className="max-w-6xl">
      <HudForm
        id="battle-form"
        onSubmit={handleSubmit}
        tabs={tabs}
        actions={
          <>
            <Button type="button" variant="outline" asChild>
              <Link href={`/campaigns/${id}/dm/battles`}>Скасувати</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Створення..." : "Створити сцену бою"}
            </Button>
          </>
        }
      />
    </HudFormPage>
  );
}
