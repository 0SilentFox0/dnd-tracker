"use client";

import { useTranslations } from "next-intl";
import { Award, Plus } from "lucide-react";

import { EmptyState, LoadingState } from "@/components/common/states";
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

      {list.isLoading && all.length === 0 ? (
        <LoadingState rows={6} label={t("page.loading")} />
      ) : all.length === 0 ? (
        <EmptyState icon={Award} title={t("page.emptyTitle")} description={t("page.emptyDescription")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {feats.map((feat) => (
            <FeatCard key={feat.id} feat={feat} campaignId={campaignId} onDelete={list.actions.deleteFeat} />
          ))}
        </div>
      )}

      <CreateFeatDialog open={list.createDialog.open} onOpenChange={list.createDialog.setOpen} onCreateFeat={list.actions.createFeat} />
    </HudPage>
  );
}
