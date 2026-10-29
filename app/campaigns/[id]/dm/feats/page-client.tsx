"use client";

import { useTranslations } from "next-intl";
import { Award, Plus } from "lucide-react";

import { DmCardGrid, DmListBody } from "@/components/common/DmListBody";
import { EmptyState } from "@/components/common/states";
import { ContentTransferButtons } from "@/components/content-import/ContentTransferButtons";
import { CreateFeatDialog } from "@/components/feats/CreateFeatDialog";
import { FeatCard } from "@/components/feats/FeatCard";
import { HudChipTabs, HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { FEAT_TYPES } from "@/lib/constants/choices";
import { useFeatsList } from "@/lib/hooks/feats";

export function DMFeatsPageClient({ campaignId }: { campaignId: string }) {
  const t = useTranslations("feats");

  const list = useFeatsList(campaignId);

  const { feats, all, typeFilter } = list;

  return (
    <HudPage>
      <HudPageHeader
        title={t("page.title")}
        subtitle={t("page.subtitle", { count: all.length })}
        actions={
          <>
            <ContentTransferButtons campaignId={campaignId} kind="feats" />
            <Button onClick={() => list.createDialog.setOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t("page.create")}
            </Button>
          </>
        }
      />

      {all.length > 0 && (
        <HudChipTabs
          ariaLabel={t("page.filterLabel")}
          items={[{ key: "all", label: t("page.filterAll"), active: typeFilter.value === null, onSelect: () => typeFilter.set(null) }, ...FEAT_TYPES.map((type) => ({ key: type, label: t(`types.${type}`), active: typeFilter.value === type, onSelect: () => typeFilter.set(type) }))]}
        />
      )}

      <DmListBody
        isLoading={list.isLoading}
        isEmpty={all.length === 0}
        loadingLabel={t("page.loading")}
        empty={<EmptyState icon={Award} title={t("page.emptyTitle")} description={t("page.emptyDescription")} />}
      >
        <DmCardGrid>
          {feats.map((feat) => (
            <FeatCard key={feat.id} feat={feat} campaignId={campaignId} onDelete={list.actions.deleteFeat} />
          ))}
        </DmCardGrid>
      </DmListBody>

      <CreateFeatDialog open={list.createDialog.open} onOpenChange={list.createDialog.setOpen} onCreateFeat={list.actions.createFeat} />
    </HudPage>
  );
}
