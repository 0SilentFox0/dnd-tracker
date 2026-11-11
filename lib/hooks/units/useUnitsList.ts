"use client";

import { useCallback, useMemo, useState } from "react";

import { useGroupLabel } from "./useGroupLabel";
import { useDeleteAllUnits, useDeleteUnit, useUnits, useUpdateUnit } from "./useUnits";

import { useCampaignRules } from "@/lib/hooks/campaigns";
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from "@/lib/hooks/common";
import { useRaces } from "@/lib/hooks/races";
import { groupUnitsByRace, raceChips } from "@/lib/utils/units/group-units";
import type { Race } from "@/types/races";
import type { Unit } from "@/types/units";

// a fresh [] default each render re-fires the setOpen effect forever while races load
const NO_RACES: Race[] = [];

export function useUnitsList(campaignId: string, initialUnits: Unit[]) {
  const { data: units = initialUnits, isLoading } = useUnits(campaignId, initialUnits);

  const { data: races = NO_RACES } = useRaces(campaignId);

  const { data: rules } = useCampaignRules(campaignId);

  const appearances = rules?.encounters?.unitGroups;

  const deleteAll = useDeleteAllUnits(campaignId);

  const deleteOne = useDeleteUnit(campaignId);

  const update = useUpdateUnit(campaignId);

  const [query, setQuery] = useState("");

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  const [raceFilter, setRaceFilter] = useState<string[]>([]);

  const [open, setOpen] = useState<string[]>([]);

  const labelOf = useGroupLabel();

  const allGroups = useMemo(() => groupUnitsByRace(units, races, "", appearances), [units, races, appearances]);

  const found = useMemo(() => groupUnitsByRace(units, races, debouncedQuery, appearances), [units, races, debouncedQuery, appearances]);

  const activeRaceFilter = raceFilter.filter((key) => allGroups.some((group) => group.key === key));

  const groups = activeRaceFilter.length > 0 ? found.filter((g) => activeRaceFilter.includes(g.key)) : found;

  const [openInputs, setOpenInputs] = useState({ debouncedQuery, units, races });

  if (openInputs.debouncedQuery !== debouncedQuery || openInputs.units !== units || openInputs.races !== races) {
    setOpenInputs({ debouncedQuery, units, races });
    setOpen(debouncedQuery.trim() ? groupUnitsByRace(units, races, debouncedQuery).map((g) => g.key) : []);
  }

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
    filter: { query, search: setQuery, raceFilter: activeRaceFilter, toggleRace },
    actions: {
      deleteUnit,
      removeAll,
      drop,
    },
  };
}
