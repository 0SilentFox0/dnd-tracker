"use client";

import { useTranslations } from "next-intl";
import { Crown, EyeOff, Heart, LogIn, ShieldAlert, Skull, Trash2, VenetianMask } from "lucide-react";

import { SideDot } from "@/components/battle/hud";
import { SelectField } from "@/components/ui/select-field";
import { CombatStatus, ParticipantSourceType } from "@/lib/constants/battle";
import { type DmParticipantActions, useBattleRules, useModeView } from "@/lib/hooks/battle";
import { useConfirm } from "@/lib/hooks/common";
import { useText } from "@/lib/i18n/use-text";
import { cn } from "@/lib/utils";
import { lairAbilities } from "@/lib/utils/battle/actions/lair";
import { hasLegendaryActions, legendaryBadge } from "@/lib/utils/battle/actions/legendary-options";
import { mult } from "@/lib/utils/common/format";
import type { BattleParticipant } from "@/types/battle";

function scaleLabel({ battleData }: BattleParticipant, t: ReturnType<typeof useTranslations<"battleDm.row">>, wounds: boolean): string | null {
  const parts = [battleData.hpMultiplier, battleData.damageMultiplier].map((m) => (m !== undefined && m !== 1 ? m : null));

  if (parts[0] === null && parts[1] === null) return null;

  return [parts[0] !== null && t(wounds ? "scaleWounds" : "scaleHp", { value: mult(parts[0]) }), parts[1] !== null && t("scaleDamage", { value: mult(parts[1]) })].filter(Boolean).join(" · ");
}

const ICON = "flex size-8 items-center justify-center border border-transparent bg-[color-mix(in_srgb,var(--hud-bone)_5%,transparent)] transition-colors";

interface DmParticipantRowProps {
  participant: BattleParticipant;
  controlled: boolean;
  actions: DmParticipantActions;
}

export function DmParticipantRow({ participant, controlled, actions }: DmParticipantRowProps) {
  const { onChangeHp, onTakeControl, onRemove, onToReserve, onKill, onConditions, onLegendary, onToggleLair, conditionsEnabled, onDone, unitControl } = actions;

  const t = useTranslations("battleDm.row");

  const tCommon = useTranslations("common.actions");

  const tMask = useTranslations("battleDm.maze.toolbar");

  const masked = useModeView().view?.maskedIds?.has(participant.basicInfo.id) ?? false;

  const confirm = useConfirm();

  const close = () => onDone?.();

  const { hpTerm } = useBattleRules();

  const label = scaleLabel(participant, t, hpTerm === "wounds");

  const canKill = onKill && participant.basicInfo.sourceType === ParticipantSourceType.UNIT && participant.combatStats.status !== CombatStatus.DEAD;

  const legendary = onLegendary && hasLegendaryActions(participant) ? participant.battleData.legendary : undefined;

  const hasLair = !!participant.battleData.lair || lairAbilities(participant).length > 0;

  const text = useText();

  const badge = legendaryBadge(participant);

  const canConditions = onConditions && conditionsEnabled;

  const legendaryLabel = t("legendary", { left: legendary?.actionsLeft ?? 0, max: legendary?.actions ?? 0 });

  return (
    <div className={cn("flex flex-col gap-1 border-b border-white/[.08] py-1", controlled && "bg-[var(--gold)]/[.08]")}>
      {/* ім’я цілком + селект «Керує» зверху (селект переноситься на новий рядок, коли не вміщується), усі іконки під ними */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <SideDot side={participant.basicInfo.side} />
        <div className="min-w-0 flex-1 basis-32">
          <div className="break-words text-sm font-medium text-[var(--ink)]">{participant.basicInfo.name}{masked && <VenetianMask aria-label={tMask("illusion")} className="ml-1 inline size-4 text-[var(--hud-muted)]" />}</div>
          {label && <div className="break-words text-xs text-[var(--hud-muted)]" data-testid="balance-scale">{label}</div>}
          {badge && <div className="break-words text-xs text-[var(--hud-muted)]" data-testid="legendary-badge">{text(badge)}</div>}
        </div>
        {unitControl?.isAssignable(participant) && (
          <label className="ml-auto flex items-center gap-1.5 text-xs text-[var(--hud-muted)]">
            {t("controls")}
            <SelectField value={unitControl.valueOf(participant)} options={unitControl.options} onValueChange={(v) => unitControl.assign(participant, v)} triggerClassName="h-7 w-28 text-xs" />
          </label>
        )}
      </div>
      <div className="flex items-center gap-0.5 pl-5">
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
        {onToReserve && (
          <button
            type="button"
            className={ICON}
            title={t("toReserve")}
            aria-label={t("toReserve")}
            onClick={async () => {
              if (await confirm({ title: t("toReserveConfirm", { name: participant.basicInfo.name }), confirmLabel: t("toReserve") })) {
                onToReserve(participant);
                close();
              }
            }}
          >
            <EyeOff className="size-3.5" />
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
