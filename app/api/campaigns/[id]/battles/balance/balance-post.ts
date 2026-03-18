/**
 * POST balance: поради по ворогах за складністю та учасниках.
 */

import type { z } from "zod";

import {
  enrichSkillTreeProgressWithInferredLevels,
  getCharacterAttacks,
} from "./balance-helpers";
import type { balanceSchema } from "./balance-schema";

import {
  MAGIC_MAIN_SKILL_IDS,
  MAGIC_MAIN_SKILL_NAME_ALIASES,
} from "@/lib/constants/dpr-by-main-skill";
import { prisma } from "@/lib/db";
import type {
  AllyStats,
  DifficultyRatio,
  SuggestedEnemy,
  TreeIdToMainSkillIds,
  UnitStats,
} from "@/lib/utils/battle/balance";
import {
  DIFFICULTY_DPR_HP_RATIOS,
  getCharacterStats,
  getUnitStats,
  suggestEnemyUnits,
} from "@/lib/utils/battle/balance";

type BalancePostData = z.infer<typeof balanceSchema>;

export async function postBalanceResponse(
  campaignId: string,
  data: BalancePostData,
) {
  const { allyParticipants, difficulty, minTier, maxTier, groupId, race } =
    data;

  let totalDpr = 0;

  let totalHp = 0;

  let allyCount = 0;

  const treeIdToMainSkillIds: TreeIdToMainSkillIds = {};

  let magicMainSkillIds = new Set<string>();

  if (allyParticipants.characterIds.length > 0) {
    const [trees, mainSkills] = await Promise.all([
      prisma.skillTree.findMany({ where: { campaignId } }),
      prisma.mainSkill.findMany({
        where: { campaignId },
        select: { id: true, name: true },
      }),
    ]);

    magicMainSkillIds = new Set(
      mainSkills
        .filter((ms) => {
          const nameNorm = ms.name.toLowerCase().trim().replace(/\s+/g, "_");

          const byId = MAGIC_MAIN_SKILL_IDS.some((slug) => ms.id === slug);

          const byName = MAGIC_MAIN_SKILL_NAME_ALIASES.some(
            (alias) =>
              alias.toLowerCase().replace(/\s+/g, "_") === nameNorm,
          );

          return byId || byName;
        })
        .map((ms) => ms.id),
    );

    for (const t of trees) {
      const skills = t.skills as { mainSkills?: Array<{ id: string }> } | null;

      treeIdToMainSkillIds[t.id] = skills?.mainSkills?.map((ms) => ms.id) ?? [];
    }
  }

  for (const cid of allyParticipants.characterIds) {
    const character = await prisma.character.findUnique({
      where: { id: cid, campaignId },
    });

    if (!character) continue;

    const attacks = await getCharacterAttacks(cid, campaignId);

    const rawProgress =
      (character.skillTreeProgress as Record<
        string,
        { level?: string; unlockedSkills?: string[] }
      >) ?? undefined;

    const skillTreeProgress =
      enrichSkillTreeProgressWithInferredLevels(rawProgress) ?? rawProgress;

    const stats = getCharacterStats({
      id: character.id,
      name: character.name,
      level: character.level,
      strength: character.strength,
      dexterity: character.dexterity,
      attacks: attacks.map((a) => ({ damageDice: a.damageDice, type: a.type })),
      skillTreeProgress,
      treeIdToMainSkillIds,
      magicMainSkillIds,
    });

    totalDpr += stats.dpr;
    totalHp += stats.hp;
    allyCount += 1;
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
      groupId: unit.groupId,
      race: unit.race,
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
      groupId?: string | null;
      race?: string;
    } = { campaignId };

    if (minTier != null) where.level = { ...where.level, gte: minTier };

    if (maxTier != null) where.level = { ...where.level, lte: maxTier };

    if (groupId != null) where.groupId = groupId;

    if (race != null && race !== "") where.race = race;

    const units = await prisma.unit.findMany({ where });

    const unitsWithStats: UnitStats[] = units.map((u) =>
      getUnitStats({
        id: u.id,
        name: u.name,
        maxHp: u.maxHp,
        level: u.level,
        groupId: u.groupId,
        race: u.race,
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
