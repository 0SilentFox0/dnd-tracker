import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { appendMessage, loadMessages } from "@/lib/ai/threads";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import { createAssistantRunStore, toolRequestKey } from "@/lib/server/assistant/runs";
import type { AssistantCaller } from "@/lib/server/assistant/types";
import { createScopedDatabase } from "@/lib/server/content/write-context";

vi.mock("@/lib/pusher/server", () => ({ pusherServer: { trigger: vi.fn(async () => {}) } }));
vi.mock("@/lib/server/assistant/runtime-effects", () => ({ ASSISTANT_EFFECT_HANDLERS: {} }));

function localUrl(name: string) {
  const url = new URL(process.env[name] ?? "");

  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.port !== "54322" || url.pathname !== "/constructor") throw new Error("ASSISTANT_TEST_REQUIRES_LOCAL_CONSTRUCTOR");

  url.searchParams.set("connection_limit", "1");

  return url.toString();
}

const databaseUrl = localUrl("DATABASE_URL");

process.env.DATABASE_URL = databaseUrl;
process.env.DIRECT_URL = localUrl("DIRECT_URL");

const raw = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

const db = createScopedDatabase(raw);

const database = vi.hoisted(() => ({ client: undefined as PrismaClient | undefined }));

vi.mock("@/lib/db", async () => {
  const { createScopedDatabase } = await import("@/lib/server/content/write-context");

  return { prisma: createScopedDatabase(new Proxy({} as PrismaClient, { get(_target, key) {
    if (!database.client) throw new Error("FIXTURE_NOT_READY");

    const value = Reflect.get(database.client, key);

    return typeof value === "function" ? value.bind(database.client) : value;
  } })) };
});
database.client = raw;

const marker = `t15-${randomUUID()}`;

let campaignId: string;

let threadId: string;

let time = Date.now();

const caller = (): AssistantCaller => ({ actor: { campaignId, userId: marker, isDM: true, via: "session", scopes: null }, channel: "chat", threadId, tokenId: null });

const store = createAssistantRunStore({ db, now: () => new Date(time) });

