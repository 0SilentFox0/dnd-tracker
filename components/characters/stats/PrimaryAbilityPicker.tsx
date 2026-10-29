"use client";

import { useTranslations } from "next-intl";

import { CORE_ABILITY_SCORES } from "@/lib/constants/abilities";
import type { AbilityKey } from "@/types/characters";

export function PrimaryAbilityPicker({ value, onChange }: { value: AbilityKey | null; onChange: (v: AbilityKey | null) => void }) {
  const t = useTranslations("characters.stats.primary");

  const tc = useTranslations("common");

  return (
    <fieldset className="grid grid-cols-2 gap-x-3 sm:grid-cols-3">
      <legend className="mb-1 text-xs text-muted-foreground">{t("legend")}</legend>
      {CORE_ABILITY_SCORES.map((a) => (
        <label key={a.key} className="flex h-11 items-center gap-2 text-sm">
          <input type="checkbox" aria-label={t("aria", { ability: tc(`abilities.${a.key}.label`) })} checked={value === a.key} onChange={() => onChange(value === a.key ? null : a.key)} className="size-5 accent-hud-gold" />
          {tc(`abilities.${a.key}.label`)}
        </label>
      ))}
    </fieldset>
  );
}
