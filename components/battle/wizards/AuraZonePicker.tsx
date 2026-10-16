"use client";

import { Portrait } from "@/components/battle/hud";
import type { AuraZoneStep } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { describeEffect } from "@/lib/utils/abilities/registry/effects";

export function AuraZonePicker({ step }: { step: AuraZoneStep }) {
  const { aura, candidates, selected, toggle, confirm, pending } = step;

  const enemies = aura.target === "nearbyEnemies";

  return (
    <div className="space-y-2 border border-[var(--gold)]/50 bg-[var(--gold)]/5 p-3">
      <div>
        <div className="hud-sc text-lg font-bold">Зона аури · {aura.ability.name}</div>
        <div className="text-xs text-[#a89c88]">
          {enemies ? "Які вороги поруч?" : "Які союзники поруч?"} {aura.effects.map(describeEffect).join(", ")} — до вашого наступного ходу.
        </div>
      </div>
      <div className="grid gap-1.5">
        {candidates.map((t) => (
          <button key={t.basicInfo.id} type="button" aria-pressed={selected.includes(t.basicInfo.id)} onClick={() => toggle(t.basicInfo.id)} className={cn("flex h-11 w-full items-center gap-2 border px-2 text-left", selected.includes(t.basicInfo.id) ? "border-[var(--gold)] bg-[var(--gold)]/10" : "border-white/15")}>
            <Portrait participant={t} size={32} />
            <span className="hud-sc min-w-0 flex-1 truncate font-bold">{t.basicInfo.name}</span>
          </button>
        ))}
      </div>
      <button type="button" disabled={pending} onClick={() => void confirm()} className="hud-sc flex h-11 w-full items-center justify-center border border-[var(--gold)] disabled:opacity-40">
        Підтвердити зону · {selected.length}
      </button>
    </div>
  );
}
