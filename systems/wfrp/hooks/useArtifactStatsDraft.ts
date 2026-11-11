"use client";

import { useEffect, useState } from "react";

import { ARMOUR_SLOTS, parseWfrpStats, WEAPON_SLOTS } from "@/systems/wfrp/rules/equipment";
import type { WfrpItemStats } from "@/systems/wfrp/rules/equipment/stats";

export type StatsKind = WfrpItemStats["type"];

export const statsKindOf = (slot: string): StatsKind => (ARMOUR_SLOTS.has(slot) ? "armour" : WEAPON_SLOTS.has(slot) ? "weapon" : "gear");

const BLANK: Record<StatsKind, WfrpItemStats> = {
  armour: { type: "armour", locations: { head: 0, arm: 0, body: 0, leg: 0 }, kind: "soft", qualities: [], weight: 0, price: 0 },
  weapon: { type: "weapon", group: "basic", reach: "average", damage: { addSb: true, flat: 0 }, qualities: [], flaws: [], twoHanded: false, weight: 0, price: 0 },
  gear: { type: "gear", qualities: [], weight: 0, price: 0 },
};

interface Options {
  value: unknown;
  slot: string;
  onChange: (value: unknown) => void;
  onValidityChange?: (valid: boolean) => void;
}

export function useArtifactStatsDraft({ value, slot, onChange, onValidityChange }: Options) {
  const kind = statsKindOf(slot);

  const parsed = parseWfrpStats(value);

  const [draft, setDraft] = useState<WfrpItemStats>(parsed?.type === kind ? parsed : BLANK[kind]);

  const [valid, setValid] = useState(true);

  const current = draft.type === kind ? draft : BLANK[kind];

  const stale = value != null && parsed?.type !== kind;

  useEffect(() => {
    if (stale) onChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stale]);

  const update = (next: WfrpItemStats) => {
    const result = parseWfrpStats(next);

    setDraft(next);
    setValid(!!result);
    onValidityChange?.(!!result);

    if (result) onChange(result);
  };

  const clear = () => {
    setDraft(BLANK[kind]);
    setValid(true);
    onValidityChange?.(true);
    onChange(null);
  };

  return { kind, draft: current, valid, update, clear, hasValue: value != null };
}
