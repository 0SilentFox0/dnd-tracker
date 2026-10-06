import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

// FK guarantees the race exists, not that it belongs to this campaign
export async function invalidUnitRace(campaignId: string, raceId: string | null | undefined): Promise<NextResponse | null> {
  if (!raceId) return null;

  const race = await prisma.race.findFirst({ where: { id: raceId, campaignId }, select: { id: true } });

  return race ? null : NextResponse.json({ error: "Раса не належить цій кампанії" }, { status: 400 });
}
