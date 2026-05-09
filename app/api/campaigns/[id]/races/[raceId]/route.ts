import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

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
    return handleApiError(error, { action: "fetch race" });
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

    revalidateTag(`races-${id}`, "max");

    return NextResponse.json(updatedRace);
  } catch (error) {
    return handleApiError(error, { action: "update race" });
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

    revalidateTag(`races-${id}`, "max");

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete race" });
  }
}
