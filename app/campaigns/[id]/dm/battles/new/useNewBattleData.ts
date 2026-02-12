"use client";

import { useEffect, useState } from "react";

import type { Character, EntityStats, Unit } from "./types";

import { useRaces } from "@/lib/hooks/useRaces";

export function useNewBattleData(campaignId: string) {
  const { data: races = [] } = useRaces(campaignId);

  const [loadingData, setLoadingData] = useState(true);

  const [characters, setCharacters] = useState<Character[]>([]);

  const [units, setUnits] = useState<Unit[]>([]);

  const [entityStats, setEntityStats] = useState<{
    characterStats: Record<string, EntityStats>;
    unitStats: Record<string, EntityStats>;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [charactersRes, unitsRes, statsRes] = await Promise.all([
          fetch(`/api/campaigns/${campaignId}/characters`),
          fetch(`/api/campaigns/${campaignId}/units`),
          fetch(`/api/campaigns/${campaignId}/battles/balance`),
        ]);

        if (charactersRes.ok) setCharacters(await charactersRes.json());

        if (unitsRes.ok) setUnits(await unitsRes.json());

        if (statsRes.ok) {
          const data = await statsRes.json();

          if (data.characterStats != null || data.unitStats != null) {
            setEntityStats({
              characterStats: data.characterStats ?? {},
              unitStats: data.unitStats ?? {},
            });
          }

          if (data._debug != null) {
            console.log("[Balance] Основні навички кампанії (id, name):", data._debug.mainSkills);
            console.log("[Balance] Прогрес основних навичок по персонажах:", data._debug.characterSkillProgress);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [campaignId]);

  return { characters, units, entityStats, loadingData, races };
}
