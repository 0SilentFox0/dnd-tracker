"use client";

import { Dna, Plus } from "lucide-react";

import { EmptyState, LoadingState } from "@/components/common/states";
import { ContentTransferButtons } from "@/components/content-import/ContentTransferButtons";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import { CreateRaceDialog } from "@/components/races/CreateRaceDialog";
import { RaceCard } from "@/components/races/RaceCard";
import { Button } from "@/components/ui/button";
import { useRacesList } from "@/lib/hooks/races";
import { pluralUk } from "@/lib/utils/common/plural";

export function DMRacesPageClient({ campaignId }: { campaignId: string }) {
  const list = useRacesList(campaignId);

  const { races } = list;

  return (
    <HudPage>
      <HudPageHeader
        title="Ігрові Раси"
        subtitle={`${races.length} ${pluralUk(races.length, ["раса", "раси", "рас"])}`}
        actions={
          <>
            <ContentTransferButtons campaignId={campaignId} kind="races" />
            <Button onClick={() => list.createDialog.setOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Створити расу
            </Button>
          </>
        }
      />
      <OnboardingHint id="dm.races" />

      {list.isLoading && races.length === 0 ? (
        <LoadingState rows={6} label="Завантаження рас…" />
      ) : races.length === 0 ? (
        <EmptyState icon={Dna} title="Ще немає рас" description="Створіть першу расу." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {races.map((race) => (
            <RaceCard key={race.id} race={race} campaignId={campaignId} onDelete={list.actions.deleteRace} />
          ))}
        </div>
      )}

      <CreateRaceDialog
        open={list.createDialog.open}
        onOpenChange={list.createDialog.setOpen}
        campaignId={campaignId}
        onCreateRace={list.actions.createRace}
        status={list.createDialog.status}
      />
    </HudPage>
  );
}
