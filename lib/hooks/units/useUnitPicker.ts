"use client";

import { useMemo, useState } from "react";

import { useUnits } from "./useUnits";

import { useRaces } from "@/lib/hooks/races";
import { groupUnitsByRace } from "@/lib/utils/units/group-units";

export function useUnitPicker(campaignId: string, enabled: boolean) {
  const { data: units = [] } = useUnits(campaignId, undefined, { enabled });

  const { data: races = [] } = useRaces(campaignId, { enabled });

  const groups = useMemo(() => groupUnitsByRace(units, races).filter((g) => g.total > 0), [units, races]);

  const [raceKey, setRaceKey] = useState("");

  const [unitId, setUnitId] = useState("");

  const tiers = groups.find((g) => g.key === raceKey)?.tiers ?? [];

  return {
    raceOptions: groups.map((g) => ({ key: g.key, label: g.label, count: g.total })),
    raceKey,
    selectRace: (key: string) => {
      setRaceKey(key);
      setUnitId("");
    },
    tiers,
    unitId,
    setUnitId,
    reset: () => setUnitId(""),
  };
}
