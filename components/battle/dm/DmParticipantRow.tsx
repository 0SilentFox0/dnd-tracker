"use client";

import { useTranslations } from "next-intl";
import { Crown, Heart, LogIn, ShieldAlert, Skull, Trash2 } from "lucide-react";

import { SideDot } from "@/components/battle/hud";
import { SelectField } from "@/components/ui/select-field";
import { CombatStatus, ParticipantSourceType } from "@/lib/constants/battle";
import type { DmParticipantActions } from "@/lib/hooks/battle";
import { useConfirm } from "@/lib/hooks/common";
import { useText } from "@/lib/i18n/use-text";
import { cn } from "@/lib/utils";
import { lairAbilities } from "@/lib/utils/battle/actions/lair";
import { hasLegendaryActions, legendaryBadge } from "@/lib/utils/battle/actions/legendary-options";
import { mult } from "@/lib/utils/common/format";
import type { BattleParticipant } from "@/types/battle";

function scaleLabel({ battleData }: BattleParticipant, t: ReturnType<typeof useTranslations<"battleDm.row">>): string | null {
  const parts = [battleData.hpMultiplier, battleData.damageMultiplier].map((m) => (m !== undefined && m !== 1 ? m : null));

  if (parts[0] === null && parts[1] === null) return null;

  return [parts[0] !== null && t("scaleHp", { value: mult(parts[0]) }), parts[1] !== null && t("scaleDamage", { value: mult(parts[1]) })].filter(Boolean).join(" · ");
}

const ICON = "flex size-8 items-center justify-center border border-transparent bg-black/40 transition-colors";

interface DmParticipantRowProps {
  participant: BattleParticipant;
  controlled: boolean;
  actions: DmParticipantActions;
}

export function DmParticipantRow({ participant, controlled, actions }: DmParticipantRowProps) {
  const { onChangeHp, onTakeControl, onRemove, onKill, onConditions, onLegendary, onToggleLair, conditionsEnabled, onDone, unitControl } = actions;

  const t = useTranslations("battleDm.row");

  const tCommon = useTranslations("common.actions");

  const confirm = useConfirm();

  const close = () => onDone?.();

  const label = scaleLabel(participant, t);

  const canKill = onKill && participant.basicInfo.sourceType === ParticipantSourceType.UNIT && participant.combatStats.status !== CombatStatus.DEAD;

  const legendary = onLegendary && hasLegendaryActions(participant) ? participant.battleData.legendary : undefined;

  const hasLair = !!participant.battleData.lair || lairAbilities(participant).length > 0;

  const text = useText();

  const badge = legendaryBadge(participant);

  const canConditions = onConditions && conditionsEnabled;

  const legendaryLabel = t("legendary", { left: legendary?.actionsLeft ?? 0, max: legendary?.actions ?? 0 });

  return (
    <div className={cn("flex min-h-10 items-center gap-2 border-b border-white/[.08] py-1", controlled && "bg-[var(--gold)]/[.08]")}>
      <SideDot side={participant.basicInfo.side} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-[var(--ink)]">{participant.basicInfo.name}</div>
        {label && <div className="truncate text-xs text-[var(--hud-muted)]" data-testid="balance-scale">{label}</div>}
        {badge && <div className="truncate text-xs text-[var(--hud-muted)]" data-testid="legendary-badge">{text(badge)}</div>}
        {unitControl?.isAssignable(participant) && (
          <label className="flex items-center gap-1.5 pt-1 text-xs text-[var(--hud-muted)]">
            {t("controls")}
            <SelectField value={unitControl.valueOf(participant)} options={unitControl.options} onValueChange={(v) => unitControl.assign(participant, v)} triggerClassName="h-7 text-xs" />
          </label>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          className={cn(ICON, "text-hud-good hover:border-hud-good/40")}
          title={t("changeHp")}
          onClick={() => {
            onChangeHp(participant);
            close();
          }}
        >
          <Heart className="size-3.5" />
        </button>
        <button
          type="button"
          className={cn(ICON, "text-[var(--gold)] hover:border-[var(--gold)]/40", controlled && "border-[var(--gold)]/60")}
          title={controlled ? t("releaseControl") : t("takeControl")}
          onClick={() => {
            onTakeControl(controlled ? null : participant);
            close();
          }}
        >
          <LogIn className="size-3.5" />
        </button>
        {hasLair && onToggleLair && <button type="button" className={cn(ICON, participant.battleData.lair?.active && "text-hud-gold-bright")} aria-label={participant.battleData.lair?.active ? t("lairOff") : t("lairOn")} title={participant.battleData.lair?.active ? t("inLair") : t("outLair")} aria-pressed={!!participant.battleData.lair?.active} onClick={() => onToggleLair(participant)}>🏰</button>}
        {(legendary || hasLair && onLegendary) && (
          <button type="button" className={cn(ICON, "text-[var(--gold)] hover:border-[var(--gold)]/40")} title={legendaryLabel} aria-label={legendaryLabel} onClick={() => onLegendary?.(participant)}>
            <Crown className="size-3.5" />
          </button>
        )}
        {canConditions && (
          <button type="button" className={cn(ICON, "text-[#8fd0e8] hover:border-[#8fd0e8]/40")} title={t("conditions")} onClick={() => onConditions(participant)}>
            <ShieldAlert className="size-3.5" />
          </button>
        )}
        {canKill && (
          <button
            type="button"
            className={cn(ICON, "text-hud-danger hover:border-hud-danger/40")}
            title={t("kill")}
            onClick={async () => {
              if (await confirm({ title: t("killConfirm", { name: participant.basicInfo.name }), confirmLabel: t("kill"), destructive: true })) {
                onKill(participant);
                close();
              }
            }}
          >
            <Skull className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          className={cn(ICON, "text-hud-danger hover:border-hud-danger/40")}
          title={t("remove")}
          onClick={async () => {
            if (await confirm({ title: t("removeConfirm", { name: participant.basicInfo.name }), confirmLabel: tCommon("delete"), destructive: true })) {
              onRemove(participant);
              close();
            }
          }}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
