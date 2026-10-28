"use client";

import { Crown, Heart, LogIn, ShieldAlert, Skull, Trash2 } from "lucide-react";

import { SideDot } from "@/components/battle/hud";
import { SelectField } from "@/components/ui/select-field";
import { CombatStatus, ParticipantSourceType } from "@/lib/constants/battle";
import type { DmParticipantActions } from "@/lib/hooks/battle";
import { useConfirm } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import { hasLegendaryActions, legendaryBadge } from "@/lib/utils/battle/actions/legendary-options";
import { mult } from "@/lib/utils/common/format";
import type { BattleParticipant } from "@/types/battle";

function scaleLabel({ battleData }: BattleParticipant): string | null {
  const parts = [battleData.hpMultiplier, battleData.damageMultiplier].map((m) => (m !== undefined && m !== 1 ? m : null));

  if (parts[0] === null && parts[1] === null) return null;

  return [parts[0] !== null && `${mult(parts[0])} HP`, parts[1] !== null && `${mult(parts[1])} шкода`].filter(Boolean).join(" · ");
}

const ICON = "flex size-8 items-center justify-center border border-transparent bg-black/40 transition-colors";

interface DmParticipantRowProps {
  participant: BattleParticipant;
  controlled: boolean;
  actions: DmParticipantActions;
}

export function DmParticipantRow({ participant, controlled, actions }: DmParticipantRowProps) {
  const { onChangeHp, onTakeControl, onRemove, onKill, onConditions, onLegendary, conditionsEnabled, onDone, unitControl } = actions;

  const confirm = useConfirm();

  const close = () => onDone?.();

  const label = scaleLabel(participant);

  const canKill = onKill && participant.basicInfo.sourceType === ParticipantSourceType.UNIT && participant.combatStats.status !== CombatStatus.DEAD;

  const legendary = onLegendary && hasLegendaryActions(participant) ? participant.battleData.legendary : undefined;

  const badge = legendaryBadge(participant);

  const canConditions = onConditions && conditionsEnabled;

  return (
    <div className={cn("flex min-h-10 items-center gap-2 border-b border-white/[.08] py-1", controlled && "bg-[var(--gold)]/[.08]")}>
      <SideDot side={participant.basicInfo.side} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-[var(--ink)]">{participant.basicInfo.name}</div>
        {label && <div className="truncate text-xs text-[var(--hud-muted)]" data-testid="balance-scale">{label}</div>}
        {badge && <div className="truncate text-xs text-[var(--hud-muted)]" data-testid="legendary-badge">{badge}</div>}
        {unitControl?.isAssignable(participant) && (
          <label className="flex items-center gap-1.5 pt-1 text-xs text-[var(--hud-muted)]">
            Керує:
            <SelectField value={unitControl.valueOf(participant)} options={unitControl.options} onValueChange={(v) => unitControl.assign(participant, v)} triggerClassName="h-7 text-xs" />
          </label>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          className={cn(ICON, "text-hud-good hover:border-hud-good/40")}
          title="Змінити HP"
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
          title={controlled ? "Відпустити керування" : "Взяти керування"}
          onClick={() => {
            onTakeControl(controlled ? null : participant);
            close();
          }}
        >
          <LogIn className="size-3.5" />
        </button>
        {legendary && (
          <button type="button" className={cn(ICON, "text-[var(--gold)] hover:border-[var(--gold)]/40")} title={`Легендарна дія (${legendary.actionsLeft}/${legendary.actions})`} aria-label={`Легендарна дія (${legendary.actionsLeft}/${legendary.actions})`} onClick={() => onLegendary?.(participant)}>
            <Crown className="size-3.5" />
          </button>
        )}
        {canConditions && (
          <button type="button" className={cn(ICON, "text-[#8fd0e8] hover:border-[#8fd0e8]/40")} title="Стани" onClick={() => onConditions(participant)}>
            <ShieldAlert className="size-3.5" />
          </button>
        )}
        {canKill && (
          <button
            type="button"
            className={cn(ICON, "text-hud-danger hover:border-hud-danger/40")}
            title="Вбити"
            onClick={async () => {
              if (await confirm({ title: "Вбити " + participant.basicInfo.name + "?", confirmLabel: "Вбити", destructive: true })) {
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
          title="Видалити з бою"
          onClick={async () => {
            if (await confirm({ title: "Видалити " + participant.basicInfo.name + " з бою?", confirmLabel: "Видалити", destructive: true })) {
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
