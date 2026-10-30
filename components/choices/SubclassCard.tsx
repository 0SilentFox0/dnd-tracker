"use client";

import { useTranslations } from "next-intl";

import { ChoiceCard } from "@/components/choices/ChoiceCard";
import { summarize } from "@/lib/utils/characters/classes";
import type { GameClassData, Subclass } from "@/types/classes";

interface SubclassCardProps {
  cls: GameClassData;
  value?: string;
  onChange: (id: string) => void;
}

export function SubclassCard({ cls, value, onChange }: SubclassCardProps) {
  const t = useTranslations("choices");

  const levels = (s: Subclass) =>
    [...s.features]
      .sort((a, b) => a.level - b.level)
      .map((f) => `${t("wizard.subclass.level", { level: f.level })}: ${f.description?.trim() || f.abilities.map((a) => a.name).join(", ") || t("wizard.subclass.noDescription")}`)
      .join("\n\n");

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {cls.subclasses.map((s) => {
        const first = s.features.find((f) => f.description)?.description;

        return <ChoiceCard key={s.id} role="radio" checked={value === s.id} onClick={() => onChange(s.id)} title={s.name} name={s.name} summary={summarize(first)} description={() => levels(s)} />;
      })}
    </div>
  );
}
