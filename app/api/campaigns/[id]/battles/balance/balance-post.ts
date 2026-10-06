/**
 * POST balance: поради по ворогах за складністю та учасниках.
 */

import type { z } from "zod";

import type { balanceSchema } from "./balance-schema";
import { loadCharacterBalanceStats } from "./character-stats";

import { prisma } from "@/lib/db";
import type { DifficultyRatio, UnitStats } from "@/lib/utils/battle/balance";
import {
  DIFFICULTY_DPR_HP_RATIOS,
  getUnitStats,
  suggestEnemyUnits,
} from "@/lib/utils/battle/balance";
import type { AllyStats, SuggestedEnemy } from "@/types/battle-setup";

type BalancePostData = z.infer<typeof balanceSchema>;

export async function postBalanceResponse(
  campaignId: string,
  data: BalancePostData,
) {
  const { allyParticipants, difficulty, minTier, maxTier, raceId } = data;

  let totalDpr = 0;

  let totalHp = 0;

  let allyCount = 0;

  if (allyParticipants.characterIds.length > 0) {
    for (const { stats } of await loadCharacterBalanceStats(campaignId, allyParticipants.characterIds)) {
      totalDpr += stats.dpr;
      totalHp += stats.hp;
      allyCount += 1;
    }
  }

  for (const { id: unitId, quantity } of allyParticipants.units) {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId, campaignId },
    });

    if (!unit) continue;

    const stats = getUnitStats({
      id: unit.id,
      name: unit.name,
      maxHp: unit.maxHp,
      level: unit.level,
      raceId: unit.raceId,
      strength: unit.strength,
      dexterity: unit.dexterity,
      attacks:
        (unit.attacks as Array<{ damageDice?: string; type?: string }>) || [],
    });

    totalDpr += stats.dpr * quantity;
    totalHp += stats.hp * quantity;
    allyCount += quantity;
  }

  const allyStats: AllyStats = {
    dpr: Math.round(totalDpr * 10) / 10,
    totalHp: totalHp,
    kpi: totalHp > 0 ? Math.round((totalDpr / totalHp) * 100) / 100 : 0,
    allyCount,
  };

  const response: {
    allyStats: AllyStats;
    suggestedEnemies?: SuggestedEnemy[];
  } = { allyStats };

  if (difficulty != null) {
    const ratio = DIFFICULTY_DPR_HP_RATIOS[difficulty as DifficultyRatio];

    const targetDpr = totalDpr * ratio;

    const targetHp = totalHp * ratio;

    const where: {
      campaignId: string;
      level?: { gte?: number; lte?: number };
      raceId?: string;
    } = { campaignId };

    if (minTier != null) where.level = { ...where.level, gte: minTier };

    if (maxTier != null) where.level = { ...where.level, lte: maxTier };

    if (raceId) where.raceId = raceId;

    const units = await prisma.unit.findMany({ where });

    const unitsWithStats: UnitStats[] = units.map((u) =>
      getUnitStats({
        id: u.id,
        name: u.name,
        maxHp: u.maxHp,
        level: u.level,
        raceId: u.raceId,
        strength: u.strength,
        dexterity: u.dexterity,
        attacks:
          (u.attacks as Array<{ damageDice?: string; type?: string }>) || [],
      }),
    );

    const suggested = suggestEnemyUnits(unitsWithStats, targetDpr, targetHp);

    response.suggestedEnemies = suggested.map((s) => ({
      ...s,
      totalDpr: Math.round(s.totalDpr * 10) / 10,
      totalHp: s.totalHp,
    }));
  }

  return response;
}
