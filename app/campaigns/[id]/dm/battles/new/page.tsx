"use client";

import Link from "next/link";

import { AutopickCard } from "./AutopickCard";
import { BattleFormBasicInfo } from "./BattleFormBasicInfo";
import { CharactersListCard } from "./CharactersListCard";
import { SidePanelCard } from "./SidePanelCard";
import { UnitsListCard } from "./UnitsListCard";
import { useNewBattlePage } from "./useNewBattlePage";

import { Button } from "@/components/ui/button";

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
      <div className="container mx-auto p-4">
        <p>Завантаження...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold">
            Створити сцену бою
          </h1>
          <p className="max-w-4/5 sm:max-w-full text-muted-foreground mt-1">
            Оберіть учасників та розподіліть їх на союзників та ворогів
          </p>
        </div>
        <Link href={`/campaigns/${id}/dm/battles`}>
          <Button variant="outline">Назад</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <BattleFormBasicInfo
          name={formData.name}
          description={formData.description}
          onNameChange={(value) =>
            setFormData((prev) => ({ ...prev, name: value }))
          }
          onDescriptionChange={(value) =>
            setFormData((prev) => ({ ...prev, description: value }))
          }
        />

        <div className="grid gap-6 md:grid-cols-2">
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

        <div className="grid gap-6 md:grid-cols-2">
          <CharactersListCard
            playerCharacters={playerCharacters}
            npcCharacters={npcCharacters}
            entityStats={entityStats?.characterStats ?? null}
            isParticipantSelected={isParticipantSelected}
            onParticipantToggle={handleParticipantToggle}
          />
          <UnitsListCard
            units={units}
            entityStats={entityStats?.unitStats ?? null}
            isParticipantSelected={isParticipantSelected}
            getParticipantSide={getParticipantSide}
            getParticipantQuantity={getParticipantQuantity}
            onParticipantToggle={handleParticipantToggle}
            onAddToEnemies={(id, quantity) =>
              handleAddToSide(id, "unit", "enemy", quantity)
            }
            onMoveToAllies={(id) => handleAddToSide(id, "unit", "ally")}
            onQuantityChange={handleQuantityChange}
          />
        </div>

        <div className="flex gap-4 justify-end">
          <Link href={`/campaigns/${id}/dm/battles`}>
            <Button type="button" variant="outline">
              Скасувати
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Створення..." : "Створити сцену бою"}
          </Button>
        </div>
      </form>
    </div>
  );
}
