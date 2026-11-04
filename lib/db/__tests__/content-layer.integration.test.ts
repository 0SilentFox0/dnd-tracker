import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { contentLayer, invalidateCampaignLayer, layerStats } from "@/lib/db/content-layer";
import { sortRows } from "@/lib/db/layer/sort";
import { createScopedDatabase, runContentWriteContext } from "@/lib/server/content/write-context";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";

const url = singleConnectionDatabaseUrl("DATABASE_URL");

const queries: string[] = [];

const raw = new PrismaClient({ datasources: { db: { url } }, log: [{ emit: "event", level: "query" }] });

raw.$on("query", (e) => { queries.push(e.query); });

const db = raw.$extends(contentLayer());

const scoped = createScopedDatabase(db);

const marker = `layers-${randomUUID()}`;

const ids = { user: marker, template: `${marker}-tpl`, plain: `${marker}-plain`, layered: `${marker}-lay`, latest: `${marker}-v2`, other: `${marker}-other`, host: `${marker}-host` };

const newCampaign = (id: string, extra: Record<string, unknown> = {}) => raw.campaign.create({ data: { id, name: id, dmUserId: ids.user, inviteCode: randomUUID(), ...extra } });

interface Fixture { delegate: string; base: string; table: string; label: string; required: Record<string, unknown> }

const FIXTURES: Fixture[] = [
  { delegate: "unit", base: "unitBase", table: "units", label: "name", required: {} },
  { delegate: "spell", base: "spellBase", table: "spells", label: "name", required: { type: "damage", damageType: "fire" } },
  { delegate: "spellGroup", base: "spellGroupBase", table: "spell_groups", label: "name", required: {} },
  { delegate: "artifact", base: "artifactBase", table: "artifacts", label: "name", required: { slot: "ring" } },
  { delegate: "artifactSet", base: "artifactSetBase", table: "artifact_sets", label: "name", required: {} },
  { delegate: "skillTree", base: "skillTreeBase", table: "skill_trees", label: "race", required: {} },
  { delegate: "campaignTrack", base: "campaignTrackBase", table: "campaign_tracks", label: "title", required: { kind: "youtube" } },
  { delegate: "skill", base: "skillBase", table: "skills", label: "name", required: {} },
  { delegate: "race", base: "raceBase", table: "races", label: "name", required: { updatedAt: new Date() } },
  { delegate: "gameClass", base: "gameClassBase", table: "classes", label: "name", required: { updatedAt: new Date() } },
  { delegate: "feat", base: "featBase", table: "feats", label: "name", required: { updatedAt: new Date() } },
  { delegate: "background", base: "backgroundBase", table: "backgrounds", label: "name", required: { updatedAt: new Date() } },
  { delegate: "mainSkill", base: "mainSkillBase", table: "main_skills", label: "name", required: { color: "#fff", updatedAt: new Date() } },
];

const R = raw as unknown as Record<string, any>;

const D = db as unknown as Record<string, any>;

const rid = (f: Fixture, key: string) => `${marker}-${f.delegate}-${key}`;

const baseRow = (f: Fixture, key: string, label: string, extra: Record<string, unknown> = {}) => ({ id: rid(f, key), [f.label]: label, ...f.required, sourceCampaignId: ids.template, validFrom: 1, ...extra });

const localRow = (f: Fixture, campaignId: string, key: string, label: string) => ({ id: rid(f, key), campaignId, [f.label]: label, ...f.required });

const labels = (f: Fixture, rows: Array<Record<string, unknown>>) => rows.map((r) => r[f.label] as string);

const inWrite = <T = any>(campaignId: string, run: (tx: any) => Promise<T>): Promise<any> => db.$transaction((tx) => runContentWriteContext(campaignId, tx, () => run(tx)));

