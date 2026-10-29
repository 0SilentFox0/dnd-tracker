import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const localDb = await vi.hoisted(async () => {
  const { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } = await import("@/lib/server/test-support/local-db");

  if (!isLocalDevDatabaseEnv()) return false;

  for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) process.env[key] = singleConnectionDatabaseUrl(key);

  return true;
});

vi.mock("@/lib/cache/tags", async original => ({ ...await original<object>(), invalidateReference: vi.fn(), invalidateAllReference: vi.fn() }));

import { prismaMediaRepository } from "../media/repository";
import { processMediaBatch } from "../media/service";
import { MEDIA_LIMITS, mediaIdOf } from "../media/types";
import { prismaImportRepository } from "../repository";
import { confirmImport, previewImport } from "../service";

import { prisma } from "@/lib/db";
import { createCampaignFromBundle } from "@/lib/server/campaigns/create-campaign";

const userId = randomUUID(), name = `ImportBatch ${userId}`, secret = "synthetic-import-images-local-integration-secret";

let campaignId: string;

const actor = () => ({ campaignId, userId, isDM: true, via: "session" as const, scopes: null });

const IMG = (n: string) => `https://img.test/${n}.png`;

const stored = (url: string) => new URL(`/storage/v1/object/public/compendium-media/${mediaIdOf(url).slice(0, 2)}/${mediaIdOf(url)}.webp`, process.env.NEXT_PUBLIC_SUPABASE_URL).toString();

const input = {
  categories: ["monster", "spell", "item", "book"],
  json: JSON.stringify({
    _meta: { sources: [{ json: "MB", full: "Media Batch" }], edition: "one" },
    monster: [{ name: "Batch Beast", source: "MB", ac: [12], hp: { average: 20 }, str: 14, dex: 10, con: 10, int: 10, wis: 10, cha: 10, cr: "1", tokenHref: { type: "external", url: IMG("token") } }],
    spell: [{ name: "Batch Spell", source: "MB", level: 1, foundryImg: IMG("spell") }, { name: "Custom Spell", source: "MB", level: 1, foundryImg: IMG("custom") }],
    item: [{ name: "Batch Item", source: "MB", rarity: "rare", fluff: { images: [{ type: "image", href: { type: "external", url: IMG("item") } }] } }],
    book: [{ name: "Batch Book", source: "MB", id: "bk", contents: [] }],
    bookData: [{ id: "bk", source: "MB", data: [{ name: "Chapter", entries: ["Before", { type: "image", href: { type: "external", url: IMG("page") } }, "After"] }] }],
  }),
};

const deps = (fetchImage: (url: string) => Promise<unknown>) => ({
  repository: prismaMediaRepository,
  fetchImage: fetchImage as never,
  store: (async (image: { sha256: string }) => ({ ok: true, value: stored(IMG(image.sha256)) })) as never,
});

