"use client";

import { useMemo, useState } from "react";

import { useRaces } from "@/lib/hooks/races";
import { useSpells } from "@/lib/hooks/spells";
import type { Unit } from "@/types/units";

export function useUnitFormFields(campaignId: string, initial: () => Partial<Unit>) {
  const { data: rawRaces } = useRaces(campaignId);

  const { data: spells = [] } = useSpells(campaignId);

  const [formData, setFormData] = useState<Partial<Unit>>(initial);

  const [dirty, setDirty] = useState(false);

  const [abilityErrors, setAbilityErrors] = useState(0);

  const races = useMemo(() => [...(rawRaces ?? [])].sort((a, b) => a.name.localeCompare(b.name, "uk")), [rawRaces]);

  const race = races.find((r) => r.id === formData.raceId) ?? null;

  const change = (updates: Partial<Unit>) => {
    setDirty(true);
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  return { races, race, spells, formData, setFormData, change, dirty, abilityErrors, setAbilityErrors, abilitiesValid: abilityErrors === 0 };
}

export type UnitFormFieldsState = ReturnType<typeof useUnitFormFields>;
