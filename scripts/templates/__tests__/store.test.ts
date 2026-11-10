import { beforeEach, describe, expect, it, vi } from "vitest";

import { readManifest } from "../lib/pack";
import { ensureTemplate, makeTemplateStore, planKeyBackfill, type TemplateStore } from "../lib/store";

import { SRD_RULES } from "@/scripts/srd/lib/rules-preset";

const findMany = vi.fn();

const findFirst = vi.fn();

const findUniqueOrThrow = vi.fn();

const update = vi.fn();

const createCampaignFromBundle = vi.fn();

vi.mock("@/lib/db", () => ({ prisma: { campaign: { findMany: (...a: unknown[]) => findMany(...a), findFirst: (...a: unknown[]) => findFirst(...a), findUniqueOrThrow: (...a: unknown[]) => findUniqueOrThrow(...a), update: (...a: unknown[]) => update(...a) } } }));
vi.mock("@/lib/server/campaigns/create-campaign", () => ({ createCampaignFromBundle: (...a: unknown[]) => createCampaignFromBundle(...a) }));

const srd = readManifest("srd-5.2");

type Where = Record<string, unknown> & { AND?: Where[]; OR?: Where[] };

type Row = { id: string; dmUserId: string; name: string; templateKey: string | null; locale: string | null };

const matches = (row: Row, where: Where): boolean =>
  Object.entries(where).every(([key, value]) => {
    if (key === "AND") return (value as Where[]).every((condition) => matches(row, condition));

    if (key === "OR") return (value as Where[]).some((condition) => matches(row, condition));

    if (key === "kind" || key === "visibility") return true;

    return row[key as keyof Row] === value;
  });

const seed = (rows: Row[]) => findMany.mockImplementation(async ({ where }: { where: Where }) => rows.filter((row) => matches(row, where)).map(({ id, dmUserId }) => ({ id, dmUserId })));

const row = (over: Partial<Row> = {}): Row => ({ id: "t1", dmUserId: "owner", name: "5e SRD 5.2", templateKey: "srd-5.2", locale: "en", ...over });

beforeEach(() => {
  for (const mock of [findMany, findFirst, findUniqueOrThrow, update, createCampaignFromBundle]) mock.mockReset();
});

describe("template store: findTemplate", () => {
  it.each([
    ["new key", row()],
    ["legacy name as key", row({ templateKey: "5e SRD 5.2" })],
    ["no key, legacy name", row({ templateKey: null, locale: null })],
  ])("finds the template by %s", async (_label, existing) => {
    seed([existing]);
    expect(await makeTemplateStore(srd).findTemplate()).toEqual({ id: "t1", dmUserId: "owner" });
  });

  it("does not adopt a same-name source with another key", async () => {
    seed([row({ templateKey: "another-source" })]);
    expect(await makeTemplateStore(srd).findTemplate()).toBeNull();
  });

  it("rejects duplicate candidates instead of picking one", async () => {
    seed([row(), row({ id: "t2", templateKey: null })]);
    await expect(makeTemplateStore(srd).findTemplate()).rejects.toThrow(/Ambiguous/);
  });

  it("keeps locales apart", async () => {
    seed([row({ locale: "uk" })]);
    expect(await makeTemplateStore(srd).findTemplate()).toBeNull();
    expect(await makeTemplateStore(srd, "uk").findTemplate()).toEqual({ id: "t1", dmUserId: "owner" });
  });
});

