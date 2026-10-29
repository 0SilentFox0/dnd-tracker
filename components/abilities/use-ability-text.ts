"use client";

import { useTranslator } from "@/lib/i18n/use-translator";
import { describeAbilityText, describeEffect } from "@/lib/utils/abilities/registry/effects";
import type { Ability, Effect } from "@/lib/utils/abilities/schema";
import { renderSegment, renderSegments, type Segment } from "@/lib/utils/abilities/segments";

export function useAbilityText() {
  const t = useTranslator("abilityRegistry");

  return {
    effect: (e: Effect) => renderSegments(t, describeEffect(e)).join(" · "),
    ability: (a: Ability) => describeAbilityText(a, t),
    segments: (s: readonly Segment[]) => renderSegments(t, s).join(" · "),
    line: (s: Segment) => renderSegment(t, s),
    lines: (list: readonly (readonly Segment[])[]) => list.map((s) => renderSegments(t, s).join(" · ")),
  };
}
