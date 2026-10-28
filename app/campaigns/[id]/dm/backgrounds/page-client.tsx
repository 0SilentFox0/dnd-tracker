"use client";

import { Award, Plus } from "lucide-react";

import { BackgroundCard } from "@/components/backgrounds/BackgroundCard";
import { CreateBackgroundDialog } from "@/components/backgrounds/CreateBackgroundDialog";
import { EmptyState, LoadingState } from "@/components/common/states";
import { ContentTransferButtons } from "@/components/content-import/ContentTransferButtons";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useBackgroundsList } from "@/lib/hooks/backgrounds";

export function DMBackgroundsPageClient({ campaignId }: { campaignId: string }) {
  const list = useBackgroundsList(campaignId);

  const backgrounds = list.items;

  return (
    <HudPage>
      <HudPageHeader
        title="Передісторії"
        subtitle={`${backgrounds.length} у кампанії`}
        actions={
          <>
            <ContentTransferButtons campaignId={campaignId} kind="backgrounds" />
            <Button onClick={() => list.createDialog.setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Нова передісторія
            </Button>
          </>
        }
      />
      {list.isLoading ? (
        <LoadingState rows={6} label="Завантаження передісторій…" />
      ) : backgrounds.length === 0 ? (
        <EmptyState icon={Award} title="Ще немає передісторій" description="Створіть передісторію або імпортуйте її з файлу." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {backgrounds.map((background) => (
            <BackgroundCard key={background.id} background={background} campaignId={campaignId} onDelete={list.remove} />
          ))}
        </div>
      )}
      <CreateBackgroundDialog open={list.createDialog.open} onOpenChange={list.createDialog.setOpen} onCreateBackground={list.create} />
    </HudPage>
  );
}
