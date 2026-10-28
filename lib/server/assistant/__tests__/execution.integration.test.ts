import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createSyntheticCampaign, deleteSyntheticCampaign } from "@/fixtures/campaign.synthetic";
import { CAMPAIGN_ACTIONS } from "@/lib/server/assistant/actions/campaign";
import { CHARACTER_ACTIONS } from "@/lib/server/assistant/actions/characters";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import { readDeletionReceipt } from "@/lib/server/assistant/receipts";
import { assertConstructorDatabaseUrls } from "@/lib/server/assistant/test-support";
import type { AssistantCaller, DurableEffect } from "@/lib/server/assistant/types";

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

assertConstructorDatabaseUrls({ DATABASE_URL: process.env.DATABASE_URL, DIRECT_URL: process.env.DIRECT_URL });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("ASSISTANT_TEST_REQUIRES_LOCAL_CONSTRUCTOR");

const url = new URL(databaseUrl);

const directUrl = process.env.DIRECT_URL;

if (!directUrl) throw new Error("ASSISTANT_TEST_REQUIRES_LOCAL_CONSTRUCTOR");

const direct = new URL(directUrl);

url.searchParams.set("connection_limit", "1");
direct.searchParams.set("connection_limit", "1");
process.env.DATABASE_URL = url.toString();
process.env.DIRECT_URL = direct.toString();

const db = new PrismaClient({ datasources: { db: { url: url.toString() } }, log: [] });

database.client = db;

const runId = process.env.ASSISTANT_CHECK_RUN_ID ?? `t19-${randomUUID()}`;

let fixture: Awaited<ReturnType<typeof createSyntheticCampaign>>;

const fixtures: Awaited<ReturnType<typeof createSyntheticCampaign>>[] = [];

let srds: { spells: number; units: number; artifacts: number };

const actor = () => ({ campaignId: fixture.campaignId, userId: fixture.userId, isDM: true, via: "session", scopes: null } as const);

const caller = (): AssistantCaller => ({ actor: actor(), channel: "chat", threadId: fixture.threadId, tokenId: null });

const executor = (actions: readonly import("@/lib/server/assistant/types").AssistantActionDef[] = CAMPAIGN_ACTIONS) => createAssistantExecutor({ db, catalog: createActionCatalog(actions) });

describe("T19 local constructor execution integration (connection_limit=1)", () => {
  beforeAll(async () => {
    const counts = await Promise.all([
      db.spell.count(),
      db.unit.count(),
      db.artifact.count(),
    ]);

    srds = { spells: counts[0], units: counts[1], artifacts: counts[2] };
  });

  beforeEach(async () => {
    fixture = await createSyntheticCampaign(db, runId);
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
    const action = executor();

    const pending = await action.dispatchAction(caller(), { actionId: "campaign.settings", requestId: randomUUID(), input: { patch: { description: "once" } } });

    if (pending.kind !== "pending") throw new Error("expected review intent");

    const receipts = await Promise.all([action.confirmIntent(actor(), pending.intent.id), action.confirmIntent(actor(), pending.intent.id)]);

    expect(receipts[0].id).toBe(receipts[1].id);
    expect(await db.assistantReceipt.count({ where: { intentId: pending.intent.id } })).toBe(1);
    expect(await db.campaign.findUniqueOrThrow({ where: { id: fixture.campaignId } })).toMatchObject({ description: "once" });
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
});
