"use client";

import { useTranslations } from "next-intl";

import { DmEntityCard } from "@/components/common/DmEntityCard";
import { Badge } from "@/components/ui/badge";
import type { FeatData } from "@/types/choices";

export function FeatCard({ feat, campaignId, onDelete }: { feat: FeatData; campaignId: string; onDelete: (featId: string) => void }) {
  const t = useTranslations("feats");

  const choices = feat.choices.length;

  return (
    <DmEntityCard href={`/campaigns/${campaignId}/dm/feats/${feat.id}`} title={feat.name} icon={feat.icon} onDelete={() => onDelete(feat.id)}>
      <Badge variant="outline">{t(`types.${feat.type}`)}</Badge>
      {feat.prerequisite.level && <Badge variant="outline">{t("card.level", { level: feat.prerequisite.level })}</Badge>}
      {feat.repeatable && <Badge variant="outline">{t("card.repeatable")}</Badge>}
      {choices > 0 && <Badge variant="outline">{t("card.choices", { count: choices })}</Badge>}
    </DmEntityCard>
  );
}
