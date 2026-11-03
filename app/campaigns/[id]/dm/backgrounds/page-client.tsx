"use client";

import { useTranslations } from "next-intl";
import { Award, Plus } from "lucide-react";

import { BackgroundCard } from "@/components/backgrounds/BackgroundCard";
import { CreateBackgroundDialog } from "@/components/backgrounds/CreateBackgroundDialog";
import { DmCardGrid, DmListBody } from "@/components/common/DmListBody";
import { EmptyState } from "@/components/common/states";
import { ContentTransferButtons } from "@/components/content-import/ContentTransferButtons";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useBackgroundsList } from "@/lib/hooks/backgrounds";

export function DMBackgroundsPageClient({ campaignId, canEdit = true }: { campaignId: string; canEdit?: boolean }) {
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
            {canEdit && <ContentTransferButtons campaignId={campaignId} kind="backgrounds" />}
            {canEdit && <Button onClick={() => list.createDialog.setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("page.create")}
            </Button>}
          </>
        }
      />
      <DmListBody
        isLoading={list.isLoading}
        isEmpty={backgrounds.length === 0}
        loadingLabel={t("page.loading")}
        empty={<EmptyState icon={Award} title={t("page.emptyTitle")} description={t("page.emptyDescription")} />}
      >
        <DmCardGrid>
          {backgrounds.map((background) => (
            <BackgroundCard key={background.id} background={background} campaignId={campaignId} onDelete={canEdit ? list.remove : undefined} canEdit={canEdit} />
          ))}
        </DmCardGrid>
      </DmListBody>
      {canEdit && <CreateBackgroundDialog open={list.createDialog.open} onOpenChange={list.createDialog.setOpen} onCreateBackground={list.create} />}
    </HudPage>
  );
}
