import "server-only";
import { prisma } from "@/lib/db";

// feat ids sit inside three JSON columns; a quoted cuid substring is exact enough
export async function featInUse(campaignId: string, featId: string): Promise<boolean> {
  const pattern = `%"${featId}"%`;

  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*)::bigint AS count FROM characters
    WHERE "campaignId" = ${campaignId} AND (feats::text LIKE ${pattern} OR "raceChoices"::text LIKE ${pattern} OR classes::text LIKE ${pattern})`;

  return Number(rows[0]?.count ?? 0) > 0;
}
