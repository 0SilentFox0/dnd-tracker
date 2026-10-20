import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { raceNameConflict } from "./race-name";
import { readRaces } from "./read-races";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { raceColorAt } from "@/lib/constants/race-colors";
import { prisma } from "@/lib/db";
import { createRaceSchema } from "@/lib/schemas";
import { abilitiesJson } from "@/lib/utils/abilities/read";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Доступ для будь-якого учасника кампанії (гравці мають бачити раси при створенні/редагуванні персонажа)
    return readRaces({ id });
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

    const data = await parseBody(createRaceSchema, request);

    if (data instanceof NextResponse) return data;

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

    invalidateReference([ReferenceKind.RACES, ReferenceKind.UNITS], id);

    return NextResponse.json(race, { status: 201 });
  } catch (error) {
    return handleApiError(error, { action: "create race" });
  }
}
