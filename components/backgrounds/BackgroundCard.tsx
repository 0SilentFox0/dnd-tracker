"use client";

import { useTranslations } from "next-intl";

import { DmEntityCard } from "@/components/common/DmEntityCard";
import { Badge } from "@/components/ui/badge";
import type { BackgroundData } from "@/types/backgrounds";

export function BackgroundCard({ background, campaignId, onDelete }: { background: BackgroundData; campaignId: string; onDelete: (backgroundId: string) => void }) {
  const t = useTranslations("backgrounds");

  const choices = background.choices.length;

  return (
    <DmEntityCard href={`/campaigns/${campaignId}/dm/backgrounds/${background.id}`} title={background.name} onDelete={() => onDelete(background.id)}>
      {choices > 0 && <Badge variant="outline">{t("card.choices", { count: choices })}</Badge>}
    </DmEntityCard>
  );
}
