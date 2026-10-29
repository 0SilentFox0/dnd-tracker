"use client";

import { useTranslations } from "next-intl";

import { HERO_ARCHETYPE_KEYS } from "@/lib/constants/hero-archetypes";

export function useArchetypeOptions() {
  const t = useTranslations("characters.archetypes");

  const options = HERO_ARCHETYPE_KEYS.map((key) => ({ value: String(key), label: t(`${key}.name`) }));

  return { options, universalLabel: t("universal.name") };
}
