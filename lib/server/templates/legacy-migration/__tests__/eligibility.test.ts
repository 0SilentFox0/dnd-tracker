import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkEligibility, PROTECTED_CAMPAIGN_IDS } from "../eligibility";

import { SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { layeredModels } from "@/lib/db/layer/config";
import { BUNDLE_TABLES } from "@/lib/server/templates/bundle";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
import { createFakeSyncDb } from "@/lib/server/templates/sync/__tests__/fake-sync-db";
import { id } from "@/lib/server/templates/sync/__tests__/helpers";

const dictionary = vi.hoisted(() => ({ values: {} as Record<string, string> }));

vi.mock("@/lib/server/templates/srd-translations", () => ({ translationsFor: (locale: string) => locale === "uk" ? dictionary.values : {} }));

type Row = Record<string, unknown>;

const SOURCE = "source", CLONE = "clone", spell = id("s");

let f: ReturnType<typeof createFakeSyncDb>;

let baseRows: Map<string, Row[]>;

let battles: Row[];

function makeDb() {
  const db = f.db as unknown as Record<string, unknown>;

  const campaign = db.campaign as Record<string, unknown>;

  campaign.count = async ({ where }: { where: { createdFromId: string } }) => f.campaigns.filter((c) => c.createdFromId === where.createdFromId).length;

  db.battleScene = { count: async ({ where }: { where: { campaignId: string; status: string } }) => battles.filter((b) => b.campaignId === where.campaignId && b.status === where.status).length };

  for (const t of BUNDLE_TABLES) {
    const name = layeredModels()[t.model].base;

    const aggregate = (db[name] as { aggregate: unknown }).aggregate;

    db[name] = { aggregate, findMany: async () => (baseRows.get(t.key) ?? []).map((r) => structuredClone(r)) };
  }

  return db;
}

async function publish(version: number) {
  const bundle = await exportCampaign(f.db, SOURCE);

  for (const t of BUNDLE_TABLES) baseRows.set(t.key, bundle[t.key].map((r) => ({ ...r, sourceCampaignId: SOURCE, validFrom: version, validTo: null })));

  f.publish(SOURCE, version);
  f.patchCampaign(SOURCE, { contentVersion: version });
}

beforeEach(() => {
  f = createFakeSyncDb();
  baseRows = new Map();
  battles = [];
  dictionary.values = {};
  f.addCampaign({ id: SOURCE, kind: "template", visibility: "official", templateKey: SRD_TEMPLATE_NAME, locale: "en", contentVersion: 1 });
  f.addRow("spell", { id: spell, campaignId: SOURCE, name: "Bless" });
  f.addCampaign({ id: CLONE, kind: "campaign", createdFromId: SOURCE, locale: "en" });
  makeDb();
});

const check = (campaignId = CLONE) => checkEligibility(f.db, campaignId);

const reason = async (campaignId = CLONE) => {
  const r = await check(campaignId);

  return r.ok ? "ok" : r.reason;
};

describe("checkEligibility", () => {
  it("accepts a clone of a fully published template", async () => {
    await publish(3);

    expect(await check()).toEqual({ ok: true, sourceId: SOURCE, version: 3 });
  });

  it("ALREADY_LAYERED", async () => {
    await publish(3);
    f.patchCampaign(CLONE, { baseSourceId: SOURCE, baseVersion: 3 });

    expect(await reason()).toBe("ALREADY_LAYERED");
  });

  it("PROTECTED beats a valid source", async () => {
    await publish(3);

    const [homm] = [...PROTECTED_CAMPAIGN_IDS];

    f.addCampaign({ id: homm, kind: "campaign", createdFromId: SOURCE });

    expect(PROTECTED_CAMPAIGN_IDS.has("cmuylhk0c0001ia06lg5eommv")).toBe(true);
    expect(await reason(homm)).toBe("PROTECTED");
  });

  it("IS_TEMPLATE", async () => {
    await publish(3);
    f.patchCampaign(CLONE, { kind: "template" });

    expect(await reason()).toBe("IS_TEMPLATE");
  });

  it("NO_SOURCE", async () => {
    f.patchCampaign(CLONE, { createdFromId: null });

    expect(await reason()).toBe("NO_SOURCE");
  });

  it("SOURCE_MISSING", async () => {
    f.patchCampaign(CLONE, { createdFromId: "gone" });

    expect(await reason()).toBe("SOURCE_MISSING");
  });

  it("SOURCE_NOT_TEMPLATE", async () => {
    f.patchCampaign(SOURCE, { kind: "campaign" });

    expect(await reason()).toBe("SOURCE_NOT_TEMPLATE");
  });

  it("SOURCE_LAYERED", async () => {
    f.patchCampaign(SOURCE, { baseSourceId: "x" });

    expect(await reason()).toBe("SOURCE_LAYERED");
  });

  it("SOURCE_NOT_PUBLISHED", async () => {
    expect(await reason()).toBe("SOURCE_NOT_PUBLISHED");
  });

  it("SOURCE_UNPUBLISHED_CHANGES when contentVersion is ahead of the last publication", async () => {
    await publish(3);
    f.patchCampaign(SOURCE, { contentVersion: 4 });

    expect(await reason()).toBe("SOURCE_UNPUBLISHED_CHANGES");
  });

  it("SOURCE_UNPUBLISHED_CHANGES when an exported row differs from the open base row", async () => {
    await publish(3);
    f.patchRow("spell", spell, { name: "Bless II" });

    expect(await reason()).toBe("SOURCE_UNPUBLISHED_CHANGES");
  });

  it("SOURCE_UNPUBLISHED_CHANGES when a template row has no open base row", async () => {
    await publish(3);
    f.addRow("spell", { id: id("n"), campaignId: SOURCE, name: "New" });

    expect(await reason()).toBe("SOURCE_UNPUBLISHED_CHANGES");
  });

  it("LOCALIZED_CONTENT for an SRD clone with a translation dictionary", async () => {
    await publish(3);
    dictionary.values = { a: "b" };
    f.patchCampaign(CLONE, { locale: "uk" });

    expect(await reason()).toBe("LOCALIZED_CONTENT");
  });

  it("an English SRD clone is not localized", async () => {
    await publish(3);
    dictionary.values = { a: "b" };

    expect(await reason()).toBe("ok");
  });

  it("HAS_DERIVED_CAMPAIGNS", async () => {
    await publish(3);
    f.addCampaign({ id: "grandchild", kind: "campaign", createdFromId: CLONE });

    expect(await reason()).toBe("HAS_DERIVED_CAMPAIGNS");
  });

  it("ACTIVE_BATTLE", async () => {
    await publish(3);
    battles.push({ campaignId: CLONE, status: "active" });

    expect(await reason()).toBe("ACTIVE_BATTLE");
  });

  it("a prepared battle does not block", async () => {
    await publish(3);
    battles.push({ campaignId: CLONE, status: "prepared" });

    expect(await reason()).toBe("ok");
  });
});
