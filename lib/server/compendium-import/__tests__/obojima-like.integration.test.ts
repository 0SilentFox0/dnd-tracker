import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import fixture from "./fixtures/obojima-like.synthetic.json";

const localDb = vi.hoisted(() => {
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");

    return url.hostname === "localhost" && url.port === "54322";
  } catch {
    return false;
  }
});

vi.mock("next/cache", async (original) => ({ ...(await original<object>()), unstable_cache: <T,>(fn: T) => fn, revalidateTag: vi.fn() }));
vi.mock("@/lib/cache/tags", async (original) => ({ ...(await original<object>()), invalidateReference: vi.fn() }));

import { importTargetOptions, previewPresentation } from "../presentation";
import { prismaImportRepository } from "../repository";
import { confirmImport, type ImportInput, previewImport } from "../service";
import type { TargetKind } from "../types";

import { COMPENDIUM_REF_KINDS } from "@/lib/constants/compendium-import";
import { prisma } from "@/lib/db";
import { createCampaignFromBundle } from "@/lib/server/campaigns/create-campaign";
import { categoryInventory, projectInput } from "@/lib/utils/compendium-import/flow";

const userId = randomUUID();

const secret = "synthetic-obojima-like-local-integration-secret";

let campaignId = "";

const actor = () => ({ campaignId, userId, isDM: true, via: "session" as const, scopes: null });

async function buildInput(): Promise<ImportInput> {
  const base = projectInput(fixture, categoryInventory(fixture).filter((c) => c.selected).map((c) => c.kind), { rulesPatch: { classes: { enabled: true } }, allowMixedEdition: true });

  const { graph } = previewPresentation(base);

  const own = new Set(graph.map((r) => r.key));

  const [template] = (await importTargetOptions(actor())).templates;

  const dependencies = new Map<string, NonNullable<ImportInput["dependencies"]>[number]>();

  for (const ref of graph.flatMap((r) => r.refs)) {
    const target = own.has(ref.key) ? undefined : template.rows.find((t) => t.kind === COMPENDIUM_REF_KINDS[ref.kind] && t.name.toLowerCase() === ref.name.toLowerCase());

    if (target) dependencies.set(ref.key, { refKey: ref.key, templateId: template.id, kind: target.kind as TargetKind, localId: target.id, edition: template.edition });
  }

  return { ...base, dependencies: [...dependencies.values()] };
}

describe.skipIf(!localDb)("obojima-like synthetic import", () => {
  beforeAll(async () => {
    await prisma.user.create({ data: { id: userId, email: `${userId}@obojima-like.example.test`, displayName: "Obojima-like DM" } });
    campaignId = (await createCampaignFromBundle({ userId, name: `Obojima-like ${userId}`, bundle: null })).campaign.id;
  });
  afterAll(async () => {
    await prisma.campaign.deleteMany({ where: { id: campaignId, dmUserId: userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("imports every entity kind, is idempotent and leaves no dangling references", async () => {
    const input = await buildInput();

    const first = await previewImport(actor(), input, secret, prismaImportRepository);

    expect(first.report.nextActions.filter((i) => i.severity === "error")).toEqual([]);
    expect(first.report.counts.errors).toBe(0);
    expect(first.report.readyToImport).toBe(true);
    expect(first.report.nextActions.filter((i) => i.code === "UNRESOLVED_REFERENCE")).toEqual([]);

    await confirmImport(actor(), input, first.token, "obojima-like", secret, prismaImportRepository);

    const count = async () => ({
      classes: await prisma.gameClass.count({ where: { campaignId } }),
      spells: await prisma.spell.count({ where: { campaignId } }),
      units: await prisma.unit.count({ where: { campaignId } }),
      artifacts: await prisma.artifact.count({ where: { campaignId } }),
      races: await prisma.race.count({ where: { campaignId } }),
      backgrounds: await prisma.background.count({ where: { campaignId } }),
      feats: await prisma.feat.count({ where: { campaignId } }),
    });

    const counts = await count();

    expect(Object.values(counts).every((n) => n > 0)).toBe(true);

    const again = await previewImport(actor(), input, secret, prismaImportRepository);

    expect(again.report.counts).toMatchObject({ created: 0, updated: 0, errors: 0 });
    expect(again.report.nextActions.filter((i) => i.code === "LOCAL_CONFLICT")).toEqual([]);

    await confirmImport(actor(), input, again.token, "obojima-like-again", secret, prismaImportRepository);
    expect(await count()).toEqual(counts);

    const wanderer = await prisma.gameClass.findFirstOrThrow({ where: { campaignId, name: "Wanderer" } });

    expect((wanderer.subclasses as Array<{ name: string }>).map((x) => x.name)).toEqual(["Path of Leaves"]);
    expect(await prisma.gameClass.count({ where: { campaignId, name: "Fighter" } })).toBe(1);

    const spellIds = new Set((await prisma.spell.findMany({ where: { campaignId }, select: { id: true } })).map((s) => s.id));

    const featIds = new Set((await prisma.feat.findMany({ where: { campaignId }, select: { id: true } })).map((f) => f.id));

    const backgrounds = await prisma.background.findMany({ where: { campaignId } });

    expect(backgrounds.every((b) => !b.originFeatId || featIds.has(b.originFeatId))).toBe(true);
    expect(backgrounds.some((b) => b.originFeatId)).toBe(true);

    const refs = JSON.stringify([...(await prisma.feat.findMany({ where: { campaignId } })).map((f) => f.choices), ...(await prisma.race.findMany({ where: { campaignId } })).map((r) => r.choices), ...(await prisma.unit.findMany({ where: { campaignId } })).map((u) => u.spellcasting)]);

    const referenced = [...refs.matchAll(/"spellId":"([^"]+)"/g)].map((m) => m[1]);

    expect(referenced.length).toBeGreaterThan(0);
    expect(referenced.filter((id) => !spellIds.has(id))).toEqual([]);
  }, 120_000);
});
