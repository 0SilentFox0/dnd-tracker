import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireCampaignAccess, requireDM, validateCampaignOwnership } from "@/lib/utils/api/api-auth";

const updateSpellSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  level: z.number().min(0).max(9).optional(),
  type: z.enum(["target", "aoe"]).optional(),
  target: z.enum(["enemies", "allies", "all"]).optional().nullable(),
  damageType: z.enum(["damage", "heal", "all", "buff", "debuff"]).optional(),
  damageElement: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional()
  ),
  damageModifier: z.enum(["control", "charm", "sleep", "state", "burning", "poison", "freezing"]).optional().nullable(),
  healModifier: z.enum(["heal", "regeneration", "dispel", "shield", "vampirism"]).optional().nullable(),
  castingTime: z.string().optional().nullable(),
  range: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  diceCount: z.number().min(0).max(10).optional().nullable(),
  diceType: z.enum(["d4", "d6", "d8", "d10", "d12", "d20", "d100"]).optional().nullable(),
  savingThrow: z
    .object({
      ability: z.enum([
        "strength",
        "dexterity",
        "constitution",
        "intelligence",
        "wisdom",
        "charisma",
      ]),
      onSuccess: z.enum(["half", "none"]),
      dc: z.number().min(1).max(30).optional().nullable(),
    })
    .optional()
    .nullable(),
  hitCheck: z
    .object({
      ability: z.enum([
        "strength",
        "dexterity",
        "constitution",
        "intelligence",
        "wisdom",
        "charisma",
      ]),
      dc: z.number().min(1).max(30),
    })
    .optional()
    .nullable(),
  description: z.string().optional().nullable(),
  effects: z.array(z.string()).optional().nullable(),
  groupId: z.string().optional().nullable(),
  icon: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional()
  ),
  appearanceDescription: z.string().nullable().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; spellId: string }> }
) {
  try {
    const { id, spellId } = await params;
    
    // Перевіряємо доступ до кампанії (не обов'язково DM)
    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const spell = await prisma.spell.findUnique({
      where: { id: spellId },
      include: {
        spellGroup: true,
      },
    });

    const validationError = validateCampaignOwnership(spell, id);

    if (validationError) {
      return validationError;
    }

    return NextResponse.json(spell);
  } catch (error) {
    console.error("Error fetching spell:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; spellId: string }> }
) {
  try {
    const { id, spellId } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const spell = await prisma.spell.findUnique({
      where: { id: spellId },
    });

    const validationError = validateCampaignOwnership(spell, id);

    if (validationError) {
      return validationError;
    }

    const body = await request.json();

    const data = updateSpellSchema.parse(body);

    const updatedSpell = await prisma.spell.update({
      where: { id: spellId },
      data: {
        name: data.name,
        level: data.level,
        type: data.type,
        target: data.target !== undefined ? data.target : undefined,
        damageType: data.damageType,
        damageElement: data.damageElement !== undefined ? data.damageElement : undefined,
        damageModifier: data.damageModifier !== undefined ? data.damageModifier : undefined,
        healModifier: data.healModifier !== undefined ? data.healModifier : undefined,
        castingTime: data.castingTime !== undefined ? data.castingTime : undefined,
        range: data.range !== undefined ? data.range : undefined,
        duration: data.duration !== undefined ? data.duration : undefined,
        diceCount: data.diceCount !== undefined ? data.diceCount : undefined,
        diceType: data.diceType !== undefined ? data.diceType : undefined,
        savingThrow:
          data.savingThrow === null
            ? Prisma.JsonNull
            : data.savingThrow
            ? (data.savingThrow as unknown as Prisma.InputJsonValue)
            : undefined,
        hitCheck:
          data.hitCheck !== undefined
            ? data.hitCheck === null
              ? Prisma.JsonNull
              : (data.hitCheck as unknown as Prisma.InputJsonValue)
            : undefined,
        description: data.description !== undefined ? data.description : undefined,
        effects: data.effects !== undefined ? (data.effects as unknown as Prisma.InputJsonValue) : undefined,
        groupId: data.groupId !== undefined ? data.groupId : undefined,
        icon: data.icon !== undefined ? (data.icon || null) : undefined,
        appearanceDescription: data.appearanceDescription !== undefined ? data.appearanceDescription : undefined,
      },
      include: {
        spellGroup: true,
      },
    });

    return NextResponse.json(updatedSpell);
  } catch (error) {
    console.error("Error updating spell:", error);

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
  { params }: { params: Promise<{ id: string; spellId: string }> }
) {
  try {
    const { id, spellId } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const spell = await prisma.spell.findUnique({
      where: { id: spellId },
    });

    const validationError = validateCampaignOwnership(spell, id);

    if (validationError) {
      return validationError;
    }

    await prisma.spell.delete({
      where: { id: spellId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting spell:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
