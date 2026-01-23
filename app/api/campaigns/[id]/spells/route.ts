import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireCampaignAccess,requireDM } from "@/lib/utils/api-auth";

const createSpellSchema = z.object({
  name: z.string().min(1).max(100),
  level: z.number().min(0).max(9).default(0),
  type: z.enum(["target", "aoe"]),
  target: z.enum(["enemies", "allies", "all"]).optional(),
  damageType: z.enum(["damage", "heal", "all"]),
  damageElement: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional()
  ),
  damageModifier: z.enum(["control", "charm", "sleep", "state", "burning", "poison", "freezing"]).optional().nullable(),
  healModifier: z.enum(["heal", "regeneration", "dispel", "shield", "vampirism"]).optional().nullable(),
  castingTime: z.string().optional().nullable(),
  range: z.string().optional().nullable(),
  components: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  concentration: z.boolean().default(false),
  diceCount: z.number().min(0).max(10).optional().nullable(),
  diceType: z.enum(["d4", "d6", "d8", "d10", "d12", "d20", "d100"]).optional().nullable(),
  savingThrow: z.object({
    ability: z.enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]),
    onSuccess: z.enum(["half", "none"]),
  }).optional().nullable(),
  description: z.string().min(1),
  groupId: z.string().optional().nullable(),
  icon: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional()
  ),
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

    const data = createSpellSchema.parse(body);

    const spell = await prisma.spell.create({
      data: {
        campaignId: id,
        name: data.name,
        level: data.level,
        type: data.type,
        target: data.target || null,
        damageType: data.damageType,
        damageElement: data.damageElement || null,
        damageModifier: data.damageModifier || null,
        healModifier: data.healModifier || null,
        castingTime: data.castingTime || null,
        range: data.range || null,
        components: data.components || null,
        duration: data.duration || null,
        concentration: data.concentration,
        diceCount: data.diceCount || null,
        diceType: data.diceType || null,
        savingThrow: data.savingThrow
          ? (data.savingThrow as unknown as Prisma.InputJsonValue)
          : undefined,
        description: data.description,
        groupId: data.groupId || null,
        icon: data.icon || null,
      },
      include: {
        spellGroup: true,
      },
    });

    return NextResponse.json(spell);
  } catch (error) {
    console.error("Error creating spell:", error);

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

    const spells = await prisma.spell.findMany({
      where: {
        campaignId: id,
      },
      include: {
        spellGroup: true,
      },
      orderBy: {
        level: "asc",
      },
    });

    return NextResponse.json(spells);
  } catch (error) {
    console.error("Error fetching spells:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
