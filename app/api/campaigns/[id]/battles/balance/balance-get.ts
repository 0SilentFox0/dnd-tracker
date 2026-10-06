/**
 * GET balance: DPR, HP, KPI для персонажів та юнітів кампанії.
 */

import { getCharacterAttacks } from "./balance-helpers";

import { prisma } from "@/lib/db";
import type { CharacterDprBreakdown } from "@/lib/utils/battle/balance";
import { getCharacterStats, getUnitStats, magicMainSkillIds as magicMainSkillIdsOf } from "@/lib/utils/battle/balance";
import { branchLevels, normalizeTree, resolveLearned } from "@/lib/utils/skills/progression";

export async function getBalancePayload(campaignId: string) {
  const [trees, mainSkills] = await Promise.all([
    prisma.skillTree.findMany({ where: { campaignId } }),
    prisma.mainSkill.findMany({
      where: { campaignId },
      select: { id: true, name: true },
    }),
  ]);

  const mainSkillsList = mainSkills.map((ms) => ({ id: ms.id, name: ms.name }));

  console.log("[Balance GET] Main skills кампанії (id, name):", mainSkillsList);

  const magicMainSkillIds = magicMainSkillIdsOf(mainSkills);

  const treesByRace = new Map(trees.map((t) => [t.race, normalizeTree(t)]));

  const characterStats: Record<
    string,
    { dpr: number; hp: number; kpi: number; dprBreakdown?: CharacterDprBreakdown }
  > = {};

  const characters = await prisma.character.findMany({
    where: { campaignId },
  });

  for (const character of characters) {
    const attacks = await getCharacterAttacks(character.id, campaignId);

    const tree = treesByRace.get(character.race);

    const levels = tree ? branchLevels(resolveLearned(tree, character.skillTreeProgress)) : {};

    console.log(`[Balance GET] Персонаж "${character.name}" (${character.id}): рівні гілок`, levels);

    const stats = getCharacterStats({
      id: character.id,
      name: character.name,
      level: character.level,
      strength: character.strength,
      dexterity: character.dexterity,
      attacks: attacks.map((a) => ({ damageDice: a.damageDice, type: a.type })),
      branchLevels: levels,
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
      const tree = treesByRace.get(c.race);

      return { characterId: c.id, characterName: c.name, branchLevels: tree ? branchLevels(resolveLearned(tree, c.skillTreeProgress)) : {} };
    });

    payload._debug = { mainSkills: mainSkillsList, characterSkillProgress };
  }

  return payload;
}
