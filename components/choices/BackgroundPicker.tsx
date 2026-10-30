"use client";

import { useTranslations } from "next-intl";

import { ChoiceCard } from "@/components/choices/ChoiceCard";
import { useBackgroundFacts } from "@/components/choices/useBackgroundFacts";
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

  const facts = useBackgroundFacts();

  const summaryOf = (b: BackgroundData) => facts({ skills: b.skillProficiencies, tools: b.toolProficiencies, originFeatName: b.originFeatId ? feats[b.originFeatId]?.name : null }).join(" · ");

  const details = (b: BackgroundData) => [b.description, ...facts({ skills: b.skillProficiencies, tools: b.toolProficiencies, originFeatName: b.originFeatId ? feats[b.originFeatId]?.name : null, equipmentText: b.equipmentText })].filter(Boolean).join("\n\n");

  return (
    <div role="radiogroup" aria-label={t("wizard.background.title")} className="grid gap-2 sm:grid-cols-2 [&>div]:h-full [&>div>[role=radio]]:h-full">
      {backgrounds.map((b) => (
        <ChoiceCard key={b.id} role="radio" checked={value === b.id} onClick={() => onChange(b.id)} title={b.name} name={b.name} icon={b.icon} summary={<span className="line-clamp-2 block min-h-[2lh]">{summarize(b.description ?? undefined) || summaryOf(b)}</span>} description={() => details(b)} />
      ))}
    </div>
  );
}
