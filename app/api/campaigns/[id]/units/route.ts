import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireCampaignAccess,requireDM } from "@/lib/utils/api-auth";
import { getProficiencyBonus } from "@/lib/utils/calculations";

const createUnitSchema = z.object({
  name: z.string().min(1).max(100),
  race: z.string().optional(),
  groupId: z.string().optional(),
  level: z.number().min(1).max(30).default(1),
  damageModifier: z.string().optional(),
  
  // Ability Scores
  strength: z.number().min(1).max(30).default(10),
  dexterity: z.number().min(1).max(30).default(10),
  constitution: z.number().min(1).max(30).default(10),
  intelligence: z.number().min(1).max(30).default(10),
  wisdom: z.number().min(1).max(30).default(10),
  charisma: z.number().min(1).max(30).default(10),
  
  // Бойові параметри
  armorClass: z.number().min(0).default(10),
  initiative: z.number().default(0),
  speed: z.number().min(0).default(30),
  maxHp: z.number().min(1).default(10),
  proficiencyBonus: z.number().min(0).default(2),
  
  // Атаки та здібності
  attacks: z.array(z.object({
    name: z.string(),
    attackBonus: z.number(),
    damageType: z.string(),
    damageDice: z.string(),
    range: z.string().optional(),
    properties: z.string().optional(),
  })).default([]),
  
  specialAbilities: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    type: z.enum(["passive", "active"]),
    spellId: z.string().optional(),
    actionType: z.enum(["action", "bonus_action"]).optional(),
    effect: z.record(z.string(), z.unknown()).optional(),
  })).default([]),
  
  immunities: z.array(z.string()).default([]),
  knownSpells: z.array(z.string()).default([]),
  morale: z.number().min(-3).max(3).default(0),
  avatar: z.string().optional(),
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

    const data = createUnitSchema.parse(body);

    // Отримуємо колір групи якщо є
    let groupColor: string | null = null;

    if (data.groupId) {
      const group = await prisma.unitGroup.findUnique({
        where: { id: data.groupId },
      });

      groupColor = group?.color || null;
    }

    const proficiencyBonus = data.proficiencyBonus || getProficiencyBonus(data.level);

    const unit = await prisma.unit.create({
      data: {
        campaignId: id,
        name: data.name,
        race: data.race || null,
        groupId: data.groupId,
        groupColor,
        damageModifier: data.damageModifier || null,
        level: data.level,
        strength: data.strength,
        dexterity: data.dexterity,
        constitution: data.constitution,
        intelligence: data.intelligence,
        wisdom: data.wisdom,
        charisma: data.charisma,
        armorClass: data.armorClass,
        initiative: data.initiative,
        speed: data.speed,
        maxHp: data.maxHp,
        proficiencyBonus,
        attacks: data.attacks as Prisma.InputJsonValue,
        specialAbilities: data.specialAbilities as Prisma.InputJsonValue,
        immunities: data.immunities as Prisma.InputJsonValue,
        knownSpells: data.knownSpells,
        morale: data.morale,
        avatar: data.avatar,
      },
      include: {
        unitGroup: true,
      },
    });

    return NextResponse.json(unit);
  } catch (error) {
    console.error("Error creating unit:", error);

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

    const units = await prisma.unit.findMany({
      where: {
        campaignId: id,
      },
      include: {
        unitGroup: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(units);
  } catch (error) {
    console.error("Error fetching units:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
