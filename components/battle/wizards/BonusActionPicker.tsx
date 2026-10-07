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
import { abilityMaxTargets, toggleAbilityTarget } from "@/lib/utils/battle/validation/ability-targets";
import { bonusTargetCandidates, bonusTargetSide, needsBonusTarget } from "@/lib/utils/battle/view";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export function BonusActionPicker({ participant, open, onOpenChange, onDone, trigger = "bonusAction" }: { participant: BattleParticipant; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void; trigger?: "bonusAction" | "action" }) {
  const { allies, enemies, actions } = useBattleScene();

  const [aiming, setAiming] = useState<ResolvedAbility | null>(null);

  const abilities = (participant.battleData.resolvedAbilities ?? []).filter((a) => a.trigger.event === trigger && withinLimits(participant, a));

  const [picked, setPicked] = useState<string[]>([]);

  const fire = async (a: ResolvedAbility, targetIds: string[] = []) => {
    try {
      if (trigger === "action") {
        await actions.abilityAction.mutateAsync({ participantId: participant.basicInfo.id, abilityKey: a.key, ...(targetIds.length > 0 && { targetParticipantIds: targetIds }) });
      } else if (targetIds.length > 1) {
        await actions.bonusAction.mutateAsync({ participantId: participant.basicInfo.id, abilityKey: a.key, targetParticipantIds: targetIds });
      } else {
        await actions.bonusAction.mutateAsync({ participantId: participant.basicInfo.id, abilityKey: a.key, ...(targetIds[0] && { targetParticipantId: targetIds[0] }) });
      }
    } catch {
      return;
    }

    setAiming(null);
    setPicked([]);
    onOpenChange(false);
    onDone();
  };

  const side = aiming ? bonusTargetSide(aiming) : null;

  const max = aiming ? abilityMaxTargets(aiming) : 1;

  const candidates = aiming ? bonusTargetCandidates(aiming, allies, enemies, participant) : [];

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => { if (!o) {
      setAiming(null);
      setPicked([]);
    }

 onOpenChange(o); }} title={aiming ? `${aiming.name} · ціль` : trigger === "action" ? "Вміння" : "Бонусна дія"} className={cn(HUD_SURFACE, "border-white/25 bg-[#15110e]")}>
      <div className="space-y-2">
        {!aiming && abilities.map((a) => (
          <button key={a.key} type="button" disabled={actions.bonusAction.isPending || actions.abilityAction.isPending} onClick={() => (needsBonusTarget(a) ? setAiming(a) : void fire(a))} className="flex min-h-14 w-full items-center gap-3 border border-white/15 px-3 py-2.5 text-left">
            {a.source.icon ? <OptimizedImage src={a.source.icon} alt="" width={40} height={40} className="size-10 rounded object-cover" /> : <Zap className="size-10 p-2 text-[var(--gold)]" />}
            <span className="min-w-0">
              <span className="hud-sc block font-bold">{a.name}</span>
              <span className="line-clamp-2 block text-xs text-[#a89c88]">{a.description ?? a.effects.map(describeEffect).join(", ")}</span>
            </span>
          </button>
        ))}
        {aiming && candidates.map((t) => (
          <button key={t.basicInfo.id} type="button" disabled={actions.bonusAction.isPending || actions.abilityAction.isPending} onClick={() => (max === 1 ? void fire(aiming, [t.basicInfo.id]) : setPicked(toggleAbilityTarget(picked, t.basicInfo.id, max)))} className={cn("flex h-14 w-full items-center gap-3 border px-3 text-left", picked.includes(t.basicInfo.id) ? "border-[var(--gold)] bg-[var(--gold)]/10" : "border-white/15")}>
            <Portrait participant={t} size={36} />
            <span className="hud-sc font-bold">{t.basicInfo.name}</span>
            {side === ParticipantSide.ENEMY ? <HealthLabel participant={t} /> : <span className="ml-auto text-sm text-[#d6cbb7]">{t.combatStats.currentHp} / {t.combatStats.maxHp}</span>}
          </button>
        ))}
        {aiming && max > 1 && (
          <button type="button" disabled={picked.length === 0 || actions.bonusAction.isPending || actions.abilityAction.isPending} onClick={() => void fire(aiming, picked)} className="hud-sc flex h-12 w-full items-center justify-center border border-[var(--gold)] disabled:opacity-40">
            Підтвердити · {picked.length}/{max}
          </button>
        )}
      </div>
    </ResponsiveDialog>
  );
}
