"use client";

import { useState } from "react";
import { Zap } from "lucide-react";

import { HealthLabel, Portrait } from "@/components/battle/hud";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { HUD_SURFACE } from "@/components/hud";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ParticipantSide } from "@/lib/constants/battle";
import { useBattleScene } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { withinLimits } from "@/lib/utils/abilities/engine/usage";
import { describeEffect } from "@/lib/utils/abilities/registry/effects";
import { bonusTargetCandidates, bonusTargetSide, needsBonusTarget } from "@/lib/utils/battle/view";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export function BonusActionPicker({ participant, open, onOpenChange, onDone }: { participant: BattleParticipant; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const { allies, enemies, actions } = useBattleScene();

  const [aiming, setAiming] = useState<ResolvedAbility | null>(null);

  const abilities = (participant.battleData.resolvedAbilities ?? []).filter((a) => a.trigger.event === "bonusAction" && withinLimits(participant, a));

  const fire = async (a: ResolvedAbility, targetId?: string) => {
    try {
      await actions.bonusAction.mutateAsync({ participantId: participant.basicInfo.id, abilityKey: a.key, ...(targetId && { targetParticipantId: targetId }) });
    } catch {
      return;
    }

    setAiming(null);
    onOpenChange(false);
    onDone();
  };

  const side = aiming ? bonusTargetSide(aiming) : null;

  const candidates = aiming ? bonusTargetCandidates(aiming, allies, enemies) : [];

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => { if (!o) setAiming(null);

 onOpenChange(o); }} title={aiming ? `${aiming.name} · ціль` : "Бонусна дія"} className={cn(HUD_SURFACE, "border-white/25 bg-[#15110e]")}>
      <div className="space-y-2">
        {!aiming && abilities.map((a) => (
          <button key={a.key} type="button" disabled={actions.bonusAction.isPending} onClick={() => (needsBonusTarget(a) ? setAiming(a) : void fire(a))} className="flex min-h-14 w-full items-center gap-3 border border-white/15 px-3 py-2.5 text-left">
            {a.source.icon ? <OptimizedImage src={a.source.icon} alt="" width={40} height={40} className="size-10 rounded object-cover" /> : <Zap className="size-10 p-2 text-[var(--gold)]" />}
            <span className="min-w-0">
              <span className="hud-sc block font-bold">{a.name}</span>
              <span className="line-clamp-2 block text-xs text-[#a89c88]">{a.description ?? a.effects.map(describeEffect).join(", ")}</span>
            </span>
          </button>
        ))}
        {aiming && candidates.map((t) => (
          <button key={t.basicInfo.id} type="button" disabled={actions.bonusAction.isPending} onClick={() => void fire(aiming, t.basicInfo.id)} className="flex h-14 w-full items-center gap-3 border border-white/15 px-3 text-left">
            <Portrait participant={t} size={36} />
            <span className="hud-sc font-bold">{t.basicInfo.name}</span>
            {side === ParticipantSide.ENEMY ? <HealthLabel participant={t} /> : <span className="ml-auto text-sm text-[#d6cbb7]">{t.combatStats.currentHp} / {t.combatStats.maxHp}</span>}
          </button>
        ))}
      </div>
    </ResponsiveDialog>
  );
}
