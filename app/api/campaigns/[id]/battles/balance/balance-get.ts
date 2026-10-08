import { loadCharacterBalanceStats } from "./character-stats";

import { heroMember } from "@/lib/utils/battle/balance";
import { loadUnitLibraryStats } from "@/lib/utils/battle/balance/unit-library";
import type { EntityStats, UnitEntityStats } from "@/types/battle-setup";

export async function getBalancePayload(campaignId: string) {
  const characters = await loadCharacterBalanceStats(campaignId);

  const characterStats: Record<string, EntityStats> = {};

  for (const { character, stats } of characters) {
    characterStats[character.id] = { ...heroMember(stats), kpi: Math.round(stats.kpi * 100) / 100, dprBreakdown: stats.dprBreakdown };
  }

  const unitStats: Record<string, UnitEntityStats> = {};

  for (const u of await loadUnitLibraryStats(campaignId)) {
    unitStats[u.unitId] = { dpr: u.dpr, hp: u.hp, kpi: Math.round(u.kpi * 100) / 100, name: u.name, level: u.level, raceId: u.raceId, ac: u.ac, attackBonus: u.attackBonus };
  }

  const payload: Record<string, unknown> = { characterStats, unitStats };

  if (process.env.NODE_ENV === "development") {
    payload._debug = {
      characterSkillProgress: characters.map(({ character, levels }) => ({ characterId: character.id, characterName: character.name, branchLevels: levels })),
    };
  }

  return payload;
}
