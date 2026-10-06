import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { raceNameConflict } from "./race-name";

import { getCachedRaces } from "@/lib/cache/reference-data";
import { raceColorAt } from "@/lib/constants/race-colors";
import { prisma } from "@/lib/db";
import { createRaceSchema } from "@/lib/schemas";
import { abilitiesJson } from "@/lib/utils/abilities/read";
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

    return NextResponse.json(races, { headers: { "Cache-Control": "private, no-store" } });
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

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const data = createRaceSchema.parse(await request.json());

    const conflict = await raceNameConflict(id, data.name);

    if (conflict) return conflict;

    const color = data.color ?? raceColorAt(await prisma.race.count({ where: { campaignId: id } }));

    const race = await prisma.race.create({
      data: {
        campaignId: id,
        name: data.name,
        icon: data.icon ?? null,
        color,
        availableSkills: data.availableSkills as Prisma.InputJsonValue,
        disabledSkills: data.disabledSkills as Prisma.InputJsonValue,
        passiveAbility: data.passiveAbility 
          ? (data.passiveAbility as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        spellSlotProgression: data.spellSlotProgression 
          ? (data.spellSlotProgression as Prisma.InputJsonValue)
          : [],
        ...(data.abilities && { abilities: abilitiesJson(data.abilities) }),
      },
    });

    revalidateTag(`races-${id}`, { expire: 0 });
    revalidateTag(`units-${id}`, { expire: 0 });

    return NextResponse.json(race, { status: 201 });
  } catch (error) {
    return handleApiError(error, { action: "create race" });
  }
}
