"use client";

import { useCallback, useMemo, useState } from "react";

import { useGroupLabel } from "./useGroupLabel";
import { useDeleteAllUnits, useDeleteUnit, useUnits, useUpdateUnit } from "./useUnits";

import { useRaces } from "@/lib/hooks/races";
import { groupUnitsByRace, raceChips } from "@/lib/utils/units/group-units";
import type { Unit } from "@/types/units";

export function useUnitsList(campaignId: string, initialUnits: Unit[]) {
  const { data: units = initialUnits, isLoading } = useUnits(campaignId, initialUnits);

  const { data: races = [] } = useRaces(campaignId);

  const deleteAll = useDeleteAllUnits(campaignId);

  const deleteOne = useDeleteUnit(campaignId);

  const update = useUpdateUnit(campaignId);

  const [query, setQuery] = useState("");

  const [raceFilter, setRaceFilter] = useState<string[]>([]);

  const [open, setOpen] = useState<string[]>([]);

  const labelOf = useGroupLabel();

  const allGroups = useMemo(() => groupUnitsByRace(units, races).filter((g) => g.total > 0), [units, races]);

  const found = useMemo(() => groupUnitsByRace(units, races, query).filter((g) => g.total > 0), [units, races, query]);

  const groups = raceFilter.length > 0 ? found.filter((g) => raceFilter.includes(g.key)) : found;

  const search = (next: string) => {
    setQuery(next);
    setOpen(next.trim() ? groupUnitsByRace(units, races, next).filter((g) => g.total > 0).map((g) => g.key) : []);
  };

  const toggleRace = (key: string) =>
    setRaceFilter((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));

  const removeAll = () => deleteAll.mutateAsync();

  const { mutate: deleteUnit } = deleteOne;

  const { mutate: updateUnit } = update;

  const drop = useCallback((unitId: string, data: Partial<Unit>) => updateUnit({ unitId, data }), [updateUnit]);

  return {
    units,
    isLoading,
    view: { groups, chips: raceChips(allGroups, labelOf), open, setOpen },
    filter: { query, search, raceFilter, toggleRace },
    actions: {
      deleteUnit,
      removeAll,
      drop,
    },
  };
}
