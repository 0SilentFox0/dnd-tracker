"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { FX_BADGE_VALUES, type FxBadgeLabels } from "@/components/battle/fx/runtime/badge-labels";

export function useFxBadgeLabels(): FxBadgeLabels {
  const t = useTranslations("spells.fx.badges");

  const thorns = t("thorns", { value: FX_BADGE_VALUES.thorns });

  const rust = t("rust", { value: FX_BADGE_VALUES.rust });

  const raincloud = t("raincloud", { value: FX_BADGE_VALUES.raincloud });

  const might = t("might");

  const siphon = t("siphon", { value: FX_BADGE_VALUES.siphon });

  const stoneskin = t("stoneskin");

  return useMemo(() => ({ thorns, rust, raincloud, might, siphon, stoneskin }), [thorns, rust, raincloud, might, siphon, stoneskin]);
}
