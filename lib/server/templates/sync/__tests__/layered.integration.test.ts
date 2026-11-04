import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn() }));

import { getCachedSpells } from "@/lib/cache/reference-data";
import { contentLayer, invalidateCampaignLayer } from "@/lib/db/content-layer";
import { layeredModels } from "@/lib/db/layer/config";
import { createScopedDatabase, runContentWriteContext } from "@/lib/server/content/write-context";
import { BUNDLE_TABLES } from "@/lib/server/templates/bundle";
import { applySafeSourceChanges, applySourceChanges } from "@/lib/server/templates/sync/apply";
import { classifyLayered, type LayeredDb,layerOf, loadLayeredContext } from "@/lib/server/templates/sync/layered";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";

const queries: string[] = [];

const raw = new PrismaClient({ datasources: { db: { url: singleConnectionDatabaseUrl("DATABASE_URL") } }, log: [{ emit: "event", level: "query" }] });

raw.$on("query", (e) => { queries.push(e.query); });

const db = raw.$extends(contentLayer());

const scoped = createScopedDatabase(db);

const marker = `sync-layers-${randomUUID()}`;

const tpl = `${marker}-tpl`;

const R = raw as unknown as Record<string, any>;

const D = db as unknown as Record<string, any>;

const spellId = (key: string) => `${marker}-spell-${key}`;

const base = (key: string, name: string, extra: Record<string, unknown> = {}) => ({ id: spellId(key), name, type: "damage", damageType: "fire", sourceCampaignId: tpl, validFrom: 1, ...extra });

const names = async (campaignId: string) => ((await D.spell.findMany({ where: { campaignId }, orderBy: { name: "asc" } })) as Array<{ name: string }>).map((r) => r.name);

const inWrite = <T>(campaignId: string, run: (tx: any) => Promise<T>): Promise<T> => db.$transaction((tx) => runContentWriteContext(campaignId, tx, () => run(tx))) as Promise<T>;

const asLayeredDb = (tx: unknown) => tx as LayeredDb;

const apply = (campaignId: string, body?: { apply: Array<{ scope: any; key: string; sourceHash: string | null; status: any }>; ignore: Array<{ scope: any; key: string; sourceHash: string | null; status: any }> }) =>
  inWrite(campaignId, (tx) => (body ? applySourceChanges(asLayeredDb(tx), campaignId, body) : applySafeSourceChanges(asLayeredDb(tx), campaignId)));

const diffOf = async (campaignId: string) => {
  const layer = (await layerOf(db as never, campaignId))!;

  return classifyLayered(await loadLayeredContext(asLayeredDb(db), campaignId, layer));
};

const ref = (i: { scope: any; key: string; sourceHash: string | null; status: any }) => ({ scope: i.scope, key: i.key, sourceHash: i.sourceHash, status: i.status });

let n = 0;

async function fresh() {
  const id = `${marker}-c${++n}`;

  await raw.campaign.create({ data: { id, name: id, dmUserId: marker, inviteCode: randomUUID(), baseSourceId: tpl, baseVersion: 1 } });

  invalidateCampaignLayer();

  return id;
}

describe("layered sync parity", () => {
  it("hashes the same columns as the template bundle for all tables", () => {
    for (const t of BUNDLE_TABLES) expect([...layeredModels()[t.model].hashColumns].sort(), t.key).toEqual([...t.columns].sort());
  });
});

