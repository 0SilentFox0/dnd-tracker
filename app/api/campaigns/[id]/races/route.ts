import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireDM } from "@/lib/utils/api-auth";

const createRaceSchema = z.object({
  name: z.string().min(1).max(100),
  availableSkills: z.array(z.string()).default([]),
  disabledSkills: z.array(z.string()).default([]),
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

const updateRaceSchema = createRaceSchema.partial();

export async function GET(
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

    const races = await prisma.race.findMany({
      where: {
        campaignId: id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(races);
  } catch (error) {
    console.error("Error fetching races:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const data = createRaceSchema.parse(body);

    const race = await prisma.race.create({
      data: {
        campaignId: id,
        name: data.name,
        availableSkills: data.availableSkills as Prisma.InputJsonValue,
        disabledSkills: data.disabledSkills as Prisma.InputJsonValue,
        passiveAbility: data.passiveAbility 
          ? (data.passiveAbility as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        spellSlotProgression: data.spellSlotProgression 
          ? (data.spellSlotProgression as Prisma.InputJsonValue)
          : [],
      },
    });

    return NextResponse.json(race, { status: 201 });
  } catch (error) {
    console.error("Error creating race:", error);
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
