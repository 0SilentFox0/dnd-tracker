import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const localDb = await vi.hoisted(async () => {
  const { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } = await import("@/lib/server/test-support/local-db");

  if (!isLocalDevDatabaseEnv()) return false;

  for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) process.env[key] = singleConnectionDatabaseUrl(key);

  return true;
});

import { loadScenarioIndex, upsertPageFacts } from "../index-store";

import { prisma } from "@/lib/db";
import { createCampaignFromBundle } from "@/lib/server/campaigns/create-campaign";
import type { PageFacts, ScenarioContent } from "@/types/scenario";

const userId = randomUUID();

let campaignId: string;

let otherCampaignId: string;

const chip = (type: string, id: string, label: string) => ({ type: "mention", attrs: { type, id, label } });

const doc = (...nodes: object[]) => ({ type: "doc", content: [{ type: "paragraph", content: nodes }] });

const content = (...nodes: object[]): ScenarioContent =>
  ({ legend: [], sections: [{ id: "s1", title: "Scene", played: false, rows: [{ id: "r1", story: doc(...nodes), notes: { type: "doc", content: [] } }] }] }) as ScenarioContent;

const createPage = (title: string, json: unknown, campaign = campaignId) =>
  prisma.scenarioPage.create({ data: { campaignId: campaign, kind: "scene", title, content: json as object, version: 1 } });

const createAcquaintance = (name: string, pageId: string) =>
  prisma.acquaintance.create({ data: { campaignId, kind: "npc", name, sourcePageId: pageId, sourceSectionId: "s1" } });

const cachedRow = (pageId: string) => prisma.scenarioPageIndex.findUnique({ where: { pageId } });

const sentinel = (id: string): PageFacts => ({ sections: [{ id: "s1", title: "Cached", played: false, refs: [{ type: "unit", id, label: "Sentinel", count: 1, secret: false }] }] });

describe.skipIf(!localDb)("loadScenarioIndex", () => {
  beforeAll(async () => {
    await prisma.user.create({ data: { id: userId, email: `${userId}@scenario-index.example.test`, displayName: "Index DM" } });
    campaignId = (await createCampaignFromBundle({ userId, name: `Scenario index ${userId}`, bundle: null })).campaign.id;
    otherCampaignId = (await createCampaignFromBundle({ userId, name: `Scenario index other ${userId}`, bundle: null })).campaign.id;
  });

  afterAll(async () => {
    await prisma.campaign.deleteMany({ where: { id: { in: [campaignId, otherCampaignId] }, dmUserId: userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("returns an empty index for a campaign without pages", async () => {
    const index = await loadScenarioIndex(campaignId);

    expect(index.counts).toEqual({ scenes: 0, entities: 0, edges: 0, byType: {}, missing: 0 });
  });

  it("indexes a page without chips as a scene only", async () => {
    const page = await createPage("Plain", content());

    const index = await loadScenarioIndex(campaignId);

    expect(index.scenes.map((s) => s.id)).toContain(page.id);
    expect(index.edges.filter((e) => e.sceneId === page.id)).toEqual([]);
  });

  it("resolves live entities and flags deleted ones as missing", async () => {
    const page = await createPage("Chips", content());

    const live = await createAcquaintance("Live Npc", page.id);

    const gone = await createAcquaintance("Gone Npc", page.id);

    await prisma.scenarioPage.update({ where: { id: page.id }, data: { version: 2, content: content(chip("acquaintance", live.id, "Chip"), chip("acquaintance", gone.id, "Old Label")) as object } });
    await prisma.acquaintance.delete({ where: { id: gone.id } });

    const index = await loadScenarioIndex(campaignId);

    const byId = Object.fromEntries(index.entities.map((e) => [e.id, e]));

    expect(byId[live.id]).toMatchObject({ label: "Live Npc", missing: false });
    expect(byId[gone.id]).toMatchObject({ label: "Old Label", missing: true });
  });

  it("caches facts at the page version and reuses them until the version changes", async () => {
    const page = await createPage("Cache", content());

    await loadScenarioIndex(campaignId);
    expect((await cachedRow(page.id))?.version).toBe(1);

    await prisma.scenarioPageIndex.update({ where: { pageId: page.id }, data: { facts: sentinel("sentinel-1") as object } });
    expect((await loadScenarioIndex(campaignId)).entities.map((e) => e.id)).toContain("sentinel-1");

    await prisma.scenarioPage.update({ where: { id: page.id }, data: { version: 2 } });
    expect((await loadScenarioIndex(campaignId)).entities.map((e) => e.id)).not.toContain("sentinel-1");
    expect((await cachedRow(page.id))?.version).toBe(2);
  });

  it("rebuilds corrupt cached facts", async () => {
    const page = await createPage("Corrupt cache", content());

    await loadScenarioIndex(campaignId);
    await prisma.scenarioPageIndex.update({ where: { pageId: page.id }, data: { facts: { sections: "nope" } } });
    await loadScenarioIndex(campaignId);

    expect((await cachedRow(page.id))?.facts).toEqual({ sections: [{ id: "s1", title: "Scene", played: false, refs: [] }] });
  });

  it("tolerates corrupt page content", async () => {
    const page = await createPage("Corrupt content", { sections: "nope" });

    const index = await loadScenarioIndex(campaignId);

    expect(index.scenes.find((s) => s.id === page.id)?.sections).toEqual([]);
  });

  it("removes the index row with the page and ignores other campaigns", async () => {
    const page = await createPage("Doomed", content());

    const foreign = await createPage("Foreign", content(), otherCampaignId);

    await loadScenarioIndex(campaignId);
    await prisma.scenarioPage.delete({ where: { id: page.id } });

    expect(await cachedRow(page.id)).toBeNull();
    expect((await loadScenarioIndex(campaignId)).scenes.map((s) => s.id)).not.toContain(foreign.id);
  });

  it("does not let an older build overwrite newer facts", async () => {
    const page = await createPage("Race", content());

    await upsertPageFacts(page.id, campaignId, 5, sentinel("newer"));
    await upsertPageFacts(page.id, campaignId, 3, sentinel("older"));

    const row = await cachedRow(page.id);

    expect(row?.version).toBe(5);
    expect(JSON.stringify(row?.facts)).toContain("newer");
  });

  it("skips the write when the page was deleted mid-build", async () => {
    const page = await createPage("Vanishing", content());

    await prisma.scenarioPage.delete({ where: { id: page.id } });

    await expect(upsertPageFacts(page.id, campaignId, 1, sentinel("ghost"))).resolves.toBeUndefined();
    expect(await cachedRow(page.id)).toBeNull();
  });
});
