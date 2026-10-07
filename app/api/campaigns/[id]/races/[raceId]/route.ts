import { NextResponse } from "next/server";

import { raceNameConflict } from "../race-name";
import { updateRaceCascade } from "./update-race";

import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { updateRaceSchema } from "@/lib/schemas";
import { readAbilities } from "@/lib/utils/abilities/read";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; raceId: string }> }
) {
  try {
    const { id, raceId } = await params;

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
      return errorResponse(API_ERRORS.RACE_NOT_FOUND, 404);
    }

    const { abilities, issues: abilityIssues } = readAbilities("race", race);

    return NextResponse.json({ ...race, abilities, abilityIssues });
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
      return errorResponse(API_ERRORS.RACE_NOT_FOUND, 404);
    }

    const data = await parseBody(updateRaceSchema, request);

    if (data instanceof NextResponse) return data;

    if (data.name !== undefined) {
      const conflict = await raceNameConflict(id, data.name, raceId);

      if (conflict) return conflict;
    }

    const updatedRace = await updateRaceCascade(id, race, data);

    invalidateReference([ReferenceKind.RACES, ReferenceKind.UNITS], id);

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

    const accessResult = await requireDM(id);

    if (accessResult instanceof NextResponse) {
      return accessResult;
    }

    const race = await prisma.race.findUnique({
      where: {
        id: raceId,
        campaignId: id,
      },
      select: { campaignId: true },
    });

    if (!race) {
      return errorResponse(API_ERRORS.RACE_NOT_FOUND, 404);
    }

    await prisma.race.deleteMany({
      where: {
        id: raceId,
      },
    });

    invalidateReference([ReferenceKind.RACES, ReferenceKind.UNITS], id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete race" });
  }
}
