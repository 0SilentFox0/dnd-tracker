import Link from "next/link";
import { useTranslations } from "next-intl";

import { HudCard, HudPill } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { BattleStatus } from "@/lib/constants/battle";
import { useDeleteBattleCard } from "@/lib/hooks/battles";

interface BattleListCardProps {
  battle: { id: string; name: string; description: string | null; currentRound: number; participants: unknown };
  campaignId: string;
  kind: BattleStatus;
}

const KIND = {
  [BattleStatus.ACTIVE]: { tone: "active", pill: "gold" },
  [BattleStatus.PREPARED]: { tone: "default", pill: "accent" },
  [BattleStatus.COMPLETED]: { tone: "muted", pill: "muted" },
} as const;

export function BattleListCard({ battle, campaignId, kind }: BattleListCardProps) {
  const t = useTranslations("battleSetup.list");

  const { isDeleting, onDelete } = useDeleteBattleCard(campaignId, battle.id);

  const participantCount = Array.isArray(battle.participants) ? battle.participants.length : 0;

  const editHref = `/campaigns/${campaignId}/dm/battles/${battle.id}`;

  const playHref = `/campaigns/${campaignId}/battles/${battle.id}`;

  const deleteButton = (
    <Button variant="destructive" size="sm" disabled={isDeleting} onClick={onDelete}>
      {t("card.delete")}
    </Button>
  );

  return (
    <HudCard tone={KIND[kind].tone} className="space-y-3 p-4">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="hud-sc min-w-0 text-lg leading-tight text-hud-ink">{battle.name}</h3>
          <HudPill tone={KIND[kind].pill}>{t(`status.${kind}`)}</HudPill>
        </div>
        {battle.description && <p className="text-sm text-hud-muted">{battle.description}</p>}
      </div>

      <div className="text-sm text-hud-muted">
        {kind === BattleStatus.ACTIVE && (
          <p>
            {t("card.round")} <span className="font-semibold text-hud-bone">{battle.currentRound}</span>
          </p>
        )}
        <p>
          {t("card.participants")} <span className="font-semibold text-hud-bone">{participantCount}</span>
        </p>
      </div>

      {kind === BattleStatus.ACTIVE && (
        <div className="flex gap-2">
          <Button asChild size="sm" className="flex-1">
            <Link href={playHref}>{t("card.play")}</Link>
          </Button>
          {deleteButton}
        </div>
      )}
      {kind === BattleStatus.PREPARED && (
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={editHref}>{t("card.edit")}</Link>
          </Button>
          <Button asChild size="sm" className="flex-1">
            <Link href={playHref}>{t("card.start")}</Link>
          </Button>
          {deleteButton}
        </div>
      )}
      {kind === BattleStatus.COMPLETED && (
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={editHref}>{t("card.view")}</Link>
          </Button>
          {deleteButton}
        </div>
      )}
    </HudCard>
  );
}
