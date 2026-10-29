"use client";

import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";

import type { RosterHero } from "@/lib/hooks/world";

interface HeroEyesSelectProps {
  heroes: RosterHero[];
  value: string | null;
  onChange(heroId: string | null): void;
}

export function HeroEyesSelect({ heroes, value, onChange }: HeroEyesSelectProps) {
  const t = useTranslations("world.eyes");

  return (
    <label className="flex h-10 w-full shrink-0 items-center lg:w-auto gap-1.5 rounded-md border border-hud-rule bg-black/40 px-2 text-xs text-hud-muted">
      <Eye className="size-4 shrink-0" aria-hidden />
      <span className="sr-only">{t("label")}</span>
      <select aria-label={t("label")} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} className="min-w-0 bg-transparent max-lg:flex-1 lg:max-w-36 text-sm text-hud-ink outline-none">
        <option value="">{t("dm")}</option>
        {heroes.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>
    </label>
  );
}
