import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { contentLayer } from "@/lib/db/content-layer";
import { createScopedDatabase } from "@/lib/server/content/write-context";
import { tableKey } from "@/lib/server/templates/bundle";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";
import { weaponStatsFromRow } from "@/lib/utils/artifacts/weapon-stats";

const raw = new PrismaClient({ datasources: { db: { url: singleConnectionDatabaseUrl("DATABASE_URL") } } });

const scoped = createScopedDatabase(raw.$extends(contentLayer()));

vi.mock("@/lib/db", () => ({ get prisma() { return scoped; } }));
vi.mock("@/lib/cache/tags", async (orig) => ({ ...(await orig<object>()), invalidateReference: vi.fn(), invalidateAllReference: vi.fn() }));

import { bundleToPack, type SlugMap } from "../lib/export";
import { importPack } from "../lib/import-pack";
import { readPack } from "../lib/pack";
import { snapshotCampaign } from "../lib/snapshot";

const marker = `heroesrt-${randomUUID()}`;

const tmpDirs: string[] = [];

const pack = readPack("heroes-homm");

const liveTemplate = isLocalDevDatabaseEnv() ? await raw.campaign.findFirst({ where: { kind: "template", templateKey: "heroes-homm" }, select: { id: true } }) : null;

const unchanged = (result: Awaited<ReturnType<typeof importPack>>) => Object.values(result.perKind).every((c) => c.created === 0 && c.updated === 0 && c.errors === 0);

