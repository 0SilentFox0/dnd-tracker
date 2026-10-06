import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { raceNameConflict } from "../race-name";
import { updateRaceCascade } from "./update-race";

import { prisma } from "@/lib/db";
import { updateRaceSchema } from "@/lib/schemas";
import { readAbilities } from "@/lib/utils/abilities/read";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

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
      return NextResponse.json({ error: "Race not found" }, { status: 404 });
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
      return NextResponse.json({ error: "Race not found" }, { status: 404 });
    }

    const data = updateRaceSchema.parse(await request.json());

    if (data.name !== undefined) {
      const conflict = await raceNameConflict(id, data.name, raceId);

      if (conflict) return conflict;
    }

    const updatedRace = await updateRaceCascade(id, race, data);

    revalidateTag(`races-${id}`, { expire: 0 });
    revalidateTag(`units-${id}`, { expire: 0 });

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
    });

    if (!race) {
      return NextResponse.json({ error: "Race not found" }, { status: 404 });
    }

    await prisma.race.delete({
      where: {
        id: raceId,
      },
    });

    revalidateTag(`races-${id}`, { expire: 0 });
    revalidateTag(`units-${id}`, { expire: 0 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, { action: "delete race" });
  }
}
