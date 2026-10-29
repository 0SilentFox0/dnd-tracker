"use client";

import { useTranslations } from "next-intl";
import { Award, Plus } from "lucide-react";

import { BackgroundCard } from "@/components/backgrounds/BackgroundCard";
import { CreateBackgroundDialog } from "@/components/backgrounds/CreateBackgroundDialog";
import { EmptyState, LoadingState } from "@/components/common/states";
import { ContentTransferButtons } from "@/components/content-import/ContentTransferButtons";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useBackgroundsList } from "@/lib/hooks/backgrounds";

export function DMBackgroundsPageClient({ campaignId }: { campaignId: string }) {
  const t = useTranslations("backgrounds");

  const list = useBackgroundsList(campaignId);

  const backgrounds = list.items;

  return (
    <HudPage>
      <HudPageHeader
        title={t("page.title")}
        subtitle={t("page.subtitle", { count: backgrounds.length })}
        actions={
          <>
            <ContentTransferButtons campaignId={campaignId} kind="backgrounds" />
            <Button onClick={() => list.createDialog.setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("page.create")}
            </Button>
          </>
        }
      />
      {list.isLoading ? (
        <LoadingState rows={6} label={t("page.loading")} />
      ) : backgrounds.length === 0 ? (
        <EmptyState icon={Award} title={t("page.emptyTitle")} description={t("page.emptyDescription")} />
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
