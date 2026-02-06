import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireCampaignAccess, requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";

// Схема для згрупованої структури (всі поля опціональні для оновлення)
const updateSkillSchema = z.object({
  basicInfo: z
    .object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      icon: z.preprocess(
        (val) => (val === "" ? null : val),
        z.string().url().nullable().optional(),
      ),
    })
    .optional(),
  bonuses: z.record(z.string(), z.number()).optional(),
  combatStats: z
    .object({
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
    })
    .optional(),
  spellData: z
    .object({
      spellId: z.string().nullable().optional(),
      spellGroupId: z.string().nullable().optional(),
      grantedSpellId: z.string().nullable().optional(),
    })
    .optional(),
  spellEnhancementData: z
    .object({
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
      spellEffectIncrease: z.number().min(0).max(200).optional().nullable(),
      spellTargetChange: z
        .object({
          target: z.enum(["enemies", "allies", "all"]),
        })
        .optional()
        .nullable(),
      spellAdditionalModifier: z
        .object({
          modifier: z.string().optional(),
          damageDice: z.string().optional(),
          duration: z.number().optional(),
        })
        .optional()
        .nullable(),
      spellNewSpellId: z.string().nullable().optional(),
    })
    .optional(),
  mainSkillData: z
    .object({
      mainSkillId: z.string().nullable().optional(),
    })
    .optional(),
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
    .optional(),
});