describe("template store: create and update", () => {
  it("creates with the manifest name and a key that differs from it", async () => {
    createCampaignFromBundle.mockResolvedValue({ campaign: { id: "new", dmUserId: "me" } });

    expect(await makeTemplateStore(srd).create({ userId: "me", rules: SRD_RULES, credits: "C" })).toEqual({ id: "new", dmUserId: "me" });
    expect(createCampaignFromBundle).toHaveBeenCalledWith(expect.objectContaining({ name: "5e SRD 5.2" }));
    expect(update).toHaveBeenCalledWith({ where: { id: "new" }, data: { locale: "en", templateKey: "srd-5.2" } });
  });

  const current = (over = {}) => ({ dmUserId: "owner", rules: JSON.parse(JSON.stringify(SRD_RULES)), credits: "C", description: "D", locale: "en", templateKey: "srd-5.2", ...over });

  it("no write when nothing changed", async () => {
    findUniqueOrThrow.mockResolvedValue(current());
    await makeTemplateStore(srd).update("t1", { rules: SRD_RULES, credits: "C", description: "D" });
    expect(update).not.toHaveBeenCalled();
  });

  it("heals a legacy key without bumping contentVersion", async () => {
    findUniqueOrThrow.mockResolvedValue(current({ templateKey: "5e SRD 5.2" }));
    await makeTemplateStore(srd).update("t1", { rules: SRD_RULES, credits: "C", description: "D" });

    const { data } = update.mock.calls[0][0];

    expect(data.templateKey).toBe("srd-5.2");
    expect(data.contentVersion).toBeUndefined();
  });

  it("bumps contentVersion when content changed", async () => {
    findUniqueOrThrow.mockResolvedValue(current({ credits: "old" }));
    await makeTemplateStore(srd).update("t1", { rules: SRD_RULES, credits: "C", description: "D" });
    expect(update.mock.calls[0][0].data.contentVersion).toEqual({ increment: 1 });
  });
});

describe("ensureTemplate", () => {
  const store = (over: Partial<TemplateStore> = {}): TemplateStore => ({
    findTemplate: vi.fn(async () => null),
    findOfficialOwner: vi.fn(async () => null),
    create: vi.fn(async ({ userId }: { userId: string }) => ({ id: "t-new", dmUserId: userId })),
    update: vi.fn(async (id: string) => ({ id, dmUserId: "u1" })),
    ...over,
  });

  const opts = { rules: SRD_RULES, credits: "CREDITS" };

  it("existing template: rewritten, nothing created", async () => {
    const s = store({ findTemplate: vi.fn(async () => ({ id: "t1", dmUserId: "u1" })) });

    expect(await ensureTemplate(s, opts)).toEqual({ id: "t1", dmUserId: "u1", created: false });
    expect(s.update).toHaveBeenCalledWith("t1", expect.objectContaining({ rules: SRD_RULES, credits: "CREDITS" }));
    expect(s.create).not.toHaveBeenCalled();
  });

  it("new template: owner from --owner, else the owner of an official template, else an error", async () => {
    const withOwner = store();

    expect(await ensureTemplate(withOwner, { ...opts, owner: "me", description: "D" })).toEqual({ id: "t-new", dmUserId: "me", created: true });
    expect(withOwner.create).toHaveBeenCalledWith({ userId: "me", rules: SRD_RULES, credits: "CREDITS", description: "D" });

    expect((await ensureTemplate(store({ findOfficialOwner: vi.fn(async () => "homm-owner") }), opts)).dmUserId).toBe("homm-owner");
    await expect(ensureTemplate(store(), opts)).rejects.toThrow(/--owner/);
  });
});

describe("planKeyBackfill", () => {
  const rows = [
    { id: "1", name: "5e SRD 5.2", templateKey: "5e SRD 5.2", locale: "en" },
    { id: "2", name: "5e SRD 5.2", templateKey: "5e SRD 5.2", locale: "uk" },
    { id: "3", name: "Heroes", templateKey: null, locale: null },
    { id: "4", name: "5e (empty)", templateKey: "5e (empty)", locale: null },
    { id: "5", name: "Grim d100 (empty)", templateKey: null, locale: null },
  ];

  it("maps the five legacy rows to pack keys", () => {
    expect(planKeyBackfill(rows)).toEqual([
      { id: "1", from: "5e SRD 5.2", to: "srd-5.2" },
      { id: "2", from: "5e SRD 5.2", to: "srd-5.2" },
      { id: "3", from: null, to: "heroes-homm" },
      { id: "4", from: "5e (empty)", to: "srd-5.2-empty" },
      { id: "5", from: null, to: "grim-d100-empty" },
    ]);
  });

  it("skips migrated rows and unknown names", () => {
    expect(planKeyBackfill([{ id: "1", name: "5e SRD 5.2", templateKey: "srd-5.2", locale: "en" }, { id: "2", name: "Custom", templateKey: null, locale: null }, { id: "3", name: "5e SRD 5.2", templateKey: "another-source", locale: "en" }])).toEqual([]);
  });
});
