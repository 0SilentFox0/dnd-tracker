import "server-only";
import { prisma } from "@/lib/db";
import { FULL_ROW_TABLES, fullRowDigest, stampDigest } from "@/lib/server/assistant/digest";
import { requestDigest } from "@/lib/server/assistant/json";

/** Conservative, uncached dependency hash; reference content is never copied into intent payloads. */
export async function characterReferenceHash(campaignId: string): Promise<string> {
  const where = { campaignId };

  const stamps = await Promise.all([
    stampDigest(prisma, "Race", where), stampDigest(prisma, "GameClass", where), stampDigest(prisma, "Background", where),
    stampDigest(prisma, "Feat", where), stampDigest(prisma, "MainSkill", where),
  ]);

  const rows = await Promise.all(FULL_ROW_TABLES.filter(table => table !== "units" && table !== "campaign_tracks").map(table => fullRowDigest(prisma, table, campaignId)));

  return requestDigest({ stamps, rows });
}
