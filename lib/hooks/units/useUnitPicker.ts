"use client";

import { useMemo, useState } from "react";

import { useGroupLabel } from "./useGroupLabel";
import { useUnits } from "./useUnits";

import { useCampaignRules } from "@/lib/hooks/campaigns";
import { useRaces } from "@/lib/hooks/races";
import { groupUnitsByRace } from "@/lib/utils/units/group-units";

export function useUnitPicker(campaignId: string, enabled: boolean) {
  const groupLabel = useGroupLabel();

  const { data: units = [] } = useUnits(campaignId, undefined, { enabled });

  const { data: races = [] } = useRaces(campaignId, { enabled });

  const { data: rules } = useCampaignRules(campaignId);

  const appearances = rules?.encounters?.unitGroups;

  const groups = useMemo(() => groupUnitsByRace(units, races, "", appearances), [units, races, appearances]);

  const [raceKey, setRaceKey] = useState("");

  const [unitId, setUnitId] = useState("");

  const tiers = groups.find((g) => g.key === raceKey)?.tiers ?? [];

  return {
    raceOptions: groups.map((g) => ({ key: g.key, label: groupLabel(g), count: g.total })),
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