describe.skipIf(!localDb)("import images batch integration", () => {
  let runId: string;

  beforeAll(async () => {
    await prisma.user.create({ data: { id: userId, email: `${userId}@images.example.test`, displayName: "Images DM" } });
    campaignId = (await createCampaignFromBundle({ userId, name, bundle: null })).campaign.id;
  });
  afterAll(async () => {
    const c = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });

    if (c.dmUserId !== userId || !c.name.startsWith(name)) throw Error("cleanup ownership mismatch");

    await prisma.campaign.delete({ where: { id: campaignId } });
    await prisma.user.deleteMany({ where: { id: userId, email: `${userId}@images.example.test` } });
    await prisma.$disconnect();
  });

  it("writes avatars, icons and page images, keeps customized icons, retries failed items", async () => {
    const p = await previewImport(actor(), input, secret, prismaImportRepository);

    const report = await confirmImport(actor(), input, p.token, "batch-1", secret, prismaImportRepository);

    runId = report.runId!;
    expect(report.media?.items).toHaveLength(5);

    const custom = await prisma.spell.findFirstOrThrow({ where: { campaignId, name: "Custom Spell" } });

    await prisma.spell.update({ where: { id: custom.id }, data: { icon: "https://custom.example/mine.png" } });

    const urls: string[] = [];

    const failToken = async (url: string) => {
      urls.push(url);

      if (url === IMG("token") && urls.filter((u) => u === url).length === 1) return { ok: false, reason: "MEDIA_HTTP_STATUS", params: { status: 503 }, retryable: true };

      return { ok: true, bytes: Buffer.from("x"), mime: "image/png", sha256: url };
    };

    const first = await processMediaBatch(actor(), runId, { ...deps(failToken), store: (async (image: { sha256: string }) => ({ ok: true, value: stored(image.sha256) })) as never });

    expect(first).toMatchObject({ total: 5, saved: 4, failed: 1, retryable: 1, pending: 0 });
    expect((await prisma.spell.findUniqueOrThrow({ where: { id: custom.id } })).icon).toBe("https://custom.example/mine.png");

    const spell = await prisma.spell.findFirstOrThrow({ where: { campaignId, name: "Batch Spell" } });

    expect(spell.icon).toBe(stored(IMG("spell")));
    expect((await prisma.artifact.findFirstOrThrow({ where: { campaignId, name: "Batch Item" } })).icon).toBe(stored(IMG("item")));

    const page = await prisma.scenarioPage.findFirstOrThrow({ where: { campaignId } });

    expect(JSON.stringify(page.content)).toContain(stored(IMG("page")));
    expect(page.version).toBeGreaterThan(0);

    const second = await processMediaBatch(actor(), runId, { ...deps(failToken), store: (async (image: { sha256: string }) => ({ ok: true, value: stored(image.sha256) })) as never }, { retryFailed: true });

    expect(second).toMatchObject({ saved: 5, failed: 0, pending: 0 });
    expect((await prisma.unit.findFirstOrThrow({ where: { campaignId, name: "Batch Beast" } })).avatar).toBe(stored(IMG("token")));

    const run = await prisma.compendiumImportRun.findUniqueOrThrow({ where: { id: runId } });

    const media = (run.report as { media: { skipped: Record<string, number>; items: Array<{ attempts: number }> } }).media;

    expect(media.skipped.MEDIA_TARGET_CUSTOMIZED).toBe(1);
    expect(Math.max(...media.items.map((i) => i.attempts))).toBe(2);
  });

  it("is a no-op after completion and rejects foreign run ids", async () => {
    const fetchImage = vi.fn();

    expect(await processMediaBatch(actor(), runId, deps(fetchImage))).toMatchObject({ saved: 5, pending: 0 });
    expect(fetchImage).not.toHaveBeenCalled();
    await expect(processMediaBatch({ ...actor(), campaignId: "other-campaign" }, runId, deps(fetchImage))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reimport takes stored urls from earlier runs without fetching", async () => {
    const p = await previewImport(actor(), input, secret, prismaImportRepository);

    const report = await confirmImport(actor(), input, p.token, "batch-2", secret, prismaImportRepository);

    expect(report.counts.created).toBe(0);

    const fetchImage = vi.fn();

    const progress = await processMediaBatch(actor(), report.runId!, deps(fetchImage));

    expect(fetchImage).not.toHaveBeenCalled();
    expect(progress.pending).toBe(0);
  });

  it("claim respects leases and attempt limits", async () => {
    const claim = (now: number, retryFailed = false) => prismaMediaRepository.claim(actor(), runId, { max: MEDIA_LIMITS.batch, leaseMs: MEDIA_LIMITS.leaseMs, now, retryFailed });

    const run = await prisma.compendiumImportRun.findUniqueOrThrow({ where: { id: runId } });

    const report = run.report as { media: { items: Array<Record<string, unknown>> } };

    report.media.items[0] = { ...report.media.items[0], status: "pending", attempts: 0 };
    report.media.items[1] = { ...report.media.items[1], status: "failed", reason: "MEDIA_TIMEOUT", retryable: true, attempts: MEDIA_LIMITS.maxAttempts };
    await prisma.compendiumImportRun.update({ where: { id: runId }, data: { report: report as never } });

    const now = 1_000_000;

    expect((await claim(now))?.items.map((i) => i.id)).toEqual([report.media.items[0].id]);
    expect((await claim(now + 1, true))?.items).toEqual([]);
    expect((await claim(now + MEDIA_LIMITS.leaseMs + 1))?.items.map((i) => i.id)).toEqual([report.media.items[0].id]);
  });
});
