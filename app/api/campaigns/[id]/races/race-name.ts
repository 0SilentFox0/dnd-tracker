import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function raceNameConflict(campaignId: string, name: string, exceptId?: string): Promise<NextResponse | null> {
  const clash = await prisma.race.findFirst({
    where: { campaignId, name: { equals: name, mode: "insensitive" }, ...(exceptId && { id: { not: exceptId } }) },
    select: { id: true },
  });

  return clash ? NextResponse.json({ error: `Раса «${name}» уже є в кампанії` }, { status: 409 }) : null;
}
