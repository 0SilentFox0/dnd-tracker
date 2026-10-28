import { requestDigest } from "../json";

import "server-only";
import { prisma } from "@/lib/db";
import { FULL_ROW_TABLES, fullRowDigest, stampDigest } from "@/lib/server/assistant/digest";
import { jsonContent } from "@/lib/server/assistant/json";
import type { Actor } from "@/lib/utils/api/actor";

/** Uncached guard state: updatedAt stamps and Postgres row digests, never full rows. No credentials or ScenarioPage text. */
export async function contentSnapshot(actor: Actor) {
  const campaignId = actor.campaignId;

  // The campaign lock blocks new campaign children. Lock existing parents and
  // children too: inventory/Choice writers do not all take the content lock.
  await prisma.$queryRaw`SELECT id FROM characters WHERE "campaignId" = ${campaignId} ORDER BY id FOR UPDATE`;
  await prisma.$queryRaw`SELECT i.id FROM character_inventories i JOIN characters c ON c.id = i."characterId" WHERE c."campaignId" = ${campaignId} ORDER BY i.id FOR UPDATE OF i`;
  await prisma.$queryRaw`SELECT s.id FROM character_skills s JOIN characters c ON c.id = s."characterId" WHERE c."campaignId" = ${campaignId} ORDER BY s.id FOR UPDATE OF s`;

  const [races, classes, feats, backgrounds, mainSkills, characters, inventory, skills] = await Promise.all([
    stampDigest(prisma, "Race", { campaignId }), stampDigest(prisma, "GameClass", { campaignId }), stampDigest(prisma, "Feat", { campaignId }),
    stampDigest(prisma, "Background", { campaignId }), stampDigest(prisma, "MainSkill", { campaignId }), stampDigest(prisma, "Character", { campaignId }),
    stampDigest(prisma, "CharacterInventory", { character: { campaignId } }), stampDigest(prisma, "CharacterSkills", { character: { campaignId } }),
  ]);

  const [units, spells, spellGroups, artifacts, artifactSets, skillRows, skillTrees, tracks] = await Promise.all(FULL_ROW_TABLES.map(table => fullRowDigest(prisma, table, campaignId)));

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { rules: true, credits: true, createdFromId: true, maxLevel: true, xpMultiplier: true, allowPlayerEdit: true, friendlyFire: true } });

  return {
    stamps: { races, classes, feats, backgrounds, mainSkills, characters, inventory, skills },
    rowDigests: { units, spells, spellGroups, artifacts, artifactSets, skills: skillRows, skillTrees, tracks },
    campaign,
  };
}

export { jsonContent } from "@/lib/server/assistant/json";
export const snapshotHash = (value: unknown) => requestDigest(jsonContent(value));