/** Форматує один скіл з Prisma у згруповану структуру для фронтенду */
function formatSkillResponse(skill: {
  id: string;
  campaignId: string;
  name: string;
  description: string | null;
  icon: string | null;
  bonuses: unknown;
  damage: number | null;
  armor: number | null;
  speed: number | null;
  physicalResistance: number | null;
  magicalResistance: number | null;
  spellId: string | null;
  spellGroupId: string | null;
  mainSkillId: string | null;
  spellEnhancementTypes: unknown;
  spellEffectIncrease: number | null;
  spellTargetChange: unknown;
  spellAdditionalModifier: unknown;
  spellNewSpellId: string | null;
  grantedSpellId?: string | null;
  basicInfo: unknown;
  combatStats: unknown;
  mainSkillData: unknown;
  spellData: unknown;
  spellEnhancementData: unknown;
  skillTriggers: unknown;
  image: string | null;
  createdAt: Date;
  spell?: { id: string; name: string } | null;
  spellGroup?: { id: string; name: string } | null;
  grantedSpell?: { id: string; name: string } | null;
}) {
  let basicInfo: Record<string, unknown>;
  if (
    skill.basicInfo &&
    typeof skill.basicInfo === "object" &&
    !Array.isArray(skill.basicInfo)
  ) {
    basicInfo = { ...(skill.basicInfo as Record<string, unknown>) };
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
  const spellDataRaw =
    skill.spellData &&
    typeof skill.spellData === "object" &&
    !Array.isArray(skill.spellData)
      ? (skill.spellData as Record<string, unknown>)
      : {};
  const spellData = {
    spellId: skill.spellId || (spellDataRaw.spellId as string) || undefined,
    spellGroupId:
      skill.spellGroupId || (spellDataRaw.spellGroupId as string) || undefined,
    grantedSpellId:
      skill.grantedSpellId ||
      (spellDataRaw.grantedSpellId as string) ||
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
          spellAdditionalModifier: skill.spellAdditionalModifier || undefined,
          spellNewSpellId: skill.spellNewSpellId || undefined,
        };
  const mainSkillData =
    skill.mainSkillData &&
    typeof skill.mainSkillData === "object" &&
    !Array.isArray(skill.mainSkillData)
      ? (skill.mainSkillData as Record<string, unknown>)
      : { mainSkillId: skill.mainSkillId || undefined };

  return {
    id: skill.id,
    campaignId: skill.campaignId,
    basicInfo,
    image: skill.image ?? null,
    bonuses: (skill.bonuses as Record<string, number>) || {},
    combatStats,
    spellData,
    spellEnhancementData,
    mainSkillData,
    skillTriggers: Array.isArray(skill.skillTriggers) ? skill.skillTriggers : [],
    createdAt: skill.createdAt,
    spell: skill.spell
      ? { id: skill.spell.id, name: skill.spell.name }
      : null,
    spellGroup: skill.spellGroup
      ? { id: skill.spellGroup.id, name: skill.spellGroup.name }
      : null,
    grantedSpell: skill.grantedSpell
      ? { id: skill.grantedSpell.id, name: skill.grantedSpell.name }
      : null,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; skillId: string }> },
) {
  try {
    const { id, skillId } = await params;

    const accessResult = await requireCampaignAccess(id, false);
    if (accessResult instanceof NextResponse) return accessResult;

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: { spell: true, spellGroup: true, grantedSpell: true },
    });

    if (!skill || skill.campaignId !== id) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    return NextResponse.json(formatSkillResponse(skill));
  } catch (error) {
    console.error("Error fetching skill:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; skillId: string }> },
) {
  try {
    const { id, skillId } = await params;

    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    const validationError = validateCampaignOwnership(skill, id);

    if (validationError) {
      return validationError;
    }

    const body = await request.json();

    const data = updateSkillSchema.parse(body);

    const updateData: Prisma.SkillUpdateInput = {};

    if (data.image !== undefined) updateData.image = data.image;

    // Оновлюємо згруповані дані
    if (data.basicInfo !== undefined) {
      updateData.basicInfo = data.basicInfo as Prisma.InputJsonValue;

      // Також оновлюємо старі поля для зворотної сумісності
      const basicInfo = data.basicInfo as Record<string, unknown>;

      if (basicInfo.name !== undefined)
        updateData.name = basicInfo.name as string;

      if (basicInfo.description !== undefined)
        updateData.description = basicInfo.description as string;

      if (basicInfo.icon !== undefined)
        updateData.icon = basicInfo.icon as string | null;
    }

    if (data.bonuses !== undefined) {
      updateData.bonuses = data.bonuses as Prisma.InputJsonValue;
    }

    if (data.combatStats !== undefined) {
      updateData.combatStats = data.combatStats as Prisma.InputJsonValue;

      // Також оновлюємо старі поля
      const combatStats = data.combatStats as Record<string, unknown>;

      if (combatStats.damage !== undefined)
        updateData.damage = combatStats.damage;

      if (combatStats.armor !== undefined) updateData.armor = combatStats.armor;

      if (combatStats.speed !== undefined) updateData.speed = combatStats.speed;

      if (combatStats.physicalResistance !== undefined)
        updateData.physicalResistance = combatStats.physicalResistance;

      if (combatStats.magicalResistance !== undefined)
        updateData.magicalResistance = combatStats.magicalResistance;
    }

    if (data.spellData !== undefined) {
      updateData.spellData = data.spellData as Prisma.InputJsonValue;

      const spellData = data.spellData as Record<string, unknown>;

      if (spellData.spellId !== undefined) {
        if (spellData.spellId === null) {
          updateData.spell = { disconnect: true };
        } else {
          updateData.spell = { connect: { id: spellData.spellId as string } };
        }
      }

      if (spellData.spellGroupId !== undefined) {
        if (spellData.spellGroupId === null) {
          updateData.spellGroup = { disconnect: true };
        } else {
          updateData.spellGroup = {
            connect: { id: spellData.spellGroupId as string },
          };
        }
      }
      if (spellData.grantedSpellId !== undefined) {
        if (spellData.grantedSpellId === null) {
          updateData.grantedSpell = { disconnect: true };
        } else {
          updateData.grantedSpell = {
            connect: { id: spellData.grantedSpellId as string },
          };
        }
      }
    }

    if (data.spellEnhancementData !== undefined) {
      updateData.spellEnhancementData =
        data.spellEnhancementData as Prisma.InputJsonValue;

      const spellEnhancementData = data.spellEnhancementData as Record<
        string,
        unknown
      >;

      if (spellEnhancementData.spellEnhancementTypes !== undefined) {
        updateData.spellEnhancementTypes =
          spellEnhancementData.spellEnhancementTypes as Prisma.InputJsonValue;
      }

      if (spellEnhancementData.spellEffectIncrease !== undefined) {
        updateData.spellEffectIncrease =
          spellEnhancementData.spellEffectIncrease;
      }

      if (spellEnhancementData.spellTargetChange !== undefined) {
        if (spellEnhancementData.spellTargetChange === null) {
          updateData.spellTargetChange = Prisma.JsonNull;
        } else {
          updateData.spellTargetChange =
            spellEnhancementData.spellTargetChange as Prisma.InputJsonValue;
        }
      }

      if (spellEnhancementData.spellAdditionalModifier !== undefined) {
        if (spellEnhancementData.spellAdditionalModifier === null) {
          updateData.spellAdditionalModifier = Prisma.JsonNull;
        } else {
          updateData.spellAdditionalModifier =
            spellEnhancementData.spellAdditionalModifier as Prisma.InputJsonValue;
        }
      }

      if (spellEnhancementData.spellNewSpellId !== undefined) {
        if (spellEnhancementData.spellNewSpellId === null) {
          updateData.spellNewSpell = { disconnect: true };
        } else {
          updateData.spellNewSpell = {
            connect: { id: spellEnhancementData.spellNewSpellId as string },
          };
        }
      }
    }

    if (data.mainSkillData !== undefined) {
      updateData.mainSkillData = data.mainSkillData as Prisma.InputJsonValue;

      const mainSkillData = data.mainSkillData as Record<string, unknown>;

      if (mainSkillData.mainSkillId !== undefined) {
        if (mainSkillData.mainSkillId === null) {
          updateData.mainSkill = { disconnect: true };
        } else {
          updateData.mainSkill = {
            connect: { id: mainSkillData.mainSkillId as string },
          };
        }
      }
    }

    if (data.skillTriggers !== undefined) {
      updateData.skillTriggers = data.skillTriggers as Prisma.InputJsonValue;
    }

    const updatedSkill = await prisma.skill.update({
      where: { id: skillId },
      data: updateData,
      include: {
        spell: true,
        spellGroup: true,
        grantedSpell: true,
        mainSkill: true,
      },
    });

    // Форматуємо відповідь для фронтенду (згрупована структура)
    const basicInfo =
      updatedSkill.basicInfo &&
      typeof updatedSkill.basicInfo === "object" &&
      !Array.isArray(updatedSkill.basicInfo)
        ? (updatedSkill.basicInfo as Record<string, unknown>)
        : {
            name: updatedSkill.name || "",
            description: updatedSkill.description || "",
            icon: updatedSkill.icon || "",
          };

    const combatStats =
      updatedSkill.combatStats &&
      typeof updatedSkill.combatStats === "object" &&
      !Array.isArray(updatedSkill.combatStats)
        ? (updatedSkill.combatStats as Record<string, unknown>)
        : {
            damage: updatedSkill.damage || undefined,
            armor: updatedSkill.armor || undefined,
            speed: updatedSkill.speed || undefined,
            physicalResistance: updatedSkill.physicalResistance || undefined,
            magicalResistance: updatedSkill.magicalResistance || undefined,
          };

    const patchSpellDataRaw =
      updatedSkill.spellData &&
      typeof updatedSkill.spellData === "object" &&
      !Array.isArray(updatedSkill.spellData)
        ? (updatedSkill.spellData as Record<string, unknown>)
        : {};
    const spellData = {
      spellId: updatedSkill.spellId || (patchSpellDataRaw.spellId as string) || undefined,
      spellGroupId:
        updatedSkill.spellGroupId || (patchSpellDataRaw.spellGroupId as string) || undefined,
      grantedSpellId:
        updatedSkill.grantedSpellId || (patchSpellDataRaw.grantedSpellId as string) || undefined,
    };

    const spellEnhancementData =
      updatedSkill.spellEnhancementData &&
      typeof updatedSkill.spellEnhancementData === "object" &&
      !Array.isArray(updatedSkill.spellEnhancementData)
        ? (updatedSkill.spellEnhancementData as Record<string, unknown>)
        : {
            spellEnhancementTypes: Array.isArray(
              updatedSkill.spellEnhancementTypes,
            )
              ? updatedSkill.spellEnhancementTypes
              : [],
            spellEffectIncrease: updatedSkill.spellEffectIncrease || undefined,
            spellTargetChange: updatedSkill.spellTargetChange || undefined,
            spellAdditionalModifier:
              updatedSkill.spellAdditionalModifier || undefined,
            spellNewSpellId: updatedSkill.spellNewSpellId || undefined,
          };

    const mainSkillData =
      updatedSkill.mainSkillData &&
      typeof updatedSkill.mainSkillData === "object" &&
      !Array.isArray(updatedSkill.mainSkillData)
        ? (updatedSkill.mainSkillData as Record<string, unknown>)
        : {
            mainSkillId: updatedSkill.mainSkillId || undefined,
          };

    const formattedSkill = {
      id: updatedSkill.id,
      campaignId: updatedSkill.campaignId,
      basicInfo,
      image: updatedSkill.image ?? null,
      bonuses: (updatedSkill.bonuses as Record<string, number>) || {},
      combatStats,
      spellData,
      spellEnhancementData,
      mainSkillData,
      skillTriggers: Array.isArray(updatedSkill.skillTriggers)
        ? updatedSkill.skillTriggers
        : [],
      createdAt: updatedSkill.createdAt,
      spell: updatedSkill.spell
        ? {
            id: updatedSkill.spell.id,
            name: updatedSkill.spell.name,
          }
        : null,
      spellGroup: updatedSkill.spellGroup
        ? {
            id: updatedSkill.spellGroup.id,
            name: updatedSkill.spellGroup.name,
          }
        : null,
      grantedSpell: updatedSkill.grantedSpell
        ? {
            id: updatedSkill.grantedSpell.id,
            name: updatedSkill.grantedSpell.name,
          }
        : null,
    };

    return NextResponse.json(formattedSkill);
  } catch (error) {
    console.error("Error updating skill:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; skillId: string }> },
) {
  try {
    const { id, skillId } = await params;

    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    const validationError = validateCampaignOwnership(skill, id);

    if (validationError) {
      return validationError;
    }

    await prisma.skill.delete({
      where: { id: skillId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting skill:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
