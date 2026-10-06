"use client";

import { useMemo, useState } from "react";

import { useDeleteAllUnits, useDeleteUnit, useUnits, useUpdateUnitAny } from "./useUnits";

import { useConfirm } from "@/lib/hooks/common";
import { useRaces } from "@/lib/hooks/races";
import { groupUnitsByRace, raceChips } from "@/lib/utils/units/group-units";
import type { Unit } from "@/types/units";

export function useUnitsList(campaignId: string, initialUnits: Unit[]) {
  const confirm = useConfirm();

  const { data: units = initialUnits, isLoading } = useUnits(campaignId, initialUnits);

  const { data: races = [] } = useRaces(campaignId);

  const deleteAll = useDeleteAllUnits(campaignId);

  const deleteOne = useDeleteUnit(campaignId);

  const update = useUpdateUnitAny(campaignId);

  const [query, setQuery] = useState("");

  const [raceFilter, setRaceFilter] = useState<string[]>([]);

  const [open, setOpen] = useState<string[]>([]);

  const allGroups = useMemo(() => groupUnitsByRace(units, races), [units, races]);

  const found = useMemo(() => groupUnitsByRace(units, races, query), [units, races, query]);

  const groups = raceFilter.length > 0 ? found.filter((g) => raceFilter.includes(g.key)) : found;

  const search = (next: string) => {
    setQuery(next);
    setOpen(next.trim() ? groupUnitsByRace(units, races, next).map((g) => g.key) : []);
  };

  const toggleRace = (key: string) =>
    setRaceFilter((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));

  const removeAll = () =>
    confirm({
      title: "Видалити всі юніти?",
      description: `Ви впевнені, що хочете видалити всі юніти з кампанії? Ця дія незворотна. Буде видалено ${units.length} юнітів.`,
      confirmLabel: "Видалити всі юніти",
      destructive: true,
      onConfirm: () => deleteAll.mutateAsync(),
    });

  return {
    units,
    groups,
    chips: raceChips(allGroups),
    isLoading,
    query,
    search,
    raceFilter,
    toggleRace,
    open,
    setOpen,
    deleteUnit: (unitId: string) => deleteOne.mutate(unitId),
    removeAll,
    drop: (unitId: string, data: Partial<Unit>) => update.mutate({ unitId, data }),
  };
}