describe.skipIf(!isLocalDevDatabaseEnv())("sync over layers", () => {
  beforeAll(async () => {
    await raw.user.create({ data: { id: marker, email: `${marker}@example.invalid`, displayName: marker } });
    await raw.campaign.create({ data: { id: tpl, name: tpl, dmUserId: marker, inviteCode: randomUUID(), kind: "template", contentVersion: 1 } });
    await raw.spellBase.createMany({ data: [base("a", "Alpha"), base("b", "Bravo")] });
  });

  beforeEach(async () => {
    await raw.spellBase.deleteMany({ where: { sourceCampaignId: tpl } });
    await raw.spellBase.createMany({ data: [base("a", "Alpha"), base("b", "Bravo")] });
    await raw.campaign.update({ where: { id: tpl }, data: { contentVersion: 1 } });
  });

  afterAll(async () => {
    await raw.campaignContentHide.deleteMany({ where: { campaignId: { startsWith: marker } } });
    await raw.character.deleteMany({ where: { campaignId: { startsWith: marker } } });
    await raw.spell.deleteMany({ where: { campaignId: { startsWith: marker } } });
    await raw.spellBase.deleteMany({ where: { sourceCampaignId: tpl } });
    await raw.campaignSourceSync.deleteMany({ where: { campaignId: { startsWith: marker } } });
    await raw.campaign.deleteMany({ where: { id: { startsWith: marker } } });
    await raw.user.delete({ where: { id: marker } });
    await raw.$disconnect();
  });

  const patch = async () => {
    await raw.spellBase.updateMany({ where: { id: spellId("a"), validTo: null }, data: { validTo: 2 } });
    await raw.spellBase.createMany({ data: [base("a", "Alpha2", { validFrom: 2 }), base("c", "Charlie", { validFrom: 2 })] });
    await raw.campaign.update({ where: { id: tpl }, data: { contentVersion: 2 } });
  };

  it("upgrade without override is one UPDATE on campaigns and no writes to content tables", async () => {
    const campaignId = await fresh();

    await patch();
    queries.length = 0;

    const result = await apply(campaignId);

    const writes = queries.filter((q) => /^(INSERT|UPDATE|DELETE)/.test(q));

    expect(result.applied).toBe(2);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatch(/UPDATE "public"."campaigns"/);
    expect(await names(campaignId)).toEqual(["Alpha2", "Bravo", "Charlie"]);
    expect((await raw.campaign.findUnique({ where: { id: campaignId } }))?.baseVersion).toBe(2);
    expect(await diffOf(campaignId)).toEqual([]);
  });

  it("an override meeting a patch of the same row is a conflict that survives the upgrade", async () => {
    const campaignId = await fresh();

    await inWrite(campaignId, (tx) => tx.spell.update({ where: { id: spellId("a") }, data: { name: "Mine" } }));
    await patch();

    const [conflict] = (await diffOf(campaignId)).filter((i) => i.key === spellId("a"));

    expect(conflict).toMatchObject({ status: "conflict", scope: "spells", sourceHash: expect.any(String) });

    await apply(campaignId);

    expect(await names(campaignId)).toEqual(["Bravo", "Charlie", "Mine"]);

    const after = (await diffOf(campaignId)).find((i) => i.key === spellId("a"))!;

    expect(after.status).toBe("conflict");

    await apply(campaignId, { apply: [ref(after)], ignore: [] });

    expect(await names(campaignId)).toEqual(["Alpha2", "Bravo", "Charlie"]);
    expect(await raw.spell.count({ where: { campaignId } })).toBe(0);
  });

  it("a hidden base row stays hidden after a patch", async () => {
    const campaignId = await fresh();

    await inWrite(campaignId, (tx) => tx.spell.delete({ where: { id: spellId("a") } }));
    await patch();

    expect(await diffOf(campaignId)).toContainEqual(expect.objectContaining({ key: spellId("a"), status: "deletedLocally", visible: true }));

    await apply(campaignId);

    expect(await names(campaignId)).toEqual(["Bravo", "Charlie"]);
  });

  it("a hidden base row comes back with the upstream version when restored explicitly", async () => {
    const campaignId = await fresh();

    await inWrite(campaignId, (tx) => tx.spell.delete({ where: { id: spellId("a") } }));
    await patch();

    const hidden = (await diffOf(campaignId)).find((i) => i.key === spellId("a"))!;

    await apply(campaignId, { apply: [ref(hidden)], ignore: [] });

    expect(await names(campaignId)).toEqual(["Alpha2", "Bravo"]);
  });

  it("accepting a row deleted upstream under an override removes the override", async () => {
    const campaignId = await fresh();

    await inWrite(campaignId, (tx) => tx.spell.update({ where: { id: spellId("b") }, data: { name: "Mine" } }));
    await raw.spellBase.updateMany({ where: { id: spellId("b") }, data: { validTo: 2 } });
    await raw.campaign.update({ where: { id: tpl }, data: { contentVersion: 2 } });

    const gone = (await diffOf(campaignId)).find((i) => i.key === spellId("b"))!;

    expect(gone.status).toBe("deletedInSource");

    await apply(campaignId, { apply: [ref(gone)], ignore: [] });

    expect(await names(campaignId)).toEqual(["Alpha"]);
    expect(await raw.spell.count({ where: { campaignId } })).toBe(0);
    expect(await raw.campaignContentHide.count({ where: { campaignId } })).toBe(0);
    expect(await diffOf(campaignId)).toEqual([]);
  });

  it("accepting a row deleted upstream nulls references to its override", async () => {
    const campaignId = await fresh();

    await inWrite(campaignId, (tx) => tx.spell.update({ where: { id: spellId("b") }, data: { name: "Mine" } }));
    await raw.skill.create({ data: { id: `${marker}-sk-${campaignId}`, campaignId, name: "K", spellId: spellId("b") } as never });
    await raw.spellBase.updateMany({ where: { id: spellId("b") }, data: { validTo: 2 } });
    await raw.campaign.update({ where: { id: tpl }, data: { contentVersion: 2 } });

    const gone = (await diffOf(campaignId)).find((i) => i.key === spellId("b"))!;

    await apply(campaignId, { apply: [ref(gone)], ignore: [] });

    expect((await raw.skill.findFirstOrThrow({ where: { campaignId } })).spellId).toBeNull();
  });

  it("an unselected updated row stays at the old version", async () => {
    const campaignId = await fresh();

    await patch();

    const created = (await diffOf(campaignId)).find((i) => i.key === spellId("c"))!;

    await apply(campaignId, { apply: [ref(created)], ignore: [] });

    expect(await names(campaignId)).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect((await raw.campaign.findUnique({ where: { id: campaignId } }))?.baseVersion).toBe(2);
    expect(await diffOf(campaignId)).toContainEqual(expect.objectContaining({ key: spellId("a"), status: "updated" }));

    const later = (await diffOf(campaignId)).find((i) => i.key === spellId("a"))!;

    await apply(campaignId, { apply: [ref(later)], ignore: [] });

    expect(await names(campaignId)).toEqual(["Alpha2", "Bravo", "Charlie"]);
    expect(await raw.spell.count({ where: { campaignId } })).toBe(0);
  });

  it("an unselected new row stays out of the campaign but is listed as new and can be restored through sync", async () => {
    const campaignId = await fresh();

    await patch();

    const updated = (await diffOf(campaignId)).find((i) => i.key === spellId("a"))!;

    await apply(campaignId, { apply: [ref(updated)], ignore: [] });

    expect(await names(campaignId)).toEqual(["Alpha2", "Bravo"]);
    expect(await raw.campaignContentHide.count({ where: { campaignId } })).toBe(1);

    const pending = (await diffOf(campaignId)).filter((i) => i.visible);

    expect(pending).toEqual([expect.objectContaining({ key: spellId("c"), status: "new", ignored: false })]);

    await apply(campaignId, { apply: [ref(pending[0])], ignore: [] });

    expect(await names(campaignId)).toEqual(["Alpha2", "Bravo", "Charlie"]);
    expect(await raw.campaignContentHide.count({ where: { campaignId } })).toBe(0);
    expect((await diffOf(campaignId)).filter((i) => i.visible)).toEqual([]);
    expect(await raw.campaignSourceSync.findUnique({ where: { campaignId } }).then((s) => JSON.stringify(s?.ignored ?? {}))).not.toContain(spellId("c"));
  });

  it("an ignored new row can be un-ignored and restored later", async () => {
    const campaignId = await fresh();

    await patch();

    const items = await diffOf(campaignId);

    await apply(campaignId, { apply: [ref(items.find((i) => i.key === spellId("a"))!)], ignore: [ref(items.find((i) => i.key === spellId("c"))!)] });

    const ignored = (await diffOf(campaignId)).find((i) => i.key === spellId("c"))!;

    expect(ignored).toMatchObject({ status: "new", visible: true, ignored: true });
    expect(await names(campaignId)).toEqual(["Alpha2", "Bravo"]);

    await apply(campaignId, { apply: [ref(ignored)], ignore: [] });

    expect(await names(campaignId)).toEqual(["Alpha2", "Bravo", "Charlie"]);
  });

  it("a deferred new row stays restorable after the template changes it again", async () => {
    const campaignId = await fresh();

    await patch();

    const updated = (await diffOf(campaignId)).find((i) => i.key === spellId("a"))!;

    await apply(campaignId, { apply: [ref(updated)], ignore: [] });

    await raw.spellBase.updateMany({ where: { id: spellId("c"), validTo: null }, data: { validTo: 3 } });
    await raw.spellBase.create({ data: base("c", "Charlie2", { validFrom: 3 }) });
    await raw.campaign.update({ where: { id: tpl }, data: { contentVersion: 3 } });

    const pending = (await diffOf(campaignId)).find((i) => i.key === spellId("c"))!;

    expect(pending).toMatchObject({ status: "new", visible: true });

    await apply(campaignId, { apply: [ref(pending)], ignore: [] });

    expect(await names(campaignId)).toEqual(["Alpha2", "Bravo", "Charlie2"]);
  });

  it("ignoring new and updated rows keeps the campaign as it was", async () => {
    const campaignId = await fresh();

    await patch();

    const items = (await diffOf(campaignId)).filter((i) => i.key === spellId("a") || i.key === spellId("c"));

    await apply(campaignId, { apply: [], ignore: items.map(ref) });

    expect(await names(campaignId)).toEqual(["Alpha", "Bravo"]);
    expect((await raw.campaign.findUnique({ where: { id: campaignId } }))?.baseVersion).toBe(2);
  });

  it("apply-safe leaves a row deleted upstream in place until it is accepted", async () => {
    const campaignId = await fresh();

    await raw.spellBase.updateMany({ where: { id: spellId("b") }, data: { validTo: 2 } });
    await raw.campaign.update({ where: { id: tpl }, data: { contentVersion: 2 } });

    const gone = (await diffOf(campaignId)).find((i) => i.key === spellId("b"))!;

    expect(gone).toMatchObject({ status: "deletedInSource", localId: null });

    await apply(campaignId);

    expect(await names(campaignId)).toEqual(["Alpha", "Bravo"]);
    expect(await diffOf(campaignId)).toContainEqual(expect.objectContaining({ key: spellId("b"), status: "deletedInSource" }));

    await apply(campaignId, { apply: [ref((await diffOf(campaignId)).find((i) => i.key === spellId("b"))!)], ignore: [] });

    expect(await names(campaignId)).toEqual(["Alpha"]);
    expect(await raw.spell.count({ where: { campaignId } })).toBe(0);
  });

  it("a character's knownSpells on a base id still resolves after the upgrade", async () => {
    const campaignId = await fresh();

    await raw.character.create({ data: { campaignId, type: "player", controlledBy: marker, name: "Hero", class: "wizard", race: "human", knownSpells: [spellId("a")] } });
    await patch();
    await apply(campaignId);

    const known = (await raw.character.findFirst({ where: { campaignId } }))!.knownSpells as string[];

    const spells = await getCachedSpells(campaignId);

    expect(spells.find((s) => s.id === known[0])?.name).toBe("Alpha2");
  });
});

void scoped;