describe("T15 real constructor run storage", () => {
  beforeAll(async () => {
    await db.user.create({ data: { id: marker, email: `${marker}@example.invalid`, displayName: marker } });

    const campaign = await db.campaign.create({ data: { name: marker, dmUserId: marker, inviteCode: randomUUID(), members: { create: { userId: marker, role: "dm" } } } });

    campaignId = campaign.id;
    threadId = (await db.aiThread.create({ data: { campaignId, userId: marker, title: marker, provider: "anthropic", model: "test", mode: "live" } })).id;
  });
  afterAll(async () => {
    if (campaignId) {
      const owned = await db.campaign.findUnique({ where: { id: campaignId } });

      if (owned && (owned.name !== marker || owned.dmUserId !== marker)) throw new Error("FIXTURE_OWNERSHIP_MISMATCH");

      await db.assistantReceipt.deleteMany({ where: { campaignId, userId: marker } });

      if (owned) await db.campaign.delete({ where: { id: campaignId } });
    }

    const user = await db.user.findUnique({ where: { id: marker } });

    if (user) {
      if (user.email !== `${marker}@example.invalid`) throw new Error("FIXTURE_OWNERSHIP_MISMATCH");

      await db.user.delete({ where: { id: marker } });
    }

    expect(await db.assistantReceipt.count({ where: { campaignId, userId: marker } })).toBe(0);
    expect(await db.assistantRun.count({ where: { threadId } })).toBe(0);
    expect(await db.user.count({ where: { id: marker } })).toBe(0);
    await raw.$disconnect();
  });
  it("concurrent duplicate submit creates one run and one user message; second request conflicts", async () => {
    const claims = await Promise.all(Array.from({ length: 4 }, () => store.beginAssistantRun(caller(), "same", { text: "Зміна" })));

    expect(claims.filter(c => !c.replayed)).toHaveLength(1);
    expect(new Set(claims.map(c => c.run.id)).size).toBe(1);
    expect(await db.aiMessage.count({ where: { threadId, role: "user" } })).toBe(1);
    await expect(store.beginAssistantRun(caller(), "other", { text: "Інший" })).rejects.toMatchObject({ status: 409 });
    await expect(store.beginAssistantRun(caller(), "same", { text: "Підміна" })).rejects.toMatchObject({ status: 409 });
  });
  it("concurrent appends allocate unique ordered seq with no dropped messages", async () => {
    await Promise.all(Array.from({ length: 8 }, (_, i) => appendMessage(threadId, { id: `${marker}-${i}`, role: "assistant", parts: [{ type: "text", text: String(i) }] })));

    const rows = await db.aiMessage.findMany({ where: { threadId }, orderBy: { seq: "asc" } });

    expect(rows.map(r => r.seq)).toEqual([1,2,3,4,5,6,7,8,9]);
  });
  it("tool retry uses one intent and receipt; Stop/recovery keeps committed result", async () => {
    const claim = await store.beginAssistantRun(caller(), "same", { text: "Зміна" });

    const executor = createAssistantExecutor({ db, catalog: createActionCatalog([{
      id: "campaign.run-test", title: "Test", description: "Owned fixture only", input: z.object({}), need: { access: "dm", scope: "campaign:write" }, effect: "write", confirmation: "standard",
      prepare: async () => ({ summary: "Test", targets: [], changes: [], warnings: [], effects: [], preconditions: {} }),
      execute: async ctx => { await ctx.db.campaign.update({ where: { id: campaignId }, data: { maxLevel: { increment: 1 } } });

 return { data: { saved: true }, affected: [], warnings: [] }; },
    }]) });

    const request = { actionId: "campaign.run-test", requestId: toolRequestKey(claim.run.id, "call1"), input: {} };

    const who = { ...caller(), runId: claim.run.id };

    const pending = await executor.dispatchAction(who, request);

    if (pending.kind !== "pending") throw new Error("Expected pending");

    const beforeConfirm = await store.readAssistantRuns(caller());

    expect(beforeConfirm.intents).toContainEqual(expect.objectContaining({ id: pending.intent.id, status: "pending" }));
    await executor.confirmIntent(caller().actor, pending.intent.id);
    await executor.dispatchAction(who, request);
    expect(await db.assistantIntent.count({ where: { campaignId, requestId: request.requestId } })).toBe(1);
    expect(await db.assistantReceipt.count({ where: { campaignId, requestId: request.requestId } })).toBe(1);
    await store.recordAssistantRunUsage(claim.run.id, { inputTokens: 12, outputTokens: null, partial: true });
    expect((await db.assistantRun.findUniqueOrThrow({ where: { id: claim.run.id } })).resultRefs).toEqual({ usage: { inputTokens: 12, outputTokens: null, partial: true } });
    await store.cancelAssistantRun(caller(), "same");
    await store.finishAssistantRun(claim.run.id, { status: "cancelled", usage: { inputTokens: 12, outputTokens: null, partial: true } });

    const recovered = await store.readAssistantRuns(caller());

    expect(recovered.receipts).toContainEqual(expect.objectContaining({ status: "applied", result: expect.objectContaining({ data: { saved: true } }) }));
    await expect(store.beginAssistantRun(caller(), "early", { text: "New" })).rejects.toMatchObject({ status: 409 });
  });
  it("terminal request mapping outlives lease, new explicit request gets new run", async () => {
    time += 300001;

    const repeated = await store.beginAssistantRun(caller(), "same", { text: "Зміна" });

    expect(repeated.replayed).toBe(true);

    await db.assistantRun.createMany({ data: Array.from({ length: 31 }, (_, i) => ({ threadId, requestId: `older-${i}`, requestHash: "fixture", status: "complete", expiresAt: new Date(time), resultRefs: { status: "completed" } })) });

    const oldRecovery = await store.readAssistantRuns(caller(), "same");

    expect(oldRecovery.receipts).toContainEqual(expect.objectContaining({ status: "applied" }));

    const next = await store.beginAssistantRun(caller(), "next", { text: "Наступний" });

    expect(next.run.id).not.toBe(repeated.run.id);
    expect(await loadMessages(threadId)).toHaveLength(10);
  });
  it("emptyRunHistoryHasNoIntentsOrReceipts", async () => {
    const emptyThread = await db.aiThread.create({ data: { campaignId, userId: marker, title: marker, provider: "anthropic", model: "test", mode: "live" } });

    // The owner already has committed history in another thread.
    expect(await db.assistantReceipt.count({ where: { campaignId, userId: marker } })).toBeGreaterThan(0);
    expect(await store.readAssistantRuns({ ...caller(), threadId: emptyThread.id })).toEqual({ runs: [], receipts: [], intents: [] });
    expect(await store.readAssistantRuns(caller(), "missing-request")).toEqual({ runs: [], receipts: [], intents: [] });
  });
  it("bounds recovery history to 30 runs and 100 related receipts/intents", async () => {
    const profileThread = await db.aiThread.create({ data: { campaignId, userId: marker, title: marker, provider: "anthropic", model: "test", mode: "live" } });

    const blob = "x".repeat(4096);

    const runIds = Array.from({ length: 32 }, (_, i) => `${marker}-profile-${i}`);

    await db.assistantRun.createMany({ data: runIds.map((id, i) => ({ id, threadId: profileThread.id, requestId: `profile-${i}`, requestHash: "fixture", status: "complete", expiresAt: new Date(0), createdAt: new Date(i * 1000), resultRefs: { status: "completed", padding: blob } })) });

    const related = Array.from({ length: 102 }, (_, i) => ({
      campaignId, userId: marker, originKey: profileThread.id, requestId: `${runIds[31]}_tool-${i}`, requestHash: "fixture", actionId: "campaign.settings", createdAt: new Date(i * 1000),
    }));

    await db.assistantIntent.createMany({ data: related.map((row, i) => ({ ...row, id: `${marker}-profile-intent-${i}`, channel: "chat", threadId: profileThread.id, summary: `Fixture ${i}`, targets: [], expiresAt: new Date(9999999999999), payload: { padding: blob }, preview: { padding: blob }, expected: { padding: blob } })) });
    await db.assistantReceipt.createMany({ data: related.map((row, i) => ({ ...row, intentId: `${marker}-profile-applied-${i}`, status: "applied", result: { data: { saved: i }, affected: [], warnings: [] }, effectsStatus: "complete", effects: { padding: blob } })) });

    let resultJsonBytes = 0;

    let queryCount = 0;

    const measuredDb = raw.$extends({ query: { $allModels: { async $allOperations({ model, operation, args, query }) {
      queryCount++;

      const value = await query(args);

      if (["AssistantRun", "AssistantReceipt", "AssistantIntent"].includes(model) && operation === "findMany") resultJsonBytes += Buffer.byteLength(JSON.stringify(value));

      return value;
    } } } });

    const measuredStore = createAssistantRunStore({ db: measuredDb as unknown as PrismaClient, now: () => new Date(0) });

    const who = { ...caller(), threadId: profileThread.id };

    const history = await measuredStore.readAssistantRuns(who);

    expect(history.runs).toHaveLength(30);
    expect(history.runs[0]).toMatchObject({ requestId: "profile-31", status: "completed" });
    expect(history.runs.at(-1)).toMatchObject({ requestId: "profile-2" });
    expect(history.receipts).toHaveLength(100);
    expect(history.receipts[0].result).toMatchObject({ data: { saved: 101 } });
    expect(history.intents).toHaveLength(100);
    expect(history.intents[0]).toMatchObject({ summary: "Fixture 101", status: "pending" });
    expect(JSON.stringify(history)).not.toContain(blob);
    expect(await measuredStore.readAssistantRuns(who, "profile-0")).toMatchObject({ receipts: [], intents: [], runs: [{ requestId: "profile-0" }] });

    if (process.env.S4_RECOVERY_PROFILE) {
      const samples = [];

      for (let i = 0; i < 35; i++) {
        resultJsonBytes = 0;
        queryCount = 0;

        const start = performance.now();

        await measuredStore.readAssistantRuns(who);

        if (i >= 5) samples.push({ resultJsonBytes, queryCount, elapsedMs: performance.now() - start });
      }
      writeFileSync(process.env.S4_RECOVERY_PROFILE, JSON.stringify({ node: process.version, fixtures: { runs: 32, intents: 102, receipts: 102, paddingChars: 4096 }, warmups: 5, samples }, null, 2));
    }
  });
  it("expired claim stays held while an unknown result cannot be reconciled", async () => {
    const next = await store.beginAssistantRun(caller(), "next", { text: "Наступний" });

    const receipt = await db.assistantReceipt.findFirstOrThrow({ where: { campaignId } });

    await db.assistantReceipt.update({ where: { id: receipt.id }, data: { requestId: toolRequestKey(next.run.id, "unknown-call"), actionId: "campaign.settings", status: "unknown", effectsStatus: "unknown" } });
    time += 300001;
    await expect(store.beginAssistantRun(caller(), "unsafe-retry", { text: "Повтор" })).rejects.toMatchObject({ status: 409 });
    expect(await db.assistantRun.count({ where: { threadId, activeThreadId: threadId } })).toBe(1);
    expect((await store.readAssistantRuns(caller())).receipts).toContainEqual(expect.objectContaining({ status: "unknown" }));
  });

});
