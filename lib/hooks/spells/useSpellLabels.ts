"use client";

import { useMemo } from "react";

import { useTranslator } from "@/lib/i18n/use-translator";
import { spellLabelsOf } from "@/lib/utils/spells/model/labels";

export function useSpellLabels() {
  const t = useTranslator();

  return useMemo(() => spellLabelsOf(t), [t]);
}
