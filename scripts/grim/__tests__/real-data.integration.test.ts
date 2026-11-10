import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { contentLayer, invalidateCampaignLayer } from "@/lib/db/content-layer";
import { createScopedDatabase } from "@/lib/server/content/write-context";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";

const raw = new PrismaClient({ datasources: { db: { url: singleConnectionDatabaseUrl("DATABASE_URL") } } });

const scoped = createScopedDatabase(raw.$extends(contentLayer()));

vi.mock("@/lib/db", () => ({ get prisma() { return scoped; } }));
vi.mock("@/lib/cache/tags", async (orig) => ({ ...(await orig<object>()), invalidateReference: vi.fn(), invalidateAllReference: vi.fn() }));

import { readGrimData } from "../data";
import { loadGrimTemplate } from "../load-template";

import { GRIM_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { createCampaignForUser } from "@/lib/server/campaigns/create-campaign";
import { listRaceProfiles } from "@/lib/server/races/race-profile";

const marker = `grimreal-${randomUUID()}`;

const rowCounts = async (templateId: string) => ({
  feats: await raw.feat.count({ where: { campaignId: templateId } }),
  careers: await raw.career.count({ where: { campaignId: templateId } }),
  races: await raw.race.count({ where: { campaignId: templateId } }),
});

describe.skipIf(!isLocalDevDatabaseEnv())("grim-d100 real data load", () => {
  let templateId = "";

  let guardPassed = false;

  const userId = marker;

  beforeAll(async () => {
    if (await raw.campaign.count({ where: { kind: "template", name: GRIM_TEMPLATE_NAME } })) throw new Error("a Grim d100 template already exists in the test database");

    guardPassed = true;

    await raw.user.create({ data: { id: userId, email: `${marker}@example.invalid`, displayName: marker } });
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterAll(async () => {
    if (!guardPassed) return void (await raw.$disconnect());

    const ids = (await raw.campaign.findMany({ where: { OR: [{ dmUserId: userId }, { name: GRIM_TEMPLATE_NAME, kind: "template" }] }, select: { id: true } })).map((c) => c.id);

    await raw.campaign.updateMany({ where: { id: { in: ids } }, data: { baseSourceId: null } });
    await raw.featBase.deleteMany({ where: { sourceCampaignId: { in: ids } } });
    await raw.spellBase.deleteMany({ where: { sourceCampaignId: { in: ids } } });
    await raw.careerBase.deleteMany({ where: { sourceCampaignId: { in: ids } } });
    await raw.raceBase.deleteMany({ where: { sourceCampaignId: { in: ids } } });
    await raw.campaign.deleteMany({ where: { id: { in: ids } } });
    await raw.user.deleteMany({ where: { id: userId } });
    await raw.$disconnect();
  });

  it("loads the real catalog", async () => {
    const result = await loadGrimTemplate({ owner: userId, allowRemote: false });

    templateId = result.templateId;
    expect(result.created).toBe(true);
    expect(result.counts).toMatchObject({ feats: 50, careers: 16, races: 4, raceProfiles: 4 });
  });

  it("a clone sees every species profile with id-based career tables", async () => {
    const created = await createCampaignForUser(userId, { name: `${marker}-clone`, templateId }, { defer: () => undefined });

    if (!created.ok) throw new Error("clone failed");

    invalidateCampaignLayer();

    const profiles = await listRaceProfiles(created.campaign.id);

    expect(profiles).toHaveLength(4);

    const data = readGrimData();

    const [careers, feats] = await Promise.all([scoped.career.findMany({ where: { campaignId: created.campaign.id }, select: { id: true, name: true } }), scoped.feat.findMany({ where: { campaignId: created.campaign.id }, select: { id: true, name: true, abilities: true } })]);

    const careerIds = new Set(careers.map((c) => c.id));

    const featIds = new Set(feats.map((f) => f.id));

    const featByName = new Map(feats.map((f) => [f.name, f.id]));

    const careerByName = new Map(careers.map((c) => [c.name, c.id]));

    expect(careers).toHaveLength(data.careers.length);
    expect(feats).toHaveLength(data.feats.length);

    for (const { race, profile } of data.raceProfiles) {
      const stored = profiles.find((p) => p.profile.careerTable.length === profile.careerTable.length && p.profile.careerTable.every((r, i) => r.max === profile.careerTable[i].max));

      expect(stored, race).toBeDefined();
      expect(stored?.profile.careerTable.map((r) => r.careerId)).toEqual(profile.careerTable.map((r) => careerByName.get(r.careerId)));
      expect(stored?.profile.talents).toEqual(profile.talents.map((t) => featByName.get(t)));
      expect(stored?.profile.randomTalents.map((r) => r.featId)).toEqual(profile.randomTalents.map((r) => featByName.get(r.featId)));
    }

    for (const { profile } of profiles) {
      expect(profile.careerTable.every((r) => careerIds.has(r.careerId))).toBe(true);
      expect([...profile.talents, ...profile.randomTalents.map((r) => r.featId)].every((id) => featIds.has(id))).toBe(true);
    }

    const mechanical = data.feats.filter((f) => Array.isArray(f.abilities) && f.abilities.length > 0);

    expect(mechanical).toHaveLength(20);

    for (const feat of mechanical) expect(feats.find((f) => f.name === feat.name)?.abilities).toEqual(feat.abilities);
  });

  it("a second run is a no-op", async () => {
    const before = await rowCounts(templateId);

    const version = (await raw.campaign.findUniqueOrThrow({ where: { id: templateId }, select: { contentVersion: true } })).contentVersion;

    const result = await loadGrimTemplate({ owner: userId, allowRemote: false });

    expect(result).toMatchObject({ templateId, created: false });
    expect(await rowCounts(templateId)).toEqual(before);
    expect((await raw.campaign.findUniqueOrThrow({ where: { id: templateId }, select: { contentVersion: true } })).contentVersion).toBe(version);
  });
});
