import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const url = new URL(process.env.DATABASE_URL ?? "");

  if (url.hostname !== "localhost" || url.port !== "54322") throw Error("Requires the local docker database");
});
vi.mock("@/lib/cache/tags", async original => ({ ...await original<object>(), invalidateReference: vi.fn() }));

import { canonicalKey } from "../identity";
import { prismaImportRepository } from "../repository";
import { confirmImport, type ImportInput, previewImport } from "../service";

import { prisma } from "@/lib/db";
import { createCampaignFromBundle } from "@/lib/server/campaigns/create-campaign";

const userId = randomUUID(), name = `Subclass reimport ${userId}`, secret = "synthetic-subclass-reimport-integration-secret";

let campaignId: string;

const actor = () => ({ campaignId, userId, isDM: true, via: "session" as const, scopes: null });

beforeAll(async () => {
  await prisma.user.create({ data: { id: userId, email: `${userId}@reimport.example.test`, displayName: "Reimport DM" } });
  campaignId = (await createCampaignFromBundle({ userId, name, bundle: null })).campaign.id;
});
afterAll(async () => {
  await prisma.campaign.deleteMany({ where: { id: campaignId, dmUserId: userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("nested subclass of an SRD class", () => {
  it("reimports unchanged without LOCAL_CONFLICT", async () => {
    const template = await prisma.campaign.findFirstOrThrow({ where: { kind: "template", visibility: "official", name: "5e SRD 5.2" } });

    const parent = await prisma.gameClass.findFirstOrThrow({ where: { campaignId: template.id }, orderBy: { name: "asc" } });

    const sub = (short: string) => ({ name: `Path ${short}`, source: "SYNRE", className: parent.name, classSource: "MISSING", shortName: short, entries: ["Subclass intro"], subclassFeatures: [`Feat A|${parent.name}|MISSING|${short}|SYNRE|3|SYNRE`, `Feat B|${parent.name}|MISSING|${short}|SYNRE|6|SYNRE`] });

    const feat = (short: string, n: string, level: number, entries: unknown[]) => ({ name: `Feat ${n}`, source: "SYNRE", className: parent.name, classSource: "MISSING", subclassShortName: short, subclassSource: "SYNRE", level, entries });

    const root = {
      _meta: { edition: "classic", sources: [{ json: "SYNRE" }] },
      subclass: [sub("Syn"), sub("Two")],
      subclassFeature: ["Syn", "Two"].flatMap(short => [feat(short, "A", 3, ["Text {@b bold}", { type: "options", count: 1, entries: [{ type: "refOptionalfeature", optionalfeature: "Opt1|SYNRE" }, { type: "refOptionalfeature", optionalfeature: "Opt2|SYNRE" }] }]), feat(short, "B", 6, ["More"])]),
      optionalfeature: [{ name: "Opt1", source: "SYNRE", entries: ["o1"] }, { name: "Opt2", source: "SYNRE", entries: ["o2"] }],
    };

    const dependencies = [{ refKey: canonicalKey("class", parent.name, "MISSING", "classic"), templateId: template.id, kind: "classes" as const, localId: parent.id, edition: "one" as const }];

    const value: ImportInput = { json: JSON.stringify(root), dependencies, allowMixedEdition: true };

    const first = await previewImport(actor(), value, secret, prismaImportRepository);

    await confirmImport(actor(), value, first.token, "first", secret, prismaImportRepository);

    const again = await previewImport(actor(), value, secret, prismaImportRepository);

    expect(again.report.nextActions.filter(i => i.code === "LOCAL_CONFLICT")).toEqual([]);
    expect(again.report.counts).toMatchObject({ created: 0, updated: 0 });
  });
});
