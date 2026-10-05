"use client";

import { useEffect, useState } from "react";

import { getBattleBalance } from "@/lib/api/battles";
import { getCharacters } from "@/lib/api/characters";
import { getUnits } from "@/lib/api/units";
import { useRaces } from "@/lib/hooks/races";
import type { EntityStats, SetupCharacter, SetupUnit } from "@/types/battle-setup";

export function useNewBattleData(campaignId: string) {
  const { data: races = [] } = useRaces(campaignId);

  const [loadingData, setLoadingData] = useState(true);

  const [characters, setCharacters] = useState<SetupCharacter[]>([]);

  const [units, setUnits] = useState<SetupUnit[]>([]);

  const [entityStats, setEntityStats] = useState<{
    characterStats: Record<string, EntityStats>;
    unitStats: Record<string, EntityStats>;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [chars, unitsData, balanceData] = await Promise.all([
          getCharacters(campaignId, { compact: true }),
          getUnits(campaignId),
          getBattleBalance(campaignId, {}),
        ]);

        setCharacters(chars as SetupCharacter[]);
        setUnits(unitsData as SetupUnit[]);

        if (
          balanceData.characterStats != null ||
          balanceData.unitStats != null
        ) {
          setEntityStats({
            characterStats: balanceData.characterStats ?? {},
            unitStats: balanceData.unitStats ?? {},
          });

          if (balanceData._debug != null) {
            console.info(
              "[Balance] Основні навички кампанії (id, name):",
              balanceData._debug.mainSkills,
            );
            console.info(
              "[Balance] Прогрес основних навичок по персонажах:",
              balanceData._debug.characterSkillProgress,
            );
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
