"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Edit, Trash2 } from "lucide-react";

import { ActionsMenu } from "@/components/common/ActionsMenu";
import { HudCard } from "@/components/hud/page";
import { Badge } from "@/components/ui/badge";
import type { GameClassData } from "@/types/classes";

interface ClassCardProps {
  gameClass: GameClassData;
  campaignId: string;
  onDelete: (classId: string) => void;
}

export function ClassCard({ gameClass, campaignId, onDelete }: ClassCardProps) {
  const t = useTranslations();

  const href = `/campaigns/${campaignId}/dm/classes/${gameClass.id}`;

  return (
    <HudCard accent={gameClass.color ?? undefined} className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Link href={href} className="min-w-0 flex-1">
          <h3 className="hud-sc truncate text-lg text-hud-ink">{gameClass.name}</h3>
        </Link>
        <ActionsMenu
          triggerSize="sm"
          triggerClassName="h-8 w-8 p-0"
          actions={[
            { label: t("common.actions.edit"), icon: Edit, href },
            { label: t("common.actions.delete"), icon: Trash2, onSelect: () => onDelete(gameClass.id), destructive: true },
          ]}
        />
      </div>
      <Link href={href} className="flex flex-wrap gap-2">
        <Badge variant="outline">d{gameClass.hitDie}</Badge>
        <Badge variant="outline">{t(`classes.casters.${gameClass.caster}`)}</Badge>
        <Badge variant="outline">
          {t("classes.card.subclasses", { count: gameClass.subclasses.length })}
        </Badge>
      </Link>
    </HudCard>
  );
}
