"use client";

import { useTranslations } from "next-intl";

import { DmEntityCard } from "@/components/common/DmEntityCard";
import { Badge } from "@/components/ui/badge";
import type { GameClassData } from "@/types/classes";

interface ClassCardProps {
  gameClass: GameClassData;
  campaignId: string;
  onDelete: (classId: string) => void;
}

export function ClassCard({ gameClass, campaignId, onDelete }: ClassCardProps) {
  const t = useTranslations();

  return (
    <DmEntityCard href={`/campaigns/${campaignId}/dm/classes/${gameClass.id}`} title={gameClass.name} accent={gameClass.color ?? undefined} onDelete={() => onDelete(gameClass.id)}>
      <Badge variant="outline">d{gameClass.hitDie}</Badge>
      <Badge variant="outline">{t(`classes.casters.${gameClass.caster}`)}</Badge>
      <Badge variant="outline">{t("classes.card.subclasses", { count: gameClass.subclasses.length })}</Badge>
    </DmEntityCard>
  );
}
