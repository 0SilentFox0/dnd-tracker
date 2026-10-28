"use client";

import Link from "next/link";
import { Edit, Trash2 } from "lucide-react";

import { ActionsMenu } from "@/components/common/ActionsMenu";
import { HudCard } from "@/components/hud/page";
import { Badge } from "@/components/ui/badge";
import { FEAT_TYPE_LABELS } from "@/lib/constants/choices";
import { pluralUk } from "@/lib/utils/common/plural";
import type { FeatData } from "@/types/choices";

export function FeatCard({ feat, campaignId, onDelete }: { feat: FeatData; campaignId: string; onDelete: (featId: string) => void }) {
  const href = `/campaigns/${campaignId}/dm/feats/${feat.id}`;

  const choices = feat.choices.length;

  return (
    <HudCard className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Link href={href} className="min-w-0 flex-1">
          <h3 className="hud-sc truncate text-lg text-hud-ink">{feat.name}</h3>
        </Link>
        <ActionsMenu
          triggerSize="sm"
          triggerClassName="h-8 w-8 p-0"
          actions={[
            { label: "Редагувати", icon: Edit, href },
            { label: "Видалити", icon: Trash2, onSelect: () => onDelete(feat.id), destructive: true },
          ]}
        />
      </div>
      <Link href={href} className="flex flex-wrap gap-2">
        <Badge variant="outline">{FEAT_TYPE_LABELS[feat.type]}</Badge>
        {feat.prerequisite.level && <Badge variant="outline">{`Рівень ${feat.prerequisite.level}+`}</Badge>}
        {feat.repeatable && <Badge variant="outline">Повторювана</Badge>}
        {choices > 0 && <Badge variant="outline">{`${choices} ${pluralUk(choices, ["вибір", "вибори", "виборів"])}`}</Badge>}
      </Link>
    </HudCard>
  );
}
