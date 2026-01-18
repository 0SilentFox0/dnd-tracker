import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireDM, validateCampaignOwnership } from "@/lib/utils/api-auth";
import { Prisma } from "@prisma/client";

const updateSkillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  icon: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().url().nullable().optional()
  ),
  races: z.array(z.string()).optional(),
  isRacial: z.boolean().optional(),
  bonuses: z.record(z.string(), z.number()).optional(),
  damage: z.number().optional(),
  armor: z.number().optional(),
  speed: z.number().optional(),
  physicalResistance: z.number().optional(),
  magicalResistance: z.number().optional(),
  spellId: z.string().nullable().optional(),
  spellGroupId: z.string().nullable().optional(),
  mainSkillId: z.string().nullable().optional(),
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
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.races !== undefined) updateData.races = data.races as Prisma.InputJsonValue;
    if (data.isRacial !== undefined) updateData.isRacial = data.isRacial;
    if (data.bonuses !== undefined) updateData.bonuses = data.bonuses as Prisma.InputJsonValue;
    if (data.damage !== undefined) updateData.damage = data.damage;
    if (data.armor !== undefined) updateData.armor = data.armor;
    if (data.speed !== undefined) updateData.speed = data.speed;
    if (data.physicalResistance !== undefined) updateData.physicalResistance = data.physicalResistance;
    if (data.magicalResistance !== undefined) updateData.magicalResistance = data.magicalResistance;
    if (data.spellId !== undefined) {
      if (data.spellId === null) {
        updateData.spell = { disconnect: true };
      } else {
        updateData.spell = { connect: { id: data.spellId } };
      }
    }
    if (data.spellGroupId !== undefined) {
      if (data.spellGroupId === null) {
        updateData.spellGroup = { disconnect: true };
      } else {
        updateData.spellGroup = { connect: { id: data.spellGroupId } };
      }
    }
    if (data.mainSkillId !== undefined) {
      if (data.mainSkillId === null) {
        updateData.mainSkill = { disconnect: true };
      } else {
        updateData.mainSkill = { connect: { id: data.mainSkillId } };
      }
    }
    if (data.spellEnhancementTypes !== undefined) {
      updateData.spellEnhancementTypes = data.spellEnhancementTypes as Prisma.InputJsonValue;
    }
    if (data.spellEffectIncrease !== undefined) {
      updateData.spellEffectIncrease = data.spellEffectIncrease;
    }
    if (data.spellTargetChange !== undefined) {
      if (data.spellTargetChange === null) {
        updateData.spellTargetChange = Prisma.JsonNull;
      } else {
        updateData.spellTargetChange = data.spellTargetChange as Prisma.InputJsonValue;
      }
    }
    if (data.spellAdditionalModifier !== undefined) {
      if (data.spellAdditionalModifier === null) {
        updateData.spellAdditionalModifier = Prisma.JsonNull;
      } else {
        updateData.spellAdditionalModifier = data.spellAdditionalModifier as Prisma.InputJsonValue;
      }
    }
    if (data.spellNewSpellId !== undefined) {
      if (data.spellNewSpellId === null) {
        updateData.spellNewSpell = { disconnect: true };
      } else {
        updateData.spellNewSpell = { connect: { id: data.spellNewSpellId } };
      }
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

    // Форматуємо відповідь для фронтенду
    const formattedSkill = {
      id: updatedSkill.id,
      campaignId: updatedSkill.campaignId,
      name: updatedSkill.name,
      description: updatedSkill.description,
      icon: updatedSkill.icon,
      races: Array.isArray(updatedSkill.races) ? updatedSkill.races : (updatedSkill.races as any) || [],
      isRacial: updatedSkill.isRacial,
      bonuses: (updatedSkill.bonuses as Record<string, number>) || {},
      damage: updatedSkill.damage,
      armor: updatedSkill.armor,
      speed: updatedSkill.speed,
      physicalResistance: updatedSkill.physicalResistance,
      magicalResistance: updatedSkill.magicalResistance,
      spellId: updatedSkill.spellId,
      spellGroupId: updatedSkill.spellGroupId,
      mainSkillId: updatedSkill.mainSkillId,
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
