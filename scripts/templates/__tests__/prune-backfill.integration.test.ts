import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { contentLayer } from "@/lib/db/content-layer";
import { createScopedDatabase } from "@/lib/server/content/write-context";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";

const raw = new PrismaClient({ datasources: { db: { url: singleConnectionDatabaseUrl("DATABASE_URL") } } });

const scoped = createScopedDatabase(raw.$extends(contentLayer()));

vi.mock("@/lib/db", () => ({ get prisma() { return scoped; } }));
vi.mock("@/lib/cache/tags", async (orig) => ({ ...(await orig<object>()), invalidateReference: vi.fn(), invalidateAllReference: vi.fn() }));

import { backfillSlugs } from "../lib/backfill-slugs";
import { importPack } from "../lib/import-pack";
import { backfillLocale } from "../lib/locale-backfill";

const marker = `prunebf-${randomUUID()}`;

const fixtures = path.join(__dirname, "fixtures");

const tmpDirs: string[] = [];

describe.skipIf(!isLocalDevDatabaseEnv())("template prune, slug backfill and locale backfill (fixture pack)", () => {
  let guardPassed = false;

  let templateId = "";

  let dir = "";

  const version = async () => (await raw.campaign.findUniqueOrThrow({ where: { id: templateId } })).contentVersion;

  const slugs = async () => (await raw.feat.findMany({ where: { campaignId: templateId }, select: { slug: true }, orderBy: { slug: "asc" } })).map((f) => f.slug);

  beforeAll(async () => {
    if (await raw.campaign.count({ where: { kind: "template", templateKey: "fixture-pack" } })) throw new Error("a fixture-pack template already exists in the test database");

    guardPassed = true;
    await raw.user.create({ data: { id: marker, email: `${marker}@example.invalid`, displayName: marker } });
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    dir = fs.mkdtempSync(path.join(os.tmpdir(), "prune-backfill-"));
    tmpDirs.push(dir);
    fs.cpSync(path.join(fixtures, "fixture-pack"), path.join(dir, "fixture-pack"), { recursive: true });
    templateId = (await importPack("fixture-pack", { owner: marker, dir })).templateId as string;
  });

  afterAll(async () => {
    if (!guardPassed) return void (await raw.$disconnect());

    const ids = (await raw.campaign.findMany({ where: { dmUserId: marker }, select: { id: true } })).map((c) => c.id);

    await raw.campaign.updateMany({ where: { id: { in: ids } }, data: { baseSourceId: null, createdFromId: null } });

    for (const base of ["featBase", "spellBase", "spellGroupBase"] as const) await (raw[base] as unknown as { deleteMany(args: unknown): Promise<unknown> }).deleteMany({ where: { sourceCampaignId: { in: ids } } });

    await raw.campaign.deleteMany({ where: { id: { in: ids } } });
    await raw.user.deleteMany({ where: { id: marker } });
    for (const tmp of tmpDirs) fs.rmSync(tmp, { recursive: true, force: true });
    await raw.$disconnect();
  });

  it("a row outside the pack is reported, kept without --prune, listed by a dry run and deleted with --prune", async () => {
    await raw.feat.create({ data: { campaignId: templateId, name: "Leftover", slug: "fix-leftover" } });

    const before = await version();

    const plain = await importPack("fixture-pack", { dir });

    expect(plain.outside?.map((r) => r.slug)).toEqual(["fix-leftover"]);
    expect(plain.perKind.feats.deleted).toBe(0);
    expect(await slugs()).toContain("fix-leftover");

    const dry = await importPack("fixture-pack", { dir, dryRun: true, prune: true });

    expect(dry.perKind.feats.deleted).toBe(1);
    expect(await slugs()).toContain("fix-leftover");
    expect(await version()).toBe(before);

    const pruned = await importPack("fixture-pack", { dir, prune: true });

    expect(pruned.perKind.feats.deleted).toBe(1);
    expect(await slugs()).toEqual(["fix-alert", "fix-archery"]);
    expect(await version()).toBeGreaterThan(before);

    const again = await importPack("fixture-pack", { dir, prune: true });

    expect(Object.values(again.perKind).every((c) => c.deleted === 0 && c.updated === 0 && c.created === 0)).toBe(true);
  });

  it("refuses to create a row in a kind that still has unslugged rows, and backfill-slugs repairs them from a map", async () => {
    const legacy = await raw.feat.create({ data: { campaignId: templateId, name: "Legacy feat" } });

    const file = path.join(dir, "fixture-pack", "feats.json");

    const original = fs.readFileSync(file, "utf8");

    const feats = JSON.parse(original) as { slug: string; name: string }[];

    fs.writeFileSync(file, JSON.stringify([...feats, { slug: "fix-brand-new", name: "Brand New" }]));
    fs.writeFileSync(path.join(dir, "fixture-pack", "manifest.json"), fs.readFileSync(path.join(dir, "fixture-pack", "manifest.json"), "utf8").replace(/"feats": 2/, '"feats": 3'));

    await expect(importPack("fixture-pack", { dir })).rejects.toThrow(/Refusing to create 1 feats row\(s\) while 1 row\(s\) of the template have no slug/);
    expect(await raw.feat.count({ where: { campaignId: templateId } })).toBe(3);

    const map = path.join(dir, "slugs.json");

    fs.writeFileSync(map, JSON.stringify({ feats: {} }));
    await expect(backfillSlugs("fixture-pack", { dir, slugsFile: map })).rejects.toThrow(/not in the slug map/);

    fs.writeFileSync(map, JSON.stringify({ feats: { [legacy.id]: "fix-legacy" } }));

    const before = await version();

    expect((await backfillSlugs("fixture-pack", { dir, slugsFile: map })).written).toBe(0);
    expect((await raw.feat.findUniqueOrThrow({ where: { id: legacy.id } })).slug).toBeNull();

    expect((await backfillSlugs("fixture-pack", { dir, slugsFile: map, apply: true })).written).toBe(1);
    expect((await raw.feat.findUniqueOrThrow({ where: { id: legacy.id } })).slug).toBe("fix-legacy");
    expect(await version()).toBe(before);

    const created = await importPack("fixture-pack", { dir });

    expect(created.perKind.feats.created).toBe(1);

    const pruned = await importPack("fixture-pack", { dir, prune: true });

    expect(pruned.perKind.feats.deleted).toBe(1);
    expect(await slugs()).toEqual(["fix-alert", "fix-archery", "fix-brand-new"]);
  });

  it("backfill-locale marks only clones without a locale, and only with --apply", async () => {
    const clone = (name: string, locale: string | null) => raw.campaign.create({ data: { name, dmUserId: marker, createdFromId: templateId, locale, inviteCode: `${marker}-${name}` } });

    const [bare, uk] = [await clone("bare", null), await clone("has-locale", "uk")];

    const dry = await backfillLocale("fixture-pack", { dir });

    expect(dry.ids).toEqual([bare.id]);
    expect((await raw.campaign.findUniqueOrThrow({ where: { id: bare.id } })).locale).toBeNull();

    await backfillLocale("fixture-pack", { dir, apply: true });
    expect((await raw.campaign.findUniqueOrThrow({ where: { id: bare.id } })).locale).toBe("uk");
    expect((await raw.campaign.findUniqueOrThrow({ where: { id: uk.id } })).locale).toBe("uk");
    expect((await backfillLocale("fixture-pack", { dir })).ids).toEqual([]);
  });
});
