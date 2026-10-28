"use client";

import { useState } from "react";
import { Award, Plus } from "lucide-react";

import { BackgroundCard } from "@/components/backgrounds/BackgroundCard";
import { CreateBackgroundDialog } from "@/components/backgrounds/CreateBackgroundDialog";
import { EmptyState, LoadingState } from "@/components/common/states";
import { ContentTransferButtons } from "@/components/content-import/ContentTransferButtons";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useBackgrounds, useCreateBackground, useDeleteBackground } from "@/lib/hooks/backgrounds";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import { errorMessage } from "@/lib/utils/common/error-message";

export function DMBackgroundsPageClient({ campaignId }: { campaignId: string }) {
  const { data: backgrounds = [], isLoading } = useBackgrounds(campaignId);

  const create = useCreateBackground(campaignId);

  const remove = useDeleteBackground(campaignId);

  const [open, setOpen] = useState(false);

  const confirm = useConfirm();

  const notify = useNotify();

  const onError = (e: Error) => void notify(errorMessage(e, "Не вдалося зберегти передісторію"));

  const onDelete = async (id: string) => {
    if (await confirm({ title: "Видалити передісторію?", confirmLabel: "Видалити", destructive: true })) remove.mutate(id, { onError });
  };

  return <HudPage>
    <HudPageHeader title="Передісторії" subtitle={`${backgrounds.length} у кампанії`} actions={<><ContentTransferButtons campaignId={campaignId} kind="backgrounds" /><Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Нова передісторія</Button></>} />
    {isLoading ? <LoadingState rows={6} label="Завантаження передісторій…" /> : backgrounds.length === 0 ? <EmptyState icon={Award} title="Ще немає передісторій" description="Створіть передісторію або імпортуйте її з файлу." /> : <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{backgrounds.map((background) => <BackgroundCard key={background.id} background={background} campaignId={campaignId} onDelete={onDelete} />)}</div>}
    <CreateBackgroundDialog open={open} onOpenChange={setOpen} onCreateBackground={(data) => create.mutate(data, { onSuccess: () => setOpen(false), onError })} />
  </HudPage>;
}
