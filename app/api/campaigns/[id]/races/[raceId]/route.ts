import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireDM, validateCampaignOwnership } from "@/lib/utils/api-auth";

const updateRaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  availableSkills: z.array(z.string()).optional(),
  disabledSkills: z.array(z.string()).optional(),
  passiveAbility: z
    .object({
      description: z.string(),
      statImprovements: z.string().optional(),
      statModifiers: z
        .record(
          z.string(),
          z.object({
            bonus: z.boolean().optional(),
            nonNegative: z.boolean().optional(),
            alwaysZero: z.boolean().optional(),
          })
        )
        .optional(),
    })
    .optional(),
  spellSlotProgression: z
    .array(
      z.object({
        level: z.number().min(1).max(5),
        slots: z.number().min(0),
      })
    )
    .optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; raceId: string }> }
) {
  try {
    const { id, raceId } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const race = await prisma.race.findUnique({
      where: {
        id: raceId,
        campaignId: id,
      },
    });

    if (!race) {
      return NextResponse.json({ error: "Race not found" }, { status: 404 });
    }

    return NextResponse.json(race);
  } catch (error) {
    console.error("Error fetching race:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; raceId: string }> }
) {
  try {
    const { id, raceId } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const race = await prisma.race.findUnique({
      where: {
        id: raceId,
        campaignId: id,
      },
    });

    if (!race) {
      return NextResponse.json({ error: "Race not found" }, { status: 404 });
    }

    const body = await request.json();

    const data = updateRaceSchema.parse(body);

    const updatedRace = await prisma.race.update({
      where: {
        id: raceId,
      },
      data: {
        name: data.name,
        availableSkills: data.availableSkills 
          ? (data.availableSkills as Prisma.InputJsonValue)
          : undefined,
        disabledSkills: data.disabledSkills 
          ? (data.disabledSkills as Prisma.InputJsonValue)
          : undefined,
        passiveAbility: data.passiveAbility !== undefined
          ? (data.passiveAbility 
              ? (data.passiveAbility as Prisma.InputJsonValue)
              : Prisma.JsonNull)
          : undefined,
        spellSlotProgression: data.spellSlotProgression !== undefined 
          ? (data.spellSlotProgression as Prisma.InputJsonValue)
          : undefined,
      },
    });

    return NextResponse.json(updatedRace);
  } catch (error) {
    console.error("Error updating race:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; raceId: string }> }
) {
  try {
    const { id, raceId } = await params;
    
    // Перевіряємо права DM
    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const race = await prisma.race.findUnique({
      where: {
        id: raceId,
        campaignId: id,
      },
    });

    if (!race) {
      return NextResponse.json({ error: "Race not found" }, { status: 404 });
    }

    await prisma.race.delete({
      where: {
        id: raceId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting race:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
