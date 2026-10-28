"use client";

import { Award, Plus } from "lucide-react";

import { EmptyState, LoadingState } from "@/components/common/states";
import { ContentTransferButtons } from "@/components/content-import/ContentTransferButtons";
import { CreateFeatDialog } from "@/components/feats/CreateFeatDialog";
import { FeatCard } from "@/components/feats/FeatCard";
import { HudChipTabs, HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { FEAT_TYPE_LABELS, FEAT_TYPES } from "@/lib/constants/choices";
import { useFeatsList } from "@/lib/hooks/feats";
import { pluralUk } from "@/lib/utils/common/plural";

export function DMFeatsPageClient({ campaignId }: { campaignId: string }) {
  const list = useFeatsList(campaignId);

  const { feats, all, typeFilter } = list;

  return (
    <HudPage>
      <HudPageHeader
        title="Риси"
        subtitle={`${all.length} ${pluralUk(all.length, ["риса", "риси", "рис"])}`}
        actions={
          <>
            <ContentTransferButtons campaignId={campaignId} kind="feats" />
            <Button onClick={() => list.createDialog.setOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Нова риса
            </Button>
          </>
        }
      />

      {all.length > 0 && (
        <HudChipTabs
          ariaLabel="Тип риси"
          items={[{ key: "all", label: "Усі", active: typeFilter.value === null, onSelect: () => typeFilter.set(null) }, ...FEAT_TYPES.map((t) => ({ key: t, label: FEAT_TYPE_LABELS[t], active: typeFilter.value === t, onSelect: () => typeFilter.set(t) }))]}
        />
      )}

      {list.isLoading && all.length === 0 ? (
        <LoadingState rows={6} label="Завантаження рис…" />
      ) : all.length === 0 ? (
        <EmptyState icon={Award} title="Ще немає рис" description="Створіть першу рису або імпортуйте їх з файлу." />
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
