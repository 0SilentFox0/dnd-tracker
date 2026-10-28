import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { applyProposal, rejectProposal } from "@/lib/ai/proposals";
import { SCENARIO_ACTIONS } from "@/lib/server/assistant/actions/scenario";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import { linkLegacyProposal } from "@/lib/server/assistant/legacy-proposals";
import type { AssistantCaller } from "@/lib/server/assistant/types";
import { runScenarioOperation } from "@/lib/server/scenario/action-service";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";
import { resolveAiOps } from "@/lib/utils/scenario/ai-ops";

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

const localUrl = (name: "DATABASE_URL" | "DIRECT_URL") => singleConnectionDatabaseUrl(name);

const databaseUrl = localUrl("DATABASE_URL");

localUrl("DIRECT_URL");

const db = new PrismaClient({ datasources: { db: { url: databaseUrl } }, log: [] });

database.client = db;

const marker = `stage6-scenario-${randomUUID()}`;

const userId = marker;

let campaignId: string;

let threadId: string;

let ready = false;

const actor = () => ({ campaignId, userId, isDM: true, via: "session", scopes: null } as const);

const caller = (): AssistantCaller => ({ actor: actor(), channel: "chat", tokenId: null, threadId });

describe.skipIf(!isLocalDevDatabaseEnv())("scenario adapters real constructor, connection_limit=1", () => {
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
  });

  const executor = () => createAssistantExecutor({ db, catalog: createActionCatalog(SCENARIO_ACTIONS) });

  const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

  const content = { legend: [], sections: [{ id: "s", title: "Сцена", played: false, rows: [{ id: "r", story: doc("Історія"), notes: doc("Секрет") }] }] };

  async function page() {
    return db.scenarioPage.create({ data: { campaignId, title: marker, kind: "scene", content } });
  }

  it("forceSnapshotBeforeAiWrite and notesSearchAndBindingsPreserved", async () => {
    const p = await page();

    await db.scenarioPageVersion.create({ data: { pageId: p.id, content, createdBy: userId } });

    const prepared = await executor().dispatchAction(caller(), { actionId: "scenario.save", requestId: randomUUID(), input: { id: p.id, content: { ...content, sections: [{ ...content.sections[0], title: "Оновлена" }] } } });

    if (prepared.kind !== "pending") throw new Error("review required");

    await executor().confirmIntent(actor(), prepared.intent.id);
    expect(await db.scenarioPageVersion.count({ where: { pageId: p.id } })).toBe(2);

    const row = await db.scenarioPage.findUniqueOrThrow({ where: { id: p.id } });

    expect(row.version).toBe(p.version + 1);
    expect(row.searchText).toContain("Секрет");
    expect((row.content as typeof content).sections[0].rows[0].notes).toEqual(content.sections[0].rows[0].notes);
  });
  it("metadataChangeMakesPreviewStale via the shared metadata writer", async () => {
    const p = await page();

    const prepared = await executor().dispatchAction(caller(), { actionId: "scenario.save", requestId: randomUUID(), input: { id: p.id, content } });

    if (prepared.kind !== "pending") throw new Error("review required");

    await runScenarioOperation(actor(), "meta", { id: p.id, patch: { subtitle: "Інша" } });
    await expect(executor().confirmIntent(actor(), prepared.intent.id)).rejects.toMatchObject({ status: 409 });
    expect(await db.scenarioPageVersion.count({ where: { pageId: p.id } })).toBe(0);
  });
  it("legacyApplyAndConfirmRaceOnlyOneWrite", async () => {
    const p = await page();

    const resolved = resolveAiOps(content as never, [{ op: "replaceRow", sectionId: "s", rowId: "r", story: "Нова історія" }]);

    if (!resolved.ok) throw new Error("invalid fixture");

    const proposal = await db.aiProposal.create({ data: { campaignId, threadId, pageId: p.id, summary: "Правка", ops: resolved.ops as never } });

    const intent = await linkLegacyProposal(caller(), proposal.id);

    expect((await linkLegacyProposal(caller(), proposal.id)).id).toBe(intent.id);
    await Promise.all([applyProposal(campaignId, userId, proposal.id), executor().confirmIntent(actor(), intent.id)]);
    expect((await db.scenarioPage.findUniqueOrThrow({ where: { id: p.id } })).version).toBe(p.version + 1);
    expect(await db.assistantReceipt.count({ where: { intentId: intent.id } })).toBe(1);
    expect(await db.scenarioPageVersion.count({ where: { pageId: p.id } })).toBe(1);
  });
  it("resetting played progress is human-only even in auto", async () => {
    const p = await page();

    await db.scenarioPage.update({ where: { id: p.id }, data: { content: { ...content, sections: [{ ...content.sections[0], played: true }] } } });
    await db.aiThread.update({ where: { id: threadId }, data: { executionMode: "auto" } });

    const prepared = await executor().dispatchAction(caller(), { actionId: "scenario.section.patch", requestId: randomUUID(), input: { id: p.id, sectionId: "s", played: false } });

    expect(prepared.kind).toBe("pending");

    const current = await db.scenarioPage.findUniqueOrThrow({ where: { id: p.id } });

    expect((current.content as typeof content).sections[0].played).toBe(true);
  });

  it("legacy stale and rejection statuses reconcile atomically", async () => {
    const p = await page();

    const resolved = resolveAiOps(content as never, [{ op: "replaceRow", sectionId: "s", rowId: "r", story: "Оновлена" }]);

    if (!resolved.ok) throw new Error("invalid fixture");

    const proposal = await db.aiProposal.create({ data: { campaignId, threadId, pageId: p.id, summary: "Правка", ops: resolved.ops as never } });

    const intent = await linkLegacyProposal(caller(), proposal.id);

    await runScenarioOperation(actor(), "meta", { id: p.id, patch: { subtitle: "Змінена" } });
    await expect(executor().confirmIntent(actor(), intent.id)).rejects.toMatchObject({ status: 409 });
    expect((await db.aiProposal.findUniqueOrThrow({ where: { id: proposal.id } })).status).toBe("stale");
    await executor().rejectIntent(caller(), intent.id);
    expect((await db.aiProposal.findUniqueOrThrow({ where: { id: proposal.id } })).status).toBe("rejected");

    const second = await db.aiProposal.create({ data: { campaignId, threadId, pageId: p.id, summary: "Друга", ops: resolved.ops as never } });

    const linked = await linkLegacyProposal(caller(), second.id);

    await rejectProposal(campaignId, second.id);
    expect((await db.assistantIntent.findUniqueOrThrow({ where: { id: linked.id } })).status).toBe("rejected");
    expect(await db.scenarioPageVersion.count({ where: { pageId: p.id } })).toBe(0);
  });

  it("T14 legacy chat alias stages canonical intent; one T6 apply and receipt on confirm", async () => {
    const { runTool } = await import("@/lib/ai/tools/define");

    const { proposeScenarioEditTool } = await import("@/lib/ai/tools/propose");

    const p = await page();

    const ctx = { campaignId, userId, threadId, scopes: ["scenario:write"] as const, caller: caller() };

    const out = JSON.parse(await runTool(proposeScenarioEditTool, ctx, { pageId: p.id, summary: "T14 edit", ops: [{ op: "renameSection", sectionId: "s", title: "T14" }] }));

    expect(out).toMatchObject({ version: 2, kind: "result", data: { kind: "pending", intent: { actionId: "scenario.propose-edit" } } });
    expect(await db.aiProposal.count({ where: { pageId: p.id } })).toBe(0);
    expect((await db.scenarioPage.findUniqueOrThrow({ where: { id: p.id } })).version).toBe(p.version);

    const engine = createAssistantExecutor({ db });

    const receipt = await engine.confirmIntent(actor(), out.data.intent.id);

    expect(receipt.status).toBe("applied");
    expect(await engine.confirmIntent(actor(), out.data.intent.id)).toEqual(receipt);
    expect(await db.aiProposal.count({ where: { pageId: p.id, status: "applied" } })).toBe(1);
    expect(await db.scenarioPageVersion.count({ where: { pageId: p.id } })).toBe(1);
    expect((await db.scenarioPage.findUniqueOrThrow({ where: { id: p.id } })).version).toBe(p.version + 1);
  });

});
