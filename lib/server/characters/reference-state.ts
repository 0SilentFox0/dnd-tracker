import "server-only";
import { prisma } from "@/lib/db";
import { requestDigest } from "@/lib/server/assistant/intent-store";

/** Conservative, uncached dependency hash; reference content is never copied into intent payloads. */
export async function characterReferenceHash(campaignId: string): Promise<string> {
  const query = { where: { campaignId }, orderBy: { id: "asc" as const } };

  const refs = await Promise.all([
    prisma.race.findMany(query), prisma.gameClass.findMany(query), prisma.background.findMany(query),
    prisma.feat.findMany(query), prisma.spell.findMany(query), prisma.spellGroup.findMany(query),
    prisma.skill.findMany(query), prisma.mainSkill.findMany(query), prisma.skillTree.findMany(query),
    prisma.artifact.findMany(query), prisma.artifactSet.findMany(query),
  ]);

  return requestDigest(refs);
}
