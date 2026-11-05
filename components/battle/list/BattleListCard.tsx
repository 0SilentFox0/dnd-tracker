import Link from "next/link";
import { useTranslations } from "next-intl";

import { HudCard, HudPill } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { BattleStatus } from "@/lib/constants/battle";
import { useDeleteBattleCard, useResetBattleCard } from "@/lib/hooks/battles";

interface BattleListCardProps {
  battle: { id: string; name: string; description: string | null; currentRound: number; participants: unknown };
  campaignId: string;
  kind: BattleStatus;
  canEdit?: boolean;
  "data-tour"?: string;
}

const KIND = {
  [BattleStatus.ACTIVE]: { tone: "active", pill: "gold" },
  [BattleStatus.PREPARED]: { tone: "default", pill: "accent" },
  [BattleStatus.COMPLETED]: { tone: "muted", pill: "muted" },
} as const;

export function BattleListCard({ battle, campaignId, kind, canEdit = true, "data-tour": dataTour }: BattleListCardProps) {
  const t = useTranslations("battleSetup.list");

  const { isDeleting, onDelete } = useDeleteBattleCard(campaignId, battle.id);

  const { isResetting, onReset } = useResetBattleCard(campaignId, battle.id, kind === BattleStatus.COMPLETED ? "replay" : "stop");

  const participantCount = Array.isArray(battle.participants) ? battle.participants.length : 0;

  const editHref = `/campaigns/${campaignId}/dm/battles/${battle.id}`;

  const playHref = `/campaigns/${campaignId}/battles/${battle.id}`;

  const deleteButton = canEdit && (
    <Button variant="destructive" size="sm" disabled={isDeleting} onClick={onDelete}>
      {t("card.delete")}
    </Button>
  );

  const resetButton = (label: string) =>
    canEdit && (
      <Button variant="outline" size="sm" disabled={isResetting} onClick={onReset}>
        {label}
      </Button>
    );

  const editButton = (label: string) =>
    canEdit && (
      <Button asChild variant="outline" size="sm" className="flex-1">
        <Link href={editHref}>{label}</Link>
      </Button>
    );

  return (
    <HudCard tone={KIND[kind].tone} className="space-y-3 p-4" data-tour={dataTour}>
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
            <Link href={playHref} data-tour="battle.open">{t("card.play")}</Link>
          </Button>
          {resetButton(t("card.stop"))}
          {deleteButton}
        </div>
      )}
      {kind === BattleStatus.PREPARED && (
        <div className="flex gap-2">
          {editButton(t("card.edit"))}
          <Button asChild size="sm" className="flex-1">
            <Link href={playHref} data-tour="battle.open">{t("card.start")}</Link>
          </Button>
          {deleteButton}
        </div>
      )}
      {kind === BattleStatus.COMPLETED && (
        <div className="flex gap-2">
          {!canEdit ? (
            <Button asChild size="sm" className="flex-1">
              <Link href={playHref} data-tour="battle.open">{t("card.play")}</Link>
            </Button>
          ) : editButton(t("card.view"))}
          {resetButton(t("card.replay"))}
          {deleteButton}
        </div>
      )}
    </HudCard>
  );
}
