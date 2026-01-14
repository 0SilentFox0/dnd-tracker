import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSpellSchema = z.object({
  name: z.string().min(1).max(100),
  level: z.number().min(0).max(5).default(0),
  school: z.string().optional(),
  type: z.enum(["target", "aoe"]),
  damageType: z.enum(["damage", "heal"]),
  castingTime: z.string().optional(),
  range: z.string().optional(),
  components: z.string().optional(),
  duration: z.string().optional(),
  concentration: z.boolean().default(false),
  damageDice: z.string().optional(),
  savingThrow: z.object({
    ability: z.enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]),
    onSuccess: z.enum(["half", "none"]),
  }).optional(),
  description: z.string().min(1),
  groupId: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!campaign || campaign.members[0]?.role !== "dm") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = createSpellSchema.parse(body);

    const spell = await prisma.spell.create({
      data: {
        campaignId: params.id,
        name: data.name,
        level: data.level,
        school: data.school,
        type: data.type,
        damageType: data.damageType,
        castingTime: data.castingTime,
        range: data.range,
        components: data.components,
        duration: data.duration,
        concentration: data.concentration,
        damageDice: data.damageDice,
        savingThrow: data.savingThrow || null,
        description: data.description,
        groupId: data.groupId,
      },
      include: {
        spellGroup: true,
      },
    });

    return NextResponse.json(spell);
  } catch (error) {
    console.error("Error creating spell:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!campaign || campaign.members.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const spells = await prisma.spell.findMany({
      where: {
        campaignId: params.id,
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
