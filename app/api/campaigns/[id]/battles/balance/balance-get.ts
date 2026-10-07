import { loadCharacterBalanceStats } from "./character-stats";

import { loadUnitLibraryStats } from "@/lib/utils/battle/balance/unit-library";
import type { CharacterDprBreakdown } from "@/types/battle-setup";

export async function getBalancePayload(campaignId: string) {
  const characters = await loadCharacterBalanceStats(campaignId);

  const characterStats: Record<
    string,
    { dpr: number; hp: number; kpi: number; dprBreakdown?: CharacterDprBreakdown }
  > = {};

  for (const { character, stats } of characters) {
    characterStats[character.id] = {
      dpr: stats.dpr,
      hp: stats.hp,
      kpi: Math.round(stats.kpi * 100) / 100,
      dprBreakdown: stats.dprBreakdown,
    };
  }

  const unitStats: Record<string, { dpr: number; hp: number; kpi: number; name: string; level: number; raceId: string | null }> = {};

  for (const u of await loadUnitLibraryStats(campaignId)) {
    unitStats[u.unitId] = { dpr: u.dpr, hp: u.hp, kpi: Math.round(u.kpi * 100) / 100, name: u.name, level: u.level, raceId: u.raceId };
  }

  const payload: Record<string, unknown> = { characterStats, unitStats };

  if (process.env.NODE_ENV === "development") {
    payload._debug = {
      characterSkillProgress: characters.map(({ character, levels }) => ({ characterId: character.id, characterName: character.name, branchLevels: levels })),
    };
  }

  return payload;
}
