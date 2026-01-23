import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireDM, validateCampaignOwnership } from "@/lib/utils/api-auth";

// Схема для згрупованої структури (всі поля опціональні для оновлення)
const updateSkillSchema = z.object({
  basicInfo: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    icon: z.preprocess(
      (val) => (val === "" ? null : val),
      z.string().url().nullable().optional()
    ),
    races: z.array(z.string()).optional(),
    isRacial: z.boolean().optional(),
  }).optional(),
  bonuses: z.record(z.string(), z.number()).optional(),
  combatStats: z.object({
    damage: z.number().optional(),
    armor: z.number().optional(),
    speed: z.number().optional(),
    physicalResistance: z.number().optional(),
    magicalResistance: z.number().optional(),
  }).optional(),
  spellData: z.object({
    spellId: z.string().nullable().optional(),
    spellGroupId: z.string().nullable().optional(),
  }).optional(),
  spellEnhancementData: z.object({
    spellEnhancementTypes: z
      .array(z.enum(["effect_increase", "target_change", "additional_modifier", "new_spell"]))
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
  }).optional(),
  mainSkillData: z.object({
    mainSkillId: z.string().nullable().optional(),
  }).optional(),
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
          ]),
        }),
        // Складний тригер
        z.object({
          type: z.literal("complex"),
          target: z.enum(["ally", "enemy"]),
          operator: z.enum([">", "<", "=", "<=", ">="]),
          value: z.number(),
          valueType: z.enum(["number", "percent"]),
          stat: z.enum(["HP", "Attack", "AC", "Speed", "Morale", "Level"]),
        }),
      ])
    )
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; skillId: string }> }
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
    
    // Оновлюємо згруповані дані
    if (data.basicInfo !== undefined) {
      updateData.basicInfo = data.basicInfo as Prisma.InputJsonValue;

      // Також оновлюємо старі поля для зворотної сумісності
      const basicInfo = data.basicInfo as any;

      if (basicInfo.name !== undefined) updateData.name = basicInfo.name;

      if (basicInfo.description !== undefined) updateData.description = basicInfo.description;

      if (basicInfo.icon !== undefined) updateData.icon = basicInfo.icon;

      if (basicInfo.races !== undefined) updateData.races = basicInfo.races as Prisma.InputJsonValue;

      if (basicInfo.isRacial !== undefined) updateData.isRacial = basicInfo.isRacial;
    }
    
    if (data.bonuses !== undefined) {
      updateData.bonuses = data.bonuses as Prisma.InputJsonValue;
    }
    
    if (data.combatStats !== undefined) {
      updateData.combatStats = data.combatStats as Prisma.InputJsonValue;

      // Також оновлюємо старі поля
      const combatStats = data.combatStats as any;

      if (combatStats.damage !== undefined) updateData.damage = combatStats.damage;

      if (combatStats.armor !== undefined) updateData.armor = combatStats.armor;

      if (combatStats.speed !== undefined) updateData.speed = combatStats.speed;

      if (combatStats.physicalResistance !== undefined) updateData.physicalResistance = combatStats.physicalResistance;

      if (combatStats.magicalResistance !== undefined) updateData.magicalResistance = combatStats.magicalResistance;
    }
    
    if (data.spellData !== undefined) {
      updateData.spellData = data.spellData as Prisma.InputJsonValue;

      const spellData = data.spellData as any;

      if (spellData.spellId !== undefined) {
        if (spellData.spellId === null) {
          updateData.spell = { disconnect: true };
        } else {
          updateData.spell = { connect: { id: spellData.spellId } };
        }
      }

      if (spellData.spellGroupId !== undefined) {
        if (spellData.spellGroupId === null) {
          updateData.spellGroup = { disconnect: true };
        } else {
          updateData.spellGroup = { connect: { id: spellData.spellGroupId } };
        }
      }
    }
    
    if (data.spellEnhancementData !== undefined) {
      updateData.spellEnhancementData = data.spellEnhancementData as Prisma.InputJsonValue;

      const spellEnhancementData = data.spellEnhancementData as any;

      if (spellEnhancementData.spellEnhancementTypes !== undefined) {
        updateData.spellEnhancementTypes = spellEnhancementData.spellEnhancementTypes as Prisma.InputJsonValue;
      }

      if (spellEnhancementData.spellEffectIncrease !== undefined) {
        updateData.spellEffectIncrease = spellEnhancementData.spellEffectIncrease;
      }

      if (spellEnhancementData.spellTargetChange !== undefined) {
        if (spellEnhancementData.spellTargetChange === null) {
          updateData.spellTargetChange = Prisma.JsonNull;
        } else {
          updateData.spellTargetChange = spellEnhancementData.spellTargetChange as Prisma.InputJsonValue;
        }
      }

      if (spellEnhancementData.spellAdditionalModifier !== undefined) {
        if (spellEnhancementData.spellAdditionalModifier === null) {
          updateData.spellAdditionalModifier = Prisma.JsonNull;
        } else {
          updateData.spellAdditionalModifier = spellEnhancementData.spellAdditionalModifier as Prisma.InputJsonValue;
        }
      }

      if (spellEnhancementData.spellNewSpellId !== undefined) {
        if (spellEnhancementData.spellNewSpellId === null) {
          updateData.spellNewSpell = { disconnect: true };
        } else {
          updateData.spellNewSpell = { connect: { id: spellEnhancementData.spellNewSpellId } };
        }
      }
    }
    
    if (data.mainSkillData !== undefined) {
      updateData.mainSkillData = data.mainSkillData as Prisma.InputJsonValue;

      const mainSkillData = data.mainSkillData as any;

      if (mainSkillData.mainSkillId !== undefined) {
        if (mainSkillData.mainSkillId === null) {
          updateData.mainSkill = { disconnect: true };
        } else {
          updateData.mainSkill = { connect: { id: mainSkillData.mainSkillId } };
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
        mainSkill: true,
      },
    });

    // Форматуємо відповідь для фронтенду (згрупована структура)
    const basicInfo = updatedSkill.basicInfo && typeof updatedSkill.basicInfo === 'object' && !Array.isArray(updatedSkill.basicInfo)
      ? updatedSkill.basicInfo as any
      : {
          name: updatedSkill.name || "",
          description: updatedSkill.description || "",
          icon: updatedSkill.icon || "",
          races: Array.isArray(updatedSkill.races) ? updatedSkill.races : (updatedSkill.races as any) || [],
          isRacial: updatedSkill.isRacial || false,
        };
    
    const combatStats = updatedSkill.combatStats && typeof updatedSkill.combatStats === 'object' && !Array.isArray(updatedSkill.combatStats)
      ? updatedSkill.combatStats as any
      : {
          damage: updatedSkill.damage || undefined,
          armor: updatedSkill.armor || undefined,
          speed: updatedSkill.speed || undefined,
          physicalResistance: updatedSkill.physicalResistance || undefined,
          magicalResistance: updatedSkill.magicalResistance || undefined,
        };
    
    const spellData = updatedSkill.spellData && typeof updatedSkill.spellData === 'object' && !Array.isArray(updatedSkill.spellData)
      ? updatedSkill.spellData as any
      : {
          spellId: updatedSkill.spellId || undefined,
          spellGroupId: updatedSkill.spellGroupId || undefined,
        };
    
    const spellEnhancementData = updatedSkill.spellEnhancementData && typeof updatedSkill.spellEnhancementData === 'object' && !Array.isArray(updatedSkill.spellEnhancementData)
      ? updatedSkill.spellEnhancementData as any
      : {
          spellEnhancementTypes: Array.isArray(updatedSkill.spellEnhancementTypes)
            ? updatedSkill.spellEnhancementTypes
            : [],
          spellEffectIncrease: updatedSkill.spellEffectIncrease || undefined,
          spellTargetChange: updatedSkill.spellTargetChange || undefined,
          spellAdditionalModifier: updatedSkill.spellAdditionalModifier || undefined,
          spellNewSpellId: updatedSkill.spellNewSpellId || undefined,
        };
    
    const mainSkillData = updatedSkill.mainSkillData && typeof updatedSkill.mainSkillData === 'object' && !Array.isArray(updatedSkill.mainSkillData)
      ? updatedSkill.mainSkillData as any
      : {
          mainSkillId: updatedSkill.mainSkillId || undefined,
        };

    const formattedSkill = {
      id: updatedSkill.id,
      campaignId: updatedSkill.campaignId,
      basicInfo,
      bonuses: (updatedSkill.bonuses as Record<string, number>) || {},
      combatStats,
      spellData,
      spellEnhancementData,
      mainSkillData,
      skillTriggers: Array.isArray(updatedSkill.skillTriggers)
        ? updatedSkill.skillTriggers
        : [],
      createdAt: updatedSkill.createdAt,
      spell: updatedSkill.spell ? {
        id: updatedSkill.spell.id,
        name: updatedSkill.spell.name,
      } : null,
      spellGroup: updatedSkill.spellGroup ? {
        id: updatedSkill.spellGroup.id,
        name: updatedSkill.spellGroup.name,
      } : null,
    };

    return NextResponse.json(formattedSkill);
  } catch (error) {
    console.error("Error updating skill:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; skillId: string }> }
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
      { status: 500 }
    );
  }
}
