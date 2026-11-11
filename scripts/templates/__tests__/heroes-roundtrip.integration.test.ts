import { Prisma, PrismaClient } from "@prisma/client";
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

import { importPack } from "../lib/import-pack";
import { readPack } from "../lib/pack";
import { diffSnapshots, snapshotCampaign } from "../lib/snapshot";

const marker = `heroesrt-${randomUUID()}`;

const tmpDirs: string[] = [];

const pack = readPack("heroes-homm");

const unchanged = (result: Awaited<ReturnType<typeof importPack>>) => Object.values(result.perKind).every((c) => c.created === 0 && c.updated === 0 && c.errors === 0);

describe.skipIf(!isLocalDevDatabaseEnv())("heroes-homm pack", () => {
  let freshId = "";

  let freshDir = "";

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

    const key = `heroes-rt-${marker.slice(-8)}`;

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

  it("re-imports into the live Heroes template without touching content, slugs are all set", async () => {
    const template = await raw.campaign.findFirst({ where: { kind: "template", templateKey: "heroes-homm" }, select: { id: true } });

    if (!template) return;

    const clones = (await raw.campaign.findMany({ where: { createdFromId: template.id }, select: { id: true } })).map((c) => c.id);

    const clonesBefore = await Promise.all(clones.map(snapshotCampaign));

    const before = await snapshotCampaign(template.id);

    const result = await importPack("heroes-homm");

    expect(unchanged(result)).toBe(true);

    const after = await snapshotCampaign(template.id);

    expect(after.contentVersion).toBe(before.contentVersion);
    expect(await Promise.all(clones.map(snapshotCampaign))).toEqual(clonesBefore);

    for (const [table, diff] of Object.entries(diffSnapshots(before, after))) expect(diff, table).toEqual({ created: 0, deleted: 0, changed: 0, slugsMissing: 0 });
  });
});
