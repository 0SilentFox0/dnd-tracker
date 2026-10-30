"use client";

import { useTranslations } from "next-intl";

import { ChoiceCard } from "@/components/choices/ChoiceCard";
import { summarize } from "@/lib/utils/characters/classes/summary";
import type { BackgroundData } from "@/types/backgrounds";
import type { FeatData } from "@/types/choices";

interface BackgroundPickerProps {
  backgrounds: BackgroundData[];
  feats: Record<string, FeatData>;
  value: string | null;
  onChange: (id: string | null) => void;
}

export function BackgroundPicker({ backgrounds, feats, value, onChange }: BackgroundPickerProps) {
  const t = useTranslations("choices");

  const tg = useTranslations("gameTerms");

  const details = (b: BackgroundData) => {
    const feat = b.originFeatId ? feats[b.originFeatId] : undefined;

    return [
      b.description,
      `${t("wizard.background.skills")}: ${b.skillProficiencies.length > 0 ? b.skillProficiencies.map((s) => tg(`dndSkills.${s}`)).join(", ") : t("wizard.background.noSkills")}`,
      b.toolProficiencies.length > 0 && `${t("wizard.background.tools")}: ${b.toolProficiencies.join(", ")}`,
      feat && `${t("wizard.background.originFeat")}: ${feat.name}`,
      b.equipmentText && `${t("wizard.background.equipment")}: ${b.equipmentText}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  };

  return (
    <div role="radiogroup" aria-label={t("wizard.background.title")} className="grid gap-2 sm:grid-cols-2">
      {backgrounds.map((b) => (
        <ChoiceCard key={b.id} role="radio" checked={value === b.id} onClick={() => onChange(b.id)} title={b.name} name={b.name} summary={summarize(b.description ?? undefined)} description={() => details(b)} />
      ))}
    </div>
  );
}
