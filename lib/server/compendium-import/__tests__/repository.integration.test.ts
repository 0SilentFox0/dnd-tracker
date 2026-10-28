import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const localDb = await vi.hoisted(async () => {
  const { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } = await import("@/lib/server/test-support/local-db");

  if (!isLocalDevDatabaseEnv()) return false;

  for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) process.env[key] = singleConnectionDatabaseUrl(key);

  return true;
});

vi.mock("@/lib/cache/tags", async (original) => ({ ...await original<object>(), invalidateReference: vi.fn() }));

import { canonicalKey } from "../identity";
import { prismaImportRepository } from "../repository";
import { confirmImport, type ImportRepository,previewImport } from "../service";

import { prisma } from "@/lib/db";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { runContentWriteContext } from "@/lib/server/content/write-context";
import { applySource, getSourceDiff } from "@/lib/server/templates/sync/service";

const userId = randomUUID();

const name = `Task19 storage verification ${userId}`;

const secret = "synthetic-local-storage-verification-secret";

let campaignId: string;

let sourceId: string;

let migrationsBefore: Array<{ migration_name: string }>;

const actor = () => ({ campaignId, userId, isDM: true, via: "session" as const, scopes: null });

const input = { json: JSON.stringify({ _meta: { edition: "one", sources: [{ json: "Synthetic", full: "Synthetic Test", authors: ["Synthetic Author"] }] }, feat: [{ name: "Storage Gift", source: "Synthetic", category: "O", entries: ["Synthetic description"] }] }) };

