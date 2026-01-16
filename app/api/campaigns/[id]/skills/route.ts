import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
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
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
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
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!campaign || campaign.members.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const skills = await prisma.skill.findMany({
      where: {
        campaignId: id,
      },
      include: {
        spell: true,
        spellGroup: true,
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
