import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
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
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; skillId: string }> }
) {
  try {
    const { id, skillId } = await params;
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

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!skill || skill.campaignId !== id) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
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

    const updatedSkill = await prisma.skill.update({
      where: { id: skillId },
      data: updateData,
      include: {
        spell: true,
        spellGroup: true,
      },
    });

    return NextResponse.json(updatedSkill);
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

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!skill || skill.campaignId !== id) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
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
