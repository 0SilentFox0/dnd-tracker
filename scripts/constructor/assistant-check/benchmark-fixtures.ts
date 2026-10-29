import type { PrismaClient } from "@prisma/client";

import type { OnCreated } from "./manifest";

import { assertConstructorDatabaseUrls } from "@/lib/server/assistant/test-support";
import type { AssistantCaller } from "@/lib/server/assistant/types";
import { classify } from "@/lib/server/templates/sync/classify";
import { loadSyncContext } from "@/lib/server/templates/sync/context";

export const FIXTURE_SIZES = { small: { spells: 10, artifacts: 10, characters: 2 }, large: { spells: 500, artifacts: 500, characters: 20 } } as const;
export const FIXTURE_CLOCK = new Date("2026-10-26T12:00:00.000Z");
export const BENCHMARK_SCENARIOS = ["rules.update", "content.spells.update", "content.spells.delete", "source.apply"] as const;

/** Only exact owned IDs are ever deleted; partial seed failures share this cleanup. */
export function benchmarkFixtures(db: PrismaClient, marker: string, size: keyof typeof FIXTURE_SIZES, onCreated?: OnCreated) {
  const guard = () => assertConstructorDatabaseUrls({ DATABASE_URL: process.env.DATABASE_URL, DIRECT_URL: process.env.DIRECT_URL });

  guard();

  if (!/^s3-bench-[a-z0-9-]{8,32}$/.test(marker)) throw new Error("ASSISTANT_BENCHMARK_INVALID_MARKER");

  const prefix = `${marker}-${size}`;

  const userId = `${prefix}-dm`, campaignId = `${prefix}-target`, sourceId = `${prefix}-source`;

  const spellId = `${prefix}-spell-0`;

  const caller: AssistantCaller = { actor: { userId, campaignId, isDM: true, via: "session", scopes: null }, channel: "chat", tokenId: null, threadId: null, locale: "uk" };

  let ownsUser = false;

  const ownedCampaigns = new Set<string>();

  async function cleanup() {
    guard();

    for (const id of [campaignId, sourceId]) {
      if (!ownedCampaigns.has(id)) continue;

      const row = await db.campaign.findUnique({ where: { id }, select: { name: true, dmUserId: true, members: { select: { userId: true, role: true } } } });

      if (row && (row.name !== prefix || row.dmUserId !== userId || row.members.length !== 1 || row.members[0].userId !== userId || row.members[0].role !== "dm")) throw new Error("ASSISTANT_BENCHMARK_OWNERSHIP_MISMATCH");

      await db.assistantReceipt.deleteMany({ where: { campaignId: id, userId } });

      if (row) await db.campaign.delete({ where: { id } });
    }

    if (ownsUser) {
      const user = await db.user.findUnique({ where: { id: userId }, select: { displayName: true, email: true, dmCampaigns: { select: { id: true } }, campaignMembers: { select: { id: true } } } });

      if (user && (user.displayName !== prefix || user.email !== `${prefix}@example.invalid` || user.dmCampaigns.length || user.campaignMembers.length)) throw new Error("ASSISTANT_BENCHMARK_OWNERSHIP_MISMATCH");

      if (user) await db.user.delete({ where: { id: userId } });
    }

    const leftovers = await Promise.all([db.campaign.count({ where: { id: { in: [campaignId, sourceId] } } }), db.user.count({ where: { id: userId } }), db.assistantIntent.count({ where: { userId } }), db.assistantReceipt.count({ where: { userId } })]);

    if (leftovers.some(Boolean)) throw new Error("ASSISTANT_BENCHMARK_FIXTURE_LEFTOVERS");

    return leftovers;
  }

  async function seed() {
    guard();
    onCreated?.("user", userId);
    onCreated?.("campaign", sourceId);
    onCreated?.("campaign", campaignId);
    await db.user.create({ data: { id: userId, displayName: prefix, email: `${prefix}@example.invalid` } });
    ownsUser = true;

    for (const id of [sourceId, campaignId]) {
      await db.campaign.create({ data: { id, name: prefix, dmUserId: userId, inviteCode: id, createdAt: FIXTURE_CLOCK, ...(id === campaignId && { createdFromId: sourceId }), members: { create: { userId, role: "dm" } } } });
      ownedCampaigns.add(id);
    }

    await db.spell.create({ data: { id: `${prefix}-incoming`, campaignId: sourceId, name: "Нове джерельне заклинання", type: "damage", damageType: "fire", createdAt: FIXTURE_CLOCK } });

    const counts = FIXTURE_SIZES[size];

    await db.spell.createMany({ data: Array.from({ length: counts.spells }, (_, i) => ({ id: `${prefix}-spell-${i}`, campaignId, name: `Заклинання ${i}`, type: "damage", damageType: "fire", description: "Синтетичний опис. ".repeat(12), createdAt: FIXTURE_CLOCK })) });
    await db.artifact.createMany({ data: Array.from({ length: counts.artifacts }, (_, i) => ({ id: `${prefix}-artifact-${i}`, campaignId, name: `Артефакт ${i}`, slot: "weapon", rarity: "common", description: "Синтетичний опис. ".repeat(12), createdAt: FIXTURE_CLOCK })) });
    await db.character.createMany({ data: Array.from({ length: counts.characters }, (_, i) => ({ id: `${prefix}-hero-${i}`, campaignId, controlledBy: userId, name: `Персонаж ${i}`, type: "hero", class: "", race: "", knownSpells: [`${prefix}-spell-${i}`], raceChoices: { nested: { spellId } } })) });
    await db.characterInventory.createMany({ data: Array.from({ length: counts.characters }, (_, i) => ({ id: `${prefix}-inventory-${i}`, characterId: `${prefix}-hero-${i}`, backpack: [`${prefix}-artifact-${i}+${prefix}-artifact-0`], updatedAt: FIXTURE_CLOCK })) });

    const actual = { spells: await db.spell.count({ where: { campaignId } }), artifacts: await db.artifact.count({ where: { campaignId } }), characters: await db.character.count({ where: { campaignId } }) };

    if (JSON.stringify(actual) !== JSON.stringify(counts)) throw new Error("ASSISTANT_BENCHMARK_FIXTURE_SIZE");

    const item = classify(await loadSyncContext(db, campaignId, { userId })).find(item => item.scope === "spells" && item.key === `${prefix}-incoming`);

    if (!item || item.status !== "new") throw new Error("ASSISTANT_BENCHMARK_SOURCE_FIXTURE");

    return {
      "rules.update": { body: { morale: { cap: 4 } } },
      "content.spells.update": { id: spellId, patch: { description: "Оновлений синтетичний опис" } },
      "content.spells.delete": { id: spellId },
      "source.apply": { body: { apply: [{ scope: item.scope, key: item.key, sourceHash: item.sourceHash, status: item.status }], ignore: [] } },
    };
  }

  return { seed, cleanup, caller, campaignId };
}
