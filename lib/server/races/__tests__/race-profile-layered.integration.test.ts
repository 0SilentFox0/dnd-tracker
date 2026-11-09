import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { contentLayer, invalidateCampaignLayer } from "@/lib/db/content-layer";
import { createScopedDatabase } from "@/lib/server/content/write-context";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";

const raw = new PrismaClient({ datasources: { db: { url: singleConnectionDatabaseUrl("DATABASE_URL") } } });

const scoped = createScopedDatabase(raw.$extends(contentLayer()));

vi.mock("@/lib/db", () => ({ get prisma() { return scoped; } }));
vi.mock("@/lib/cache/tags", async (orig) => ({ ...(await orig<object>()), invalidateReference: vi.fn() }));
vi.mock("@/lib/server/campaigns/version", () => ({ bumpContentVersion: vi.fn() }));

import { profileReferences } from "@/lib/server/races/profile-usage";
import { listRaceProfiles, saveRaceProfile } from "@/lib/server/races/race-profile";

const marker = `rprof-${randomUUID()}`;

const ids = { user: marker, template: `${marker}-tpl`, clone: `${marker}-clone`, race: `${marker}-race`, plain: `${marker}-plain`, career: `${marker}-career`, feat: `${marker}-feat` };

const profile = { mods: { ws: 2 }, move: 4, fate: 2, extraWounds: 0, talents: [ids.feat], randomTalentCount: 0, randomTalents: [], careerTable: [{ max: 100, careerId: ids.career }] };

const campaign = (id: string, extra: object = {}) => raw.campaign.create({ data: { id, name: id, dmUserId: ids.user, inviteCode: randomUUID(), ...extra } });

describe.skipIf(!isLocalDevDatabaseEnv())("race profile over layers", () => {
  beforeAll(async () => {
    await raw.user.create({ data: { id: ids.user, email: `${marker}@example.invalid`, displayName: marker } });
    await campaign(ids.template);
    await campaign(ids.clone, { baseSourceId: ids.template, baseVersion: 1 });
    await campaign(ids.plain);

    const base = { sourceCampaignId: ids.template, validFrom: 1, updatedAt: new Date() };

    await raw.raceBase.create({ data: { id: ids.race, name: "Dwarf", profile, ...base } });
    await raw.careerBase.create({ data: { id: ids.career, name: "Miner", ...base } });
    await raw.featBase.create({ data: { id: ids.feat, name: "Stout", ...base } });
    await raw.race.create({ data: { id: `${marker}-local`, campaignId: ids.plain, name: "Elf" } });
    invalidateCampaignLayer();
  });

  afterAll(async () => {
    await raw.race.deleteMany({ where: { campaignId: { startsWith: marker } } });
    await raw.raceBase.deleteMany({ where: { sourceCampaignId: ids.template } });
    await raw.careerBase.deleteMany({ where: { sourceCampaignId: ids.template } });
    await raw.featBase.deleteMany({ where: { sourceCampaignId: ids.template } });
    await raw.campaign.deleteMany({ where: { id: { startsWith: marker } } });
    await raw.user.deleteMany({ where: { id: ids.user } });
    await raw.$disconnect();
  });

  it("lists a base species profile for a clone without a local row", async () => {
    expect(await raw.race.count({ where: { campaignId: ids.clone } })).toBe(0);
    expect(await listRaceProfiles(ids.clone)).toEqual([{ raceId: ids.race, profile }]);
  });

  it("profileReferences sees the career and talent of the base profile", async () => {
    expect(await profileReferences(ids.clone, { careerId: ids.career })).toBe(true);
    expect(await profileReferences(ids.clone, { featId: ids.feat })).toBe(true);
    expect(await profileReferences(ids.clone, { careerId: "none" })).toBe(false);
  });

  it("save on a base species creates an override and keeps the base id public", async () => {
    const next = { ...profile, move: 5 };

    expect(await saveRaceProfile(ids.clone, ids.race, next)).toEqual({ raceId: ids.race, profile: next });
    expect(await listRaceProfiles(ids.clone)).toEqual([{ raceId: ids.race, profile: next }]);

    const stored = await raw.race.findMany({ where: { campaignId: ids.clone } });

    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ sourceId: ids.race, name: "Dwarf" });
    expect(stored[0].id).not.toBe(ids.race);
    expect((await raw.raceBase.findFirst({ where: { id: ids.race } }))?.profile).toEqual(profile);
  });

  it("save on a local species updates it in place", async () => {
    const local = { ...profile, talents: [], careerTable: [] };

    await saveRaceProfile(ids.plain, `${marker}-local`, local);

    expect(await listRaceProfiles(ids.plain)).toEqual([{ raceId: `${marker}-local`, profile: local }]);
  });
});
