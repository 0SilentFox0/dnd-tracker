import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createSyntheticCampaign, deleteSyntheticCampaign } from "@/fixtures/campaign.synthetic";
import { CAMPAIGN_ACTIONS } from "@/lib/server/assistant/actions/campaign";
import { CHARACTER_ACTIONS } from "@/lib/server/assistant/actions/characters";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import { readDeletionReceipt } from "@/lib/server/assistant/receipts";
import { readReceipt } from "@/lib/server/assistant/receipts";
import type { ActionExecutionContext, AssistantCaller, DurableEffect } from "@/lib/server/assistant/types";
import { ContentError } from "@/lib/server/content/errors";
import { afterContentCommit, currentContentWrite } from "@/lib/server/content/write-context";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";
import { manifestTracker } from "@/scripts/constructor/assistant-check/manifest";

vi.mock("@/lib/pusher/server", () => ({ pusherServer: { trigger: vi.fn(async () => {}) } }));
vi.mock("@/lib/server/assistant/runtime-effects", () => ({ ASSISTANT_EFFECT_HANDLERS: {} }));
vi.mock("@/lib/cache/campaign-list", () => ({ invalidateCampaignLists: vi.fn() }));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference: vi.fn(), ReferenceKind: { RACES: "races" } }));

const routeAuth = vi.hoisted(() => ({ userId: "" }));

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: async () => ({ userId: routeAuth.userId }), requireAuth: async () => ({ userId: routeAuth.userId }) }));

const database = vi.hoisted(() => ({ client: undefined as PrismaClient | undefined }));

vi.mock("@/lib/db", async () => {
  const { createScopedDatabase } = await import("@/lib/server/content/write-context");

  const base = new Proxy({} as PrismaClient, { get(_target, property) {
    if (!database.client) throw new Error("FIXTURE_DATABASE_NOT_READY");

    const value = Reflect.get(database.client, property);

    return typeof value === "function" ? value.bind(database.client) : value;
  } });

  return { prisma: createScopedDatabase(base) };
});

const url = new URL(singleConnectionDatabaseUrl("DATABASE_URL"));

process.env.DATABASE_URL = url.toString();
process.env.DIRECT_URL = singleConnectionDatabaseUrl("DIRECT_URL");

const db = new PrismaClient({ datasources: { db: { url: url.toString() } }, log: [] });

database.client = db;

const runId = process.env.ASSISTANT_CHECK_RUN_ID ?? `t19-${randomUUID()}`;

let fixture: Awaited<ReturnType<typeof createSyntheticCampaign>>;

const fixtures: Awaited<ReturnType<typeof createSyntheticCampaign>>[] = [];

let srds: { spells: number; units: number; artifacts: number };

const actor = () => ({ campaignId: fixture.campaignId, userId: fixture.userId, isDM: true, via: "session", scopes: null } as const);

const caller = (): AssistantCaller => ({ actor: actor(), channel: "chat", threadId: fixture.threadId, tokenId: null });

const executor = (actions: readonly import("@/lib/server/assistant/types").AssistantActionDef[] = CAMPAIGN_ACTIONS) => createAssistantExecutor({ db, catalog: createActionCatalog(actions) });

