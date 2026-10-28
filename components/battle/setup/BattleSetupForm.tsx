"use client";

import Link from "next/link";

import { AutopickCard } from "./AutopickCard";
import { BalanceSummary } from "./BalanceSummary";
import { BattleFormBasicInfo } from "./BattleFormBasicInfo";
import { BattleFormMap } from "./BattleFormMap";
import { CharactersListCard } from "./CharactersListCard";
import { SidePanelCard } from "./SidePanelCard";
import { UnitsListCard } from "./UnitsListCard";

import { BATTLE_FORM_TAB, type BattleFormTabId } from "@/components/battle/setup/battle-form-tabs";
import { LoadingState } from "@/components/common/states";
import { HudForm, HudFormPage, type HudTab } from "@/components/hud/form";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import { Button } from "@/components/ui/button";
import { ParticipantSide } from "@/lib/constants/battle";
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

  if (setup.loading) return <SetupLoading title={title} />;

  const { participants, details, data, balance, form } = setup;

  const sidePanel = (side: ParticipantSide) => (
    <SidePanelCard
      side={side}
      participants={participants.list}
      characters={data.characters}
      units={data.units}
      actions={participants.actions}
    />
  );

  const tabs: HudTab<BattleFormTabId>[] = [
    {
      id: BATTLE_FORM_TAB.basic,
      label: "Основне",
      content: <BattleFormBasicInfo details={details} />,
    },
    { id: BATTLE_FORM_TAB.map, label: "Карта", content: <BattleFormMap editor={setup.mapEditor} /> },
    {
      id: BATTLE_FORM_TAB.heroes,
      label: "Герої",
      content: (
        <CharactersListCard
          playerCharacters={data.playerCharacters}
          npcCharacters={data.npcCharacters}
          entityStats={data.entityStats?.characterStats ?? null}
          selection={participants.selection}
          actions={participants.actions}
        />
      ),
    },
    {
      id: BATTLE_FORM_TAB.units,
      label: "Юніти",
      content: (
        <div className="space-y-4">
          {!isEdit && (
            <AutopickCard hasAllies={participants.allies.exists} races={data.races} balance={balance} />
          )}
          <UnitsListCard units={data.units} entityStats={data.entityStats?.unitStats ?? null} selection={participants.selection} actions={participants.actions} />
        </div>
      ),
    },
    {
      id: BATTLE_FORM_TAB.roster,
      label: `Склад · ${participants.list.length}`,
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
      <OnboardingHint id="dm.battle-setup" className="mb-3" />
      <HudForm
        id={isEdit ? "battle-edit-form" : "battle-form"}
        onSubmit={form.actions.submit}
        tabs={tabs}
        actions={
          <>
            {isEdit && (
              <Button type="button" variant="destructive" onClick={form.actions.remove} disabled={form.status.isDeleting}>
                {form.status.isDeleting ? "Видалення..." : "Видалити"}
              </Button>
            )}
            <Button type="button" variant="outline" asChild>
              <Link href={`/campaigns/${campaignId}/dm/battles`}>Скасувати</Link>
            </Button>
            <Button type="submit" disabled={form.status.isSaving}>
              {isEdit ? (form.status.isSaving ? "Збереження..." : "Зберегти зміни") : form.status.isSaving ? "Створення..." : "Створити сцену бою"}
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
