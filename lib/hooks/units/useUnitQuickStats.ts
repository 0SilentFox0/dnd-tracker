"use client";

import { useState } from "react";

import { useUpdateUnitAny } from "./useUnits";

import { planQuickStatUpdate, type QuickStatField } from "@/lib/utils/units/quick-stats";
import type { Unit } from "@/types/units";

export function useUnitQuickStats(unit: Unit, campaignId: string, primaryAttackIndex: number) {
  const update = useUpdateUnitAny(campaignId);

  // Uncontrolled inputs reset to the server value by bumping their key, so typing keeps focus.
  const [epochs, setEpochs] = useState<Record<QuickStatField, number>>({ ac: 0, init: 0, dice: 0 });

  const bump = (f: QuickStatField) => setEpochs((e) => ({ ...e, [f]: e[f] + 1 }));

  const attacks = Array.isArray(unit.attacks) ? unit.attacks : [];

  const saved: Record<QuickStatField, string> = {
    ac: String(unit.armorClass),
    init: String(unit.initiative),
    dice: (primaryAttackIndex >= 0 ? attacks[primaryAttackIndex]?.damageDice : "") ?? "",
  };

  const field = (f: QuickStatField) => ({
    key: `${unit.id}-${f}-${saved[f]}-${epochs[f]}`,
    id: `unit-${f}-${unit.id}`,
    defaultValue: saved[f],
    commit: (raw: string) => {
      const plan = planQuickStatUpdate(f, raw, unit, primaryAttackIndex);

      if (plan.kind === "reset") bump(f);

      if (plan.kind === "update") update.mutate({ unitId: unit.id, data: plan.data }, { onError: () => bump(f) });
    },
  });

  return { field, isBusy: update.isPending };
}
