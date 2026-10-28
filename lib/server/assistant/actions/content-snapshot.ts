import type { Prisma } from "@prisma/client";

import "server-only";
import { prisma } from "@/lib/db";
import { requestDigest } from "@/lib/server/assistant/intent-store";
import { BUNDLE_TABLES, delegateOf } from "@/lib/server/templates/bundle";
import type { Actor } from "@/lib/utils/api/actor";

/** Uncached, conservative snapshot. No credentials or ScenarioPage text. */
export async function contentSnapshot(actor: Actor) {
  const campaignId = actor.campaignId;

  // The campaign lock blocks new campaign children. Lock existing parents and
  // children too: inventory/Choice writers do not all take the content lock.
  await prisma.$queryRaw`SELECT id FROM characters WHERE "campaignId" = ${campaignId} ORDER BY id FOR UPDATE`;
  await prisma.$queryRaw`SELECT i.id FROM character_inventories i JOIN characters c ON c.id = i."characterId" WHERE c."campaignId" = ${campaignId} ORDER BY i.id FOR UPDATE OF i`;
  await prisma.$queryRaw`SELECT s.id FROM character_skills s JOIN characters c ON c.id = s."characterId" WHERE c."campaignId" = ${campaignId} ORDER BY s.id FOR UPDATE OF s`;

  const tables: Record<string, unknown> = {};

  for (const table of BUNDLE_TABLES) tables[table.key] = await delegateOf(prisma, table).findMany({ where: { campaignId }, orderBy: { id: "asc" } });

  const characters = await prisma.character.findMany({ where: { campaignId }, orderBy: { id: "asc" }, select: {
    id: true, race: true, subrace: true, class: true, classes: true, backgroundId: true, backgroundChoices: true,
    knownSpells: true, feats: true, raceChoices: true, backgroundFeatPicks: true,
  } });

  const inventory = await prisma.characterInventory.findMany({ where: { character: { campaignId } }, orderBy: { id: "asc" } });

  const skills = await prisma.characterSkills.findMany({ where: { character: { campaignId } }, orderBy: { id: "asc" } });

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { rules: true, credits: true, createdFromId: true, maxLevel: true, xpMultiplier: true, allowPlayerEdit: true, friendlyFire: true } });

  return { tables, characters, inventory, skills, campaign };
}

export const jsonContent = (value: unknown): Prisma.JsonValue => JSON.parse(JSON.stringify(value ?? null));
export const snapshotHash = (value: unknown) => requestDigest(jsonContent(value));
