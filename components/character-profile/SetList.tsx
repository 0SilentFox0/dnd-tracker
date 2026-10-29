"use client";

import { useTranslations } from "next-intl";

import { useAbilityText } from "@/components/abilities/use-ability-text";
import { cn } from "@/lib/utils";
import type { SetProgress } from "@/types/characters";

export function SetList({ sets }: { sets: SetProgress[] }) {
  const t = useTranslations("characterProfile.sets");

  const abilityText = useAbilityText();

  const effectsOf = (s: SetProgress) => abilityText.flows(s.effects).join(" · ");

  if (sets.length === 0) return null;

  return (
    <ul>
      {sets.map((s) => (
        <li key={s.setId} className="border-b border-[#2a2218] py-2">
          <span className={cn("block text-sm", s.complete ? "text-hud-gold-strong" : "text-hud-ink")}>
            ✦ {t("name", { name: s.name, have: s.have, total: s.total })}
          </span>
          <span className="block text-xs text-hud-muted">{s.complete ? effectsOf(s) : t("withFull", { effects: effectsOf(s) || "—" })}</span>
        </li>
      ))}
    </ul>
  );
}
