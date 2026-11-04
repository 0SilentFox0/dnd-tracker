import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { contentLayer, invalidateCampaignLayer, layerStats } from "@/lib/db/content-layer";
import { runContentWriteContext } from "@/lib/server/content/write-context";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";

const url = singleConnectionDatabaseUrl("DATABASE_URL");

const queries: string[] = [];

const raw = new PrismaClient({ datasources: { db: { url } }, log: [{ emit: "event", level: "query" }] });

raw.$on("query", (e) => { queries.push(e.query); });

const db = raw.$extends(contentLayer());

const marker = `layers-${randomUUID()}`;

const ids = { user: marker, template: `${marker}-tpl`, plain: `${marker}-plain`, layered: `${marker}-lay`, latest: `${marker}-v2` };

const spell = (id: string, name: string, level: number, groupId: string | null = null) => ({ id, name, level, groupId, type: "damage", damageType: "fire", sourceCampaignId: ids.template, validFrom: 1 });

const newCampaign = (id: string, extra: Record<string, unknown> = {}) => raw.campaign.create({ data: { id, name: id, dmUserId: ids.user, inviteCode: randomUUID(), ...extra } });

const names = (rows: Array<{ name: string }>) => rows.map((r) => r.name);

describe.skipIf(!isLocalDevDatabaseEnv())("content layer prototype (Spell, SpellGroup)", () => {
  beforeAll(async () => {
    await raw.user.create({ data: { id: ids.user, email: `${marker}@example.invalid`, displayName: marker } });
    await newCampaign(ids.template);
    await newCampaign(ids.plain);
    await newCampaign(ids.layered, { baseSourceId: ids.template, baseVersion: 1 });
    await newCampaign(ids.latest, { baseSourceId: ids.template, baseVersion: 2 });
    await raw.spellGroupBase.create({ data: { id: `${marker}-gA`, name: "Evocation", sourceCampaignId: ids.template, validFrom: 1 } });
    await raw.spellBase.createMany({ data: [
      spell(`${marker}-s1`, "Alpha", 1, `${marker}-gA`),
      spell(`${marker}-s2`, "Bravo", 2),
      { ...spell(`${marker}-s3`, "Charlie", 3), validTo: 2 },
      { ...spell(`${marker}-s4`, "Delta", 1), validFrom: 2 },
    ] });
    await raw.spell.create({ data: { id: `${marker}-l1`, campaignId: ids.layered, name: "Local", type: "damage", damageType: "cold", level: 1 } });
    await raw.spell.create({ data: { id: `${marker}-p1`, campaignId: ids.plain, name: "Plain", type: "damage", damageType: "cold", level: 1 } });
    invalidateCampaignLayer();
  });

  afterAll(async () => {
    await raw.campaignContentHide.deleteMany({ where: { campaignId: { startsWith: marker } } });
    await raw.spell.deleteMany({ where: { campaignId: { startsWith: marker } } });
    await raw.spellBase.deleteMany({ where: { sourceCampaignId: ids.template } });
    await raw.spellGroupBase.deleteMany({ where: { sourceCampaignId: ids.template } });
    await raw.campaign.deleteMany({ where: { id: { startsWith: marker } } });
    await raw.user.delete({ where: { id: ids.user } });
    await raw.$disconnect();
  });

  it("campaign without a base is a pure passthrough with no base queries and one cached campaign lookup", async () => {
    const before = layerStats.campaignLookups;

    queries.length = 0;
    expect(names(await db.spell.findMany({ where: { campaignId: ids.plain } }))).toEqual(["Plain"]);
    expect(await db.spell.count({ where: { campaignId: ids.plain } })).toBe(1);
    expect(layerStats.campaignLookups - before).toBe(1);
    expect(queries.filter((q) => q.includes("spells_base") || q.includes("campaign_content_hides"))).toHaveLength(0);
  });

  it("unions local and base rows by campaign version and honours validity windows", async () => {
    expect(names(await db.spell.findMany({ where: { campaignId: ids.layered }, orderBy: { name: "asc" } }))).toEqual(["Alpha", "Bravo", "Charlie", "Local"]);
    expect(names(await db.spell.findMany({ where: { campaignId: ids.latest }, orderBy: { name: "asc" } }))).toEqual(["Alpha", "Bravo", "Delta"]);
  });

  it("applies filters, orderBy, skip/take and count over the union", async () => {
    const where = { campaignId: ids.layered };

    expect(names(await db.spell.findMany({ where: { ...where, level: 1 }, orderBy: { name: "desc" } }))).toEqual(["Local", "Alpha"]);
    expect(names(await db.spell.findMany({ where, orderBy: { name: "asc" }, skip: 1, take: 2 }))).toEqual(["Bravo", "Charlie"]);
    expect(await db.spell.count({ where })).toBe(4);
    expect(await db.spell.count({ where: { ...where, level: 1 } })).toBe(2);
    expect(await db.spell.findFirst({ where: { ...where, name: "Bravo" } })).toMatchObject({ id: `${marker}-s2`, campaignId: ids.layered });
    expect(await db.spell.findUnique({ where: { id: `${marker}-s1`, campaignId: ids.layered } as never })).toMatchObject({ name: "Alpha" });
  });

  it("supports select with orderBy fields that are not selected", async () => {
    const rows = await db.spell.findMany({ where: { campaignId: ids.layered }, select: { name: true }, orderBy: { level: "desc" } });

    expect(rows[0]).toEqual({ name: "Charlie" });
    expect(Object.keys(rows[0])).toEqual(["name"]);
  });

  it("resolves include: spellGroup for base rows against the base group layer", async () => {
    await raw.spell.create({ data: { id: `${marker}-l2`, campaignId: ids.layered, name: "LocalGrouped", type: "damage", damageType: "cold", groupId: `${marker}-gA` } }).catch((e) => e);

    const rows = await db.spell.findMany({ where: { campaignId: ids.layered, name: { in: ["Alpha", "LocalGrouped"] } }, include: { spellGroup: true }, orderBy: { name: "asc" } });

    expect(rows.map((r) => (r as { spellGroup: { name: string } | null }).spellGroup?.name)).toEqual(["Evocation", "Evocation"]);
  });

  it("rejects include of unlayered relations on base rows and filters the base cannot evaluate", async () => {
    await expect(db.spell.findMany({ where: { campaignId: ids.layered }, include: { skills: true } })).rejects.toThrow("LAYER_UNSUPPORTED_INCLUDE");
    await expect(db.spell.findMany({ where: { campaignId: ids.layered, spellGroup: { name: "x" } } })).rejects.toThrow("LAYER_UNSUPPORTED_FILTER");
  });

  it("reads a base id with no campaign in the filter, without a campaignId on the result", async () => {
    const row = await db.spell.findUnique({ where: { id: `${marker}-s2` } });

    expect(row).toMatchObject({ name: "Bravo" });
    expect((row as { campaignId?: string }).campaignId).toBeUndefined();
  });

  it("materialises a base row on update inside the write transaction (override) and leaves the base untouched", async () => {
    await db.$transaction((tx) => runContentWriteContext(ids.layered, tx, () => tx.spell.update({ where: { id: `${marker}-s2` }, data: { name: "Bravo2" } })));
    expect(names(await db.spell.findMany({ where: { campaignId: ids.layered, level: 2 } }))).toEqual(["Bravo2"]);
    expect(await raw.spellBase.findFirst({ where: { id: `${marker}-s2` } })).toMatchObject({ name: "Bravo" });
    expect(await raw.spell.findUnique({ where: { id: `${marker}-s2` } })).toMatchObject({ sourceId: `${marker}-s2`, campaignId: ids.layered });
  });

  it("rolls the materialised copy back together with the transaction", async () => {
    await expect(db.$transaction(async (tx) => {
      await runContentWriteContext(ids.layered, tx, () => tx.spell.update({ where: { id: `${marker}-s1` }, data: { name: "Alpha2" } }));
      throw new Error("ROLLBACK");
    })).rejects.toThrow("ROLLBACK");
    expect(await raw.spell.findUnique({ where: { id: `${marker}-s1` } })).toBeNull();
  });

  it("updateMany materialises matching base rows first", async () => {
    await db.$transaction((tx) => runContentWriteContext(ids.layered, tx, () => tx.spell.updateMany({ where: { campaignId: ids.layered, level: 1 }, data: { damageType: "acid" } })));

    const rows = await db.spell.findMany({ where: { campaignId: ids.layered, level: 1 } });

    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.damageType === "acid")).toBe(true);
  });

  it("hides a base row on delete and keeps it hidden", async () => {
    await db.$transaction((tx) => runContentWriteContext(ids.layered, tx, () => tx.spell.delete({ where: { id: `${marker}-s3` } })));
    expect(names(await db.spell.findMany({ where: { campaignId: ids.layered } }))).not.toContain("Charlie");
    expect(await raw.spellBase.count({ where: { id: `${marker}-s3` } })).toBe(1);
    expect(await raw.campaignContentHide.count({ where: { campaignId: ids.layered, table: "spells" } })).toBe(1);
  });

  it("deleteMany on a layered campaign hides every base row, deletes locals, and does not touch the template", async () => {
    const result = await db.$transaction((tx) => runContentWriteContext(ids.layered, tx, () => tx.spell.deleteMany({ where: { campaignId: ids.layered } })));

    expect(result.count).toBeGreaterThan(0);
    expect(await db.spell.count({ where: { campaignId: ids.layered } })).toBe(0);
    expect(await raw.spellBase.count({ where: { sourceCampaignId: ids.template } })).toBe(4);
    expect(await db.spell.count({ where: { campaignId: ids.latest } })).toBe(3);
  });
});
