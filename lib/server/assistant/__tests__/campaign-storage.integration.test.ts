import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CAMPAIGN_ACTIONS } from "@/lib/server/assistant/actions/campaign";
import { authorizeAssistant } from "@/lib/server/assistant/authorize";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import { readDeletionReceipt } from "@/lib/server/assistant/receipts";
import type { AssistantCaller } from "@/lib/server/assistant/types";
import { runCampaignOperation } from "@/lib/server/campaigns/action-service";
vi.mock("@/lib/cache/campaign-list", () => ({ invalidateCampaignLists: vi.fn() }));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference: vi.fn(), ReferenceKind: { RACES: "races" } }));

// Route helpers and the injected executor use the SAME one-connection client.
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

function localUrl(name: string) {
  const url = new URL(process.env[name] ?? "");

  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.port !== "54322" || url.pathname !== "/constructor") throw new Error("ASSISTANT_TEST_REQUIRES_LOCAL_CONSTRUCTOR");

  url.searchParams.set("connection_limit", "1");

  return url.toString();
}

const databaseUrl = localUrl("DATABASE_URL");

localUrl("DIRECT_URL");

const db = new PrismaClient({ datasources: { db: { url: databaseUrl } }, log: [] });

database.client = db;

const marker = `stage6-campaign-${randomUUID()}`;

const userId = marker;

let campaignId: string;

let threadId: string;

const ownedIds = new Set<string>();

const actor = () => ({ campaignId, userId, isDM: true, via: "session", scopes: null } as const);

const caller = (): AssistantCaller => ({ actor: actor(), channel: "chat", threadId, tokenId: null });

const executor = () => createAssistantExecutor({ db, catalog: createActionCatalog(CAMPAIGN_ACTIONS) });

describe("campaign lifecycle real constructor, connection_limit=1", () => {
  beforeAll(async () => {
    await db.user.create({ data: { id: userId, email: `${marker}@example.invalid`, displayName: marker } });
  });
  beforeEach(async () => {
    const campaign = await db.campaign.create({ data: { name: marker, dmUserId: userId, inviteCode: randomUUID(), members: { create: { userId, role: "dm" } } } });

    campaignId = campaign.id;
    ownedIds.add(campaignId);

    const thread = await db.aiThread.create({ data: { campaignId, userId, title: marker, provider: "anthropic", model: "synthetic", mode: "scenario" } });

    threadId = thread.id;
  });
  afterAll(async () => {
    // Discover owned clones even if an assertion failed immediately after creation.
    const rows = await db.campaign.findMany({ where: { dmUserId: userId }, select: { id: true, name: true, dmUserId: true, members: { select: { userId: true, role: true } } } });

    for (const row of rows) {
      if (row.name !== marker || row.dmUserId !== userId || row.members.length !== 1 || row.members[0].userId !== userId || row.members[0].role !== "dm") throw new Error("FIXTURE_OWNERSHIP_MISMATCH");

      ownedIds.add(row.id);
      await db.campaign.delete({ where: { id: row.id } });
    }
    await db.assistantReceipt.deleteMany({ where: { userId, campaignId: { in: [...ownedIds] } } });

    const user = await db.user.findUnique({ where: { id: userId }, select: { displayName: true, email: true, campaignMembers: { select: { id: true } }, dmCampaigns: { select: { id: true } } } });

    if (user) {
      if (user.displayName !== marker || user.email !== `${marker}@example.invalid` || user.campaignMembers.length || user.dmCampaigns.length) throw new Error("FIXTURE_USER_MISMATCH");

      await db.user.delete({ where: { id: userId } });
    }

    expect(await db.campaign.count({ where: { id: { in: [...ownedIds] } } })).toBe(0);
    await db.$disconnect();
  });
  it("settingsConcurrentEditStale after shared HTTP settings writer", async () => {
    const prepared = await executor().dispatchAction(caller(), { actionId: "campaign.settings", requestId: randomUUID(), input: { patch: { description: "Моя" } } });

    if (prepared.kind !== "pending") throw new Error("review required");

    await runCampaignOperation(actor(), "settings", { patch: { description: "Чужа" } });
    await expect(executor().confirmIntent(actor(), prepared.intent.id)).rejects.toMatchObject({ status: 409 });
    expect((await db.campaign.findUniqueOrThrow({ where: { id: campaignId } })).description).toBe("Чужа");
  });
  it("cloneDoesNotGrantTokenNewScope and inviteNeverInToolOutput", async () => {
    const token = await db.apiToken.create({ data: { campaignId, userId, name: marker, prefix: "synthetic", tokenHash: randomUUID(), scopes: ["campaign:write", "campaign:read"] } });

    const tokenCaller: AssistantCaller = { actor: { ...actor(), via: "token", scopes: ["campaign:write", "campaign:read"] }, channel: "mcp", threadId: null, tokenId: token.id };

    const prepared = await executor().dispatchAction(tokenCaller, { actionId: "campaign.clone", requestId: randomUUID(), input: { name: marker } });

    if (prepared.kind !== "pending") throw new Error("session review required");

    const receipt = await executor().confirmIntent(actor(), prepared.intent.id);

    const data = receipt.result?.data as { id: string; href: string };

    ownedIds.add(data.id);
    expect(JSON.stringify(receipt)).not.toContain("inviteCode");
    expect(await db.apiToken.count({ where: { campaignId: data.id } })).toBe(0);
    expect((await db.apiToken.findUniqueOrThrow({ where: { id: token.id } })).campaignId).toBe(campaignId);
    await expect(authorizeAssistant({ ...tokenCaller, actor: { ...tokenCaller.actor, campaignId: data.id } }, { access: "dm", scope: "campaign:read" }, "execute", db)).rejects.toMatchObject({ status: 403 });
  });
  it("deleteCampaignReceiptSurvivesCascade", async () => {
    const prepared = await executor().dispatchAction(caller(), { actionId: "campaign.delete", requestId: randomUUID(), input: {} });

    if (prepared.kind !== "pending") throw new Error("human review required");

    const receipt = await executor().confirmIntent(actor(), prepared.intent.id);

    expect(receipt.status).toBe("applied");
    expect(await db.campaign.count({ where: { id: campaignId } })).toBe(0);
    expect(await db.assistantIntent.count({ where: { id: prepared.intent.id } })).toBe(0);
    expect(await readDeletionReceipt(userId, campaignId, prepared.intent.id, db)).toEqual({ id: receipt.id, status: "applied", deleted: true });
    await expect(readDeletionReceipt("foreign", campaignId, prepared.intent.id, db)).rejects.toMatchObject({ status: 404 });
  });
  it("new cascade targets make campaign deletion stale", async () => {
    const prepared = await executor().dispatchAction(caller(), { actionId: "campaign.delete", requestId: randomUUID(), input: {} });

    if (prepared.kind !== "pending") throw new Error("human review required");

    await db.scenarioPage.create({ data: { campaignId, title: marker, kind: "scene", content: { legend: [], sections: [] } } });
    await expect(executor().confirmIntent(actor(), prepared.intent.id)).rejects.toMatchObject({ status: 409 });
    expect(await db.campaign.count({ where: { id: campaignId } })).toBe(1);
  });
});
