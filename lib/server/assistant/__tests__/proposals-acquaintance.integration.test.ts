import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { makeT } from "@/lib/i18n/test/mock-t";
import { applyProposal } from "@/lib/server/assistant/proposals";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";
import { resolveAiOps } from "@/lib/utils/scenario/ai-ops";

const database = vi.hoisted(() => ({ client: undefined as PrismaClient | undefined, failCreate: false }));

vi.mock("@/lib/db", async () => {
  const { createScopedDatabase } = await import("@/lib/server/content/write-context");

  const base = new Proxy({} as PrismaClient, { get(_target, property) {
    if (!database.client) throw new Error("FIXTURE_DATABASE_NOT_READY");

    const value = Reflect.get(database.client, property);

    return typeof value === "function" ? value.bind(database.client) : value;
  } });

  return { prisma: createScopedDatabase(base) };
});

vi.mock("@/lib/server/acquaintances/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/acquaintances/service")>();

  return {
    ...actual,
    createAcquaintance: async (...args: Parameters<typeof actual.createAcquaintance>) => {
      const row = await actual.createAcquaintance(...args);

      if (database.failCreate) throw new Error("forced failure after insert");

      return row;
    },
  };
});

const db = new PrismaClient({ datasources: { db: { url: singleConnectionDatabaseUrl("DATABASE_URL") } }, log: [] });

database.client = db;

const marker = `ai-acq-${randomUUID()}`;

const userId = marker;

let campaignId: string;

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

const content = () => ({ legend: [], sections: [{ id: "s", title: "Бал", played: false, rows: [{ id: "r", story: doc("Беатріс танцює, дай Беатрісі ключ"), notes: doc("") }] }] });

const proposalFor = async (pageId: string, name = "Беатріс") => {
  const resolved = resolveAiOps(content() as never, [{ op: "createAcquaintance", ref: "b", name }, { op: "linkMentions", acquaintance: { ref: "b" }, forms: ["Беатріс", "Беатрісі"] }], makeT("assistant"));

  if (!resolved.ok) throw new Error("fixture");

  return db.aiProposal.create({ data: { campaignId, pageId, summary: "Беатріс", ops: resolved.ops as never } });
};

const newPage = () => db.scenarioPage.create({ data: { campaignId, title: marker, kind: "scene", content: content() } });

describe.skipIf(!isLocalDevDatabaseEnv())("applyProposal createAcquaintance (local DB, connection_limit=1)", () => {
  beforeAll(async () => {
    await db.user.create({ data: { id: userId, email: `${marker}@example.invalid`, displayName: marker } });

    const campaign = await db.campaign.create({ data: { name: marker, dmUserId: userId, inviteCode: randomUUID(), maxLevel: 10, acquaintancesEnabled: true, members: { create: { userId, role: "dm" } } } });

    campaignId = campaign.id;
  });

  beforeEach(async () => {
    database.failCreate = false;
    await db.campaign.update({ where: { id: campaignId }, data: { acquaintancesEnabled: true } });
    await db.acquaintance.deleteMany({ where: { campaignId } });
  });

  afterAll(async () => {
    if (campaignId) await db.campaign.delete({ where: { id: campaignId } });

    await db.user.deleteMany({ where: { id: userId, displayName: marker } });
    await db.$disconnect();
  });

  it("creates the acquaintance and chips with its real id in one apply, then re-apply is rejected", async () => {
    const page = await newPage();

    const proposal = await proposalFor(page.id);

    const res = await applyProposal(campaignId, userId, proposal.id);

    expect(res.ok).toBe(true);

    const [acq] = await db.acquaintance.findMany({ where: { campaignId } });

    expect(acq).toMatchObject({ kind: "micro", name: "Беатріс", sourcePageId: page.id, sourceSectionId: "s" });

    const stored = await db.scenarioPage.findUniqueOrThrow({ where: { id: page.id } });

    const json = JSON.stringify(stored.content);

    expect(json).toContain(acq.id);
    expect(json).not.toContain("@ref:");
    expect(stored.version).toBe(page.version + 1);
    expect((await db.aiProposal.findUniqueOrThrow({ where: { id: proposal.id } })).status).toBe("applied");
    expect(await applyProposal(campaignId, userId, proposal.id)).toMatchObject({ ok: false, status: 409, error: API_ERRORS.AI_PROPOSAL_DONE });
  });

  it("a stale second proposal over the same text creates nothing", async () => {
    const page = await newPage();

    const first = await proposalFor(page.id);

    const second = await proposalFor(page.id, "Інша");

    await applyProposal(campaignId, userId, first.id);

    expect(await applyProposal(campaignId, userId, second.id)).toMatchObject({ ok: false, error: API_ERRORS.AI_PROPOSAL_STALE });
    expect(await db.acquaintance.count({ where: { campaignId } })).toBe(1);
    expect((await db.aiProposal.findUniqueOrThrow({ where: { id: second.id } })).status).toBe("stale");
  });

  it("failure after the insert rolls back acquaintance, page and proposal", async () => {
    const page = await newPage();

    const proposal = await proposalFor(page.id);

    database.failCreate = true;
    await expect(applyProposal(campaignId, userId, proposal.id)).rejects.toThrow("forced failure");
    expect(await db.acquaintance.count({ where: { campaignId } })).toBe(0);

    const stored = await db.scenarioPage.findUniqueOrThrow({ where: { id: page.id } });

    expect(stored.version).toBe(page.version);
    expect(stored.content).toEqual(content());
    expect((await db.aiProposal.findUniqueOrThrow({ where: { id: proposal.id } })).status).toBe("pending");
  });

  it("same name (any case) reuses the existing acquaintance", async () => {
    const page = await newPage();

    const existing = await db.acquaintance.create({ data: { campaignId, kind: "micro", name: "БЕАТРІС", sourcePageId: page.id, sourceSectionId: "s" } });

    const proposal = await proposalFor(page.id);

    expect((await applyProposal(campaignId, userId, proposal.id)).ok).toBe(true);
    expect(await db.acquaintance.count({ where: { campaignId } })).toBe(1);
    expect(JSON.stringify((await db.scenarioPage.findUniqueOrThrow({ where: { id: page.id } })).content)).toContain(existing.id);
  });

  it("acquaintances disabled -> ACQUAINTANCES_DISABLED, nothing changes", async () => {
    await db.campaign.update({ where: { id: campaignId }, data: { acquaintancesEnabled: false } });

    const page = await newPage();

    const proposal = await proposalFor(page.id);

    expect(await applyProposal(campaignId, userId, proposal.id)).toMatchObject({ ok: false, error: API_ERRORS.ACQUAINTANCES_DISABLED });
    expect(await db.acquaintance.count({ where: { campaignId } })).toBe(0);
    expect((await db.scenarioPage.findUniqueOrThrow({ where: { id: page.id } })).version).toBe(page.version);
    expect((await db.aiProposal.findUniqueOrThrow({ where: { id: proposal.id } })).status).toBe("pending");
  });
});
