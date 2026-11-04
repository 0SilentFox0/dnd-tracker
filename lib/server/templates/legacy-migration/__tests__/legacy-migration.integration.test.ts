import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn() }));

import { contentLayer, invalidateCampaignLayer } from "@/lib/db/content-layer";
import { layeredModels } from "@/lib/db/layer/config";
import { BUNDLE_TABLES } from "@/lib/server/templates/bundle";
import { clearBundleCache } from "@/lib/server/templates/bundle-cache";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
import { newContentId } from "@/lib/server/templates/ids";
import { importBundle } from "@/lib/server/templates/import-bundle";
import { readPreImage } from "@/lib/server/templates/legacy-migration/preimage";
import { REFERRERS } from "@/lib/server/templates/legacy-migration/referrers";
import { dryRunCampaign, type ExtendedPrisma, migrateCampaign } from "@/lib/server/templates/legacy-migration/service";
import type { MigrationPlan } from "@/lib/server/templates/legacy-migration/types";
import { verifyFromPreImage } from "@/lib/server/templates/legacy-migration/verify";
import { latestPublishedVersion, publishTemplateVersion } from "@/lib/server/templates/publish";
import { baselineFromBundle } from "@/lib/server/templates/sync/hash";
import { classifyLayered, loadLayeredContext } from "@/lib/server/templates/sync/layered";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";
import { hashJson } from "@/lib/utils/battle/store/stable-json";
import { itemRef } from "@/lib/utils/items/ref";

const queries: string[] = [];

const raw = new PrismaClient({ datasources: { db: { url: singleConnectionDatabaseUrl("DATABASE_URL") } }, log: [{ emit: "event", level: "query" }] });

raw.$on("query", (e) => { queries.push(e.query); });

const db = raw.$extends(contentLayer());

const R = raw as unknown as Record<string, any>;

const D = db as unknown as Record<string, any>;

const marker = `legacy-mig-${randomUUID()}`;

const tpl = `${marker}-tpl`;

const T = Object.fromEntries(["group", "sp1", "sp2", "sp3", "sp4", "ms", "sk", "tree", "race", "unit", "set", "art", "art2", "art3", "trk", "bg"].map((k) => [k, newContentId()])) as Record<string, string>;

const writes = () => queries.filter((q) => /^(INSERT|UPDATE|DELETE)/.test(q));

const spell = (id: string, name: string, extra: Record<string, unknown> = {}) => ({ id, campaignId: tpl, name, type: "damage", damageType: "fire", ...extra });

interface Clone { id: string; local: (sourceId: string) => string }

const clones = {} as Record<"main" | "rb", Clone>;

let preImageDir = "";

let published = 0;

let mainPreImage = "";

const asMigrate = db as unknown as ExtendedPrisma;

async function clone(name: string): Promise<Clone> {
  const id = `${marker}-${name}`;

  const bundle = await exportCampaign(raw as never, tpl);

  const idMap = await raw.$transaction(async (tx) => {
    await tx.campaign.create({ data: { id, name: id, dmUserId: marker, inviteCode: randomUUID(), createdFromId: tpl } });

    const imported = await importBundle(tx as never, bundle, id);

    await tx.campaignSourceSync.create({ data: { campaignId: id, sourceCampaignId: tpl, baseline: baselineFromBundle(bundle, imported.hashes) as never } });

    return imported.idMap;
  });

  return { id, local: (sourceId) => idMap.get(sourceId) ?? sourceId };
}