describe.skipIf(!isLocalDevDatabaseEnv())("content layer over 13 models", () => {
  beforeAll(async () => {
    await raw.user.create({ data: { id: ids.user, email: `${marker}@example.invalid`, displayName: marker } });
    await newCampaign(ids.template);
    await newCampaign(ids.plain);
    await newCampaign(ids.other, { baseSourceId: ids.template, baseVersion: 1 });
    await newCampaign(ids.layered, { baseSourceId: ids.template, baseVersion: 1 });
    await newCampaign(ids.latest, { baseSourceId: ids.template, baseVersion: 2 });

    for (const f of FIXTURES) {
      await R[f.base].createMany({ data: [
        baseRow(f, "a", "Alpha"),
        baseRow(f, "b", "Bravo"),
        baseRow(f, "c", "Charlie", { validTo: 2 }),
        baseRow(f, "d", "Delta", { validFrom: 2 }),
      ] });
      await R[f.delegate].create({ data: localRow(f, ids.layered, "l", "Local") });
      await R[f.delegate].create({ data: localRow(f, ids.plain, "p", "Plain") });
    }

    invalidateCampaignLayer();
  });

  afterAll(async () => {
    await raw.campaignContentHide.deleteMany({ where: { campaignId: { startsWith: marker } } });

    for (const f of FIXTURES) {
      await R[f.delegate].deleteMany({ where: { campaignId: { startsWith: marker } } });
      await R[f.base].deleteMany({ where: { sourceCampaignId: ids.template } });
    }

    await raw.campaign.deleteMany({ where: { id: { startsWith: marker } } });
    await raw.user.delete({ where: { id: ids.user } });
    await raw.$disconnect();
  });

  describe.each(FIXTURES)("$delegate", (f) => {
    const campaign = (id: string) => ({ campaignId: id });

    it("unions local and base rows by campaign version and honours validity windows", async () => {
      expect(labels(f, await D[f.delegate].findMany({ where: campaign(ids.latest), orderBy: { [f.label]: "asc" } }))).toEqual(["Alpha", "Bravo", "Delta"]);
    });

    it("applies filters, orderBy, skip/take and count over the union", async () => {
      const where = campaign(ids.other);

      expect(labels(f, await D[f.delegate].findMany({ where, orderBy: { [f.label]: "desc" } }))).toEqual(["Charlie", "Bravo", "Alpha"]);
      expect(labels(f, await D[f.delegate].findMany({ where: { ...where, [f.label]: { in: ["Alpha", "Charlie"] } }, orderBy: { [f.label]: "asc" }, skip: 1, take: 1 }))).toEqual(["Charlie"]);
      expect(await D[f.delegate].count({ where })).toBe(3);
      expect(await D[f.delegate].count({ where: { ...where, [f.label]: "Bravo" } })).toBe(1);
      expect(await D[f.delegate].findFirst({ where: { ...where, [f.label]: "Bravo" } })).toMatchObject({ id: rid(f, "b"), campaignId: ids.other, sourceId: rid(f, "b") });
      expect(await D[f.delegate].findUnique({ where: { id: rid(f, "a"), campaignId: ids.other } })).toMatchObject({ [f.label]: "Alpha" });
      expect(await D[f.delegate].findFirst({ where: { ...where, id: rid(f, "d") } })).toBeNull();
      await expect(D[f.delegate].findFirstOrThrow({ where: { ...where, id: rid(f, "d") } })).rejects.toMatchObject({ code: "P2025" });
    });

    it("reads a base id with no campaign in the filter without a campaignId on the result", async () => {
      const row = await D[f.delegate].findUnique({ where: { id: rid(f, "b") } });

      expect(row).toMatchObject({ [f.label]: "Bravo" });
      expect(row.campaignId).toBeUndefined();
    });

    it("supports select with orderBy fields that are not selected", async () => {
      const rows = await D[f.delegate].findMany({ where: campaign(ids.other), select: { id: true }, orderBy: { [f.label]: "asc" } });

      expect(rows.map((r: { id: string }) => r.id)).toEqual([rid(f, "a"), rid(f, "b"), rid(f, "c")]);
      expect(Object.keys(rows[0])).toEqual(["id"]);
    });

    it("rejects filters the base cannot evaluate and operations it cannot express", async () => {
      await expect(D[f.delegate].findMany({ where: { campaignId: ids.other, campaign: { name: "x" } } })).rejects.toThrow("LAYER_UNSUPPORTED_FILTER");
      await expect(D[f.delegate].upsert({ where: { id: rid(f, "a") }, create: localRow(f, ids.other, "u", "U"), update: {} })).rejects.toThrow("LAYER_UNSUPPORTED_OPERATION");
    });

    it("overrides a base row on update inside the write transaction, hiding the stale base values", async () => {
      await inWrite(ids.layered, (tx) => tx[f.delegate].update({ where: { id: rid(f, "a") }, data: { [f.label]: "Alpha2" } }));

      expect(labels(f, await D[f.delegate].findMany({ where: campaign(ids.layered), orderBy: { [f.label]: "asc" } }))).toEqual(["Alpha2", "Bravo", "Charlie", "Local"]);
      expect(await D[f.delegate].count({ where: { ...campaign(ids.layered), [f.label]: "Alpha" } })).toBe(0);
      expect(await D[f.delegate].count({ where: campaign(ids.layered) })).toBe(4);
      expect(await R[f.base].findFirst({ where: { id: rid(f, "a") } })).toMatchObject({ [f.label]: "Alpha" });

      const stored = await R[f.delegate].findFirst({ where: { campaignId: ids.layered, sourceId: rid(f, "a") } });

      expect(stored).toMatchObject({ sourceId: rid(f, "a"), campaignId: ids.layered });
      expect(stored.id).not.toBe(rid(f, "a"));

      const exposed = await D[f.delegate].findMany({ where: { campaignId: ids.layered, [f.label]: "Alpha2" } });

      expect(exposed.map((r: { id: string }) => r.id)).toEqual([rid(f, "a")]);
      expect(await D[f.delegate].findUnique({ where: { id: rid(f, "a"), campaignId: ids.layered } })).toMatchObject({ [f.label]: "Alpha2", id: rid(f, "a") });
      expect(await D[f.delegate].count({ where: { campaignId: ids.layered, id: { in: [rid(f, "a"), rid(f, "b")] } } })).toBe(2);
      expect((await D[f.delegate].findMany({ where: { campaignId: ids.layered, id: { notIn: [rid(f, "a")] } } })).map((r: { id: string }) => r.id).sort()).toEqual([rid(f, "b"), rid(f, "c"), rid(f, "l")]);
      expect(await D[f.delegate].count({ where: { campaignId: ids.layered, id: { not: rid(f, "a") } } })).toBe(3);

      await inWrite(ids.layered, (tx) => tx[f.delegate].update({ where: { id: rid(f, "a") }, data: { [f.label]: "Alpha2" } }));
      expect(await R[f.delegate].count({ where: { campaignId: ids.layered, sourceId: rid(f, "a") } })).toBe(1);
      expect(labels(f, await D[f.delegate].findMany({ where: campaign(ids.other), orderBy: { [f.label]: "asc" } }))).toEqual(["Alpha", "Bravo", "Charlie"]);
    });

    it("rolls the materialised copy back together with the transaction", async () => {
      await expect(db.$transaction(async (tx) => {
        await runContentWriteContext(ids.layered, tx, () => (tx as any)[f.delegate].update({ where: { id: rid(f, "b") }, data: { [f.label]: "Bravo2" } }));
        throw new Error("ROLLBACK");
      })).rejects.toThrow("ROLLBACK");
      expect(await R[f.delegate].findFirst({ where: { campaignId: ids.layered, sourceId: rid(f, "b") } })).toBeNull();
    });

    it("updateMany materialises matching base rows first", async () => {
      await inWrite(ids.layered, (tx) => tx[f.delegate].updateMany({ where: { campaignId: ids.layered, [f.label]: { in: ["Bravo", "Charlie"] } }, data: { [f.label]: "Many" } }));

      expect(labels(f, await D[f.delegate].findMany({ where: campaign(ids.layered), orderBy: { [f.label]: "asc" } }))).toEqual(["Alpha2", "Local", "Many", "Many"]);
    });

    it("hides a base row on delete, keeps it hidden, and does not touch the template", async () => {
      await inWrite(ids.layered, (tx) => tx[f.delegate].delete({ where: { id: rid(f, "c") } }));

      expect(labels(f, await D[f.delegate].findMany({ where: campaign(ids.layered), orderBy: { [f.label]: "asc" } }))).toEqual(["Alpha2", "Local", "Many"]);
      expect(await R[f.base].count({ where: { id: rid(f, "c") } })).toBe(1);
      expect(await raw.campaignContentHide.count({ where: { campaignId: ids.layered, table: f.table, id: rid(f, "c") } })).toBe(1);
    });

    it("deleteMany hides every base row, deletes locals, overrides do not resurrect, the template is untouched", async () => {
      const result = await inWrite(ids.layered, (tx) => tx[f.delegate].deleteMany({ where: { campaignId: ids.layered } }));

      expect(result.count).toBeGreaterThan(0);
      expect(await D[f.delegate].count({ where: campaign(ids.layered) })).toBe(0);
      expect(await R[f.base].count({ where: { sourceCampaignId: ids.template } })).toBe(4);
      expect(await raw.campaignContentHide.count({ where: { campaignId: ids.layered, table: f.table } })).toBe(3);
      expect(await D[f.delegate].count({ where: campaign(ids.latest) })).toBe(3);
      expect(await D[f.delegate].count({ where: campaign(ids.other) })).toBe(3);
    });

    it("campaign without a base is a pure passthrough: no base or hide queries", async () => {
      await D[f.delegate].count({ where: campaign(ids.plain) });

      const before = layerStats.campaignLookups;

      queries.length = 0;
      expect(labels(f, await D[f.delegate].findMany({ where: campaign(ids.plain) }))).toEqual(["Plain"]);
      expect(await D[f.delegate].count({ where: campaign(ids.plain) })).toBe(1);
      expect(layerStats.campaignLookups).toBe(before);
      expect(queries.filter((q) => q.includes("_base") || q.includes("campaign_content_hides") || q.includes('FROM "public"."campaigns"'))).toHaveLength(0);
    });
  });

  describe("caches", () => {
    it("a repeated layered read costs the campaign lookup plus local rows; a content write invalidates through the version bump", async () => {
      invalidateCampaignLayer();
      await D.spell.findMany({ where: { campaignId: ids.latest } });

      queries.length = 0;
      expect(await D.spell.findMany({ where: { campaignId: ids.latest } })).toHaveLength(3);
      expect(queries).toHaveLength(2);
      expect(queries.filter((q) => q.includes('FROM "public"."campaigns"'))).toHaveLength(1);

      await inWrite(ids.latest, (tx) => tx.spell.delete({ where: { id: rid(FIXTURES[1], "a") } }));
      expect(await D.spell.findMany({ where: { campaignId: ids.latest } })).toHaveLength(2);
      expect((await raw.campaign.findUnique({ where: { id: ids.latest }, select: { contentVersion: true } }))?.contentVersion).toBe(1);
    });

    it("another instance bumping contentVersion or baseVersion is seen without any invalidation", async () => {
      const id = `${marker}-stale`;

      await newCampaign(id, { baseSourceId: ids.template, baseVersion: 1 });
      invalidateCampaignLayer();

      const names = async () => labels(FIXTURES[1], await D.spell.findMany({ where: { campaignId: id }, orderBy: { name: "asc" } }));

      expect(await names()).toEqual(["Alpha", "Bravo", "Charlie"]);

      await raw.spell.create({ data: { ...localRow(FIXTURES[1], id, "x", "Xray") } });
      await raw.campaignContentHide.create({ data: { campaignId: id, table: "spells", id: rid(FIXTURES[1], "a") } });
      await raw.campaign.update({ where: { id }, data: { contentVersion: { increment: 1 } } });

      expect(await names()).toEqual(["Bravo", "Charlie", "Xray"]);

      await raw.campaign.update({ where: { id }, data: { baseVersion: 2 } });

      expect(await names()).toEqual(["Bravo", "Delta", "Xray"]);
    });

    it("a plain campaign is looked up once; a campaign created after a miss is not remembered as plain", async () => {
      const id = `${marker}-late`;

      invalidateCampaignLayer();
      expect(await D.spell.findMany({ where: { campaignId: id } })).toEqual([]);

      await newCampaign(id, { baseSourceId: ids.template, baseVersion: 1 });

      expect(await D.spell.count({ where: { campaignId: id } })).toBe(3);
    });

    it("a layer read inside a rolled back transaction leaves nothing behind", async () => {
      const id = `${marker}-rolled`;

      await newCampaign(id);
      invalidateCampaignLayer();

      await expect(inWrite(id, async (tx) => {
        await tx.campaign.update({ where: { id }, data: { baseSourceId: ids.template, baseVersion: 2 } });
        expect(await tx.spell.count({ where: { campaignId: id } })).toBe(3);
        throw new Error("rollback");
      })).rejects.toThrow("rollback");

      expect(await D.spell.count({ where: { campaignId: id } })).toBe(0);
    });

    it("base rows are shared between campaigns on one template version", async () => {
      invalidateCampaignLayer();
      await D.race.findMany({ where: { campaignId: ids.other } });

      queries.length = 0;
      await D.race.findMany({ where: { campaignId: ids.layered } });
      expect(queries.filter((q) => q.includes("races_base"))).toHaveLength(0);
    });

    it("cached rows cannot be mutated through a result", async () => {
      const first = await D.spell.findMany({ where: { campaignId: ids.other }, orderBy: { name: "asc" } });

      first[0].name = "mutated";
      first[0].lists.push("x");

      const second = await D.spell.findMany({ where: { campaignId: ids.other }, orderBy: { name: "asc" } });

      expect(second.map((r: { name: string }) => r.name)).not.toContain("mutated");
      expect(second[0].lists).toEqual([]);
    });
  });

  describe("relations between layered models", () => {
    const [unit, spell, group, artifact, set, , , skill, race, , , , main] = FIXTURES;

    const base = (f: Fixture, key: string, data: Record<string, unknown>) => R[f.base].update({ where: { id_validFrom: { id: rid(f, key), validFrom: 1 } }, data });

    beforeAll(async () => {
      await base(group, "a", { name: "Evocation" });
      await base(spell, "a", { groupId: rid(group, "a") });
      await base(spell, "b", { groupId: rid(group, "a") });
      await base(unit, "a", { raceId: rid(race, "a") });
      await base(artifact, "a", { setId: rid(set, "a") });
      await base(skill, "a", { spellId: rid(spell, "a"), spellGroupId: rid(group, "a"), mainSkillId: rid(main, "a") });
      invalidateCampaignLayer();
    });

    it("many-to-one include resolves base targets, nested selects included", async () => {
      const rows = await D.spell.findMany({ where: { campaignId: ids.other, groupId: { not: null } }, include: { spellGroup: true }, orderBy: { name: "asc" } });

      expect(rows.map((r: any) => r.spellGroup.name)).toEqual(["Evocation", "Evocation"]);

      const picked = await D.spell.findMany({ where: { campaignId: ids.other, groupId: { not: null } }, select: { name: true, spellGroup: { select: { name: true } } }, orderBy: { name: "asc" } });

      expect(picked).toEqual([{ name: "Alpha", spellGroup: { name: "Evocation" } }, { name: "Bravo", spellGroup: { name: "Evocation" } }]);
      expect((await D.spell.findMany({ where: { campaignId: ids.other, groupId: null }, include: { spellGroup: true } })).every((r: any) => r.spellGroup === null)).toBe(true);
    });

    it("one-to-many include groups base children", async () => {
      const groups = await D.spellGroup.findMany({ where: { campaignId: ids.other, id: rid(group, "a") }, include: { spells: { select: { name: true }, orderBy: { name: "asc" } } } });

      expect(groups[0].spells).toEqual([{ name: "Alpha" }, { name: "Bravo" }]);
    });

    it("skill resolves spell, group and main skill through the layer", async () => {
      const row = await D.skill.findFirst({ where: { campaignId: ids.other, id: rid(skill, "a") }, include: { spell: { select: { id: true, name: true } }, spellGroup: { select: { id: true, name: true } }, mainSkill: true, grantedSpell: true } });

      expect(row.spell).toEqual({ id: rid(spell, "a"), name: "Alpha" });
      expect(row.spellGroup.name).toBe("Evocation");
      expect(row.mainSkill.name).toBe("Alpha");
      expect(row.grantedSpell).toBeNull();
    });

    it("unit.race, artifact.artifactSet, race.units and artifactSet.artifacts resolve", async () => {
      expect((await D.unit.findFirst({ where: { campaignId: ids.other, id: rid(unit, "a") }, include: { race: true } })).race.name).toBe("Alpha");
      expect((await D.artifact.findFirst({ where: { campaignId: ids.other, id: rid(artifact, "a") }, include: { artifactSet: { select: { id: true, name: true } } } })).artifactSet).toEqual({ id: rid(set, "a"), name: "Alpha" });
      expect((await D.race.findFirst({ where: { campaignId: ids.other, id: rid(race, "a") }, include: { units: { select: { id: true } } } })).units).toEqual([{ id: rid(unit, "a") }]);
      expect((await D.artifactSet.findFirst({ where: { campaignId: ids.other, id: rid(set, "a") }, include: { artifacts: { select: { id: true } } } })).artifacts).toEqual([{ id: rid(artifact, "a") }]);
    });

    it("campaign.select of layered lists sees base rows; a campaign without a base keeps the native join", async () => {
      const layered = await D.campaign.findUnique({ where: { id: ids.other }, select: { name: true, races: { where: { name: "Alpha" }, take: 1 }, spells: { select: { id: true } } } });

      expect(layered.races).toHaveLength(1);
      expect(layered.spells).toHaveLength(3);
      expect(Object.keys(layered).sort()).toEqual(["name", "races", "spells"]);

      queries.length = 0;
      expect((await D.campaign.findUnique({ where: { id: ids.plain }, select: { races: true } })).races).toHaveLength(1);
      expect(queries.filter((q) => q.includes("_base"))).toHaveLength(0);
    });

    it("write results with include resolve base relations", async () => {
      const created = await inWrite(ids.other, (tx) => tx.skill.create({ data: { campaignId: ids.other, name: "Copy", spellGroupId: rid(group, "a") }, include: { spellGroup: true } }));

      expect(created.spellGroup.name).toBe("Evocation");
    });

    it("rejects an include of an unlayered relation when base rows are in the result", async () => {
      await expect(D.skillTree.findMany({ where: { campaignId: ids.other }, include: { characterSkills: true } })).rejects.toThrow("LAYER_UNSUPPORTED_INCLUDE");
    });
  });

  describe("aggregate", () => {
    it("aggregates over the union", async () => {
      await R.campaignTrackBase.updateMany({ where: { sourceCampaignId: ids.template, id: rid(FIXTURES[6], "b") }, data: { sortOrder: 9 } });
      invalidateCampaignLayer();

      const result = await D.campaignTrack.aggregate({ where: { campaignId: ids.other }, _max: { sortOrder: true }, _count: { _all: true } });

      expect(result._max.sortOrder).toBe(9);
      expect(result._count._all).toBe(3);
    });
  });

  describe("race rename cascade", () => {
    it("updateMany with a case-insensitive string filter materialises matching base skill trees", async () => {
      const tree = FIXTURES[5];

      await inWrite(ids.other, (tx) => tx.skillTree.updateMany({ where: { campaignId: ids.other, race: { equals: "alpha", mode: "insensitive" } }, data: { race: "Renamed" } }));

      expect(labels(tree, await D.skillTree.findMany({ where: { campaignId: ids.other }, orderBy: { race: "asc" } }))).toEqual(["Bravo", "Charlie", "Renamed"]);
    });
  });

  describe("ordering matches Postgres", () => {
    const NAMES = ["Alpha", "alpha", "beta", "Bravo", "Éclair", "eclair", "Ёж", "яблуко", "Яблуко", "Їжак", "їжак", "Іван", "Бета", "альфа", "Альфа", "Ґанок", "Fire Ball", "Fireball", "Fire Bolt", "Ice 2", "Ice 10", "Ice 1", "Cure Wounds", "cure wounds", "Це", "це", "Zebra", "zz", "Zz", "Ünit", "Äpfel", "Apple"];

    it("the JS comparator sorts names like ORDER BY name in the database", async () => {
      await newCampaign(`${marker}-order`);
      await raw.spell.createMany({ data: NAMES.map((name, i) => ({ id: `${marker}-o${i}`, campaignId: `${marker}-order`, name, type: "damage", damageType: "fire" })) });

      const fromDb = (await raw.spell.findMany({ where: { campaignId: `${marker}-order` }, orderBy: { name: "asc" }, select: { name: true } })).map((r) => r.name);

      expect(sortRows(NAMES.map((name) => ({ name })), { name: "asc" }).map((r) => r.name)).toEqual(fromDb);
      expect(sortRows(NAMES.map((name) => ({ name })), { name: "desc" }).map((r) => r.name)).toEqual([...fromDb].reverse());
    });
  });

  describe("transactions with a single connection", () => {
    it("layered reads and writes inside an interactive transaction do not deadlock", async () => {
      const result = await scoped.$transaction(async (tx) => {
        const t = tx as any;

        const before = await t.spell.findMany({ where: { campaignId: ids.latest }, include: { spellGroup: true } });

        await runContentWriteContext(ids.latest, tx, () => t.spell.update({ where: { id: rid(FIXTURES[1], "b") }, data: { name: "InTx" } }));

        return [before.length, (await t.spell.findMany({ where: { campaignId: ids.latest, name: "InTx" } })).length];
      });

      expect(result).toEqual([2, 1]);
    });

    it("layered reads inside a plain transaction (no write context) use that transaction", async () => {
      const count = await scoped.$transaction(async (tx) => (tx as any).spell.findMany({ where: { campaignId: ids.other }, include: { spellGroup: true } }).then((r: unknown[]) => r.length));

      expect(count).toBe(3);
    });

    it("a rolled back scoped transaction leaves no materialised copy", async () => {
      await expect(scoped.$transaction(async (tx) => {
        await runContentWriteContext(ids.latest, tx, () => (tx as any).race.update({ where: { id: rid(FIXTURES[8], "a") }, data: { name: "Gone" } }));
        throw new Error("ROLLBACK");
      })).rejects.toThrow("ROLLBACK");
      expect(await R.race.findFirst({ where: { campaignId: ids.latest, sourceId: rid(FIXTURES[8], "a") } })).toBeNull();
    });
  });

  describe("removeAllContent on a campaign with a base", () => {
    it("hides every base id for the campaign and leaves the template untouched", async () => {
      await newCampaign(ids.host, { baseSourceId: ids.template, baseVersion: 1 });
      invalidateCampaignLayer();

      for (const f of FIXTURES) await inWrite(ids.host, (tx) => tx[f.delegate].deleteMany({ where: { campaignId: ids.host } }));

      for (const f of FIXTURES) {
        expect(await raw.campaignContentHide.count({ where: { campaignId: ids.host, table: f.table } })).toBe(3);
        expect(await D[f.delegate].count({ where: { campaignId: ids.host } })).toBe(0);
        expect(await R[f.base].count({ where: { sourceCampaignId: ids.template } })).toBe(4);
      }
    });
  });

  describe("two campaigns overriding the same base row", () => {
    it("each gets its own override with a fresh id and sees only its own values; the base id stays the public id", async () => {
      const f = FIXTURES[0];

      await inWrite(ids.other, (tx) => tx.unit.update({ where: { id: rid(f, "a") }, data: { name: "Mine" } }));
      await inWrite(ids.latest, (tx) => tx.unit.update({ where: { id: rid(f, "a") }, data: { name: "Theirs" } }));

      const mine = await R.unit.findFirst({ where: { campaignId: ids.other, sourceId: rid(f, "a") } });

      const theirs = await R.unit.findFirst({ where: { campaignId: ids.latest, sourceId: rid(f, "a") } });

      expect(mine.id).not.toBe(theirs.id);
      expect(await D.unit.findUnique({ where: { id: rid(f, "a"), campaignId: ids.other } })).toMatchObject({ name: "Mine", id: rid(f, "a") });
      expect(await D.unit.findUnique({ where: { id: rid(f, "a"), campaignId: ids.latest } })).toMatchObject({ name: "Theirs", id: rid(f, "a") });
      expect(await D.unit.findUnique({ where: { id: rid(f, "a"), campaignId: ids.layered } })).toBeNull();
      expect(await R.unitBase.findFirst({ where: { id: rid(f, "a") } })).toMatchObject({ name: "Alpha" });
    });

    it("references by base id keep resolving to the override, and deleting an override hides the base id", async () => {
      const [, spell, , , , , , skill] = FIXTURES;

      await newCampaign(`${marker}-refs`, { baseSourceId: ids.template, baseVersion: 1 });
      await R.skillBase.update({ where: { id_validFrom: { id: rid(skill, "a"), validFrom: 1 } }, data: { spellId: rid(spell, "a") } });
      invalidateCampaignLayer();

      const refs = `${marker}-refs`;

      await inWrite(refs, (tx) => tx.spell.update({ where: { id: rid(spell, "a") }, data: { name: "Overridden" } }));

      const row = await D.skill.findFirst({ where: { campaignId: refs, id: rid(skill, "a") }, include: { spell: { select: { id: true, name: true } } } });

      expect(row.spell).toEqual({ id: rid(spell, "a"), name: "Overridden" });
      expect(row.spellId).toBe(rid(spell, "a"));
      expect((await D.spell.findMany({ where: { campaignId: refs, id: { in: [row.spellId] } } })).map((r: { name: string }) => r.name)).toEqual(["Overridden"]);

      await inWrite(refs, (tx) => tx.spell.delete({ where: { id: rid(spell, "a") } }));

      expect(await D.spell.findUnique({ where: { id: rid(spell, "a"), campaignId: refs } })).toBeNull();
      expect(await R.spell.count({ where: { campaignId: refs } })).toBe(0);
      expect(await raw.campaignContentHide.count({ where: { campaignId: refs, table: "spells", id: rid(spell, "a") } })).toBe(1);
    });

    it("a local row cannot be created with an id that is a visible base id", async () => {
      await expect(inWrite(ids.other, (tx) => tx.spell.create({ data: { id: rid(FIXTURES[1], "b"), campaignId: ids.other, name: "Dup", type: "damage", damageType: "fire" } }))).rejects.toThrow("LAYER_ID_COLLISION");
    });
  });
});
