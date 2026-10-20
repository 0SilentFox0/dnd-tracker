import Link from "next/link";

import { HudCard, HudPill } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { BattleStatus } from "@/lib/constants/battle";

interface BattleListCardProps {
  battle: { id: string; name: string; description: string | null; currentRound: number; participants: unknown };
  campaignId: string;
  kind: BattleStatus;
}

const KIND = {
  [BattleStatus.ACTIVE]: { tone: "active", badge: <HudPill tone="gold">Активний</HudPill> },
  [BattleStatus.PREPARED]: { tone: "default", badge: <HudPill tone="accent">Підготовлено</HudPill> },
  [BattleStatus.COMPLETED]: { tone: "muted", badge: <HudPill tone="muted">Завершено</HudPill> },
} as const;

export function BattleListCard({ battle, campaignId, kind }: BattleListCardProps) {
  const participantCount = Array.isArray(battle.participants) ? battle.participants.length : 0;

  const editHref = `/campaigns/${campaignId}/dm/battles/${battle.id}`;

  const playHref = `/campaigns/${campaignId}/battles/${battle.id}`;

  return (
    <HudCard tone={KIND[kind].tone} className="space-y-3 p-4">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="hud-sc min-w-0 text-lg leading-tight text-hud-ink">{battle.name}</h3>
          {KIND[kind].badge}
        </div>
        {battle.description && <p className="text-sm text-hud-muted">{battle.description}</p>}
      </div>

      <div className="text-sm text-hud-muted">
        {kind === BattleStatus.ACTIVE && (
          <p>
            Раунд: <span className="font-semibold text-hud-bone">{battle.currentRound}</span>
          </p>
        )}
        <p>
          Учасників: <span className="font-semibold text-hud-bone">{participantCount}</span>
        </p>
      </div>

      {kind === BattleStatus.ACTIVE && (
        <Button asChild className="w-full">
          <Link href={playHref}>Перейти до бою</Link>
        </Button>
      )}
      {kind === BattleStatus.PREPARED && (
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={editHref}>Редагувати</Link>
          </Button>
          <Button asChild size="sm" className="flex-1">
            <Link href={playHref}>Запустити</Link>
          </Button>
        </div>
      )}
      {kind === BattleStatus.COMPLETED && (
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href={editHref}>Переглянути</Link>
        </Button>
      )}
    </HudCard>
  );
}