async function populate(c: Clone) {
  const L = c.local;

  await R.spell.update({ where: { id: L(T.sp2) }, data: { name: "Mine" } });
  await R.spell.delete({ where: { id: L(T.sp3) } });
  await R.spell.create({ data: spell(newContentId(), "Local", { campaignId: c.id }) });

  const character = await R.character.create({
    data: {
      campaignId: c.id,
      type: "pc",
      controlledBy: marker,
      name: "Hero",
      class: "x",
      race: "x",
      knownSpells: [L(T.sp1), L(T.sp2)],
      backgroundId: L(T.bg),
      personalSkillId: L(T.sk),
      skillTreeProgress: { [L(T.tree)]: { [L(T.sk)]: 1 } },
    },
  });

  await R.characterInventory.create({ data: { characterId: character.id, backpack: [itemRef(L(T.art), L(T.art3))], items: [{ type: "itemStats", value: JSON.stringify({ ref: L(T.art) }) }] } });
  await R.characterSkills.create({ data: { characterId: character.id, skillTreeId: L(T.tree), unlockedSkills: [L(T.sk)] } });

  const battle = await R.battleScene.create({ data: { campaignId: c.id, name: "Fight", participants: [{ sourceId: L(T.unit) }], audio: { trackId: L(T.trk) } } });

  await R.battleParticipant.create({
    data: {
      id: newContentId(), battleId: battle.id, sourceType: "unit", sourceId: L(T.unit), side: "enemy", controlledBy: "dm", orderIndex: 0,
      currentHp: 1, tempHp: 0, maxHp: 1, morale: 0, status: "alive", initiative: 0, hasUsedAction: false, hasUsedBonusAction: false, hasUsedReaction: false, hasExtraTurn: false,
      snapshot: { unitId: L(T.unit), name: "Orc" }, state: {}, snapshotHash: "stale",
    },
  });

  await R.playerNotification.create({ data: { userId: c === clones.rb ? `${marker}-u2` : marker, campaignId: c.id, type: "spell", refId: L(T.sp1), href: "stale" } });
  await R.campaignShow.create({ data: { campaignId: c.id, audio: { trackId: L(T.trk) } } });
  await R.compendiumEntry.create({ data: { campaignId: c.id, canonicalKey: "k", kind: "spells", localId: L(T.sp1), edition: "e", sourceJson: "{}", originalName: "o", inputHash: "h", adapterVersion: "1", baseline: {} } });
}

async function storedState(campaignId: string) {
  const tables = Object.fromEntries(await Promise.all(BUNDLE_TABLES.map(async (t) => [t.key, await R[t.delegate].findMany({ where: { campaignId }, orderBy: { id: "asc" } })])));

  return JSON.stringify({
    tables,
    campaign: await R.campaign.findUnique({ where: { id: campaignId } }),
    sync: await R.campaignSourceSync.findUnique({ where: { campaignId } }),
    hides: await R.campaignContentHide.findMany({ where: { campaignId } }),
    characters: await R.character.findMany({ where: { campaignId }, orderBy: { id: "asc" } }),
    participants: await R.battleParticipant.findMany({ where: { battle: { campaignId } }, orderBy: { id: "asc" } }),
  });
}

