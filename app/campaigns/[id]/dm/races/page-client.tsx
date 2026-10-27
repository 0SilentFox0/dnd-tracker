"use client";

import { Dna, Plus } from "lucide-react";

import { SearchEmptyState } from "@/components/common/SearchEmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState, LoadingState } from "@/components/common/states";
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

  const total = list.total;

  return (
    <HudPage>
      <HudPageHeader
        title="Ігрові Раси"
        subtitle={`${total} ${pluralUk(total, ["раса", "раси", "рас"])}`}
        actions={
          <Button onClick={() => list.createDialog.setOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Створити расу
          </Button>
        }
      />
      <OnboardingHint id="dm.races" />

      {list.isLoading && total === 0 ? (
        <LoadingState rows={6} label="Завантаження рас…" />
      ) : total === 0 ? (
        <EmptyState icon={Dna} title="Ще немає рас" description="Створіть першу расу." />
      ) : (
        <>
          <SearchInput value={list.search.query.value} onChange={list.search.query.set} label="Пошук рас" />
          {races.length === 0 ? (
            <SearchEmptyState query={list.search.query.value} onClear={() => list.search.query.set("")} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {races.map((race) => (
                <RaceCard key={race.id} race={race} campaignId={campaignId} onDelete={list.actions.deleteRace} />
              ))}
            </div>
          )}
        </>
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