describe.skipIf(!isLocalDevDatabaseEnv())("heroes-homm pack", () => {
  let freshId = "";

  let freshDir = "";

  let key = "";

  beforeAll(() => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterAll(async () => {
    const ids = (await raw.campaign.findMany({ where: { dmUserId: marker }, select: { id: true } })).map((c) => c.id);

    await raw.campaign.updateMany({ where: { id: { in: ids } }, data: { baseSourceId: null } });
    await raw.campaign.deleteMany({ where: { id: { in: ids } } });
    await raw.user.deleteMany({ where: { id: marker } });
    for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
    await raw.$disconnect();
  });

  it("imports into an empty template: every row is created, tree ids resolve, a rerun changes nothing", async () => {
    await raw.user.create({ data: { id: marker, email: `${marker}@example.invalid`, displayName: marker } });

    freshDir = fs.mkdtempSync(path.join(os.tmpdir(), "heroes-pack-"));
    tmpDirs.push(freshDir);

    key = `heroes-rt-${marker.slice(-8)}`;

    fs.cpSync(path.join(process.cwd(), "data/templates/heroes-homm"), path.join(freshDir, key), { recursive: true });
    fs.writeFileSync(path.join(freshDir, key, "manifest.json"), JSON.stringify({ ...pack.manifest, key, names: { en: key, uk: key } }));

    const first = await importPack(key, { owner: marker, dir: freshDir });

    freshId = first.templateId as string;

    expect(first.created).toBe(true);
    expect(Object.fromEntries(Object.entries(first.perKind).map(([kind, c]) => [kind, c.created]))).toEqual(pack.manifest.counts);
    expect(Object.values(first.perKind).every((c) => c.errors === 0)).toBe(true);

    const trees = await raw.skillTree.findMany({ where: { campaignId: freshId } });

    const skillIds = new Set((await raw.skill.findMany({ where: { campaignId: freshId }, select: { id: true } })).map((r) => r.id));

    const mainIds = new Set((await raw.mainSkill.findMany({ where: { campaignId: freshId }, select: { id: true } })).map((r) => r.id));

    const groupIds = new Set((await raw.spellGroup.findMany({ where: { campaignId: freshId }, select: { id: true } })).map((r) => r.id));

    expect(trees).toHaveLength(7);

    for (const tree of trees) {
      const json = tree.skills as { id: string; race: string; mainSkills: Array<{ id: string; spellGroupId?: string; levelSkillIds?: Record<string, string>; levels?: { basic?: Record<string, Array<{ id: string }>> } }>; ultimateSkill?: { id: string } };

      expect(json.id).toBe(tree.id);
      expect(json.race).toBe(tree.race);

      for (const branch of json.mainSkills) {
        expect(branch.id === "racial" || mainIds.has(branch.id), branch.id).toBe(true);

        if (branch.spellGroupId) expect(groupIds.has(branch.spellGroupId)).toBe(true);

        for (const id of Object.values(branch.levelSkillIds ?? {})) expect(skillIds.has(id) || id.startsWith("placeholder_") || id === "", id).toBe(true);
        for (const slots of Object.values(branch.levels?.basic ?? {})) for (const slot of slots) expect(skillIds.has(slot.id), slot.id).toBe(true);
      }
    }

    const extras = await raw.unit.findMany({ where: { campaignId: freshId, NOT: { levelScaling: { equals: Prisma.DbNull } } }, select: { name: true } });

    expect(extras.length).toBe(pack.rows.units?.filter((row) => row.extra?.levelScaling).length);

    const again = await importPack(key, { owner: marker, dir: freshDir });

    expect(unchanged(again)).toBe(true);
  });

  it("fixpoint: a fresh import exported back equals the pack", async () => {
    const bundle = await exportCampaign(scoped as never, freshId);

    const slugs: SlugMap = Object.fromEntries(pack.manifest.kinds.map((kind) => [kind, Object.fromEntries(((bundle as unknown as Record<string, Array<{ id: string; slug: string }>>)[tableKey(kind)] ?? []).map((row) => [row.id, row.slug]))]));

    const exported = bundleToPack(bundle, pack.manifest, slugs);

    const normal = (rows: Array<Record<string, unknown>> = []) => rows.map(({ origin: _origin, ...row }) => (Array.isArray(row.artifactIds) ? { ...row, artifactIds: [...row.artifactIds].sort() } : row));

    for (const kind of pack.manifest.kinds) expect(normal(exported.rows[kind] as never), kind).toEqual(normal(pack.rows[kind] as never));
  });

  it("a changed skill name and weapon stat are reported by a dry run, written by an import and bump the version", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "heroes-pack-edit-"));

    tmpDirs.push(dir);
    fs.cpSync(path.join(freshDir, key), path.join(dir, key), { recursive: true });

    const edit = (file: string, change: (rows: Array<Record<string, unknown> & { slug: string; name: string; weapon?: Record<string, unknown> }>) => void) => {
      const target = path.join(dir, key, file);

      const rows = JSON.parse(fs.readFileSync(target, "utf8")) as Array<Record<string, unknown> & { slug: string; name: string; weapon?: Record<string, unknown> }>;

      change(rows);
      fs.writeFileSync(target, JSON.stringify(rows));
    };

    let skillSlug = "";

    let weaponSlug = "";

    edit("skills.json", (rows) => {
      rows[0].name = `${rows[0].name} (renamed)`;
      skillSlug = rows[0].slug;
    });
    edit("artifacts.json", (rows) => {
      const row = rows.find((r) => r.weapon)!;

      row.weapon = { ...row.weapon, damageDice: "1d12" };
      weaponSlug = row.slug;
    });

    const version = (await raw.campaign.findUniqueOrThrow({ where: { id: freshId } })).contentVersion;

    const dry = await importPack(key, { dir, dryRun: true });

    expect(dry.perKind.skills).toMatchObject({ updated: 1, created: 0 });
    expect(dry.perKind.artifacts).toMatchObject({ updated: 1, created: 0 });
    expect((await raw.campaign.findUniqueOrThrow({ where: { id: freshId } })).contentVersion).toBe(version);
    expect((await raw.skill.findFirstOrThrow({ where: { campaignId: freshId, slug: skillSlug } })).name).not.toContain("(renamed)");

    const result = await importPack(key, { dir });

    expect(result.perKind.skills).toMatchObject({ updated: 1, created: 0, errors: 0 });
    expect(result.perKind.artifacts).toMatchObject({ updated: 1, created: 0, errors: 0 });
    expect((await raw.skill.findFirstOrThrow({ where: { campaignId: freshId, slug: skillSlug } })).name).toContain("(renamed)");
    expect(weaponStatsFromRow(await raw.artifact.findFirstOrThrow({ where: { campaignId: freshId, slug: weaponSlug } }) as never)?.damageDice).toBe("1d12");
    expect((await raw.campaign.findUniqueOrThrow({ where: { id: freshId } })).contentVersion).toBeGreaterThan(version);

    const again = await importPack(key, { dir });

    expect(unchanged(again)).toBe(true);
  });

  it.skipIf(!liveTemplate)("a dry run against the live Heroes template reports no changes and writes nothing", async () => {
    const template = liveTemplate!;

    const before = await snapshotCampaign(template.id);

    const result = await importPack("heroes-homm", { dryRun: true });

    expect(unchanged(result)).toBe(true);

    const after = await snapshotCampaign(template.id);

    expect(after).toEqual(before);
  });
});
