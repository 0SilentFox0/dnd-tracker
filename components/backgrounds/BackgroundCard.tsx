"use client";

import Link from "next/link";
import { Edit, Trash2 } from "lucide-react";

import { ActionsMenu } from "@/components/common/ActionsMenu";
import { HudCard } from "@/components/hud/page";
import { Badge } from "@/components/ui/badge";
import { pluralUk } from "@/lib/utils/common/plural";
import type { BackgroundData } from "@/types/backgrounds";

export function BackgroundCard({ background, campaignId, onDelete }: { background: BackgroundData; campaignId: string; onDelete: (backgroundId: string) => void }) {
  const href = `/campaigns/${campaignId}/dm/backgrounds/${background.id}`;

  const choices = background.choices.length;

  return (
    <HudCard className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Link href={href} className="min-w-0 flex-1">
          <h3 className="hud-sc truncate text-lg text-hud-ink">{background.name}</h3>
        </Link>
        <ActionsMenu
          triggerSize="sm"
          triggerClassName="h-8 w-8 p-0"
          actions={[
            { label: "Редагувати", icon: Edit, href },
            { label: "Видалити", icon: Trash2, onSelect: () => onDelete(background.id), destructive: true },
          ]}
        />
      </div>
      <Link href={href} className="flex flex-wrap gap-2">
        {choices > 0 && <Badge variant="outline">{`${choices} ${pluralUk(choices, ["вибір", "вибори", "виборів"])}`}</Badge>}
      </Link>
    </HudCard>
  );
}
