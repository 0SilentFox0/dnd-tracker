import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    const url = new URL(process.env[key] ?? "");

    if (url.hostname !== "localhost" || url.port !== "54322" || url.pathname !== "/constructor") throw Error("Task19 storage verification requires local constructor only");

    url.searchParams.set("connection_limit", "1");
    process.env[key] = url.toString();
  }
});
vi.mock("@/lib/cache/tags", async (original) => ({ ...await original<object>(), invalidateReference: vi.fn() }));

import { prismaImportRepository } from "../repository";
import { confirmImport, type ImportRepository,previewImport } from "../service";

import { prisma } from "@/lib/db";
import { withCampaignContentWrite } from "@/lib/server/content/write";

const userId = randomUUID();

const name = `Task19 storage verification ${userId}`;

const secret = "synthetic-local-storage-verification-secret";

let campaignId: string;

const actor = () => ({ campaignId, userId, isDM: true, via: "session" as const, scopes: null });

const input = { json: JSON.stringify({ _meta: { edition: "one", sources: [{ json: "Synthetic", full: "Synthetic Test", authors: ["Synthetic Author"] }] }, feat: [{ name: "Storage Gift", source: "Synthetic", category: "O", entries: ["Synthetic description"] }] }) };

beforeAll(async () => {
  await prisma.user.create({ data: { id: userId, email: `${userId}@task19.example.test`, displayName: "Task19 storage verification" } });

  const campaign = await prisma.campaign.create({ data: { name, inviteCode: randomUUID(), dmUserId: userId, members: { create: { userId, role: "dm" } } } });

  campaignId = campaign.id;
});

afterAll(async () => {
  if (campaignId) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });

    if (campaign?.name !== name || campaign.dmUserId !== userId) throw Error("Cleanup ownership mismatch");

    await prisma.campaign.delete({ where: { id: campaignId } });
  }

  await prisma.user.deleteMany({ where: { id: userId, email: `${userId}@task19.example.test` } });
  await prisma.$disconnect();
});

describe("Task19 local transaction storage (no HTTP/UI)", () => {
  it("uses the real transaction with a single DB connection and reimports without duplicates", async () => {
    const first = await previewImport(actor(), input, secret, prismaImportRepository);

    expect(await prisma.feat.count({ where: { campaignId } })).toBe(0);

    const saved = await confirmImport(actor(), input, first.token, "first", secret, prismaImportRepository);

    expect(saved.counts.created).toBe(1);
    expect(await confirmImport(actor(), input, first.token, "first", secret, prismaImportRepository)).toEqual(saved);

    const again = await previewImport(actor(), input, secret, prismaImportRepository);

    expect(again.report.counts.unchanged).toBe(1);
    await confirmImport(actor(), input, again.token, "again", secret, prismaImportRepository);
    expect(await prisma.feat.count({ where: { campaignId } })).toBe(1);
    expect(await prisma.compendiumEntry.count({ where: { campaignId } })).toBe(1);
  });

  it("persists independent subrace baselines and updates only the changed imported option", async () => {
    const root = { _meta: { edition: "one" }, race: [{ name: "Synthetic People", source: "Synthetic" }], subrace: ["Hill", "Coast"].map((name) => ({ name, source: "Synthetic", raceName: "Synthetic People", raceSource: "Synthetic", entries: [`Synthetic ${name}`] })) };

    const firstInput = { json: JSON.stringify(root) };

    const first = await previewImport(actor(), firstInput, secret, prismaImportRepository);

    expect(first.report.counts.errors).toBe(0);
    await confirmImport(actor(), firstInput, first.token, "nested-first", secret, prismaImportRepository);

    const again = await previewImport(actor(), firstInput, secret, prismaImportRepository);

    expect(again.report.counts.updated).toBe(0);
    expect(again.report.nextActions.some((i) => i.code === "LOCAL_CONFLICT")).toBe(false);
    root.subrace[0].entries = ["Changed synthetic Hill"];

    const changed = { json: JSON.stringify(root) };

    const preview = await previewImport(actor(), changed, secret, prismaImportRepository);

    await confirmImport(actor(), changed, preview.token, "nested-update", secret, prismaImportRepository);

    const stored = await prisma.race.findFirstOrThrow({ where: { campaignId, name: "Synthetic People" } });

    expect(JSON.stringify(stored.choices)).toContain("Changed synthetic Hill");
    expect(JSON.stringify(stored.choices)).toContain("Synthetic Coast");
    expect(await prisma.compendiumEntry.count({ where: { campaignId, kind: "races" } })).toBe(3);
  });

  it("rolls back actual native and provenance writes together", async () => {
    const changed = { json: input.json.replaceAll("Storage Gift", "Rolled Back Gift") };

    const failing: ImportRepository = {
      ...prismaImportRepository,
      saveSources: async () => { throw Error("Synthetic rollback check"); },
      transaction: (actor, callback) => withCampaignContentWrite(actor.campaignId, () => callback(failing)),
    };

    const preview = await previewImport(actor(), changed, secret, failing);

    await expect(confirmImport(actor(), changed, preview.token, "rolled-back", secret, failing)).rejects.toThrow("Synthetic rollback check");
    expect(await prisma.feat.count({ where: { campaignId, name: "Rolled Back Gift" } })).toBe(0);
    expect(await prisma.compendiumEntry.count({ where: { campaignId, originalName: "Rolled Back Gift" } })).toBe(0);
    expect(await prisma.compendiumImportRun.count({ where: { campaignId, idempotencyKey: "rolled-back" } })).toBe(0);
  });
});
