import { NextResponse } from "next/server";
import { z } from "zod";

import { ArtifactModifierType } from "@/lib/constants/artifacts";
import { AttackType } from "@/lib/constants/battle";
import {
  MAGIC_MAIN_SKILL_IDS,
  MAGIC_MAIN_SKILL_NAME_ALIASES,
} from "@/lib/constants/dpr-by-main-skill";
import { prisma } from "@/lib/db";
import { SkillLevel } from "@/lib/types/skill-tree";
import { requireDM } from "@/lib/utils/api/api-auth";
import {
  type AllyStats,
  type CharacterDprBreakdown,
  DIFFICULTY_DPR_HP_RATIOS,
  type DifficultyRatio,
  getCharacterStats,
  getUnitStats,
  type SuggestedEnemy,
  suggestEnemyUnits,
  type TreeIdToMainSkillIds,
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

function getOptionalModifierValue(
  modifiers: ArtifactModifier[],
  modifierType: string,
): string | undefined {
  const m = modifiers.find((x) => x.type === modifierType);

  if (m?.value == null) return undefined;

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
        type:
          (v.weaponType as string) === AttackType.RANGED
            ? AttackType.RANGED
            : AttackType.MELEE,
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

    const damageDice =
      getOptionalModifierValue(modifiers, ArtifactModifierType.DAMAGE_DICE) ??
      "";

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

/**
 * Виводить рівень прокачки з ID вивчених скілів,
 * якщо в UI не зберігається progress[].level (напр. ID містять "_expert_", "_advanced_").
 */
function inferLevelFromUnlockedSkillIds(
  unlockedSkills: string[] | undefined,
): SkillLevel {
  if (!unlockedSkills?.length) return SkillLevel.BASIC;

  const joined = unlockedSkills.join(" ").toLowerCase();

  if (joined.includes("expert")) return SkillLevel.EXPERT;

  if (joined.includes("advanced")) return SkillLevel.ADVANCED;

  return SkillLevel.BASIC;
}

/** Заповнює progress[].level з unlockedSkills, якщо level не заданий. */
function enrichSkillTreeProgressWithInferredLevels(
  progress:
    | Record<string, { level?: string; unlockedSkills?: string[] }>
    | null
    | undefined,
): Record<string, { level?: string; unlockedSkills?: string[] }> | undefined {
  if (!progress || typeof progress !== "object") return undefined;

  const out: Record<string, { level?: string; unlockedSkills?: string[] }> = {};

  for (const [key, entry] of Object.entries(progress)) {
    const level =
      entry?.level != null && entry.level !== ""
        ? entry.level
        : inferLevelFromUnlockedSkillIds(entry?.unlockedSkills);

    out[key] = { ...entry, level };
  }

  return out;
}

/** GET: повертає DPR, HP, KPI для кожного персонажа та юніта кампанії (для списків при створенні битви). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: campaignId } = await params;

    const accessResult = await requireDM(campaignId);

    if (accessResult instanceof NextResponse) return accessResult;

    const treeIdToMainSkillIds: TreeIdToMainSkillIds = {};

    const [trees, mainSkills] = await Promise.all([
      prisma.skillTree.findMany({ where: { campaignId } }),
      prisma.mainSkill.findMany({ where: { campaignId }, select: { id: true, name: true } }),
    ]);

    const mainSkillsList = mainSkills.map((ms) => ({ id: ms.id, name: ms.name }));

    console.log("[Balance GET] Main skills кампанії (id, name):", mainSkillsList);

    const magicMainSkillIds = new Set(
      mainSkills
        .filter((ms) => {
          const nameNorm = ms.name.toLowerCase().trim().replace(/\s+/g, "_");

          const byId = MAGIC_MAIN_SKILL_IDS.some((slug) => ms.id === slug);

          const byName =
            MAGIC_MAIN_SKILL_NAME_ALIASES.some(
              (alias) =>
                alias.toLowerCase().replace(/\s+/g, "_") === nameNorm,
            );

          return byId || byName;
        })
        .map((ms) => ms.id),
    );

    for (const t of trees) {
      const skills = t.skills as { mainSkills?: Array<{ id: string }> } | null;

      const ids = skills?.mainSkills?.map((ms) => ms.id) ?? [];

      treeIdToMainSkillIds[t.id] = ids;
    }

    const characterStats: Record<
      string,
      {
        dpr: number;
        hp: number;
        kpi: number;
        dprBreakdown?: CharacterDprBreakdown;
      }
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
        attacks: attacks.map((a) => ({
          damageDice: a.damageDice,
          type: a.type,
        })),
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

    return NextResponse.json(payload);
  } catch (e) {
    console.error("Balance entity-stats GET error:", e);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
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

    let magicMainSkillIds = new Set<string>();

    if (allyParticipants.characterIds.length > 0) {
      const [trees, mainSkills] = await Promise.all([
        prisma.skillTree.findMany({ where: { campaignId } }),
        prisma.mainSkill.findMany({
          where: { campaignId },
          select: { id: true, name: true },
        }),
      ]);

      console.log(
        "[Balance POST] Main skills (id, name):",
        mainSkills.map((ms) => ({ id: ms.id, name: ms.name })),
      );

      magicMainSkillIds = new Set(
        mainSkills
          .filter((ms) => {
            const nameNorm = ms.name.toLowerCase().trim().replace(/\s+/g, "_");

            const byId = MAGIC_MAIN_SKILL_IDS.some((slug) => ms.id === slug);

            const byName =
              MAGIC_MAIN_SKILL_NAME_ALIASES.some(
                (alias) =>
                  alias.toLowerCase().replace(/\s+/g, "_") === nameNorm,
              );

            return byId || byName;
          })
          .map((ms) => ms.id),
      );

      for (const t of trees) {
        const skills = t.skills as {
          mainSkills?: Array<{ id: string }>;
        } | null;

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
        attacks: attacks.map((a) => ({
          damageDice: a.damageDice,
          type: a.type,
        })),
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
      } = {
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
