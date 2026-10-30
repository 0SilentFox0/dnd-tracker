import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const localDb = await vi.hoisted(async () => {
  const { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } = await import("@/lib/server/test-support/local-db");

  if (!isLocalDevDatabaseEnv()) return false;

  for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) process.env[key] = singleConnectionDatabaseUrl(key);

  return true;
});

import { loadSummaries, loadSummaryRow, upsertSummary } from "../summary-store";

import { prisma } from "@/lib/db";
import type { PageSummary } from "@/lib/schemas/scenario-summary";
import { createCampaignFromBundle } from "@/lib/server/campaigns/create-campaign";

const userId = randomUUID();

let campaignId: string;

let otherCampaignId: string;

const summary = (overview: string): PageSummary => ({ overview, events: ["e"], secrets: [], entities: [], digest: "d" });

const createPage = (title: string, campaign = campaignId) =>
  prisma.scenarioPage.create({ data: { campaignId: campaign, kind: "scene", title, content: {}, version: 1 } });

const save = (pageId: string, version: number, overview: string, campaign = campaignId) =>
  upsertSummary({ pageId, campaignId: campaign, version, summary: summary(overview), provider: "test", model: "m", inputTokens: 1, outputTokens: 2 });

describe.skipIf(!localDb)("summary-store", () => {
  beforeAll(async () => {
    await prisma.user.create({ data: { id: userId, email: `${userId}@scenario-summary.example.test`, displayName: "Summary DM" } });
    campaignId = (await createCampaignFromBundle({ userId, name: `Scenario summary ${userId}`, bundle: null })).campaign.id;
    otherCampaignId = (await createCampaignFromBundle({ userId, name: `Scenario summary other ${userId}`, bundle: null })).campaign.id;
  });

  afterAll(async () => {
    await prisma.campaign.deleteMany({ where: { id: { in: [campaignId, otherCampaignId] }, dmUserId: userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("inserts a summary row", async () => {
    const page = await createPage("Insert");

    await save(page.id, 1, "first");

    const row = await loadSummaryRow(page.id);

    expect(row).toMatchObject({ version: 1, model: "m", summary: { overview: "first" } });
  });

  it("does not let an older version overwrite a newer one", async () => {
    const page = await createPage("Race");

    await save(page.id, 5, "newer");
    await save(page.id, 3, "older");

    expect(await loadSummaryRow(page.id)).toMatchObject({ version: 5, summary: { overview: "newer" } });
  });

  it("overwrites on an equal version", async () => {
    const page = await createPage("Regenerate");

    await save(page.id, 2, "before");
    await save(page.id, 2, "after");

    expect((await loadSummaryRow(page.id))?.summary.overview).toBe("after");
  });

  it("skips the write when the page does not exist", async () => {
    const ghost = randomUUID();

    await expect(save(ghost, 1, "ghost")).resolves.toBeUndefined();
    expect(await loadSummaryRow(ghost)).toBeNull();
  });

  it("returns null for a corrupt row", async () => {
    const page = await createPage("Corrupt");

    await save(page.id, 1, "ok");
    await prisma.scenarioPageSummary.update({ where: { pageId: page.id }, data: { summary: { overview: 1 } } });

    expect(await loadSummaryRow(page.id)).toBeNull();
  });

  it("computes stale, scopes by campaign and skips corrupt rows", async () => {
    const fresh = await createPage("Fresh");

    const stale = await createPage("Stale");

    const bad = await createPage("Bad");

    const foreign = await createPage("Foreign", otherCampaignId);

    await save(fresh.id, 1, "fresh");
    await save(stale.id, 1, "stale");
    await save(bad.id, 1, "bad");
    await save(foreign.id, 1, "foreign", otherCampaignId);
    await prisma.scenarioPage.update({ where: { id: stale.id }, data: { version: 2 } });
    await prisma.scenarioPageSummary.update({ where: { pageId: bad.id }, data: { summary: "nope" } });

    const { summaries } = await loadSummaries(campaignId);

    expect(summaries[fresh.id]).toMatchObject({ stale: false, version: 1, model: "m" });
    expect(typeof summaries[fresh.id].createdAt).toBe("string");
    expect(summaries[stale.id].stale).toBe(true);
    expect(summaries[bad.id]).toBeUndefined();
    expect(summaries[foreign.id]).toBeUndefined();
  });
});
