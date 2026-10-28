import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

import { prisma } from "@/lib/db";
import { CONTENT_ACTIONS } from "@/lib/server/assistant/actions/content";
import { CONTENT_EFFECT_HANDLERS } from "@/lib/server/assistant/actions/content-effects";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import type { AssistantCaller } from "@/lib/server/assistant/types";
import { DEFAULT_IMPORT_DEPS } from "@/lib/server/content/import/import-content";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";

function localUrl(name: string): string {
  const url = new URL(process.env[name] ?? "");

  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.port !== "54322" || url.pathname !== "/constructor") throw new Error("ASSISTANT_TEST_REQUIRES_LOCAL_CONSTRUCTOR");

  url.searchParams.set("connection_limit", "1");

  return url.toString();
}

// Validate BOTH URLs before constructing clients or performing fixture writes.
const databaseUrl = localUrl("DATABASE_URL");

localUrl("DIRECT_URL");

const db = new PrismaClient({ datasources: { db: { url: databaseUrl } }, log: [] });

const marker = `stage6-content-${randomUUID()}`;

const userId = marker;

let campaignId: string;

let threadId: string;

let ready = false;

const actor = () => ({ campaignId, userId, isDM: true, via: "session", scopes: null } as const);

const caller = (): AssistantCaller => ({ actor: actor(), channel: "chat", tokenId: null, threadId });

