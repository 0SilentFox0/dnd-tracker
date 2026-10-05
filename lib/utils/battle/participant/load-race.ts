import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export async function loadRace(
  raceName: string | null | undefined,
  campaignId: string,
  preloaded?: Prisma.RaceGetPayload<object> | null,
): Promise<Prisma.RaceGetPayload<object> | null> {
  if (preloaded !== undefined) return preloaded;

  if (!raceName) return null;

  return prisma.race.findFirst({ where: { campaignId, name: raceName } });
}
