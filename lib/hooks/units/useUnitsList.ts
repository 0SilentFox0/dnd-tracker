"use client";

import { useCallback, useMemo, useState } from "react";

import { useGroupLabel } from "./useGroupLabel";
import { useDeleteAllUnits, useDeleteUnit, useUnits, useUpdateUnit } from "./useUnits";

import { useCampaignRules } from "@/lib/hooks/campaigns";
import { useRaces } from "@/lib/hooks/races";
import { groupUnitsByRace, raceChips } from "@/lib/utils/units/group-units";
import type { Unit } from "@/types/units";

export function useUnitsList(campaignId: string, initialUnits: Unit[]) {
  const { data: units = initialUnits, isLoading } = useUnits(campaignId, initialUnits);

  const { data: races = [] } = useRaces(campaignId);

  const { data: rules } = useCampaignRules(campaignId);

  const appearances = rules?.encounters?.unitGroups;

  const deleteAll = useDeleteAllUnits(campaignId);

  const deleteOne = useDeleteUnit(campaignId);

  const update = useUpdateUnit(campaignId);

  const [query, setQuery] = useState("");

  const [raceFilter, setRaceFilter] = useState<string[]>([]);

  const [open, setOpen] = useState<string[]>([]);

  const labelOf = useGroupLabel();

  const allGroups = useMemo(() => groupUnitsByRace(units, races, "", appearances), [units, races, appearances]);

  const found = useMemo(() => groupUnitsByRace(units, races, query, appearances), [units, races, query, appearances]);

  const activeRaceFilter = raceFilter.filter((key) => allGroups.some((group) => group.key === key));

  const groups = activeRaceFilter.length > 0 ? found.filter((g) => activeRaceFilter.includes(g.key)) : found;

  const search = (next: string) => {
    setQuery(next);
    setOpen(next.trim() ? groupUnitsByRace(units, races, next).map((g) => g.key) : []);
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
    filter: { query, search, raceFilter: activeRaceFilter, toggleRace },
    actions: {
      deleteUnit,
      removeAll,
      drop,
    },
  };
}
