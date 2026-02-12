import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";

// Схема для згрупованої структури
const createSkillSchema = z.object({
  basicInfo: z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    icon: z.preprocess(
      (val) => (val === "" ? null : val),
      z.string().url().nullable().optional(),
    ),
  }),
  bonuses: z.record(z.string(), z.number()).default({}),
  combatStats: z.object({
    damage: z.number().optional(),
    armor: z.number().optional(),
    speed: z.number().optional(),
    physicalResistance: z.number().optional(),
    magicalResistance: z.number().optional(),
    min_targets: z.number().optional(),
    max_targets: z.number().optional(),
    effects: z
      .array(
        z.object({
            stat: z.string(),
            type: z.string(),
            value: z.union([z.number(), z.string(), z.boolean()]),
            isPercentage: z.boolean().optional(),
            duration: z.number().optional(),
            target: z
              .enum(["self", "enemy", "all_enemies", "all_allies"])
              .optional(),
            maxTriggers: z.number().min(1).max(100).nullable().optional(),
          }),
      )
      .optional(),
  }),
  spellData: z.object({
    spellId: z.string().optional(),
    spellGroupId: z.string().optional(),
    grantedSpellId: z.string().nullable().optional(),
  }),
  spellEnhancementData: z.object({
    spellEnhancementTypes: z
      .array(
        z.enum([
          "effect_increase",
          "target_change",
          "additional_modifier",
          "new_spell",
        ]),
      )
      .optional(),
    spellEffectIncrease: z.number().min(0).max(200).optional(),
    spellTargetChange: z
      .object({
        target: z.enum(["enemies", "allies", "all"]),
      })
      .optional(),
    spellAdditionalModifier: z
      .object({
        modifier: z.string().optional(),
        damageDice: z.string().optional(),
        duration: z.number().optional(),
      })
      .optional(),
    spellNewSpellId: z.string().optional(),
  }),
  mainSkillData: z.object({
    mainSkillId: z.string().optional(),
  }),
  image: z.string().nullable().optional(),
  skillTriggers: z
    .array(
      z.union([
        // Простий тригер
        z.object({
          type: z.literal("simple"),
          trigger: z.enum([
            "startRound",
            "endRound",
            "beforeOwnerAttack",
            "beforeEnemyAttack",
            "afterOwnerAttack",
            "afterEnemyAttack",
            "beforeOwnerSpellCast",
            "afterOwnerSpellCast",
            "beforeEnemySpellCast",
            "afterEnemySpellCast",
            "bonusAction",
            "passive",
            "onBattleStart",
            "onHit",
            "onAttack",
            "onKill",
            "onAllyDeath",
            "onLethalDamage",
            "onCast",
            "onFirstHitTakenPerRound",
            "onFirstRangedAttack",
            "onMoraleSuccess",
            "allyMoraleCheck",
          ]),
          modifiers: z.object({
            probability: z.number().optional(),
            oncePerBattle: z.boolean().optional(),
            twicePerBattle: z.boolean().optional(),
            stackable: z.boolean().optional(),
            condition: z.string().optional(),
          }).optional(),
        }),
        // Складний тригер
        z.object({
          type: z.literal("complex"),
          target: z.enum(["ally", "enemy"]),
          operator: z.enum([">", "<", "=", "<=", ">="]),
          value: z.number(),
          valueType: z.enum(["number", "percent"]),
          stat: z.enum(["HP", "Attack", "AC", "Speed", "Morale", "Level"]),
          modifiers: z.object({
            probability: z.number().optional(),
            oncePerBattle: z.boolean().optional(),
            twicePerBattle: z.boolean().optional(),
            stackable: z.boolean().optional(),
            condition: z.string().optional(),
          }).optional(),
        }),
      ]),
    )
    .default([])
    .optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const body = await request.json();

    const data = createSkillSchema.parse(body);

    // Витягуємо значення для зворотної сумісності (для relations)
    const basicInfo = data.basicInfo as Record<string, unknown>;

    const spellData = data.spellData as Record<string, unknown>;

    const mainSkillData = data.mainSkillData as Record<string, unknown>;

    const spellEnhancementData = data.spellEnhancementData as Record<
      string,
      unknown
    >;

    const skill = await prisma.skill.create({
      data: {
        campaignId: id,
        image: data.image ?? null,
        // Згруповані дані
        basicInfo: data.basicInfo as Prisma.InputJsonValue,
        bonuses: data.bonuses as Prisma.InputJsonValue,
        combatStats: data.combatStats as Prisma.InputJsonValue,
        spellData: data.spellData as Prisma.InputJsonValue,
        spellEnhancementData:
          data.spellEnhancementData as Prisma.InputJsonValue,
        mainSkillData: data.mainSkillData as Prisma.InputJsonValue,
        skillTriggers: data.skillTriggers
          ? (data.skillTriggers as Prisma.InputJsonValue)
          : [],
        // Старі поля для зворотної сумісності (relations)
        name: (basicInfo.name as string) || "",
        description: (basicInfo.description as string) || null,
        icon: (basicInfo.icon as string) || null,
        damage: data.combatStats.damage || null,
        armor: data.combatStats.armor || null,
        speed: data.combatStats.speed || null,
        physicalResistance: data.combatStats.physicalResistance || null,
        magicalResistance: data.combatStats.magicalResistance || null,
        spellId: (spellData.spellId as string) || null,
        spellGroupId: (spellData.spellGroupId as string) || null,
        grantedSpellId:
          (spellData.grantedSpellId as string) || null,
        mainSkillId: (mainSkillData.mainSkillId as string) || null,
        spellEnhancementTypes: spellEnhancementData.spellEnhancementTypes
          ? (spellEnhancementData.spellEnhancementTypes as Prisma.InputJsonValue)
          : [],
        spellEffectIncrease:
          (spellEnhancementData.spellEffectIncrease as number) || null,
        spellTargetChange: spellEnhancementData.spellTargetChange
          ? (spellEnhancementData.spellTargetChange as Prisma.InputJsonValue)
          : undefined,
        spellAdditionalModifier: spellEnhancementData.spellAdditionalModifier
          ? (spellEnhancementData.spellAdditionalModifier as Prisma.InputJsonValue)
          : undefined,
        spellNewSpellId:
          (spellEnhancementData.spellNewSpellId as string) || null,
      },
      include: {
        spell: true,
        spellGroup: true,
        grantedSpell: true,
      },
    });

    return NextResponse.json(skill);
  } catch (error) {
    console.error("Error creating skill:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Перевіряємо доступ до кампанії (не обов'язково DM)
    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const skills = await prisma.skill.findMany({
      where: {
        campaignId: id,
      },
      include: {
        spell: true,
        spellGroup: true,
        grantedSpell: true,
        mainSkill: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Перетворюємо дані з Prisma в формат для фронтенду (згрупована структура)
    const formattedSkills = skills.map((skill) => {
      // Використовуємо згруповані дані, якщо вони є, інакше формуємо з старих полів
      let basicInfo: Record<string, unknown>;

      if (
        skill.basicInfo &&
        typeof skill.basicInfo === "object" &&
        !Array.isArray(skill.basicInfo)
      ) {
        basicInfo = { ...(skill.basicInfo as Record<string, unknown>) };

        // Заповнюємо name/description з кореня, якщо в basicInfo їх нема (старі записи або імпорт)
        if (basicInfo.name === undefined || basicInfo.name === "")
          basicInfo.name = skill.name || "";

        if (basicInfo.description === undefined)
          basicInfo.description = skill.description ?? "";

        if (basicInfo.icon === undefined) basicInfo.icon = skill.icon ?? "";
      } else {
        basicInfo = {
          name: skill.name || "",
          description: skill.description || "",
          icon: skill.icon || "",
        };
      }

      const combatStats =
        skill.combatStats &&
        typeof skill.combatStats === "object" &&
        !Array.isArray(skill.combatStats)
          ? (skill.combatStats as Record<string, unknown>)
          : {
              damage: skill.damage || undefined,
              armor: skill.armor || undefined,
              speed: skill.speed || undefined,
              physicalResistance: skill.physicalResistance || undefined,
              magicalResistance: skill.magicalResistance || undefined,
            };

      const baseSpellData =
        skill.spellData &&
        typeof skill.spellData === "object" &&
        !Array.isArray(skill.spellData)
          ? (skill.spellData as Record<string, unknown>)
          : {};

      const spellData = {
        spellId: skill.spellId || (baseSpellData.spellId as string) || undefined,
        spellGroupId:
          skill.spellGroupId ||
          (baseSpellData.spellGroupId as string) ||
          undefined,
        grantedSpellId:
          (skill as { grantedSpellId?: string }).grantedSpellId ||
          (baseSpellData.grantedSpellId as string) ||
          undefined,
      };

      const spellEnhancementData =
        skill.spellEnhancementData &&
        typeof skill.spellEnhancementData === "object" &&
        !Array.isArray(skill.spellEnhancementData)
          ? (skill.spellEnhancementData as Record<string, unknown>)
          : {
              spellEnhancementTypes: Array.isArray(skill.spellEnhancementTypes)
                ? skill.spellEnhancementTypes
                : [],
              spellEffectIncrease: skill.spellEffectIncrease || undefined,
              spellTargetChange: skill.spellTargetChange || undefined,
              spellAdditionalModifier:
                skill.spellAdditionalModifier || undefined,
              spellNewSpellId: skill.spellNewSpellId || undefined,
            };

      const mainSkillData =
        skill.mainSkillData &&
        typeof skill.mainSkillData === "object" &&
        !Array.isArray(skill.mainSkillData)
          ? (skill.mainSkillData as Record<string, unknown>)
          : {
              mainSkillId: skill.mainSkillId || undefined,
            };

      return {
        id: skill.id,
        campaignId: skill.campaignId,
        basicInfo,
        image: skill.image ?? null,
        appearanceDescription: (skill as { appearanceDescription?: string | null }).appearanceDescription ?? null,
        bonuses: (skill.bonuses as Record<string, number>) || {},
        combatStats,
        spellData,
        spellEnhancementData,
        mainSkillData,
        skillTriggers: Array.isArray(skill.skillTriggers)
          ? skill.skillTriggers
          : [],
        createdAt: skill.createdAt,
        spell: skill.spell
          ? {
              id: skill.spell.id,
              name: skill.spell.name,
            }
          : null,
        spellGroup: skill.spellGroup
          ? {
              id: skill.spellGroup.id,
              name: skill.spellGroup.name,
            }
          : null,
        grantedSpell:
          (skill as { grantedSpell?: { id: string; name: string } })
            .grantedSpell
            ? {
                id: (skill as { grantedSpell: { id: string } }).grantedSpell.id,
                name: (skill as { grantedSpell: { name: string } }).grantedSpell
                  .name,
              }
            : null,
      };
    });

    return NextResponse.json(formattedSkills);
  } catch (error) {
    console.error("Error fetching skills:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    // Видаляємо всі скіли кампанії
    const result = await prisma.skill.deleteMany({
      where: {
        campaignId: id,
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Error deleting all skills:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
