import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { contentLayer } from "@/lib/db/content-layer";
import { runContentWriteContext } from "@/lib/server/content/write-context";
import { publishTemplateVersion } from "@/lib/server/templates/publish";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";

const raw = new PrismaClient({ datasources: { db: { url: singleConnectionDatabaseUrl("DATABASE_URL") } } });

const db = raw.$extends(contentLayer());

const R = raw as unknown as Record<string, any>;

const marker = `publish-${randomUUID()}`;

const ids = { user: marker, template: `${marker}-tpl`, other: `${marker}-other` };

interface Fixture { delegate: string; base: string; label: string; required: Record<string, unknown> }

const FIXTURES: Fixture[] = [
  { delegate: "unit", base: "unitBase", label: "name", required: {} },
  { delegate: "spell", base: "spellBase", label: "name", required: { type: "damage", damageType: "fire" } },
  { delegate: "spellGroup", base: "spellGroupBase", label: "name", required: {} },
  { delegate: "artifact", base: "artifactBase", label: "name", required: { slot: "ring" } },
  { delegate: "artifactSet", base: "artifactSetBase", label: "name", required: {} },
  { delegate: "skillTree", base: "skillTreeBase", label: "race", required: {} },
  { delegate: "campaignTrack", base: "campaignTrackBase", label: "title", required: { kind: "youtube" } },
  { delegate: "skill", base: "skillBase", label: "name", required: {} },
  { delegate: "race", base: "raceBase", label: "name", required: { updatedAt: new Date() } },
  { delegate: "gameClass", base: "gameClassBase", label: "name", required: { updatedAt: new Date() } },
  { delegate: "feat", base: "featBase", label: "name", required: { updatedAt: new Date() } },
  { delegate: "background", base: "backgroundBase", label: "name", required: { updatedAt: new Date() } },
  { delegate: "mainSkill", base: "mainSkillBase", label: "name", required: { color: "#fff", updatedAt: new Date() } },
];

const rid = (f: Fixture) => `${marker}-${f.delegate}`;

const publish = (campaignId = ids.template) => db.$transaction((tx) => runContentWriteContext(campaignId, tx, () => publishTemplateVersion(tx, campaignId)), { timeout: 60_000 });

const history = (f: Fixture) => R[f.base].findMany({ where: { sourceCampaignId: ids.template, id: rid(f) }, orderBy: { validFrom: "asc" } });

const spell = FIXTURES[1];

const version = async () => (await raw.campaign.findUniqueOrThrow({ where: { id: ids.template }, select: { contentVersion: true } })).contentVersion;

describe.skipIf(!isLocalDevDatabaseEnv())("publishTemplateVersion", () => {
  beforeAll(async () => {
    await raw.user.create({ data: { id: ids.user, email: `${marker}@example.invalid`, displayName: marker } });

    for (const id of [ids.template, ids.other]) await raw.campaign.create({ data: { id, name: id, dmUserId: ids.user, inviteCode: randomUUID(), kind: "template" } });

    for (const f of FIXTURES) await R[f.delegate].create({ data: { id: rid(f), campaignId: ids.template, [f.label]: `${f.delegate} one`, ...f.required } });
  });

  afterAll(async () => {
    for (const f of FIXTURES) {
      await R[f.delegate].deleteMany({ where: { campaignId: { startsWith: marker } } });
      await R[f.base].deleteMany({ where: { sourceCampaignId: { startsWith: marker } } });
    }

    await raw.campaign.deleteMany({ where: { id: { startsWith: marker } } });
    await raw.user.delete({ where: { id: ids.user } });
    await raw.$disconnect();
  });

  it("first publish writes every row of all 13 models as open rows of the new version", async () => {
    const result = await publish();

    expect(result).toEqual({ version: 1, added: 13, changed: 0, removed: 0 });

    for (const f of FIXTURES) {
      const rows = await history(f);

      expect(rows, f.delegate).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id: rid(f), sourceCampaignId: ids.template, validFrom: 1, validTo: null, [f.label]: `${f.delegate} one` });
    }
  });

  it("publishing without changes does nothing and does not grow the version", async () => {
    expect(await publish()).toEqual({ version: 1, added: 0, changed: 0, removed: 0 });
    expect(await version()).toBe(1);
    expect(await history(spell)).toHaveLength(1);
  });

  it("one changed row closes the old row and opens a new one", async () => {
    await raw.spell.update({ where: { id: rid(spell) }, data: { name: "spell two" } });

    expect(await publish()).toEqual({ version: 2, added: 0, changed: 1, removed: 0 });

    const rows = await history(spell);

    expect(rows.map((r: any) => [r.name, r.validFrom, r.validTo])).toEqual([["spell one", 1, 2], ["spell two", 2, null]]);

    for (const f of FIXTURES.filter((x) => x !== spell)) expect(await history(f), f.delegate).toHaveLength(1);
  });

  it("a deleted row is closed, not removed, and a new row counts as added", async () => {
    await raw.unit.delete({ where: { id: rid(FIXTURES[0]) } });
    await raw.spellGroup.create({ data: { id: `${marker}-extra`, campaignId: ids.template, name: "extra" } });

    expect(await publish()).toEqual({ version: 3, added: 1, changed: 0, removed: 1 });

    const [unit] = await history(FIXTURES[0]);

    expect(unit).toMatchObject({ validFrom: 1, validTo: 3 });
    expect(await raw.spellGroupBase.count({ where: { sourceCampaignId: ids.template, validTo: null } })).toBe(2);
  });

  it("base rows belong to the template that published them", async () => {
    expect(await publish(ids.other)).toMatchObject({ added: 0, changed: 0, removed: 0 });
    expect(await raw.spellBase.count({ where: { sourceCampaignId: ids.other } })).toBe(0);
  });
});