describe.skipIf(!isLocalDevDatabaseEnv())("legacy layer migration", () => {
  beforeAll(async () => {
    preImageDir = await mkdtemp(path.join(tmpdir(), "legacy-mig-"));
    clearBundleCache();

    await R.user.create({ data: { id: marker, email: `${marker}@example.invalid`, displayName: marker } });
    await R.campaign.create({ data: { id: tpl, name: tpl, dmUserId: marker, inviteCode: randomUUID(), kind: "template", contentVersion: 1 } });

    await R.user.create({ data: { id: `${marker}-u2`, email: `${marker}-u2@example.invalid`, displayName: marker } });

    const own = { campaignId: tpl };

    await R.spellGroup.create({ data: { id: T.group, ...own, name: "Group" } });
    await R.spell.createMany({ data: [spell(T.sp1, "Alpha", { groupId: T.group }), spell(T.sp2, "Bravo"), spell(T.sp3, "Charlie")] });
    await R.mainSkill.create({ data: { id: T.ms, ...own, name: "Main", color: "red", spellGroupId: T.group } });
    await R.skill.create({ data: { id: T.sk, ...own, name: "Skill", mainSkillId: T.ms, grantedSpellId: T.sp1 } });
    await R.skillTree.create({ data: { id: T.tree, ...own, race: "elf", skills: [{ id: T.sk }] } });
    await R.race.create({ data: { id: T.race, ...own, name: "Elf" } });
    await R.unit.create({ data: { id: T.unit, ...own, name: "Orc", raceId: T.race, knownSpells: [T.sp1] } });
    await R.artifactSet.create({ data: { id: T.set, ...own, name: "Set" } });
    await R.artifact.createMany({ data: [T.art, T.art2, T.art3].map((id, i) => ({ id, ...own, name: `Art${i}`, slot: "ring", setId: T.set })) });
    await R.campaignTrack.create({ data: { id: T.trk, ...own, title: "Track", kind: "ambient" } });
    await R.background.create({ data: { id: T.bg, ...own, name: "Sage" } });

    clones.main = await clone("main");
    clones.rb = await clone("rb");

    await R.spell.update({ where: { id: T.sp1 }, data: { name: "Alpha v2" } });
    await R.spell.update({ where: { id: T.sp2 }, data: { name: "Bravo v2" } });
    await R.spell.create({ data: spell(T.sp4, "Delta") });
    await R.artifact.delete({ where: { id: T.art2 } });

    published = (await raw.$transaction((tx) => publishTemplateVersion(tx, tpl))).version;
  });

  afterAll(async () => {
    const campaigns = { campaignId: { startsWith: marker } };

    await R.$executeRawUnsafe(`DROP TRIGGER IF EXISTS legacy_mig_fail ON characters`);
    await raw.playerNotification.deleteMany({ where: campaigns });
    await raw.compendiumEntry.deleteMany({ where: campaigns });
    await raw.campaignShow.deleteMany({ where: campaigns });
    await raw.battleScene.deleteMany({ where: campaigns });
    await raw.character.deleteMany({ where: campaigns });
    await raw.campaignContentHide.deleteMany({ where: campaigns });
    await raw.campaignSourceSync.deleteMany({ where: campaigns });

    for (const t of BUNDLE_TABLES) {
      await R[t.delegate].deleteMany({ where: campaigns });
      await R[layeredModels()[t.model].base].deleteMany({ where: { sourceCampaignId: tpl } });
    }

    await raw.campaign.deleteMany({ where: { id: { startsWith: marker } } });
    await raw.user.deleteMany({ where: { id: { startsWith: marker } } });
    await raw.$disconnect();
    await rm(preImageDir, { recursive: true, force: true });
  });

  it("dry-run writes nothing and reports the plan counts", async () => {
    const c = clones.main;

    await populate(c);

    queries.length = 0;

    const report = await dryRunCampaign(db, c.id);

    expect(writes()).toEqual([]);
    expect(report).toMatchObject({ status: "eligible", sourceId: tpl, version: published });
    expect(report.tables.spells).toEqual({ stored: 3, baseRef: 0, override: { updated: 1, conflict: 1, own: 0, orphan: 0 }, local: 1, hide: 2, hidePending: 1 });
    expect(report.tables.artifacts).toMatchObject({ stored: 3, baseRef: 2, override: { orphan: 1 }, hide: 0 });
    expect(report.tables.races).toMatchObject({ stored: 1, baseRef: 1, local: 0 });

    const character = report.referrers.find((r) => r.model === "Character")!;

    expect(character.rows).toBe(1);
    expect(character.cells).toMatchObject({ knownSpells: 1, backgroundId: 1, personalSkillId: 1, skillTreeProgress: 1 });
  });

  it("migrates content, hides, referrers and campaign state in one transaction", async () => {
    const c = clones.main;

    const L = c.local;

    const before = await R.campaign.findUnique({ where: { id: c.id } });

    const visibleBefore = (await R.spell.findMany({ where: { campaignId: c.id }, orderBy: { name: "asc" } })).map((s: any) => s.name);

    const report = await migrateCampaign(db as unknown as ExtendedPrisma, { campaignId: c.id, preImageDir });

    expect(report.status).toBe("migrated");
    mainPreImage = report.preImagePath!;
    expect(report.residuals).toBeDefined();
    expect(existsSync(report.preImagePath!)).toBe(true);

    const campaign = await R.campaign.findUnique({ where: { id: c.id } });

    expect(campaign).toMatchObject({ baseSourceId: tpl, baseVersion: published, contentVersion: before.contentVersion + 1 });

    const spells = await R.spell.findMany({ where: { campaignId: c.id } });

    expect(spells.map((s: any) => s.sourceId).sort()).toEqual([null, T.sp1, T.sp2].sort());
    expect(spells.find((s: any) => s.sourceId === T.sp2).id).toBe(L(T.sp2));
    expect(await R.race.count({ where: { campaignId: c.id } })).toBe(0);
    expect(await R.unit.count({ where: { campaignId: c.id } })).toBe(0);
    expect((await R.artifact.findMany({ where: { campaignId: c.id } })).map((a: any) => a.sourceId)).toEqual([T.art2]);

    const spellHides = layeredModels().Spell.hideTable;

    const hides = await R.campaignContentHide.findMany({ where: { campaignId: c.id } });

    expect(hides.map((h: any) => `${h.table}:${h.id}`).sort()).toEqual([`${spellHides}:${T.sp3}`, `${spellHides}:${T.sp4}`].sort());

    const sync = await R.campaignSourceSync.findUnique({ where: { campaignId: c.id } });

    expect(sync.sourceVersion).toBe(published);
    expect(Object.keys(sync.ignored.tables.spells)).toEqual([`pending:${T.sp4}`]);

    const character = await R.character.findFirst({ where: { campaignId: c.id } });

    expect(character).toMatchObject({ knownSpells: [T.sp1, T.sp2], backgroundId: T.bg, personalSkillId: T.sk, skillTreeProgress: { [T.tree]: { [T.sk]: 1 } } });

    const inventory = await R.characterInventory.findFirst({ where: { characterId: character.id } });

    expect(inventory.backpack).toEqual([itemRef(T.art, T.art3)]);
    expect(JSON.parse(inventory.items[0].value)).toEqual({ ref: T.art });
    expect((await R.characterSkills.findFirst({ where: { characterId: character.id } }))).toMatchObject({ skillTreeId: T.tree, unlockedSkills: [T.sk] });

    const scene = await R.battleScene.findFirst({ where: { campaignId: c.id } });

    expect(scene).toMatchObject({ participants: [{ sourceId: T.unit }], audio: { trackId: T.trk } });

    const participant = await R.battleParticipant.findFirst({ where: { battleId: scene.id } });

    expect(participant.sourceId).toBe(T.unit);
    expect(participant.snapshot).toEqual({ unitId: T.unit, name: "Orc" });
    expect(participant.snapshotHash).toBe(hashJson(participant.snapshot));
    expect(await R.playerNotification.findFirst({ where: { campaignId: c.id } })).toMatchObject({ refId: T.sp1, href: `/campaigns/${c.id}/character?tab=magic` });
    expect(await R.campaignShow.findUnique({ where: { campaignId: c.id } })).toMatchObject({ audio: { trackId: T.trk } });
    expect(await R.compendiumEntry.findFirst({ where: { campaignId: c.id } })).toMatchObject({ localId: T.sp1 });

    invalidateCampaignLayer();

    const visible = (await D.spell.findMany({ where: { campaignId: c.id }, orderBy: { name: "asc" } })).map((s: any) => s.name);

    expect(visible).toEqual(visibleBefore);

    const image = await readPreImage(report.preImagePath!);

    expect(image).toMatchObject({ campaignId: c.id, campaign: { baseSourceId: null, baseVersion: null, contentVersion: before.contentVersion }, postContentVersion: before.contentVersion + 1 });
    expect(image.stored.spells).toHaveLength(3);
    expect(image.sourceSync).toMatchObject({ campaignId: c.id });
    expect(image.referrerCells.some((cell) => cell.model === "Character" && cell.column === "knownSpells")).toBe(true);
    expect(new Map(image.plan.idMap).get(L(T.sp1))).toBe(T.sp1);
  });

  it("a second run is ALREADY_LAYERED and a campaign without a source is NO_SOURCE, both without writes", async () => {
    const orphan = `${marker}-nosource`;

    await R.campaign.create({ data: { id: orphan, name: orphan, dmUserId: marker, inviteCode: randomUUID() } });
    queries.length = 0;

    const again = await migrateCampaign(db as unknown as ExtendedPrisma, { campaignId: clones.main.id, preImageDir });

    const none = await migrateCampaign(db as unknown as ExtendedPrisma, { campaignId: orphan, preImageDir });

    expect(again).toMatchObject({ status: "ALREADY_LAYERED" });
    expect(none).toMatchObject({ status: "NO_SOURCE" });
    expect(again.preImagePath).toBeUndefined();
    expect(writes()).toEqual([]);
  });

  it("an error in the middle of the write rolls everything back", async () => {
    const c = clones.rb;

    await populate(c);

    const snapshot = await storedState(c.id);

    await R.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION legacy_mig_fail() RETURNS trigger AS $$ BEGIN IF NEW."campaignId" LIKE '${marker}%' THEN RAISE EXCEPTION 'injected'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`);
    await R.$executeRawUnsafe(`CREATE TRIGGER legacy_mig_fail BEFORE UPDATE ON characters FOR EACH ROW EXECUTE FUNCTION legacy_mig_fail()`);

    try {
      await expect(migrateCampaign(db as unknown as ExtendedPrisma, { campaignId: c.id, preImageDir })).rejects.toThrow(/injected/);
    } finally {
      await R.$executeRawUnsafe(`DROP TRIGGER IF EXISTS legacy_mig_fail ON characters`);
      await R.$executeRawUnsafe(`DROP FUNCTION IF EXISTS legacy_mig_fail()`);
    }

    expect(await storedState(c.id)).toBe(snapshot);
    await expect(latestPublishedVersion(raw, tpl)).resolves.toBe(published);
  });

  it("the layered sync items cover updated, conflict, deletedInSource and new after migration, and verifyFromPreImage agrees", async () => {
    const c = clones.main;

    invalidateCampaignLayer();

    const ctx = await loadLayeredContext(db as never, c.id, { sourceId: tpl, baseVersion: published });

    const statuses = new Map(classifyLayered(ctx).map((i) => [`${i.scope}:${i.key}`, i.status]));

    expect(statuses.get(`spells:${T.sp1}`)).toBe("updated");
    expect(statuses.get(`spells:${T.sp2}`)).toBe("conflict");
    expect(statuses.get(`spells:${T.sp4}`)).toBe("new");
    expect(statuses.get(`artifacts:${T.art2}`)).toBe("deletedInSource");

    const verdict = await verifyFromPreImage(db, mainPreImage);

    expect(verdict).toMatchObject({ ok: true, mismatches: [] });
    expect(verdict.residuals.exact).toEqual([]);
  });

  it("a registry that misses a column fails with RESIDUAL_REFS and leaves the database untouched", async () => {
    const c = clones.rb;

    const snapshot = await storedState(c.id);

    const broken = REFERRERS.map((r) => (r.model === "Character" && r.mode === "remap" ? { ...r, columns: r.columns!.filter((x) => x !== "knownSpells") } : r));

    const error = await migrateCampaign(asMigrate, { campaignId: c.id, preImageDir, seams: { registry: broken } }).catch((e) => e);

    expect(error).toMatchObject({ code: "RESIDUAL_REFS" });
    expect(error.details.exact).toContainEqual({ model: "Character", column: "knownSpells", count: 1 });
    expect(await storedState(c.id)).toBe(snapshot);
  });

  it("a corrupted plan fails with VERIFY_MISMATCH and leaves the database untouched", async () => {
    const c = clones.rb;

    const snapshot = await storedState(c.id);

    const dropOverride = (plan: MigrationPlan): MigrationPlan => ({
      ...plan,
      rows: { ...plan.rows, spells: plan.rows.spells.filter((r) => r.sourceId !== T.sp2) },
    });

    const error = await migrateCampaign(asMigrate, { campaignId: c.id, preImageDir, seams: { mapPlan: dropOverride } }).catch((e) => e);

    expect(error).toMatchObject({ code: "VERIFY_MISMATCH" });
    expect(error.details.exposed).toContainEqual({ table: "spells", id: T.sp2, kind: "changed" });
    expect(await storedState(c.id)).toBe(snapshot);
  });
});