describe.skipIf(!isLocalDevDatabaseEnv())("T19 local constructor execution integration (connection_limit=1)", () => {
  beforeAll(async () => {
    const counts = await Promise.all([
      db.spell.count(),
      db.unit.count(),
      db.artifact.count(),
    ]);

    srds = { spells: counts[0], units: counts[1], artifacts: counts[2] };
  });

  beforeEach(async () => {
    fixture = await createSyntheticCampaign(db, runId, manifestTracker());
    fixtures.push(fixture);
    routeAuth.userId = fixture.userId;
  });

  afterAll(async () => {
    for (const owned of fixtures) await deleteSyntheticCampaign(db, owned);

    const counts = await Promise.all([
      db.spell.count(),
      db.unit.count(),
      db.artifact.count(),
    ]);

    expect({ spells: counts[0], units: counts[1], artifacts: counts[2] }).toEqual(srds);
    await db.$disconnect();
  });

  it("serializes two concurrent confirmations into one receipt and one domain update", async () => {
    const original = CAMPAIGN_ACTIONS.find(action => action.id === "campaign.settings");

    if (!original || original.effect !== "write") throw new Error("campaign.settings missing");

    const catalog = createActionCatalog([{ ...original, execute: async (ctx: ActionExecutionContext, input: unknown) => {
      const result = await original.execute(ctx, input);

      await ctx.db.campaign.update({ where: { id: fixture.campaignId }, data: { maxLevel: { increment: 1 } } });

      return result;
    } }]);

    // Two independent pools, each capped at one connection. Both transactions
    // must open before either reaches the executor's campaign/intent locks.
    const other = new PrismaClient({ datasources: { db: { url: url.toString() } }, log: [] });

    const sessions = new Set<number>();

    let release = () => {};

    const ready = new Promise<void>(resolve => { release = resolve; });

    const simultaneous = (client: PrismaClient) => new Proxy(client, { get(target, key) {
      if (key === "$transaction") return (body: (tx: Prisma.TransactionClient) => Promise<unknown>, options: { timeout: number; maxWait: number }) => target.$transaction(async tx => {
        const [session] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;

        sessions.add(session.pid);

        if (sessions.size === 2) release();

        await ready;

        return body(tx);
      }, options);

      const value = Reflect.get(target, key);

      return typeof value === "function" ? value.bind(target) : value;
    } });

    const action = createAssistantExecutor({ db: simultaneous(db), catalog });

    const contender = createAssistantExecutor({ db: simultaneous(other), catalog });

    try {
      const pending = await action.dispatchAction(caller(), { actionId: "campaign.settings", requestId: randomUUID(), input: { patch: { description: "once" } } });

      if (pending.kind !== "pending") throw new Error("expected review intent");

      const receipts = await Promise.all([action.confirmIntent(actor(), pending.intent.id), contender.confirmIntent(actor(), pending.intent.id)]);

      expect(sessions.size).toBe(2);
      expect(receipts[0].id).toBe(receipts[1].id);
      expect(await db.assistantReceipt.count({ where: { intentId: pending.intent.id } })).toBe(1);
      expect(await db.campaign.findUniqueOrThrow({ where: { id: fixture.campaignId } })).toMatchObject({ description: "once", maxLevel: 21 });
    } finally {
      release();
      await other.$disconnect();
    }
  });

  it("competing HTTP PATCH invalidates the MCP preview before confirm", async () => {
    const action = executor();

    const token = await db.apiToken.create({ data: { campaignId: fixture.campaignId, userId: fixture.userId, name: "synthetic", tokenHash: randomUUID(), prefix: "fixture", scopes: ["campaign:write", "campaign:read"] } });

    const tokenCaller: AssistantCaller = { actor: { ...actor(), via: "token", scopes: token.scopes as never }, channel: "mcp", threadId: null, tokenId: token.id };

    const mcpPending = await action.dispatchAction(tokenCaller, { actionId: "campaign.settings", requestId: randomUUID(), input: { patch: { description: "MCP" } } });

    if (mcpPending.kind !== "pending") throw new Error("expected MCP review intent");

    const { PATCH } = await import("@/app/api/campaigns/[id]/route");

    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ description: "HTTP" }) }), { params: Promise.resolve({ id: fixture.campaignId }) });

    expect(response.status).toBe(200);
    await expect(action.confirmIntent(actor(), mcpPending.intent.id)).rejects.toMatchObject({ status: 409 });
    expect(await db.campaign.findUniqueOrThrow({ where: { id: fixture.campaignId } })).toMatchObject({ description: "HTTP" });
  });

  it("new character log refs make a prepared delete stale without partial deletion", async () => {
    const chars = createAssistantExecutor({ db, catalog: createActionCatalog(CHARACTER_ACTIONS) });

    const created = await chars.dispatchAction(caller(), { actionId: "characters.create", requestId: randomUUID(), input: { name: "T19 Hero", type: "npc_hero", controlledBy: "", race: "Людина", class: "Герой" } });

    if (created.kind !== "pending") throw new Error("expected create review");

    const result = await chars.confirmIntent(actor(), created.intent.id);

    const characterId = (result.result?.data as { id: string }).id;

    expect(await chars.confirmIntent(actor(), created.intent.id)).toMatchObject({ id: result.id });
    expect(await db.character.count({ where: { id: characterId, campaignId: fixture.campaignId } })).toBe(1);
    expect(await db.characterInventory.count({ where: { characterId } })).toBe(1);
    expect(await db.characterLog.count({ where: { characterId } })).toBe(0);
    expect(await db.inventoryLog.count({ where: { characterId } })).toBe(0);

    const pending = await chars.dispatchAction(caller(), { actionId: "characters.delete", requestId: randomUUID(), input: { characterId } });

    if (pending.kind !== "pending") throw new Error("expected delete review");

    await db.characterLog.create({ data: { campaignId: fixture.campaignId, characterId, actorUserId: fixture.userId, kind: "check", data: { label: "new dependency" } } });

    await expect(chars.confirmIntent(actor(), pending.intent.id)).rejects.toMatchObject({ status: 409 });
    expect(await db.character.findUnique({ where: { id: characterId } })).not.toBeNull();
    expect(await db.assistantReceipt.findFirst({ where: { intentId: pending.intent.id } })).toBeNull();
  });

  it("campaign deletion leaves an owner-only tombstone receipt after cascade", async () => {
    const action = executor();

    const pending = await action.dispatchAction(caller(), { actionId: "campaign.delete", requestId: randomUUID(), input: {} });

    if (pending.kind !== "pending") throw new Error("expected dangerous review");

    const receipt = await action.confirmIntent(actor(), pending.intent.id);

    expect(receipt.status).toBe("applied");
    expect(await db.campaign.count({ where: { id: fixture.campaignId } })).toBe(0);
    expect(await readDeletionReceipt(fixture.userId, fixture.campaignId, pending.intent.id, db)).toMatchObject({ id: receipt.id, status: "applied", deleted: true });
    await expect(readDeletionReceipt("foreign-user", fixture.campaignId, pending.intent.id, db)).rejects.toMatchObject({ status: 404 });
  });

  it("revoking the originating MCP token during an in-flight dispatch prevents confirmation", async () => {
    const token = await db.apiToken.create({ data: { campaignId: fixture.campaignId, userId: fixture.userId, name: "synthetic", tokenHash: randomUUID(), prefix: "fixture", scopes: ["campaign:write", "campaign:read"] } });

    const mcp: AssistantCaller = { actor: { ...actor(), via: "token", scopes: token.scopes as never }, channel: "mcp", threadId: null, tokenId: token.id };

    const original = CAMPAIGN_ACTIONS.find(action => action.id === "campaign.settings");

    if (!original || original.effect !== "write") throw new Error("campaign.settings prepare missing");

    const prepare = original.prepare;

    let releasePrepare = () => {};

    let prepareStarted = () => {};

    const prepareGate = new Promise<void>(resolve => { releasePrepare = resolve; });

    const started = new Promise<void>(resolve => { prepareStarted = resolve; });

    const guarded = {
      ...original,
      prepare: async (requester: AssistantCaller, input: unknown) => {
        prepareStarted();
        await prepareGate;

        return prepare(requester, input);
      },
    };

    const action = createAssistantExecutor({ db, catalog: createActionCatalog([guarded]) });

    const dispatch = action.dispatchAction(mcp, { actionId: "campaign.settings", requestId: randomUUID(), input: { patch: { description: "should not apply" } } });

    await started;
    await db.apiToken.update({ where: { id: token.id }, data: { revokedAt: new Date() } });
    releasePrepare();

    const pending = await dispatch;

    if (pending.kind !== "pending") throw new Error("expected MCP review");

    await expect(action.confirmIntent(actor(), pending.intent.id)).rejects.toMatchObject({ status: 403 });
    expect(await db.campaign.findUniqueOrThrow({ where: { id: fixture.campaignId } })).toMatchObject({ description: null });
    expect(await db.assistantReceipt.count({ where: { intentId: pending.intent.id, status: "applied" } })).toBe(0);
  });

  it("crash/retry reuses the receipt and idempotency key without repeating durable effect", async () => {
    const delivered = new Set<string>();

    let handlerCalls = 0;

    const effect: DurableEffect = { key: `effect-${runId}`, kind: "invalidate", payload: { domain: "campaign", id: fixture.campaignId } };

    const actionDef = {
      id: "campaign.integration-effect", title: "Integration effect", description: "Owned fixture only", input: z.object({}),
      need: { access: "dm" as const, scope: "campaign:write" as const }, effect: "write" as const, confirmation: "standard" as const,
      prepare: async () => ({ summary: "Effect fixture", targets: [], changes: [], warnings: [], effects: [], preconditions: { version: 1 } }),
      execute: async (ctx: import("@/lib/server/assistant/types").ActionExecutionContext) => {
        await ctx.db.campaign.update({ where: { id: fixture.campaignId }, data: { maxLevel: { increment: 1 } } });
        ctx.afterCommit(effect);

        return { data: { saved: true }, affected: [], warnings: [] };
      },
    };

    const handler = async (_payload: unknown, key: string) => {
      handlerCalls += 1;
      delivered.add(key);

      if (handlerCalls === 1) throw new Error("synthetic crash after delivery before receipt acknowledgement");
    };

    const action = createAssistantExecutor({ db, catalog: createActionCatalog([actionDef]), effects: { invalidate: handler } });

    const pending = await action.dispatchAction(caller(), { actionId: actionDef.id, requestId: randomUUID(), input: {} });

    if (pending.kind !== "pending") throw new Error("expected review intent");

    const receipt = await action.confirmIntent(actor(), pending.intent.id);

    expect(receipt.effectsStatus).toBe("failed");

    const replay = await action.reconcileEffects(caller(), pending.intent.id);

    expect(replay.id).toBe(receipt.id);
    expect(await db.assistantReceipt.count({ where: { intentId: pending.intent.id } })).toBe(1);
    expect(await db.campaign.findUniqueOrThrow({ where: { id: fixture.campaignId } })).toMatchObject({ maxLevel: 21 });
    expect(handlerCalls).toBe(2);
    expect(delivered).toEqual(new Set([effect.key]));
    expect(replay.effectsStatus).toBe("complete");
  });
  it.each([404, 409])("fresh prepare %i persists stale without a partial domain write", async status => {
    const original = CAMPAIGN_ACTIONS.find(action => action.id === "campaign.settings");

    if (!original || original.effect !== "write") throw new Error("campaign.settings missing");

    let stale = false;

    const action = executor([{ ...original, prepare: async (who: AssistantCaller, input: unknown) => {
      if (stale) throw new ContentError("Synthetic stale preview", status);

      return original.prepare(who, input);
    } }]);

    const pending = await action.dispatchAction(caller(), { actionId: original.id, requestId: randomUUID(), input: { patch: { description: "must not apply" } } });

    if (pending.kind !== "pending") throw new Error("expected review");

    stale = true;
    await expect(action.confirmIntent(actor(), pending.intent.id)).rejects.toMatchObject({ status: 409 });
    expect(await db.assistantIntent.findUniqueOrThrow({ where: { id: pending.intent.id } })).toMatchObject({ status: "stale" });
    expect(await db.assistantReceipt.count({ where: { intentId: pending.intent.id } })).toBe(0);
    expect(await db.campaign.findUniqueOrThrow({ where: { id: fixture.campaignId } })).toMatchObject({ description: null, maxLevel: 20 });
  });

  it.each(["result", "unknown"] as const)("durable external %s survives executor recreation without repeating payment", async phase => {
    let externalCalls = 0;

    let failFinalize = true;

    const actionDef: import("@/lib/server/assistant/types").AssistantWriteAction = {
      id: "campaign.integration-paid", title: "Synthetic paid", description: "No network; owned fixture only", input: z.object({}),
      need: { access: "dm", scope: "campaign:write" }, effect: "paid", confirmation: "always",
      prepare: async () => ({ summary: "Paid fixture", targets: [], changes: [], warnings: [], effects: [], preconditions: null }),
      external: async (_who, _input, signal) => {
        externalCalls++;
        expect(currentContentWrite()).toBeUndefined();
        expect(signal?.aborted).toBe(false);
        expect(await db.assistantReceipt.findFirstOrThrow({ where: { campaignId: fixture.campaignId, actionId: "campaign.integration-paid" } })).toMatchObject({ status: "unknown", result: null, effects: { external: { phase: "started" } } });

        if (phase === "unknown") throw new Error("UNKNOWN_PROVIDER_OUTCOME");

        return null;
      },
      execute: async ctx => {
        if (failFinalize) throw new Error("CRASH_AFTER_EXTERNAL_RESULT");

        expect(ctx.externalResult).toBeNull();
        await ctx.db.campaign.update({ where: { id: fixture.campaignId }, data: { maxLevel: { increment: 1 } } });

        return { data: ctx.externalResult ?? null, affected: [], warnings: [] };
      },
    };

    const engine = () => executor([actionDef]);

    const request = { actionId: actionDef.id, requestId: randomUUID(), input: {} };

    const pending = await engine().dispatchAction({ ...caller(), runId: randomUUID() }, request);

    if (pending.kind !== "pending") throw new Error("expected paid review");

    if (phase === "result") {
      await expect(engine().confirmIntent(actor(), pending.intent.id)).rejects.toThrow("CRASH_AFTER_EXTERNAL_RESULT");
      expect(await db.assistantReceipt.findUniqueOrThrow({ where: { intentId: pending.intent.id } })).toMatchObject({ status: "executing", effects: { external: { phase: "result", result: null } } });
      expect(await db.campaign.findUniqueOrThrow({ where: { id: fixture.campaignId } })).toMatchObject({ maxLevel: 20 });
      failFinalize = false;
      expect(await engine().confirmIntent(actor(), pending.intent.id)).toMatchObject({ status: "applied", result: { data: null } });
      expect(await engine().dispatchAction({ ...caller(), runId: randomUUID() }, request)).toMatchObject({ kind: "result", result: { data: null } });
    } else {
      expect(await engine().confirmIntent(actor(), pending.intent.id)).toMatchObject({ status: "unknown", result: null, effectsStatus: "unknown" });
      expect(await engine().confirmIntent(actor(), pending.intent.id)).toMatchObject({ status: "unknown", result: null });
      await expect(engine().dispatchAction({ ...caller(), runId: randomUUID() }, request)).rejects.toMatchObject({ status: 409 });
    }

    expect(await engine().reconcileEffects(caller(), pending.intent.id)).toMatchObject({ status: phase === "result" ? "applied" : "unknown" });
    expect(externalCalls).toBe(1);
    expect(await db.assistantReceipt.count({ where: { intentId: pending.intent.id } })).toBe(1);
    expect(await db.campaign.findUniqueOrThrow({ where: { id: fixture.campaignId } })).toMatchObject({ maxLevel: phase === "result" ? 21 : 20 });
  });

  it("legacy pending intent and receipt JSON remain readable after payload redaction", async () => {
    const original = CAMPAIGN_ACTIONS.find(action => action.id === "campaign.settings");

    if (!original || original.effect !== "write") throw new Error("campaign.settings missing");

    const payload = { patch: { description: "legacy pending" } };

    const preview = await original.prepare(caller(), payload);

    // Seed the persisted pre-extraction format directly, without dispatch/new envelope builders.
    const intent = await db.assistantIntent.create({ data: {
      campaignId: fixture.campaignId, userId: fixture.userId, channel: "chat", threadId: fixture.threadId, originThreadId: fixture.threadId,
      originKey: "legacy-fixture", requestId: randomUUID(), requestHash: "legacy-hash", actionId: original.id,
      summary: preview.summary, targets: [], payload, preview: JSON.parse(JSON.stringify(preview)), expected: JSON.parse(JSON.stringify(preview.preconditions)),
      status: "pending", expiresAt: new Date(Date.now() + 900_000),
    } });

    const receipt = await executor().confirmIntent(actor(), intent.id);

    expect(receipt.status).toBe("applied");
    expect(await db.assistantReceipt.findUniqueOrThrow({ where: { intentId: intent.id } })).toMatchObject({ effects: { items: [], completed: [] } });
    await db.assistantReceipt.update({ where: { intentId: intent.id }, data: { effects: { items: [], completed: [] } } });
    await db.assistantIntent.update({ where: { id: intent.id }, data: { payload: Prisma.JsonNull, preview: Prisma.JsonNull, expected: Prisma.JsonNull, redactedAt: new Date() } });
    expect(await readReceipt(caller(), intent.id, db)).toEqual(receipt);
    expect(await executor().confirmIntent(actor(), intent.id)).toEqual(receipt);
    expect(await executor().reconcileEffects(caller(), intent.id)).toEqual(receipt);
    expect(await db.assistantReceipt.count({ where: { intentId: intent.id } })).toBe(1);
    expect(await db.campaign.findUniqueOrThrow({ where: { id: fixture.campaignId } })).toMatchObject({ description: "legacy pending" });
  });

  it("throwing after-commit callback leaves the SQL domain write applied and never replays it", async () => {
    const original = CAMPAIGN_ACTIONS.find(action => action.id === "campaign.settings");

    if (!original || original.effect !== "write") throw new Error("campaign.settings missing");

    let callbackCalls = 0;

    const action = executor([{ ...original, execute: async (ctx: ActionExecutionContext, input: unknown) => {
      const result = await original.execute(ctx, input);

      await ctx.db.campaign.update({ where: { id: fixture.campaignId }, data: { maxLevel: { increment: 1 } } });
      afterContentCommit(() => { callbackCalls++; throw new Error("AFTER_COMMIT_FAILURE"); });

      return result;
    } }]);

    const pending = await action.dispatchAction(caller(), { actionId: original.id, requestId: randomUUID(), input: { patch: { description: "committed" } } });

    if (pending.kind !== "pending") throw new Error("expected review");

    const receipt = await action.confirmIntent(actor(), pending.intent.id);

    expect(receipt).toMatchObject({ status: "applied", effectsStatus: "unknown" });
    expect(await action.confirmIntent(actor(), pending.intent.id)).toEqual(receipt);
    expect(await action.reconcileEffects(caller(), pending.intent.id)).toEqual(receipt);
    expect(callbackCalls).toBe(1);
    expect(await db.campaign.findUniqueOrThrow({ where: { id: fixture.campaignId } })).toMatchObject({ description: "committed", maxLevel: 21 });
  });

});
