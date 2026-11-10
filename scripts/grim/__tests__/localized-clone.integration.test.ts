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
import { GRIM_I18N_DIR } from "../i18n";
import { loadGrimTemplate } from "../load-template";
import { GRIM_SPELL_LISTS } from "../spells";

import { GRIM_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { createCampaignForUser } from "@/lib/server/campaigns/create-campaign";
import { listRaceProfiles } from "@/lib/server/races/race-profile";
import { visible } from "@/lib/server/templates/sync/__tests__/helpers";
import { classify } from "@/lib/server/templates/sync/classify";
import { loadSyncContext, type SyncDb } from "@/lib/server/templates/sync/context";
import { translateText } from "@/lib/utils/templates/i18n/overlay";
import { readTranslations } from "@/scripts/srd/i18n/store";

const marker = `grimloc-${randomUUID()}`;

const data = readGrimData();

const uk = readTranslations("uk", GRIM_I18N_DIR);

type Rows = { name: string }[];

const names = (rows: Rows) => rows.map((row) => row.name).sort();

const expectedNames = (rows: { name?: unknown }[], tr: Record<string, string>) => rows.map((row) => translateText(tr, "name", String(row.name))).sort();

describe.skipIf(!isLocalDevDatabaseEnv())("grim-d100 localized clones", () => {
  let templateId = "";

  let guardPassed = false;

  const userId = marker;

  const clones = {} as Record<"uk" | "en", string>;

  beforeAll(async () => {
    if (await raw.campaign.count({ where: { kind: "template", name: GRIM_TEMPLATE_NAME } })) throw new Error("a Grim d100 template already exists in the test database");

    guardPassed = true;

    await raw.user.create({ data: { id: userId, email: `${marker}@example.invalid`, displayName: marker } });
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterAll(async () => {
    if (!guardPassed) return void (await raw.$disconnect());

    const ids = (await raw.campaign.findMany({ where: { dmUserId: userId }, select: { id: true } })).map((c) => c.id);

    await raw.campaign.updateMany({ where: { id: { in: ids } }, data: { baseSourceId: null } });
    await raw.featBase.deleteMany({ where: { sourceCampaignId: { in: ids } } });
    await raw.spellBase.deleteMany({ where: { sourceCampaignId: { in: ids } } });
    await raw.artifactBase.deleteMany({ where: { sourceCampaignId: { in: ids } } });
    await raw.careerBase.deleteMany({ where: { sourceCampaignId: { in: ids } } });
    await raw.raceBase.deleteMany({ where: { sourceCampaignId: { in: ids } } });
    await raw.unitBase.deleteMany({ where: { sourceCampaignId: { in: ids } } });
    await raw.campaign.deleteMany({ where: { id: { in: ids } } });
    await raw.user.deleteMany({ where: { id: userId } });
    await raw.$disconnect();
  });

  it("loads the template and a second run is a no-op", async () => {
    const first = await loadGrimTemplate({ owner: userId, allowRemote: false });

    templateId = first.templateId;
    expect(first.created).toBe(true);

    const second = await loadGrimTemplate({ owner: userId, allowRemote: false });

    expect(second.published).toEqual({ added: 0, changed: 0, removed: 0 });
  });

  it.each([["uk" as const], ["en" as const]])("clones the %s locale with translated rows", async (locale) => {
    const created = await createCampaignForUser(userId, { name: `${marker}-${locale}`, templateId, contentLocale: locale }, { defer: () => undefined });

    if (!created.ok) throw new Error("clone failed");

    invalidateCampaignLayer();

    const campaignId = created.campaign.id;

    clones[locale] = campaignId;

    const tr = locale === "uk" ? uk : {};

    const where = { campaignId };

    const [careers, spells, units, artifacts, feats, races, campaign] = await Promise.all([
      scoped.career.findMany({ where, select: { name: true } }),
      scoped.spell.findMany({ where, select: { name: true, lists: true } }),
      scoped.unit.findMany({ where, select: { name: true } }),
      scoped.artifact.findMany({ where, select: { name: true } }),
      scoped.feat.findMany({ where, select: { name: true } }),
      scoped.race.findMany({ where, select: { name: true } }),
      raw.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { locale: true, rules: true } }),
    ]);

    expect(campaign.locale).toBe(locale);

    for (const [rows, source] of [[careers, data.careers], [spells, data.spells], [units, data.units], [artifacts, data.artifacts], [feats, data.feats], [races, data.races]] as const) {
      expect(rows).toHaveLength(source.length);
      expect(names(rows)).toEqual(expectedNames(source, tr));
    }

    const minor = (campaign.rules as { tables: { miscastMinor: { text: string }[] } }).tables.miscastMinor[0].text;

    expect(minor).toBe(translateText(tr, "text", (data.rules?.tables as { miscastMinor: { text: string }[] }).miscastMinor[0].text));

    if (locale === "uk") {
      const known = new Set(Object.values(GRIM_SPELL_LISTS).flat().map((list) => translateText(uk, "name", list)));

      for (const spell of spells) expect(known.has((spell.lists as string[])[0]), spell.name).toBe(true);
    }
  });

  it("keeps the species profile structure identical across locales", async () => {
    const normalized = async (campaignId: string) => {
      const [careers, feats, races] = await Promise.all([
        scoped.career.findMany({ where: { campaignId }, select: { id: true, name: true } }),
        scoped.feat.findMany({ where: { campaignId }, select: { id: true, name: true } }),
        scoped.race.findMany({ where: { campaignId }, select: { id: true, name: true } }),
      ]);

      const pos = (rows: { id: string; name: string }[], source: { name?: unknown }[]) => {
        const order = new Map(source.flatMap((row, index) => [[String(row.name), index], [translateText(uk, "name", String(row.name)), index]] as const));

        return new Map(rows.map((row) => [row.id, order.get(row.name)]));
      };

      const careerPos = pos(careers, data.careers);

      const featPos = pos(feats, data.feats);

      const racePos = pos(races, data.races);

      const profiles = await listRaceProfiles(campaignId);

      return profiles
        .map(({ raceId, profile }) => ({
          race: racePos.get(raceId),
          careerTable: profile.careerTable.map((r) => ({ max: r.max, career: careerPos.get(r.careerId) })),
          talents: profile.talents.map((id) => featPos.get(id)),
          randomTalents: profile.randomTalents.map((r) => featPos.get(r.featId)),
        }))
        .sort((a, b) => Number(a.race) - Number(b.race));
    };

    expect(await normalized(clones.uk)).toEqual(await normalized(clones.en));
  });

  it("clones are in sync with the template", async () => {
    for (const locale of ["uk", "en"] as const) expect(visible(classify(await loadSyncContext(scoped as unknown as SyncDb, clones[locale]))), locale).toEqual([]);
  });
});
