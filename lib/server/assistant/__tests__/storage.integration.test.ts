import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import type { AssistantCaller, AssistantWriteAction } from "@/lib/server/assistant/types";

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

const marker = `stage6-assistant-${randomUUID()}`;

const userId = marker;

let campaignId: string;

let threadId: string;

let ready = false;

const actor = () => ({ campaignId, userId, isDM: true, via: "session", scopes: null } as const);

const caller = (): AssistantCaller => ({ actor: actor(), channel: "chat", tokenId: null, threadId });

const request = () => ({ actionId: "campaign.test-update", requestId: randomUUID(), input: {} });

function action(): AssistantWriteAction {
  return {
    id: "campaign.test-update", title: "Synthetic integration operation", description: "Increments only an owned test campaign", input: z.object({}),
    need: { access: "dm", scope: "campaign:write" }, effect: "write", confirmation: "standard",
    prepare: async (who) => {
      // Exercise the actual scoped prisma proxy. During execute this read must
      // reuse the open transaction rather than wait for its sole connection.
      const row = await prisma.campaign.findUniqueOrThrow({ where: { id: who.actor.campaignId }, select: { maxLevel: true } });

      return { summary: "Synthetic change", targets: [], changes: [], warnings: [], effects: [{ kind: "update", targets: [], description: "Synthetic" }], preconditions: { maxLevel: row.maxLevel } };
    },
    execute: async (ctx) => {
      const row = await ctx.db.campaign.update({ where: { id: ctx.caller.actor.campaignId }, data: { maxLevel: { increment: 1 } }, select: { maxLevel: true } });

      return { data: { maxLevel: row.maxLevel }, affected: [], warnings: [] };
    },
  };
}

describe("assistant real constructor storage, connection_limit=1", () => {
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

  it("concurrent confirmations commit one mutation and one receipt", async () => {
    const executor = createAssistantExecutor({ db, catalog: createActionCatalog([action()]) });

    const pending = await executor.dispatchAction(caller(), request());

    if (pending.kind !== "pending") throw new Error("Expected pending");

    const results = await Promise.all([executor.confirmIntent(actor(), pending.intent.id), executor.confirmIntent(actor(), pending.intent.id)]);

    expect(results[0]).toEqual(results[1]);
    expect(await db.campaign.findUnique({ where: { id: campaignId }, select: { maxLevel: true } })).toEqual({ maxLevel: 11 });
    expect(await db.assistantReceipt.count({ where: { intentId: pending.intent.id } })).toBe(1);
  });

  it("a competing committed update makes preview stale without overwriting it", async () => {
    const executor = createAssistantExecutor({ db, catalog: createActionCatalog([action()]) });

    const pending = await executor.dispatchAction(caller(), request());

    if (pending.kind !== "pending") throw new Error("Expected pending");

    await db.campaign.update({ where: { id: campaignId }, data: { maxLevel: 15 } });
    await expect(executor.confirmIntent(actor(), pending.intent.id)).rejects.toMatchObject({ status: 409 });
    expect(await db.campaign.findUnique({ where: { id: campaignId }, select: { maxLevel: true } })).toEqual({ maxLevel: 15 });
    expect(await db.assistantIntent.findUnique({ where: { id: pending.intent.id }, select: { status: true } })).toEqual({ status: "stale" });
  });

  it("domain failure rolls back the real database write and receipt", async () => {
    const base = action();

    const failing: AssistantWriteAction = { ...base, execute: async (ctx, input) => { await base.execute(ctx, input); throw new Error("SYNTHETIC_ROLLBACK"); } };

    const executor = createAssistantExecutor({ db, catalog: createActionCatalog([failing]) });

    const pending = await executor.dispatchAction(caller(), request());

    if (pending.kind !== "pending") throw new Error("Expected pending");

    await expect(executor.confirmIntent(actor(), pending.intent.id)).rejects.toThrow("SYNTHETIC_ROLLBACK");
    expect(await db.campaign.findUnique({ where: { id: campaignId }, select: { maxLevel: true } })).toEqual({ maxLevel: 10 });
    expect(await db.assistantReceipt.count({ where: { intentId: pending.intent.id } })).toBe(0);
  });

  it("auto checks execution settings through the same single connection", async () => {
    await db.aiThread.update({ where: { id: threadId }, data: { executionMode: "auto" } });

    const executor = createAssistantExecutor({ db, catalog: createActionCatalog([action()]) });

    expect(await executor.dispatchAction(caller(), request())).toMatchObject({ kind: "result", result: { data: { maxLevel: 11 } } });
  });

  it("new tables have RLS and database constraints reject invalid states", async () => {
    const rows = await db.$queryRaw<Array<{ relname: string; relrowsecurity: boolean }>>`SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname IN ('assistant_intents', 'assistant_receipts', 'assistant_runs')`;

    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.relrowsecurity)).toBe(true);
    await expect(db.aiThread.update({ where: { id: threadId }, data: { executionMode: "untrusted" } })).rejects.toBeDefined();
    expect(await db.aiThread.findUnique({ where: { id: threadId }, select: { executionMode: true } })).toEqual({ executionMode: "review" });
  });
});
