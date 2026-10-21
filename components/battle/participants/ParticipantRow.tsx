"use client";

import { memo } from "react";
import { Shield } from "lucide-react";

import { HitFrame, PortraitFx } from "@/components/battle/fx/PortraitFx";
import { EffectLine, HealthBar, HealthLabel, hitFlashClass, HitFloat, Portrait } from "@/components/battle/hud";
import { useHitFx } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import type { FxImpact } from "@/lib/utils/battle/fx";
import { isDown } from "@/lib/utils/battle/participant/state";
import { hpRatio } from "@/lib/utils/battle/view";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export const ParticipantRow = memo(function ParticipantRow({ participant: live, effects, exact, acText, current, impact, onSelect }: {
  participant: BattleParticipant;
  effects: readonly ActiveEffect[];
  exact: boolean;
  acText: string;
  current: boolean;
  impact: FxImpact | null;
  onSelect: (id: string) => void;
}) {
  const { change, shown: participant, shakeRef } = useHitFx<HTMLDivElement>(live, impact);

  const { currentHp, maxHp } = participant.combatStats;

  const down = isDown(participant);

  return (
    <div ref={shakeRef} className={cn("relative flex min-h-[76px] w-full items-center gap-3 border-b border-white/[.08] py-2", down && "opacity-40")}>
      <button type="button" aria-label={participant.basicInfo.name} onClick={() => onSelect(participant.basicInfo.id)} className="absolute inset-0" />
      <HitFrame change={change} />
      <HitFloat change={change} className="left-6 top-2 text-[26px]" />
      <PortraitFx effects={effects} size={48}>
        <Portrait key={`portrait:${change?.id ?? ""}`} participant={participant} fx="main" size={48} current={current} className={cn("pointer-events-none", !change?.impact && hitFlashClass(change))} />
      </PortraitFx>
      <div className="min-w-0 flex-1">
        <div className={cn("hud-sc flex h-5 items-center whitespace-nowrap text-base font-bold text-[var(--ink)]", down && "line-through")}>
          <span className="truncate">{participant.basicInfo.name}</span>
          {exact ? <span className={cn("ml-auto pl-2 font-sans text-sm font-medium tracking-normal", hpRatio(participant) <= 0.25 ? "text-[#e04a35]" : "text-[#d6cbb7]")}>{currentHp} / {maxHp}</span> : <HealthLabel participant={participant} />}
        </div>
        <HealthBar participant={participant} exact={exact} />
        <EffectLine effects={effects} />
      </div>
      <span className="mt-3.5 flex w-16 shrink-0 items-center justify-end gap-1.5 self-start text-sm text-[#b8ab95]">
        {acText}
        <Shield className="size-4 text-[var(--hud-muted)]" />
      </span>
    </div>
  );
});
