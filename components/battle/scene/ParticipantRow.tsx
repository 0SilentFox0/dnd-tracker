"use client";

import { memo } from "react";
import { Shield } from "lucide-react";

import { EffectLine, HealthBar, HealthLabel, Portrait } from "@/components/battle/hud";
import { useHpChange } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { isDown } from "@/lib/utils/battle/participant/state";
import { hpRatio } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

export const ParticipantRow = memo(function ParticipantRow({ participant, exact, acText, current, onSelect }: {
  participant: BattleParticipant;
  exact: boolean;
  acText: string;
  current: boolean;
  onSelect: (id: string) => void;
}) {
  const { currentHp, maxHp } = participant.combatStats;

  const change = useHpChange(currentHp);

  const down = isDown(participant);

  return (
    <button
      key={change?.id}
      type="button"
      onClick={() => onSelect(participant.basicInfo.id)}
      className={cn("relative flex h-[76px] w-full items-center gap-3 border-b border-white/[.08] text-left", change && change.delta < 0 && "animate-[hud-shake_.35s]", down && "opacity-40")}
    >
      {change && (
        <span className={cn("hud-sc pointer-events-none absolute left-6 top-2 text-[26px] font-extrabold opacity-0 [text-shadow:0_2px_6px_#000] animate-[hud-float_1.1s_ease-out]", change.delta < 0 ? "text-[#ff6a4d]" : "text-[#8fd07a]")}>
          {change.delta < 0 ? `−${-change.delta}` : `+${change.delta}`}
        </span>
      )}
      <Portrait participant={participant} size={48} current={current} className={cn(change && (change.delta < 0 ? "animate-[hud-flash-red_.5s]" : "animate-[hud-flash-green_.7s]"))} />
      <div className="min-w-0 flex-1">
        <div className={cn("hud-sc flex h-5 items-center whitespace-nowrap text-base font-bold text-[var(--ink)]", down && "line-through")}>
          <span className="truncate">{participant.basicInfo.name}</span>
          {exact ? <span className={cn("ml-auto pl-2 font-sans text-sm font-medium tracking-normal", hpRatio(participant) <= 0.25 ? "text-[#e04a35]" : "text-[#d6cbb7]")}>{currentHp} / {maxHp}</span> : <HealthLabel participant={participant} />}
        </div>
        <HealthBar participant={participant} exact={exact} />
        <EffectLine effects={participant.battleData.activeEffects} />
      </div>
      <span className="mt-3.5 flex w-16 shrink-0 items-center justify-end gap-1.5 self-start text-sm text-[#b8ab95]">
        {acText}
        <Shield className="size-4 text-[var(--hud-muted)]" />
      </span>
    </button>
  );
});
