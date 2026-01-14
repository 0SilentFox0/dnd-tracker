import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { Prisma } from "@prisma/client";

const updateSpellSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  level: z.number().min(0).max(9).optional(),
  school: z.string().optional(),
  type: z.enum(["target", "aoe"]).optional(),
  damageType: z.enum(["damage", "heal"]).optional(),
  castingTime: z.string().optional(),
  range: z.string().optional(),
  components: z.string().optional(),
  duration: z.string().optional(),
  concentration: z.boolean().optional(),
  damageDice: z.string().optional(),
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
    })
    .optional()
    .nullable(),
  description: z.string().min(1).optional(),
  groupId: z.string().optional().nullable(),
  icon: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().url().nullable().optional()
  ),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; spellId: string }> }
) {
  try {
    const { id, spellId } = await params;
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

    const spell = await prisma.spell.findUnique({
      where: { id: spellId },
      include: {
        spellGroup: true,
      },
    });

    if (!spell || spell.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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

    const spell = await prisma.spell.findUnique({
      where: { id: spellId },
    });

    if (!spell || spell.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = updateSpellSchema.parse(body);

    const updatedSpell = await prisma.spell.update({
      where: { id: spellId },
      data: {
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
        savingThrow:
          data.savingThrow === null
            ? Prisma.JsonNull
            : data.savingThrow
            ? (data.savingThrow as unknown as Prisma.InputJsonValue)
            : undefined,
        description: data.description,
        groupId: data.groupId === null ? null : data.groupId,
        icon: data.icon !== undefined ? (data.icon || null) : undefined,
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

    const spell = await prisma.spell.findUnique({
      where: { id: spellId },
    });

    if (!spell || spell.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
