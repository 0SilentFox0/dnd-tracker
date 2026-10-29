"use client";

import { useMemo } from "react";

import { useTranslator } from "@/lib/i18n/use-translator";
import { describeEffect } from "@/lib/utils/abilities/registry/effects";
import type { Effect } from "@/lib/utils/abilities/schema";
import { type AbilityFlowSummary, flowSegments, joinSegments, linesText, type Segment } from "@/lib/utils/abilities/segments";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";

export function useAbilityText() {
  const t = useTranslator("abilityRegistry");

  return useMemo(
    () => ({
      effect: (e: Effect | SpellEffect) => joinSegments(t, describeEffect(e)),
      segments: (s: readonly Segment[]) => joinSegments(t, s),
      flows: (list: readonly AbilityFlowSummary[]) => linesText(t, list.map(flowSegments)),
      flowsText: (list: readonly AbilityFlowSummary[]) => linesText(t, list.map(flowSegments)).join(" · "),
      lines: (list: readonly (readonly Segment[])[]) => linesText(t, list),
    }),
    [t],
  );
}
