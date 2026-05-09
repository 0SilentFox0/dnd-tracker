import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getCachedRaces } from "@/lib/cache/reference-data";
import { prisma } from "@/lib/db";
import { createRaceSchema } from "@/lib/schemas";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Доступ для будь-якого учасника кампанії (гравці мають бачити раси при створенні/редагуванні персонажа)
    const accessResult = await requireCampaignAccess(id, false);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const races = await getCachedRaces(id);

    return NextResponse.json(races, {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return handleApiError(error, { action: "list races" });
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

    revalidateTag(`races-${id}`, "max");

    return NextResponse.json(race, { status: 201 });
  } catch (error) {
    return handleApiError(error, { action: "create race" });
  }
}