describe("content adapters real constructor, connection_limit=1", () => {
  beforeAll(async () => {
    const migration = await db.$queryRaw<Array<{ migration_name: string }>>`SELECT migration_name FROM _prisma_migrations WHERE migration_name = '20261108000000_assistant_intents' AND finished_at IS NOT NULL`;

    expect(migration).toHaveLength(1);
    await db.user.create({ data: { id: userId, email: `${marker}@example.invalid`, displayName: marker } });

    const campaign = await db.campaign.create({ data: { name: marker, dmUserId: userId, inviteCode: randomUUID(), maxLevel: 10, members: { create: { userId, role: "dm" } } } });

    campaignId = campaign.id;

    const thread = await db.aiThread.create({ data: { campaignId, userId, title: marker, mode: "scenario", provider: "anthropic", model: "synthetic", executionMode: "review" } });

    threadId = thread.id;
    ready = true;
  });

  beforeEach(async () => {
    await db.campaign.update({ where: { id: campaignId }, data: { maxLevel: 10 } });
    await db.aiThread.update({ where: { id: threadId }, data: { executionMode: "review" } });
  });

  afterAll(async () => {
    if (campaignId) {
      const owned = await db.campaign.findUnique({ where: { id: campaignId }, select: { name: true, dmUserId: true, members: { select: { userId: true, role: true } } } });

      if (owned && (owned.name !== marker || owned.dmUserId !== userId || owned.members.length !== 1 || owned.members[0].userId !== userId || owned.members[0].role !== "dm")) throw new Error("FIXTURE_OWNERSHIP_MISMATCH");

      await db.assistantReceipt.deleteMany({ where: { campaignId, userId } });

      if (owned) await db.campaign.delete({ where: { id: campaignId } });
    }

    const user = await db.user.findUnique({ where: { id: userId }, select: { displayName: true, email: true, campaignMembers: { select: { id: true } }, dmCampaigns: { select: { id: true } } } });

    if (user) {
      if (user.displayName !== marker || user.email !== `${marker}@example.invalid` || user.campaignMembers.length || user.dmCampaigns.length) throw new Error("FIXTURE_USER_MISMATCH");

      await db.user.delete({ where: { id: userId } });
    }

    if (ready) expect(await db.campaign.count({ where: { id: campaignId } })).toBe(0);

    await db.$disconnect();
    await prisma.$disconnect();
  });

  it("real content review and concurrent confirm create exactly one row and receipt", async () => {
    const executor = createAssistantExecutor({ db, catalog: createActionCatalog(CONTENT_ACTIONS), effects: CONTENT_EFFECT_HANDLERS });

    const prepared = await executor.dispatchAction(caller(), { actionId: "content.units.create", requestId: randomUUID(), input: { data: { name: marker } } });

    if (prepared.kind !== "pending") throw new Error("review required");

    expect(await db.unit.count({ where: { campaignId, name: marker } })).toBe(0);

    const receipts = await Promise.all([executor.confirmIntent(actor(), prepared.intent.id), executor.confirmIntent(actor(), prepared.intent.id)]);

    expect(receipts[0].id).toBe(receipts[1].id);
    expect(await db.unit.count({ where: { campaignId, name: marker } })).toBe(1);
    expect(await db.assistantReceipt.count({ where: { intentId: prepared.intent.id } })).toBe(1);
  });

  it("real newly added inventory reference makes a deletion stale", async () => {
    const artifact = await db.artifact.create({ data: { campaignId, name: marker, slot: "weapon", rarity: "common" } });

    const executor = createAssistantExecutor({ db, catalog: createActionCatalog(CONTENT_ACTIONS), effects: CONTENT_EFFECT_HANDLERS });

    const prepared = await executor.dispatchAction(caller(), { actionId: "content.artifacts.delete", requestId: randomUUID(), input: { id: artifact.id } });

    if (prepared.kind !== "pending") throw new Error("review required");

    const character = await db.character.create({ data: { campaignId, controlledBy: userId, type: "hero", name: marker, class: "", race: "", inventory: { create: { backpack: [artifact.id] } } } });

    await expect(executor.confirmIntent(actor(), prepared.intent.id)).rejects.toMatchObject({ status: 409 });
    expect(await db.artifact.count({ where: { id: artifact.id } })).toBe(1);
    expect(await db.assistantReceipt.count({ where: { intentId: prepared.intent.id } })).toBe(0);
    expect(await db.characterInventory.findUnique({ where: { characterId: character.id } })).toMatchObject({ backpack: [artifact.id] });
  });

  it("real partial importer report and receipt commit on the sole transaction connection", async () => {
    const executor = createAssistantExecutor({ db, catalog: createActionCatalog(CONTENT_ACTIONS), effects: CONTENT_EFFECT_HANDLERS });

    const name = `${marker}-import`;

    const prepared = await executor.dispatchAction(caller(), { actionId: "content.import", requestId: randomUUID(), input: { kind: "units", body: { rows: [{ name }, {}] } } });

    if (prepared.kind !== "pending") throw new Error("review required");

    const receipt = await executor.confirmIntent(actor(), prepared.intent.id);

    expect(receipt).toMatchObject({ status: "applied", result: { data: { counts: { created: 1, error: 1 } }, warnings: [expect.stringContaining("частково")] } });
    expect(await db.unit.count({ where: { campaignId, name } })).toBe(1);
    expect(await executor.confirmIntent(actor(), prepared.intent.id)).toEqual(receipt);
  });
  it("a database error rolls back only its import row, then later rows and receipt commit", async () => {
    const executor = createAssistantExecutor({ db, catalog: createActionCatalog(CONTENT_ACTIONS), effects: CONTENT_EFFECT_HANDLERS });

    const original = DEFAULT_IMPORT_DEPS.resource;

    const spy = vi.spyOn(DEFAULT_IMPORT_DEPS, "resource").mockImplementation((kind) => {
      if (kind !== "units") return original(kind);

      return { ...CONTENT_RESOURCES.units, create: async (who, input) => {
        const row = await CONTENT_RESOURCES.units.create(who, input);

        if (input.name.endsWith("-sql-fault")) await prisma.$queryRaw`SELECT 1 / 0`;

        return row;
      } };
    });

    const bad = `${marker}-sql-fault`, good = `${marker}-sql-good`;

    try {
      const prepared = await executor.dispatchAction(caller(), { actionId: "content.import", requestId: randomUUID(), input: { kind: "units", body: { rows: [{ name: bad }, { name: good }] } } });

      if (prepared.kind !== "pending") throw new Error("review required");

      const receipt = await executor.confirmIntent(actor(), prepared.intent.id);

      expect(receipt).toMatchObject({ status: "applied", effectsStatus: "complete", result: { data: { counts: { created: 1, error: 1 } } } });
      expect(await db.unit.count({ where: { campaignId, name: bad } })).toBe(0);
      expect(await db.unit.count({ where: { campaignId, name: good } })).toBe(1);
    } finally { spy.mockRestore(); }
  });

});
