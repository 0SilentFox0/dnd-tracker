"use client";

import { useTranslations } from "next-intl";
import { Dna, Plus } from "lucide-react";

import { SearchEmptyState } from "@/components/common/SearchEmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState, LoadingState } from "@/components/common/states";
import { ContentTransferButtons } from "@/components/content-import/ContentTransferButtons";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import { CreateRaceDialog } from "@/components/races/CreateRaceDialog";
import { RaceCard } from "@/components/races/RaceCard";
import { Button } from "@/components/ui/button";
import { useRacesList } from "@/lib/hooks/races";

export function DMRacesPageClient({ campaignId }: { campaignId: string }) {
  const t = useTranslations("races");

  const list = useRacesList(campaignId);

  const { races } = list;

  const total = list.total;

  return (
    <HudPage>
      <HudPageHeader
        title={t("page.title")}
        subtitle={t("page.subtitle", { count: total })}
        actions={
          <>
            <ContentTransferButtons campaignId={campaignId} kind="races" />
            <Button onClick={() => list.createDialog.setOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t("page.create")}
            </Button>
          </>
        }
      />
      <OnboardingHint id="dm.races" />

      {list.isLoading && total === 0 ? (
        <LoadingState rows={6} label={t("page.loading")} />
      ) : total === 0 ? (
        <EmptyState icon={Dna} title={t("page.emptyTitle")} description={t("page.emptyDescription")} />
      ) : (
        <>
          <SearchInput value={list.search.query.value} onChange={list.search.query.set} label={t("page.searchLabel")} />
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
