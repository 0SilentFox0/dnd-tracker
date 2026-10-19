"use client";

import { Zap } from "lucide-react";

import { HealthLabel, Portrait } from "@/components/battle/hud";
import { AbilityAimPanel } from "@/components/battle/wizards/AbilityAimPanel";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { HUD_SURFACE } from "@/components/hud";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ParticipantSide } from "@/lib/constants/battle";
import { useAbilityPicker } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { describeEffect } from "@/lib/utils/abilities/registry/effects";
import type { BattleParticipant } from "@/types/battle";

export function BonusActionPicker({ participant, open, onOpenChange, onDone, trigger = "bonusAction" }: { participant: BattleParticipant; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void; trigger?: "bonusAction" | "action" }) {
  const { abilities, isPending, aiming, mapAim, pick, reset } = useAbilityPicker(participant, trigger, { onOpenChange, onDone });

  const { ability, side, max, candidates, picked } = aiming;

  const changeOpen = (o: boolean) => {
    if (!o) reset();

    onOpenChange(o);
  };

  return (
    <>
      {mapAim.ability && <AbilityAimPanel name={mapAim.ability.name} onCancel={mapAim.cancel} />}
      <ResponsiveDialog open={open} onOpenChange={changeOpen} title={ability ? `${ability.name} · ціль` : trigger === "action" ? "Вміння" : "Бонусна дія"} className={cn(HUD_SURFACE, "border-white/25 bg-[#15110e]")}>
        <div className="space-y-2">
          {!ability && abilities.map(({ ability: a, cooldownLeft }) => (
            <button key={a.key} type="button" disabled={cooldownLeft > 0 || isPending} onClick={() => pick(a)} className="flex min-h-14 w-full items-center gap-3 border border-white/15 px-3 py-2.5 text-left disabled:opacity-50">
              {a.source.icon ? <OptimizedImage src={a.source.icon} alt="" width={40} height={40} className="size-10 rounded object-cover" /> : <Zap className="size-10 p-2 text-[var(--gold)]" />}
              <span className="min-w-0">
                <span className="hud-sc block font-bold">{a.name}{cooldownLeft > 0 && <span className="ml-2 text-xs font-normal text-[#a89c88]">ще {cooldownLeft} р.</span>}</span>
                <span className="line-clamp-2 block text-xs text-[#a89c88]">{a.description ?? a.effects.map(describeEffect).join(", ")}</span>
              </span>
            </button>
          ))}
          {ability && candidates.map((t) => (
            <button key={t.basicInfo.id} type="button" disabled={isPending} onClick={() => aiming.choose(t.basicInfo.id)} className={cn("flex h-14 w-full items-center gap-3 border px-3 text-left", picked.includes(t.basicInfo.id) ? "border-[var(--gold)] bg-[var(--gold)]/10" : "border-white/15")}>
              <Portrait participant={t} size={36} />
              <span className="hud-sc font-bold">{t.basicInfo.name}</span>
              {side === ParticipantSide.ENEMY ? <HealthLabel participant={t} /> : <span className="ml-auto text-sm text-[#d6cbb7]">{t.combatStats.currentHp} / {t.combatStats.maxHp}</span>}
            </button>
          ))}
          {ability && max > 1 && (
            <button type="button" disabled={picked.length === 0 || isPending} onClick={aiming.confirm} className="hud-sc flex h-12 w-full items-center justify-center border border-[var(--gold)] disabled:opacity-40">
              Підтвердити · {picked.length}/{max}
            </button>
          )}
        </div>
      </ResponsiveDialog>
    </>
  );
}
