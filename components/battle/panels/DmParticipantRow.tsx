"use client";

import { Heart, LogIn, Skull, Trash2 } from "lucide-react";

import { CombatStatus, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { useConfirm } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import type { BattleParticipant } from "@/types/battle";

const mult = (n: number) => `×${Math.round(n * 100) / 100}`;

function scaleLabel({ battleData }: BattleParticipant): string | null {
  const parts = [battleData.hpMultiplier, battleData.damageMultiplier].map((m) => (m !== undefined && m !== 1 ? m : null));

  if (parts[0] === null && parts[1] === null) return null;

  return [parts[0] !== null && `${mult(parts[0])} HP`, parts[1] !== null && `${mult(parts[1])} шкода`].filter(Boolean).join(" · ");
}

const ICON = "flex size-8 items-center justify-center border border-transparent bg-black/40 transition-colors";

interface DmParticipantRowProps {
  participant: BattleParticipant;
  dmControlledParticipantId: string | null;
  onChangeHp: (p: BattleParticipant) => void;
  onTakeControl: (p: BattleParticipant | null) => void;
  onRemove: (p: BattleParticipant) => void;
  onKill?: (p: BattleParticipant) => void;
  onActionDone?: () => void;
}

export function DmParticipantRow({
  participant,
  dmControlledParticipantId,
  onChangeHp,
  onTakeControl,
  onRemove,
  onKill,
  onActionDone,
}: DmParticipantRowProps) {
  const confirm = useConfirm();

  const close = () => onActionDone?.();

  const controlled = dmControlledParticipantId === participant.basicInfo.id;

  const label = scaleLabel(participant);

  const canKill = onKill && participant.basicInfo.sourceType === ParticipantSourceType.UNIT && participant.combatStats.status !== CombatStatus.DEAD;

  return (
    <div className={cn("flex min-h-10 items-center gap-2 border-b border-white/[.08] py-1", controlled && "bg-[var(--gold)]/[.08]")}>
      <i className="size-2 shrink-0 rounded-full" style={{ background: participant.basicInfo.side === ParticipantSide.ALLY ? "var(--ally)" : "var(--enemy)" }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-[var(--ink)]">{participant.basicInfo.name}</div>
        {label && <div className="truncate text-xs text-[var(--hud-muted)]" data-testid="balance-scale">{label}</div>}
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
            if (
              typeof window !== "undefined" &&
              (await confirm({ title: "Видалити " + participant.basicInfo.name + " з бою?", confirmLabel: "Видалити", destructive: true }))
            ) {
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
