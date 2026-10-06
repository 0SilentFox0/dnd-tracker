/**
 * GET balance: DPR, HP, KPI для персонажів та юнітів кампанії.
 */

import { loadCharacterBalanceStats } from "./character-stats";

import { prisma } from "@/lib/db";
import { getUnitStats } from "@/lib/utils/battle/balance";
import type { CharacterDprBreakdown } from "@/types/battle-setup";

export async function getBalancePayload(campaignId: string) {
  const characters = await loadCharacterBalanceStats(campaignId);

  const characterStats: Record<
    string,
    { dpr: number; hp: number; kpi: number; dprBreakdown?: CharacterDprBreakdown }
  > = {};

  for (const { character, stats } of characters) {
    characterStats[character.id] = {
      dpr: Math.round(stats.dpr * 10) / 10,
      hp: stats.hp,
      kpi: Math.round(stats.kpi * 100) / 100,
      dprBreakdown: stats.dprBreakdown,
    };
  }

  const unitStats: Record<string, { dpr: number; hp: number; kpi: number }> =
    {};

  const units = await prisma.unit.findMany({
    where: { campaignId },
  });

  for (const unit of units) {
    const stats = getUnitStats({
      id: unit.id,
      name: unit.name,
      maxHp: unit.maxHp,
      level: unit.level,
      groupId: unit.groupId,
      race: unit.race,
      strength: unit.strength,
      dexterity: unit.dexterity,
      attacks:
        (unit.attacks as Array<{ damageDice?: string; type?: string }>) || [],
    });

    unitStats[unit.id] = {
      dpr: Math.round(stats.dpr * 10) / 10,
      hp: stats.hp,
      kpi: Math.round(stats.kpi * 100) / 100,
    };
  }

  const payload: Record<string, unknown> = { characterStats, unitStats };

  if (process.env.NODE_ENV === "development") {
    payload._debug = {
      characterSkillProgress: characters.map(({ character, levels }) => ({ characterId: character.id, characterName: character.name, branchLevels: levels })),
    };
  }

  return payload;
}
