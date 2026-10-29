import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { contentDeleteCascades, contentDependencies } from "@/lib/server/assistant/actions/content-dependencies";
import { contentOperationState, contentPreviewState } from "@/lib/server/assistant/actions/content-preview";
import { contentSnapshot } from "@/lib/server/assistant/actions/content-snapshot";
import { fullRowDigest, stampDigest } from "@/lib/server/assistant/digest";
import { prepareBattleAction } from "@/lib/server/battles/action-service";
import { ContentError } from "@/lib/server/content/errors";
import { prepareShowAction, runShowOperation } from "@/lib/server/show/action-service";
import { bindDeckRecord } from "@/lib/server/show/deck-operations";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

const database = vi.hoisted(() => ({ client: undefined as PrismaClient | undefined }));

vi.mock("@/lib/db", async () => {
  const { createScopedDatabase } = await import("@/lib/server/content/write-context");

  const base = new Proxy({} as PrismaClient, { get(_target, key) {
    if (!database.client) throw new Error("FIXTURE_DATABASE_NOT_READY");

    const value = Reflect.get(database.client, key);

    return typeof value === "function" ? value.bind(database.client) : value;
  } });

  return { prisma: createScopedDatabase(base) };
});

const localUrl = (name: "DATABASE_URL" | "DIRECT_URL") => singleConnectionDatabaseUrl(name);

const databaseUrl = localUrl("DATABASE_URL");

localUrl("DIRECT_URL");
process.env.DATABASE_URL = databaseUrl;
process.env.DIRECT_URL = localUrl("DIRECT_URL");

const queries: string[] = [];

const db = new PrismaClient({ datasources: { db: { url: databaseUrl } }, log: [{ emit: "event", level: "query" }] });

(db as unknown as { $on: (event: "query", cb: (e: { query: string }) => void) => void }).$on("query", e => queries.push(e.query));
database.client = db;

const marker = `digest-${randomUUID()}`;

const userId = marker;

let campaignId: string;

let otherId: string;

