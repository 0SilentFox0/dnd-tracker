import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireDM, requireCampaignAccess } from "@/lib/utils/api-auth";
import { Prisma } from "@prisma/client";

const createSkillSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  icon: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().url().nullable().optional()
  ),
  races: z.array(z.string()).default([]),
  isRacial: z.boolean().default(false),
  bonuses: z.record(z.string(), z.number()).default({}),
  damage: z.number().optional(),
  armor: z.number().optional(),
  speed: z.number().optional(),
  physicalResistance: z.number().optional(),
  magicalResistance: z.number().optional(),
  spellId: z.string().optional(),
  spellGroupId: z.string().optional(),
  mainSkillId: z.string().optional(),
  spellEnhancementTypes: z
    .array(z.enum(["effect_increase", "target_change", "additional_modifier", "new_spell"]))
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
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);
    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const { campaign } = accessResult;

    const body = await request.json();
    const data = createSkillSchema.parse(body);

    const skill = await prisma.skill.create({
      data: {
        campaignId: id,
        name: data.name,
        description: data.description,
        icon: data.icon || null,
        races: data.races as Prisma.InputJsonValue,
        isRacial: data.isRacial,
        bonuses: data.bonuses as Prisma.InputJsonValue,
        damage: data.damage,
        armor: data.armor,
        speed: data.speed,
        physicalResistance: data.physicalResistance,
        magicalResistance: data.magicalResistance,
        spellId: data.spellId,
        spellGroupId: data.spellGroupId,
        mainSkillId: data.mainSkillId,
        spellEnhancementTypes: data.spellEnhancementTypes
          ? (data.spellEnhancementTypes as Prisma.InputJsonValue)
          : [],
        spellEffectIncrease: data.spellEffectIncrease,
        spellTargetChange: data.spellTargetChange
          ? (data.spellTargetChange as Prisma.InputJsonValue)
          : undefined,
        spellAdditionalModifier: data.spellAdditionalModifier
          ? (data.spellAdditionalModifier as Prisma.InputJsonValue)
          : undefined,
        spellNewSpellId: data.spellNewSpellId || null,
      },
      include: {
        spell: true,
        spellGroup: true,
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
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
        mainSkill: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Перетворюємо дані з Prisma в формат для фронтенду
    const formattedSkills = skills.map((skill) => ({
      id: skill.id,
      campaignId: skill.campaignId,
      name: skill.name,
      description: skill.description,
      icon: skill.icon,
      races: Array.isArray(skill.races) ? skill.races : (skill.races as any) || [],
      isRacial: skill.isRacial,
      bonuses: (skill.bonuses as Record<string, number>) || {},
      damage: skill.damage,
      armor: skill.armor,
      speed: skill.speed,
      physicalResistance: skill.physicalResistance,
      magicalResistance: skill.magicalResistance,
      spellId: skill.spellId,
      spellGroupId: skill.spellGroupId,
      mainSkillId: skill.mainSkillId,
      spellEnhancementTypes: Array.isArray(skill.spellEnhancementTypes)
        ? skill.spellEnhancementTypes
        : [],
      spellEffectIncrease: skill.spellEffectIncrease,
      spellTargetChange: skill.spellTargetChange,
      spellAdditionalModifier: skill.spellAdditionalModifier,
      spellNewSpellId: skill.spellNewSpellId,
      createdAt: skill.createdAt,
      spell: skill.spell ? {
        id: skill.spell.id,
        name: skill.spell.name,
      } : null,
      spellGroup: skill.spellGroup ? {
        id: skill.spellGroup.id,
        name: skill.spellGroup.name,
      } : null,
    }));

    return NextResponse.json(formattedSkills);
  } catch (error) {
    console.error("Error fetching skills:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
