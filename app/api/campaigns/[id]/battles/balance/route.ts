import { NextResponse } from "next/server";
import { z } from "zod";

import { AttackType } from "@/lib/constants/battle";
import {
  ArtifactModifierType,
  DEFAULT_ARTIFACT_MODIFIERS,
} from "@/lib/constants/equipment";
import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import {
  type AllyStats,
  type DifficultyRatio,
  type TreeIdToMainSkillIds,
  DIFFICULTY_RATIOS,
  getCharacterStats,
  getUnitStats,
  suggestEnemyUnits,
  type SuggestedEnemy,
  type UnitStats,
} from "@/lib/utils/battle/balance-calculations";

const balanceSchema = z.object({
  allyParticipants: z.object({
    characterIds: z.array(z.string()).default([]),
    units: z
      .array(z.object({ id: z.string(), quantity: z.number().min(1).max(20) }))
      .default([]),
  }),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  minTier: z.number().min(1).max(30).optional(),
  maxTier: z.number().min(1).max(30).optional(),
  groupId: z.string().optional(),
  race: z.string().optional(),
});

type ArtifactModifier = { type: string; value?: number | string };

function getModifierValue(
  modifiers: ArtifactModifier[],
  modifierType: string,
  defaultValue: string,
): string {
  const m = modifiers.find((x) => x.type === modifierType);
  if (m?.value == null) return defaultValue;
  return String(m.value);
}

/**
 * Витягує масив атак (damageDice, type) з персонажа: інвентар + артефакти.
 */
async function getCharacterAttacks(
  characterId: string,
  campaignId: string,
): Promise<Array<{ damageDice: string; type: string }>> {
  const character = await prisma.character.findUnique({
    where: { id: characterId, campaignId },
    include: { inventory: true },
  });
  if (!character?.inventory) return [];

  const equipped =
    (character.inventory.equipped as Record<string, string | unknown>) || {};
  const weaponSlots = ["mainHand", "offHand", "weapon", "weapon1", "weapon2"];
  const weaponIds: string[] = [];
  const inlineAttacks: Array<{ damageDice: string; type: string }> = [];

  for (const key of weaponSlots) {
    const val = equipped[key];
    if (!val) continue;
    if (typeof val === "string") {
      weaponIds.push(val);
    } else if (typeof val === "object" && val !== null && "damageDice" in val) {
      const v = val as { damageDice?: string; weaponType?: string };
      inlineAttacks.push({
        damageDice: (v.damageDice as string) || "1d6",
        type: (v.weaponType as string) === AttackType.RANGED ? AttackType.RANGED : AttackType.MELEE,
      });
    }
  }

  if (weaponIds.length === 0) return inlineAttacks;

  const artifacts = await prisma.artifact.findMany({
    where: { id: { in: weaponIds }, campaignId },
  });

  for (const art of artifacts) {
    if (
      art.slot !== "weapon" &&
      art.slot !== "mainHand" &&
      art.slot !== "offHand"
    )
      continue;
    const modifiers = (art.modifiers as ArtifactModifier[]) || [];
    const damageDice = getModifierValue(
      modifiers,
      ArtifactModifierType.DAMAGE_DICE,
      DEFAULT_ARTIFACT_MODIFIERS.DAMAGE_DICE,
    );
    const attackType = getModifierValue(
      modifiers,
      ArtifactModifierType.ATTACK_TYPE,
      AttackType.MELEE,
    );
    inlineAttacks.push({
      damageDice,
      type: attackType,
    });
  }

  return inlineAttacks;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: campaignId } = await params;
    const accessResult = await requireDM(campaignId);
    if (accessResult instanceof NextResponse) return accessResult;

    const body = await request.json();
    const data = balanceSchema.parse(body);

    const { allyParticipants, difficulty, minTier, maxTier, groupId, race } =
      data;

    let totalDpr = 0;
    let totalHp = 0;
    let allyCount = 0;

    const treeIdToMainSkillIds: TreeIdToMainSkillIds = {};
    if (allyParticipants.characterIds.length > 0) {
      const trees = await prisma.skillTree.findMany({
        where: { campaignId },
      });
      for (const t of trees) {
        const skills = t.skills as { mainSkills?: Array<{ id: string }> } | null;
        const ids = skills?.mainSkills?.map((ms) => ms.id) ?? [];
        treeIdToMainSkillIds[t.id] = ids;
      }
    }

    for (const cid of allyParticipants.characterIds) {
      const character = await prisma.character.findUnique({
        where: { id: cid, campaignId },
      });
      if (!character) continue;
      const attacks = await getCharacterAttacks(cid, campaignId);
      const skillTreeProgress = (character.skillTreeProgress as Record<string, { level?: string; unlockedSkills?: string[] }>) ?? undefined;
      const stats = getCharacterStats({
        id: character.id,
        name: character.name,
        maxHp: character.maxHp,
        strength: character.strength,
        dexterity: character.dexterity,
        attacks: attacks.map((a) => ({
          damageDice: a.damageDice,
          type: a.type,
        })),
        skillTreeProgress,
        treeIdToMainSkillIds,
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
        attacks: (unit.attacks as Array<{ damageDice?: string; type?: string }>) || [],
      });
      totalDpr += stats.dpr * quantity;
      totalHp += stats.hp * quantity;
      allyCount += quantity;
    }

    const kpi = totalHp > 0 ? totalDpr / totalHp : 0;
    const allyStats: AllyStats = {
      dpr: Math.round(totalDpr * 10) / 10,
      totalHp: totalHp,
      kpi: Math.round(kpi * 100) / 100,
      allyCount,
    };

    const response: {
      allyStats: AllyStats;
      targetEnemyKpi?: number;
      suggestedEnemies?: SuggestedEnemy[];
    } = { allyStats };

    if (difficulty != null) {
      const ratio = DIFFICULTY_RATIOS[difficulty as DifficultyRatio];
      const targetEnemyKpi = ratio !== 0 ? kpi / ratio : kpi;
      response.targetEnemyKpi = Math.round(targetEnemyKpi * 100) / 100;

      const targetHp = totalHp;
      const targetDpr = targetEnemyKpi * targetHp;

      const where: { campaignId: string; level?: { gte?: number; lte?: number }; groupId?: string | null; race?: string } = {
        campaignId,
      };
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
          attacks: (u.attacks as Array<{ damageDice?: string; type?: string }>) || [],
        }),
      );

      const suggested = suggestEnemyUnits(
        unitsWithStats,
        targetEnemyKpi,
        targetDpr,
        targetHp,
      );
      response.suggestedEnemies = suggested.map((s) => ({
        ...s,
        totalDpr: Math.round(s.totalDpr * 10) / 10,
        totalHp: s.totalHp,
      }));
    }

    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues }, { status: 400 });
    }
    console.error("Balance API error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
