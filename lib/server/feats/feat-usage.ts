import "server-only";
import { prisma } from "@/lib/db";

// Parameters remain bound SQL values; quoting the id excludes partial matches.
export async function featInUse(campaignId: string, featId: string): Promise<boolean> {
  const pattern = `%"${featId}"%`;

  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT (
      (SELECT count(*) FROM characters WHERE "campaignId" = ${campaignId}
        AND (feats::text LIKE ${pattern} OR "raceChoices"::text LIKE ${pattern} OR classes::text LIKE ${pattern} OR "backgroundChoices"::text LIKE ${pattern}))
      + (SELECT count(*) FROM backgrounds WHERE "campaignId" = ${campaignId}
        AND ("originFeatId" = ${featId} OR choices::text LIKE ${pattern}))
    )::bigint AS count`;

  return Number(rows[0]?.count ?? 0) > 0;
}

/** ASI definitions cannot change while a background still uses their stored picks. */
export async function featAsiUsedByBackground(campaignId: string, featId: string): Promise<boolean> {
  const pattern = `%"${featId}"%`;

  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*)::bigint AS count FROM characters c
    LEFT JOIN backgrounds b ON b.id = c."backgroundId" AND b."campaignId" = c."campaignId"
    WHERE c."campaignId" = ${campaignId} AND (b."originFeatId" = ${featId} OR c."backgroundChoices"::text LIKE ${pattern})`;

  return Number(rows[0]?.count ?? 0) > 0;
}
