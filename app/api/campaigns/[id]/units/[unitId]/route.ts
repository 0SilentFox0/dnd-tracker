import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const updateUnitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  groupId: z.string().optional().nullable(),
  damageModifier: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().nullable().optional()
  ),
  level: z.number().min(1).max(30).optional(),
  strength: z.number().min(1).max(30).optional(),
  dexterity: z.number().min(1).max(30).optional(),
  constitution: z.number().min(1).max(30).optional(),
  intelligence: z.number().min(1).max(30).optional(),
  wisdom: z.number().min(1).max(30).optional(),
  charisma: z.number().min(1).max(30).optional(),
  armorClass: z.number().min(0).optional(),
  initiative: z.number().optional(),
  speed: z.number().min(0).optional(),
  maxHp: z.number().min(1).optional(),
  proficiencyBonus: z.number().min(0).optional(),
  attacks: z
    .array(
      z.object({
        name: z.string(),
        attackBonus: z.number(),
        damageType: z.string(),
        damageDice: z.string(),
        range: z.string().optional(),
        properties: z.string().optional(),
      })
    )
    .optional(),
  specialAbilities: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        type: z.enum(["passive", "active"]),
        spellId: z.string().optional(),
        actionType: z.enum(["action", "bonus_action"]).optional(),
        effect: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .optional(),
  immunities: z.array(z.string()).optional(),
  knownSpells: z.array(z.string()).optional(),
  avatar: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().url().nullable().optional()
  ),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  try {
    const { id, unitId } = await params;
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

    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        unitGroup: true,
      },
    });

    if (!unit || unit.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(unit);
  } catch (error) {
    console.error("Error fetching unit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  try {
    const { id, unitId } = await params;
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

    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
    });

    if (!unit || unit.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.unit.delete({
      where: { id: unitId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting unit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  try {
    const { id, unitId } = await params;
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

    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
    });

    if (!unit || unit.campaignId !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = updateUnitSchema.parse(body);

    // Отримуємо колір групи якщо змінюється groupId
    let groupColor: string | null = null;
    if (data.groupId !== undefined) {
      if (data.groupId) {
        const group = await prisma.unitGroup.findUnique({
          where: { id: data.groupId },
        });
        groupColor = group?.color || null;
      } else {
        groupColor = null;
      }
    }

    const updatedUnit = await prisma.unit.update({
      where: { id: unitId },
      data: {
        name: data.name,
        groupId: data.groupId !== undefined ? data.groupId : undefined,
        groupColor: data.groupId !== undefined ? groupColor : undefined,
        damageModifier:
          data.damageModifier !== undefined ? data.damageModifier : undefined,
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
        proficiencyBonus: data.proficiencyBonus,
        attacks:
          data.attacks !== undefined
            ? (data.attacks as Prisma.InputJsonValue)
            : undefined,
        specialAbilities:
          data.specialAbilities !== undefined
            ? (data.specialAbilities as Prisma.InputJsonValue)
            : undefined,
        immunities:
          data.immunities !== undefined
            ? (data.immunities as Prisma.InputJsonValue)
            : undefined,
        knownSpells:
          data.knownSpells !== undefined
            ? (data.knownSpells as Prisma.InputJsonValue)
            : undefined,
        avatar: data.avatar !== undefined ? (data.avatar || null) : undefined,
      },
      include: {
        unitGroup: true,
      },
    });

    return NextResponse.json(updatedUnit);
  } catch (error) {
    console.error("Error updating unit:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
