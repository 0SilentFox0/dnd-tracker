import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";


const localDb = await vi.hoisted(async () => {
  const { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } = await import("@/lib/server/test-support/local-db");

  if (!isLocalDevDatabaseEnv()) return false;

  for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) process.env[key] = singleConnectionDatabaseUrl(key);

  return true;
});

vi.mock("@/lib/cache/tags", async original => ({ ...await original<object>(), invalidateReference: vi.fn() }));

vi.mock("@/lib/cache/tags", async original => ({ ...await original<object>(), invalidateReference: vi.fn() }));

import { prismaImportRepository } from "../repository";
import { confirmImport, previewImport } from "../service";

import { prisma } from "@/lib/db";
import { createCampaignFromBundle } from "@/lib/server/campaigns/create-campaign";

const userId = randomUUID(), name = `ImportImages ${userId}`, secret = "synthetic-import-images-local-integration-secret";

let campaignId: string;

const actor = () => ({ campaignId, userId, isDM: true, via: "session" as const, scopes: null });

const input = { json: JSON.stringify({ spell: [{ name: "Pic Spell", source: "T", level: 1, foundryImg: "https://img.test/a.png" }] }) };

describe.skipIf(!localDb)("import images confirm integration", () => {
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

  it("stores the queue in the run report and original urls in entry attribution", async () => {
    const p = await previewImport(actor(), input, secret, prismaImportRepository);

    const report = await confirmImport(actor(), input, p.token, "img", secret, prismaImportRepository);

    const run = await prisma.compendiumImportRun.findFirstOrThrow({ where: { campaignId } });

    const media = (run.report as { media: { items: Array<{ url: string; status: string; targets: Array<{ localId: string; field: string }> }> } }).media;

    const spell = await prisma.spell.findFirstOrThrow({ where: { campaignId } });

    expect(media.items).toHaveLength(1);
    expect(media.items[0]).toMatchObject({ url: "https://img.test/a.png", status: "pending", targets: [{ localId: spell.id, field: "icon" }] });
    expect(report.media?.items).toHaveLength(1);

    const entry = await prisma.compendiumEntry.findFirstOrThrow({ where: { campaignId, kind: "spells" } });

    expect(entry.attribution).toMatchObject({ images: [{ url: "https://img.test/a.png", role: "icon" }] });
    expect(spell.icon ?? null).toBeNull();
  });
});
