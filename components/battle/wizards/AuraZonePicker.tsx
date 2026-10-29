"use client";

import { useAbilityText } from "@/components/abilities/use-ability-text";
import { TargetButton } from "@/components/battle/wizards/TargetButton";
import type { AuraZoneStep } from "@/lib/hooks/battle";

export function AuraZonePicker({ step }: { step: AuraZoneStep }) {
  const { aura, candidates, selected, toggle, confirm, pending } = step;

  const abilityText = useAbilityText();

  const enemies = aura.target === "nearbyEnemies";

  return (
    <div className="space-y-2 border border-[var(--gold)]/50 bg-[var(--gold)]/5 p-3">
      <div>
        <div className="hud-sc text-lg font-bold">Зона аури · {aura.ability.name}</div>
        <div className="text-xs text-[#a89c88]">
          {enemies ? "Які вороги поруч?" : "Які союзники поруч?"} {aura.effects.map(abilityText.effect).join(", ")} — до вашого наступного ходу.
        </div>
      </div>
      <div className="grid gap-1.5">
        {candidates.map((t) => (
          <TargetButton key={t.basicInfo.id} participant={t} tone="gold" compact selected={selected.includes(t.basicInfo.id)} onClick={() => toggle(t.basicInfo.id)} />
        ))}
      </div>
      <button type="button" disabled={pending} onClick={() => void confirm()} className="hud-sc flex h-11 w-full items-center justify-center border border-[var(--gold)] disabled:opacity-40">
        Підтвердити зону · {selected.length}
      </button>
    </div>
  );
}