const actor = () => ({ campaignId, userId, isDM: true, via: "session", scopes: null } as const);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe.skipIf(!isLocalDevDatabaseEnv())("precondition digests against the local constructor database", () => {
  beforeAll(async () => {
    await db.user.create({ data: { id: userId, email: `${marker}@example.invalid`, displayName: marker } });

    campaignId = (await db.campaign.create({ data: { name: marker, dmUserId: userId, inviteCode: randomUUID(), members: { create: { userId, role: "dm" } } } })).id;
    otherId = (await db.campaign.create({ data: { name: `${marker}-other`, dmUserId: userId, inviteCode: randomUUID() } })).id;
  });

  afterAll(async () => {
    await db.campaign.deleteMany({ where: { id: { in: [campaignId, otherId].filter(Boolean) } } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  });

  it("Prisma updateMany bumps updatedAt (D1 evidence)", async () => {
    const race = await db.race.create({ data: { campaignId, name: `race-${marker}` } });

    const before = (await stampDigest(db, "Race", { campaignId }))[0];

    await sleep(5);
    await db.race.updateMany({ where: { id: race.id }, data: { name: "renamed" } });

    const after = (await stampDigest(db, "Race", { campaignId }))[0];

    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
  });

  it("raw UPDATE without updatedAt is invisible to stamps (documented limit; the audit test forbids such code)", async () => {
    const race = await db.race.create({ data: { campaignId, name: `raw-${marker}` } });

    const before = JSON.stringify(await stampDigest(db, "Race", { campaignId }));

    await db.$executeRaw`UPDATE races SET name = 'raw-changed' WHERE id = ${race.id}`;
    expect(JSON.stringify(await stampDigest(db, "Race", { campaignId }))).toBe(before);
  });

  it("bindDeckRecord keeps updatedAt but the deck stamp still changes through scenarioPageId", async () => {
    const page = await db.scenarioPage.create({ data: { campaignId, kind: "scene", title: "Scene" } });

    const deck = await db.slideDeck.create({ data: { campaignId, title: "Deck" } });

    const before = (await stampDigest(db, "SlideDeck", { campaignId })).find(d => d.id === deck.id)!;

    await sleep(5);
    await bindDeckRecord(campaignId, deck.id, deck.updatedAt, page.id);

    const after = (await stampDigest(db, "SlideDeck", { campaignId })).find(d => d.id === deck.id)!;

    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
    expect(after.scenarioPageId).toBe(page.id);
    expect(JSON.stringify(after)).not.toBe(JSON.stringify(before));
  });

  it("show preview goes stale after a bind, which bypasses updatedAt", async () => {
    const page = await db.scenarioPage.create({ data: { campaignId, kind: "scene", title: "Scene 2" } });

    const deck = await db.slideDeck.create({ data: { campaignId, title: "Deck 2" } });

    const preview = await prepareShowAction({ actor: actor(), channel: "chat", threadId: null, tokenId: null, locale: "uk" as const }, "decks.get", { deckId: deck.id });

    await bindDeckRecord(campaignId, deck.id, deck.updatedAt, page.id);
    await expect(runShowOperation(actor(), "decks.get", { deckId: deck.id }, preview.preconditions as never)).rejects.toBeInstanceOf(ContentError);
  });

  it("fullRowDigest follows a field change in the same campaign only", async () => {
    const spell = await db.spell.create({ data: { campaignId, name: `spell-${marker}`, type: "damage", damageType: "fire" } });

    const before = await fullRowDigest(db, "spells", campaignId);

    const otherBefore = await fullRowDigest(db, "spells", otherId);

    await db.spell.create({ data: { campaignId: otherId, name: "foreign", type: "damage", damageType: "fire" } });
    expect(await fullRowDigest(db, "spells", campaignId)).toBe(before);
    expect(await fullRowDigest(db, "spells", otherId)).not.toBe(otherBefore);

    await db.spell.update({ where: { id: spell.id }, data: { damageType: "cold" } });
    expect(await fullRowDigest(db, "spells", campaignId)).not.toBe(before);
  });

  it("empty campaigns hash to an empty string and tables outside the whitelist are rejected", async () => {
    const empty = await db.campaign.create({ data: { name: `${marker}-empty`, dmUserId: userId, inviteCode: randomUUID() } });

    try {
      expect(await fullRowDigest(db, "units", empty.id)).toBe("");
      await expect(fullRowDigest(db, "users" as never, empty.id)).rejects.toThrow("DIGEST_TABLE_NOT_ALLOWED");
    } finally {
      await db.campaign.delete({ where: { id: empty.id } });
    }
  });

  it("contentSnapshot never reads full bundle rows", async () => {
    queries.length = 0;
    await db.$transaction(async tx => {
      const { runContentWriteContext } = await import("@/lib/server/content/write-context");

      return runContentWriteContext(campaignId, tx as Prisma.TransactionClient, () => contentSnapshot(actor()));
    });

    const bundle = queries.filter(q => /FROM "public"\."(races|classes|feats|backgrounds|main_skills|characters|character_inventories|character_skills)"/.test(q));

    expect(bundle.length).toBeGreaterThan(0);
    for (const query of bundle) expect(query).not.toMatch(/"public"\."\w+"\."name"/);
    expect(queries.filter(q => /FROM "public"\."(units|spells)"/.test(q))).toHaveLength(0);
    expect(queries.filter(q => /md5\(string_agg/.test(q))).toHaveLength(8);
  });

  it("preview state loads only rows that mention the target, with the same cascades as full rows", async () => {
    const group = await db.spellGroup.create({ data: { campaignId, name: `group-${marker}` } });

    const member = await db.spell.create({ data: { campaignId, name: "Member", type: "damage", damageType: "fire", groupId: group.id } });

    await db.spell.create({ data: { campaignId, name: "Unrelated", type: "damage", damageType: "fire" } });

    const state = await contentPreviewState(actor(), "spell-groups", group.id, null);

    expect(state.tables.spells.map(row => row.id)).toEqual([member.id]);
    expect(contentDeleteCascades(state, "spell-groups", [group.id])).toMatchObject([{ target: { id: member.id }, path: "groupId", after: null }]);
    expect(Object.keys(contentDependencies(state, "spell-groups", group.id, null))).toContain("tables");

    const operation = await contentOperationState(actor(), "spell-groups.remove-all-spells", { groupId: group.id });

    expect((operation?.tables as { spells: unknown[] }).spells).toHaveLength(1);
  });

  it("battle create preview reads units and spells once through digests and validates refs in one query per type", async () => {
    const unit = await db.unit.create({ data: { campaignId, name: `unit-${marker}` } });

    await db.spell.create({ data: { campaignId, name: "Battle spell", type: "damage", damageType: "fire" } });
    queries.length = 0;

    const preview = await db.$transaction(async tx => {
      const { runContentWriteContext } = await import("@/lib/server/content/write-context");

      return runContentWriteContext(campaignId, tx as Prisma.TransactionClient, () => prepareBattleAction({ actor: actor(), channel: "chat", threadId: null, tokenId: null, locale: "uk" as const }, "create", { body: { name: "B", participants: [{ id: unit.id, type: "unit", side: "enemy" }, { id: unit.id, type: "unit", side: "enemy" }] } }));
    });

    expect(preview.preconditions).toMatchObject({ version: 0 });
    expect(queries.filter(q => /"public"\."(units|spells)"\."name"/.test(q))).toHaveLength(0);
    expect(queries.filter(q => /FROM "public"\."units"/.test(q))).toHaveLength(1);
    expect(queries.filter(q => /FROM "units" t/.test(q))).toHaveLength(1);
    expect(queries.filter(q => /FROM "spells" t/.test(q))).toHaveLength(1);
  });
});