describe.skipIf(!localDb)("Task19 local transaction storage (no HTTP/UI)", () => {
  beforeAll(async () => {
    migrationsBefore = await prisma.$queryRaw`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name`;
    await prisma.user.create({ data: { id: userId, email: `${userId}@task19.example.test`, displayName: "Task19 storage verification" } });

    const campaign = await prisma.campaign.create({ data: { name, inviteCode: randomUUID(), dmUserId: userId, members: { create: { userId, role: "dm" } } } });

    campaignId = campaign.id;

    const source = await prisma.campaign.create({ data: { name: "5e SRD 5.2", kind: "template", visibility: "official", inviteCode: randomUUID(), dmUserId: userId, description: name } });

    sourceId = source.id;
  });

  afterAll(async () => {
    if (campaignId) {
      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });

      if (campaign?.name !== name || campaign.dmUserId !== userId) throw Error("Cleanup ownership mismatch");

      await prisma.campaign.delete({ where: { id: campaignId } });
    }

    if (sourceId) {
      const source = await prisma.campaign.findUniqueOrThrow({ where: { id: sourceId } });

      if (source.description !== name || source.dmUserId !== userId) throw Error("Source cleanup ownership mismatch");

      await prisma.campaign.delete({ where: { id: sourceId } });
    }

    await prisma.user.deleteMany({ where: { id: userId, email: `${userId}@task19.example.test` } });
    expect(await prisma.campaign.count({ where: { dmUserId: userId } })).toBe(0);
    expect(await prisma.user.count({ where: { id: userId } })).toBe(0);
    expect(await prisma.$queryRaw`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name`).toEqual(migrationsBefore);
    await prisma.$disconnect();
  });

  it("rejects cross-campaign bindings including a nested origin feat reference", async () => {
    const foreign = await prisma.feat.create({ data: { campaignId: sourceId, name: "Foreign origin", type: "origin" } });

    const value = { json: JSON.stringify({ _meta: { edition: "one" }, background: [{ name: "Foreign Background", source: "Synthetic", feats: [{ "Foreign origin|Synthetic": true }] }] }), bindings: { [canonicalKey("feat", "Foreign origin", "Synthetic", "one")]: { kind: "feats" as const, id: foreign.id } } };

    const before = await prisma.compendiumImportRun.count({ where: { campaignId } });

    await expect(previewImport(actor(), value, secret, prismaImportRepository)).rejects.toMatchObject({ code: "BINDING_WRONG_CAMPAIGN" });

    const local = await prisma.feat.create({ data: { campaignId, name: "Local origin", type: "origin" } });

    const selected = { ...value, bindings: { [canonicalKey("feat", "Foreign origin", "Synthetic", "one")]: { kind: "feats" as const, id: local.id } } };

    const preview = await previewImport(actor(), selected, secret, prismaImportRepository);

    expect(preview.report.counts.errors).toBe(0);
    await prisma.feat.update({ where: { id: local.id }, data: { campaignId: sourceId } });
    await expect(confirmImport(actor(), selected, preview.token, "foreign-binding", secret, prismaImportRepository)).rejects.toMatchObject({ code: "BINDING_WRONG_CAMPAIGN" });
    expect(await prisma.background.count({ where: { campaignId, name: "Foreign Background" } })).toBe(0);
    expect(await prisma.compendiumImportRun.count({ where: { campaignId } })).toBe(before);
    expect(await prisma.feat.findUnique({ where: { id: foreign.id } })).toMatchObject({ campaignId: sourceId });
  });

  it("rejects dependency source changes after preview without partial writes", async () => {
    const source = await prisma.feat.create({ data: { campaignId: sourceId, name: "Dependency origin", type: "origin" } });

    const value = { json: JSON.stringify({ _meta: { edition: "one" }, background: [{ name: "Dependency Background", source: "Synthetic", feats: [{ "Dependency origin|Synthetic": true }] }] }), dependencies: [{ refKey: canonicalKey("feat", "Dependency origin", "Synthetic", "one"), templateId: sourceId, kind: "feats" as const, localId: source.id, edition: "one" as const }] };

    const preview = await previewImport(actor(), value, secret, prismaImportRepository);

    expect(preview.report.counts.errors).toBe(0);
    await prisma.feat.update({ where: { id: source.id }, data: { description: "Changed between preview and confirm" } });
    await expect(confirmImport(actor(), value, preview.token, "changed-dependency", secret, prismaImportRepository)).rejects.toMatchObject({ code: "PREVIEW_STALE" });
    expect(await prisma.feat.count({ where: { campaignId, name: "Dependency origin" } })).toBe(0);
    expect(await prisma.background.count({ where: { campaignId, name: "Dependency Background" } })).toBe(0);
    expect(await prisma.compendiumImportRun.count({ where: { campaignId, idempotencyKey: "changed-dependency" } })).toBe(0);
  });

  it.each(["second-native", "second-provenance", "receipt"])("rolls back a nested graph, sources, credits and receipt when %s fails", async (phase) => {
    const source = `Rollback-${phase}`;

    const value = { json: JSON.stringify({ _meta: { edition: "one", sources: [{ json: source, full: `Synthetic ${source}` }] }, race: [{ name: `People ${phase}`, source }], subrace: [{ name: `Hill ${phase}`, source, raceName: `People ${phase}`, raceSource: source }], feat: [{ name: `Gift ${phase}`, source, category: "O" }], background: [{ name: `Past ${phase}`, source, feats: [{ [`Gift ${phase}|${source}`]: true }] }] }) };

    const preview = await previewImport(actor(), value, secret, prismaImportRepository);

    expect(preview.report.counts.errors).toBe(0);

    const before = {
      races: await prisma.race.findMany({ where: { campaignId } }), feats: await prisma.feat.findMany({ where: { campaignId } }), backgrounds: await prisma.background.findMany({ where: { campaignId } }),
      entries: await prisma.compendiumEntry.findMany({ where: { campaignId } }), sources: await prisma.compendiumSource.findMany({ where: { campaignId } }), runs: await prisma.compendiumImportRun.findMany({ where: { campaignId } }),
      campaign: await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } }),
    };

    let natives = 0, entries = 0;

    const failing: ImportRepository = {
      ...prismaImportRepository,
      transaction: (actor, callback) => withCampaignContentWrite(actor.campaignId, () => callback(failing)),
      write: async (actor, row) => {
        const id = await prismaImportRepository.write(actor, row);

        if (++natives === 2 && phase === "second-native") throw Error("Synthetic nested rollback");

        return id;
      },
      saveEntry: async (actor, row) => {
        await prismaImportRepository.saveEntry(actor, row);

        if (++entries === 2 && phase === "second-provenance") throw Error("Synthetic nested rollback");
      },
      saveRun: async (actor, key, hash, report) => {
        await prismaImportRepository.saveRun(actor, key, hash, report);
        throw Error("Synthetic nested rollback");
      },
    };

    await expect(confirmImport(actor(), value, preview.token, `rollback-${phase}`, secret, failing)).rejects.toThrow("Synthetic nested rollback");
    expect(natives).toBeGreaterThanOrEqual(2);

    expect(await prisma.race.findMany({ where: { campaignId } })).toEqual(before.races);
    expect(await prisma.feat.findMany({ where: { campaignId } })).toEqual(before.feats);
    expect(await prisma.background.findMany({ where: { campaignId } })).toEqual(before.backgrounds);
    expect(await prisma.compendiumEntry.findMany({ where: { campaignId } })).toEqual(before.entries);
    expect(await prisma.compendiumSource.findMany({ where: { campaignId } })).toEqual(before.sources);
    expect(await prisma.compendiumImportRun.findMany({ where: { campaignId } })).toEqual(before.runs);
    expect(await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } })).toEqual(before.campaign);
  });
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

  it("rolls back source apply native rows, provenance, sources, credits and baseline together", async () => {
    const sourceActor = { ...actor(), campaignId: sourceId };

    const value = { json: JSON.stringify({ _meta: { edition: "one", sources: [{ json: "SyncRollback", full: "Synthetic sync attribution" }] }, feat: [{ name: "Sync rollback gift", source: "SyncRollback", category: "O" }] }) };

    const preview = await previewImport(sourceActor, value, secret, prismaImportRepository);

    const imported = await confirmImport(sourceActor, value, preview.token, "sync-source", secret, prismaImportRepository);

    await prisma.campaign.update({ where: { id: campaignId }, data: { createdFromId: sourceId } });

    const diff = await getSourceDiff(actor());

    const item = diff.items.find(item => item.key === imported.rows[0].targetId);

    if (!item) throw Error("Missing imported source feat in diff");

    expect(item).toMatchObject({ scope: "feats", status: "new" });

    const before = { campaign: await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } }), entries: await prisma.compendiumEntry.findMany({ where: { campaignId } }), sources: await prisma.compendiumSource.findMany({ where: { campaignId } }), sync: await prisma.campaignSourceSync.findUnique({ where: { campaignId } }) };

    const saveState = vi.fn();

    let baselineWritten = false;

    await expect(withCampaignContentWrite(campaignId, async (tx) => {
      saveState.mockImplementation(async (args: Prisma.CampaignSourceSyncUpsertArgs) => {
        await tx.campaignSourceSync.upsert(args);
        expect(await tx.campaignSourceSync.findUnique({ where: { campaignId } })).not.toEqual(before.sync);
        baselineWritten = true;
        throw Error("Synthetic sync state failure");
      });

      const failing = { ...tx, campaignSourceSync: { ...tx.campaignSourceSync, upsert: saveState } };

      return runContentWriteContext(campaignId, failing, () => applySource(actor(), { apply: [{ scope: item.scope, key: item.key, sourceHash: item.sourceHash, status: item.status }], ignore: [] }));
    })).rejects.toThrow("Synthetic sync state failure");
    expect(saveState).toHaveBeenCalledOnce();
    expect(baselineWritten).toBe(true);
    expect(await prisma.feat.count({ where: { campaignId, name: "Sync rollback gift" } })).toBe(0);
    expect(await prisma.compendiumEntry.findMany({ where: { campaignId } })).toEqual(before.entries);
    expect(await prisma.compendiumSource.findMany({ where: { campaignId } })).toEqual(before.sources);
    expect(await prisma.campaignSourceSync.findUnique({ where: { campaignId } })).toEqual(before.sync);
    expect(await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } })).toEqual(before.campaign);
  });
});
