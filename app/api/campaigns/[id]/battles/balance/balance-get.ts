/**
 * GET balance: DPR, HP, KPI для персонажів та юнітів кампанії.
 */

import {
  enrichSkillTreeProgressWithInferredLevels,
  getCharacterAttacks,
} from "./balance-helpers";

import {
  MAGIC_MAIN_SKILL_IDS,
  MAGIC_MAIN_SKILL_NAME_ALIASES,
} from "@/lib/constants/dpr-by-main-skill";
import { prisma } from "@/lib/db";
import type {
  CharacterDprBreakdown,
  TreeIdToMainSkillIds,
} from "@/lib/utils/battle/balance";
import { getCharacterStats, getUnitStats } from "@/lib/utils/battle/balance";

export async function getBalancePayload(campaignId: string) {
  const treeIdToMainSkillIds: TreeIdToMainSkillIds = {};

  const [trees, mainSkills] = await Promise.all([
    prisma.skillTree.findMany({ where: { campaignId } }),
    prisma.mainSkill.findMany({
      where: { campaignId },
      select: { id: true, name: true },
    }),
  ]);

  const mainSkillsList = mainSkills.map((ms) => ({ id: ms.id, name: ms.name }));

  console.log("[Balance GET] Main skills кампанії (id, name):", mainSkillsList);

  const magicMainSkillIds = new Set(
    mainSkills
      .filter((ms) => {
        const nameNorm = ms.name.toLowerCase().trim().replace(/\s+/g, "_");

        const byId = MAGIC_MAIN_SKILL_IDS.some((slug) => ms.id === slug);

        const byName = MAGIC_MAIN_SKILL_NAME_ALIASES.some(
          (alias) => alias.toLowerCase().replace(/\s+/g, "_") === nameNorm,
        );

        return byId || byName;
      })
      .map((ms) => ms.id),
  );

  for (const t of trees) {
    const skills = t.skills as { mainSkills?: Array<{ id: string }> } | null;

    treeIdToMainSkillIds[t.id] = skills?.mainSkills?.map((ms) => ms.id) ?? [];
  }

  const characterStats: Record<
    string,
    { dpr: number; hp: number; kpi: number; dprBreakdown?: CharacterDprBreakdown }
  > = {};

  const characters = await prisma.character.findMany({
    where: { campaignId },
  });

  for (const character of characters) {
    const attacks = await getCharacterAttacks(character.id, campaignId);

    const rawProgress =
      (character.skillTreeProgress as Record<
        string,
        { level?: string; unlockedSkills?: string[] }
      >) ?? undefined;

    const skillTreeProgress =
      enrichSkillTreeProgressWithInferredLevels(rawProgress) ?? rawProgress;

    const progressForLog = rawProgress
      ? Object.entries(rawProgress).map(([key, entry]) => ({
          treeOrMainSkillId: key,
          level: entry?.level,
          unlockedCount: entry?.unlockedSkills?.length ?? 0,
        }))
      : [];

    console.log(
      `[Balance GET] Персонаж "${character.name}" (${character.id}): основні навички (прогрес)`,
      progressForLog,
    );

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
    const characterSkillProgress = characters.map((c) => {
      const raw =
        (c.skillTreeProgress as Record<
          string,
          { level?: string; unlockedSkills?: string[] }
        >) ?? {};

      return {
        characterId: c.id,
        characterName: c.name,
        progress: Object.entries(raw).map(([key, entry]) => ({
          treeOrMainSkillId: key,
          level: entry?.level,
          unlockedCount: entry?.unlockedSkills?.length ?? 0,
        })),
      };
    });

    payload._debug = { mainSkills: mainSkillsList, characterSkillProgress };
  }

  return payload;
}
