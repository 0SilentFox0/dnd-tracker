"use client";

import Link from "next/link";

import { AutopickCard } from "./AutopickCard";
import { BalanceSummary } from "./BalanceSummary";
import { BattleFormBasicInfo } from "./BattleFormBasicInfo";
import { CharactersListCard } from "./CharactersListCard";
import { SidePanelCard } from "./SidePanelCard";
import { UnitsListCard } from "./UnitsListCard";

import { BATTLE_FORM_TAB, type BattleFormTabId } from "@/components/battle/battle-form-tabs";
import { LoadingState } from "@/components/common/states";
import { HudForm, HudFormPage, type HudTab } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { type BattleSetupInitial, useBattleSetup, useBattleSetupInitial } from "@/lib/hooks/battles";

interface BattleSetupFormProps {
  campaignId: string;
  battleId?: string;
}

const PAGE_CLASS = "max-w-6xl";

function SetupLoading({ title }: { title: string }) {
  return (
    <HudFormPage title={title} className={PAGE_CLASS}>
      <div className="px-4 py-3">
        <LoadingState label="Завантаження..." />
      </div>
    </HudFormPage>
  );
}

function BattleSetupLayout({ campaignId, battleId, initial }: BattleSetupFormProps & { initial?: BattleSetupInitial }) {
  const setup = useBattleSetup(campaignId, battleId, initial);

  const isEdit = !!battleId;

  const title = isEdit ? "Редагувати сцену бою" : "Створити сцену бою";

  if (setup.loadingData) return <SetupLoading title={title} />;

  const { participants, formData, entityStats } = setup;

  const sidePanel = (side: ParticipantSide) => (
    <SidePanelCard
      side={side}
      participants={participants}
      characters={setup.characters}
      units={setup.units}
      onSideChange={setup.handleSideChange}
      onRemove={setup.handleRemoveParticipant}
    />
  );

  const tabs: HudTab<BattleFormTabId>[] = [
    {
      id: BATTLE_FORM_TAB.basic,
      label: "Основне",
      content: (
        <BattleFormBasicInfo
          name={formData.name}
          description={formData.description}
          onNameChange={(value) => setup.setFormData((prev) => ({ ...prev, name: value }))}
          onDescriptionChange={(value) => setup.setFormData((prev) => ({ ...prev, description: value }))}
        />
      ),
    },
    {
      id: BATTLE_FORM_TAB.heroes,
      label: "Герої",
      content: (
        <CharactersListCard
          playerCharacters={setup.playerCharacters}
          npcCharacters={setup.npcCharacters}
          entityStats={entityStats?.characterStats ?? null}
          isParticipantSelected={setup.isParticipantSelected}
          onParticipantToggle={setup.handleParticipantToggle}
        />
      ),
    },
    {
      id: BATTLE_FORM_TAB.units,
      label: "Юніти",
      content: (
        <div className="space-y-4">
          {!isEdit && (
            <AutopickCard
              hasAllies={setup.hasAllies}
              balanceLoading={setup.balanceLoading}
              balanceRace={setup.balanceRace}
              races={setup.races}
              suggestedEnemies={setup.suggestedEnemies}
              suggestDone={setup.suggestDone}
              actions={{ onBalanceRaceChange: setup.setBalanceRace, onSuggestEnemies: setup.suggestEnemies, onApplySuggestedEnemies: setup.applySuggestedEnemies }}
            />
          )}
          <UnitsListCard
            units={setup.units}
            entityStats={entityStats?.unitStats ?? null}
            isParticipantSelected={setup.isParticipantSelected}
            getParticipantSide={setup.getParticipantSide}
            getParticipantQuantity={setup.getParticipantQuantity}
            onParticipantToggle={setup.handleParticipantToggle}
            onAddToEnemies={(id, quantity) => setup.handleAddToSide(id, ParticipantSourceType.UNIT, ParticipantSide.ENEMY, quantity)}
            onMoveToAllies={(id) => setup.handleAddToSide(id, ParticipantSourceType.UNIT, ParticipantSide.ALLY)}
            onQuantityChange={setup.handleQuantityChange}
          />
        </div>
      ),
    },
    {
      id: BATTLE_FORM_TAB.roster,
      label: `Склад · ${participants.length}`,
      content: (
        <div>
          <BalanceSummary fair={setup.fair} />
          <div className="grid gap-4 md:grid-cols-2">
            {sidePanel(ParticipantSide.ALLY)}
            {sidePanel(ParticipantSide.ENEMY)}
          </div>
        </div>
      ),
    },
  ];

  return (
    <HudFormPage
      title={title}
      aside={isEdit ? "Оновіть учасників та їх ролі в битві" : "Оберіть учасників та розподіліть їх на союзників та ворогів"}
      className={PAGE_CLASS}
    >
      <HudForm
        id={isEdit ? "battle-edit-form" : "battle-form"}
        onSubmit={setup.handleSubmit}
        tabs={tabs}
        actions={
          <>
            {isEdit && (
              <Button type="button" variant="destructive" onClick={setup.handleDelete} disabled={setup.deleting}>
                {setup.deleting ? "Видалення..." : "Видалити"}
              </Button>
            )}
            <Button type="button" variant="outline" asChild>
              <Link href={`/campaigns/${campaignId}/dm/battles`}>Скасувати</Link>
            </Button>
            <Button type="submit" disabled={setup.saving}>
              {isEdit ? (setup.saving ? "Збереження..." : "Зберегти зміни") : setup.saving ? "Створення..." : "Створити сцену бою"}
            </Button>
          </>
        }
      />
    </HudFormPage>
  );
}

function EditBattleSetup({ campaignId, battleId }: { campaignId: string; battleId: string }) {
  const { initial, loading } = useBattleSetupInitial(campaignId, battleId);

  if (loading) return <SetupLoading title="Редагувати сцену бою" />;

  return <BattleSetupLayout campaignId={campaignId} battleId={battleId} initial={initial} />;
}

export function BattleSetupForm({ campaignId, battleId }: BattleSetupFormProps) {
  if (battleId) return <EditBattleSetup campaignId={campaignId} battleId={battleId} />;

  return <BattleSetupLayout campaignId={campaignId} />;
}
