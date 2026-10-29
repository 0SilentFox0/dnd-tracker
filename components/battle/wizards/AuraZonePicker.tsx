"use client";

import { useTranslations } from "next-intl";

import { TargetButton } from "@/components/battle/wizards/TargetButton";
import type { AuraZoneStep } from "@/lib/hooks/battle";
import { useText } from "@/lib/i18n/use-text";
import { describeEffect } from "@/lib/utils/abilities/registry/effects";

export function AuraZonePicker({ step }: { step: AuraZoneStep }) {
  const { aura, candidates, selected, toggle, confirm, pending } = step;

  const t = useTranslations("battleWizards");

  const text = useText();

  const enemies = aura.target === "nearbyEnemies";

  return (
    <div className="space-y-2 border border-[var(--gold)]/50 bg-[var(--gold)]/5 p-3">
      <div>
        <div className="hud-sc text-lg font-bold">{t("aura.title", { name: aura.ability.name })}</div>
        <div className="text-xs text-[#a89c88]">
          {t(enemies ? "aura.hintEnemies" : "aura.hintAllies", { effects: aura.effects.map((e) => text(describeEffect(e))).join(", ") })}
        </div>
      </div>
      <div className="grid gap-1.5">
        {candidates.map((t) => (
          <TargetButton key={t.basicInfo.id} participant={t} tone="gold" compact selected={selected.includes(t.basicInfo.id)} onClick={() => toggle(t.basicInfo.id)} />
        ))}
      </div>
      <button type="button" disabled={pending} onClick={() => void confirm()} className="hud-sc flex h-11 w-full items-center justify-center border border-[var(--gold)] disabled:opacity-40">
        {t("aura.confirm", { count: selected.length })}
      </button>
    </div>
  );
}
