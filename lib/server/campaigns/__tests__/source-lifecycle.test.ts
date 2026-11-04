import { beforeEach, describe, expect, it, vi } from "vitest";

import { SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { campaignState, runCampaignOperation } from "@/lib/server/campaigns/action-service";
import { createCampaignForUser } from "@/lib/server/campaigns/create-campaign";
import { BUNDLE_TABLES, emptyBundle } from "@/lib/server/templates/bundle";
import { createFakeSyncDb } from "@/lib/server/templates/sync/__tests__/fake-sync-db";
import { id } from "@/lib/server/templates/sync/__tests__/helpers";
import { classify } from "@/lib/server/templates/sync/classify";
import { loadSyncContext } from "@/lib/server/templates/sync/context";
import { hashText } from "@/lib/srd/i18n/catalog";
import { requestDigest } from "@/lib/utils/battle/store/stable-json";

const h = vi.hoisted(() => ({ base: {} as Record<string, unknown>, dictionary: {} as Record<string, string> }));

vi.mock("@/lib/db", async () => {
  const { createScopedDatabase } = await import("@/lib/server/content/write-context");

  return { prisma: createScopedDatabase(new Proxy({}, { get: (_target, key) => Reflect.get(h.base, key) })) };
});
vi.mock("@/lib/cache/campaign-list", () => ({ invalidateCampaignLists: vi.fn() }));
vi.mock("@/lib/cache/tags", () => ({ invalidateAllReference: vi.fn() }));
vi.mock("@/lib/i18n/translator", () => ({ getTranslator: vi.fn(async () => (key: string) => key) }));
vi.mock("@/lib/server/templates/srd-translations", () => ({ translationsFor: (locale: string) => locale === "uk" ? h.dictionary : {} }));

const actor = { campaignId: "home", userId: "dm", isDM: true, via: "session" as const, scopes: null };

const official = { kind: "template", visibility: "official", templateKey: SRD_TEMPLATE_NAME, members: [] };

let f: ReturnType<typeof createFakeSyncDb>;

let createdCount: number;

beforeEach(() => {
  f = createFakeSyncDb();
  createdCount = 0;
  h.dictionary = { [hashText("n", "Bless")]: "Благословення" };
  f.addCampaign({ id: "home", name: "Home", kind: "campaign", members: [{ role: "dm" }], locale: "uk" });
  f.addCampaign({ id: "canonical", ...official, locale: "en" });
  f.addCampaign({ id: "legacy", ...official, locale: "uk" });
  f.addRow("spell", { id: id("s"), campaignId: "canonical", name: "Bless" });

  const tx = f.db as unknown as Record<string, unknown>;

  tx.campaignMember = { findMany: vi.fn(async () => []) };
  tx.$queryRaw = vi.fn(async () => [{ id: "home" }]);
  Object.assign(f.db.campaign, { create: vi.fn(async ({ data }) => {
    const id = `created-${++createdCount}`;

    f.addCampaign({ ...data, id, members: [{ role: "dm" }] });

    return f.campaign(id);
  }) });
  Object.assign(f.db.campaignSourceSync, { create: vi.fn(async ({ data }) => f.syncs.set(data.campaignId, data)) });
  h.base = { ...tx, $transaction: vi.fn(async (callback) => callback(f.db)) };
});

describe("source lifecycle through the database boundary", () => {
  it("locks canonical source, checks preview and imports in a single content-write transaction", async () => {
    const input = { name: "N", templateId: "legacy" };

    const expected = requestDigest(await campaignState(actor, "create", input));

    vi.mocked(h.base.$transaction as ReturnType<typeof vi.fn>).mockClear();

    const reads = vi.spyOn(f.db.spell, "findMany");

    const result = await runCampaignOperation(actor, "create", input, expected, "en");

    expect(h.base.$transaction).toHaveBeenCalledTimes(1);
    expect(reads.mock.calls.filter(([args]) => args?.where?.campaignId === "canonical")).toHaveLength(1);
    expect((f.db as unknown as { $queryRaw: ReturnType<typeof vi.fn> }).$queryRaw.mock.calls.some((args) => args[1] === "canonical")).toBe(true);

    const createdId = (result.data as { id: string }).id;

    expect(f.campaign(createdId)).toMatchObject({ createdFromId: "canonical", locale: "uk" });
    expect((f.store.get("spell") ?? []).find((r) => r.campaignId === createdId)).toMatchObject({ name: "Благословення", sourceId: id("s") });
    expect(classify(await loadSyncContext(f.db, createdId))).toEqual([]);
  });
  it("uses an exact prepared bundle without exporting or localizing it again", async () => {
    const bundle = { ...emptyBundle(), spells: [{ id: id("x"), name: "Already localized" }] };

    const reads = BUNDLE_TABLES.map((t) => vi.spyOn(f.db[t.delegate], "findMany"));

    const created = await createCampaignForUser("dm", { name: "N" }, { source: { id: "canonical", bundle, contentLocale: "uk", contentVersion: 0, source: official }, defer: () => {} });

    expect(created.ok).toBe(true);
    expect(reads.every((spy) => spy.mock.calls.every(([args]) => (args as { where: { campaignId?: string } }).where.campaignId !== "canonical"))).toBe(true);
    expect((f.store.get("spell") ?? []).find((r) => r.campaignId === "created-1")).toMatchObject({ name: "Already localized", sourceId: id("x") });
  });
  it("private copy to template to clone retains stored text, null/uk locale and immediate lineage", async () => {
    for (const locale of [null, "uk"]) {
      f.patchCampaign("home", { locale });
      f.addRow("spell", { id: id(locale === "uk" ? "u" : "n"), campaignId: "home", name: "Bless" });

      const saved = await runCampaignOperation(actor, "template.save", { name: "Saved" });

      const savedId = (saved.data as { id: string }).id;

      expect(f.campaign(savedId)).toMatchObject({ locale, createdFromId: "home", visibility: "private" });
      expect(f.campaign(savedId).templateKey).toBeUndefined();

      const created = await createCampaignForUser("dm", { name: "Child", templateId: savedId }, { defer: () => {} });

      if (!created.ok) throw new Error("Creation failed");

      expect(created.campaign).toMatchObject({ locale, createdFromId: savedId });
      expect((f.store.get("spell") ?? []).filter((r) => r.campaignId === created.campaign.id).every((r) => r.name === "Bless")).toBe(true);
    }
  });
});
