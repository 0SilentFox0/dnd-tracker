"use client";

import { useState } from "react";

import { characterKeys } from "./keys";

import { postArcaneRecovery } from "@/lib/api/characters";
import { useCrudMutation } from "@/lib/hooks/common";
import { pickedLevels } from "@/lib/utils/characters/resources/arcane-recovery";
import type { SheetRest } from "@/types/characters";

export function useArcaneRecovery(campaignId: string, characterId: string, offer: NonNullable<SheetRest["arcaneRecovery"]>) {
  const [picks, setPicks] = useState<Record<string, number>>({});

  const save = useCrudMutation({
    mutationFn: (p: Record<string, number>) => postArcaneRecovery(campaignId, characterId, p),
    invalidateKeys: [characterKeys.sheet(campaignId, characterId), characterKeys.lists(campaignId), characterKeys.log(campaignId, characterId)],
    errorText: "Не вдалося відновити слоти",
  });

  const total = pickedLevels(picks);

  const spentAt = (level: number) => offer.slots.find((s) => s.level === level)?.spent ?? 0;

  const canStep = (level: number, delta: 1 | -1) => (delta > 0 ? (picks[level] ?? 0) < spentAt(level) && total + level <= offer.budget : (picks[level] ?? 0) > 0);

  const step = (level: number, delta: 1 | -1) => canStep(level, delta) && setPicks((p) => ({ ...p, [level]: (p[level] ?? 0) + delta }));

  const submit = () => save.mutateOk(Object.fromEntries(Object.entries(picks).filter(([, n]) => n > 0))).then((ok) => ok && setPicks({}));

  return { picks, total, canStep, step, canSubmit: total > 0 && !save.isPending, submit, isPending: save.isPending };
}
