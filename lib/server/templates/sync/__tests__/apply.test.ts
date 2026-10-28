import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clone, createFakeSyncDb } from "./fake-sync-db";
import { id, visible as visibleItems } from "./helpers";

import { SYNC_SCOPES } from "@/lib/constants/source-sync";
import { ContentError } from "@/lib/server/content/errors";
import { BUNDLE_TABLES } from "@/lib/server/templates/bundle";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
import { applySourceChanges } from "@/lib/server/templates/sync/apply";
import { classify } from "@/lib/server/templates/sync/classify";
import { loadSyncContext } from "@/lib/server/templates/sync/context";
import { buildDiff } from "@/lib/server/templates/sync/diff";
import type { SyncRef } from "@/types/campaigns";

const SRC = "src", TGT = "tgt";

const RACE = id("r"), UNIT = id("u"), SPELL = id("s");

let f: ReturnType<typeof createFakeSyncDb>;

const visible = async () => visibleItems(classify(await loadSyncContext(f.db, TGT)));

const ref = (i: SyncRef) => ({ scope: i.scope, key: i.key, sourceHash: i.sourceHash, status: i.status });

const rows = (delegate: string, campaignId: string) => f.store.get(delegate)!.filter((r) => r.campaignId === campaignId);

beforeEach(async () => {
  f = createFakeSyncDb();
  f.addCampaign({ id: SRC, kind: "template" });
  f.addRow("race", { id: RACE, campaignId: SRC, name: "Haven" });
  f.addRow("unit", { id: UNIT, campaignId: SRC, name: "Archer", raceId: RACE, knownSpells: [SPELL] });
  f.addRow("spell", { id: SPELL, campaignId: SRC, name: "Bless" });
  await clone(f, SRC, TGT);
});

describe("applySourceChanges", () => {
  it("fresh clone → empty diff", async () => {
    expect(await visible()).toEqual([]);
  });

  it("applies an update in place, keeping the local id", async () => {
    f.patchRow("spell", SPELL, { name: "Bless II" });

    const [item] = await visible();

    const localId = item.localId!;

    await applySourceChanges(f.db, TGT, { apply: [ref(item)], ignore: [] });

    expect(rows("spell", TGT)).toEqual([expect.objectContaining({ id: localId, name: "Bless II" })]);
    expect(await visible()).toEqual([]);
  });

  it("adds a new unit with its new race and remaps knownSpells to local ids", async () => {
    const R2 = id("q"), U2 = id("w");

    f.addRow("race", { id: R2, campaignId: SRC, name: "Inferno" });
    f.addRow("unit", { id: U2, campaignId: SRC, name: "Imp", raceId: R2, knownSpells: [SPELL] });

    const unit = (await visible()).find((i) => i.key === U2)!;

    const res = await applySourceChanges(f.db, TGT, { apply: [ref(unit)], ignore: [] });

    expect(res.autoAdded).toEqual([expect.objectContaining({ key: R2 })]);

    const localSpell = rows("spell", TGT)[0].id;

    const imp = rows("unit", TGT).find((u) => u.name === "Imp")!;

    const inferno = rows("race", TGT).find((r) => r.name === "Inferno")!;

    expect(imp).toMatchObject({ raceId: inferno.id, knownSpells: [localSpell], sourceId: U2 });
    expect(JSON.stringify(rows("unit", TGT))).not.toContain(SPELL);
    expect(await visible()).toEqual([]);
  });

  it("deletes on deletedInSource and drops the baseline key", async () => {
    f.removeRow("spell", SPELL);
    f.patchRow("unit", UNIT, { knownSpells: [] });

    const items = await visible();

    await applySourceChanges(f.db, TGT, { apply: items.map(ref), ignore: [] });

    expect(rows("spell", TGT)).toEqual([]);
    expect(await visible()).toEqual([]);
  });

  it("re-adds a locally deleted row when chosen", async () => {
    const local = rows("spell", TGT)[0];

    f.removeRow("spell", local.id as string);
    f.patchRow("spell", SPELL, { name: "Bless II" });

    const [item] = await visible();

    expect(item.status).toBe("deletedLocally");

    await applySourceChanges(f.db, TGT, { apply: [ref(item)], ignore: [] });

    expect(rows("spell", TGT)).toEqual([expect.objectContaining({ name: "Bless II", sourceId: SPELL })]);
  });

  it("ignore hides until the next source change", async () => {
    f.patchRow("spell", SPELL, { name: "Bless II" });

    const [item] = await visible();

    await applySourceChanges(f.db, TGT, { apply: [], ignore: [ref(item)] });

    expect(await visible()).toEqual([]);

    f.patchRow("spell", SPELL, { name: "Bless III" });

    expect(await visible()).toHaveLength(1);
  });

  it("stale sourceHash → 409, nothing written", async () => {
    f.patchRow("spell", SPELL, { name: "Bless II" });

    const [item] = await visible();

    f.patchRow("spell", SPELL, { name: "Bless III" });

    await expect(applySourceChanges(f.db, TGT, { apply: [ref(item)], ignore: [] })).rejects.toMatchObject({ status: 409 });
    expect(rows("spell", TGT)[0].name).toBe("Bless");
  });

  it("applies rules per mechanic and settings", async () => {
    f.patchCampaign(SRC, { maxLevel: 10, rules: { morale: { enabled: false } } });

    const items = await visible();

    await applySourceChanges(f.db, TGT, { apply: items.map(ref), ignore: [] });

    const tgt = f.campaign(TGT);

    expect(tgt.maxLevel).toBe(10);
    expect((tgt.rules as { morale: { enabled: boolean } }).morale.enabled).toBe(false);
    expect(await visible()).toEqual([]);
  });

  it("unknown key → 409", async () => {
    await expect(applySourceChanges(f.db, TGT, { apply: [{ scope: "spells", key: id("z"), sourceHash: "x", status: "new" }], ignore: [] })).rejects.toBeInstanceOf(ContentError);
  });

  it("buildDiff reports usage for deletedInSource", async () => {
    f.removeRow("spell", SPELL);

    const ctx = await loadSyncContext(f.db, TGT);

    const diff = await buildDiff(f.db, ctx);

    expect(diff.items.find((i) => i.status === "deletedInSource")!.usage).toEqual({ characters: 0, content: 1 });
  });
});

describe("fallback baseline (no sync row)", () => {
  beforeEach(() => {
    f.syncs.delete(TGT);
  });

  it("fresh clone → empty diff, rules and settings count as synced", async () => {
    f.patchCampaign(SRC, { maxLevel: 10 });

    expect(await visible()).toEqual([]);
  });

  it("source edit → updated, local edit too → conflict", async () => {
    f.patchRow("spell", SPELL, { name: "Bless II" });

    expect((await visible()).map((i) => [i.scope, i.status])).toEqual([["spells", "updated"]]);

    f.patchRow("spell", rows("spell", TGT)[0].id as string, { name: "Mine" });

    expect((await visible())[0].status).toBe("conflict");
  });

  it("a sync row of another source is ignored", async () => {
    f.syncs.set(TGT, { campaignId: TGT, sourceCampaignId: "other", baseline: { tables: {}, rules: {} }, ignored: { tables: {}, rules: {} } });

    expect(await visible()).toEqual([]);
  });

  it("first apply creates the sync row", async () => {
    f.patchRow("spell", SPELL, { name: "Bless II" });

    await applySourceChanges(f.db, TGT, { apply: (await visible()).map(ref), ignore: [] });

    expect(f.syncs.get(TGT)).toMatchObject({ sourceCampaignId: SRC });
    expect(await visible()).toEqual([]);
  });
});

describe("conflicts", () => {
  it("keep mine: nothing applied, the item stays", async () => {
    const localId = rows("spell", TGT)[0].id as string;

    f.patchRow("spell", localId, { name: "Mine" });
    f.patchRow("spell", SPELL, { name: "Theirs" });

    const [item] = await visible();

    expect(item.status).toBe("conflict");

    await applySourceChanges(f.db, TGT, { apply: [], ignore: [] });

    expect(rows("spell", TGT)[0].name).toBe("Mine");
    expect(await visible()).toEqual([expect.objectContaining({ key: SPELL, status: "conflict" })]);
  });

  it("apply takes the source version", async () => {
    const localId = rows("spell", TGT)[0].id as string;

    f.patchRow("spell", localId, { name: "Mine" });
    f.patchRow("spell", SPELL, { name: "Theirs" });

    await applySourceChanges(f.db, TGT, { apply: (await visible()).map(ref), ignore: [] });

    expect(rows("spell", TGT)[0].name).toBe("Theirs");
  });

  it("the row became a conflict after the diff was shown → 409, nothing written", async () => {
    f.patchRow("spell", SPELL, { name: "Bless II" });

    const [item] = await visible();

    expect(item.status).toBe("updated");

    f.patchRow("spell", rows("spell", TGT)[0].id as string, { name: "Mine" });

    await expect(applySourceChanges(f.db, TGT, { apply: [ref(item)], ignore: [] })).rejects.toMatchObject({ status: 409 });
    expect(rows("spell", TGT)[0].name).toBe("Mine");
  });
});

describe("skill trees", () => {
  const TREE = id("t");

  const tree = (note: string) => ({ id: TREE, campaignId: SRC, race: "Haven", skills: { id: TREE, mainSkills: [], note } });

  it("creates with the JSON id remapped, and moves legacy progress on update", async () => {
    f.addRow("skillTree", tree("v1"));

    await applySourceChanges(f.db, TGT, { apply: (await visible()).map(ref), ignore: [] });

    const created = rows("skillTree", TGT)[0];

    expect((created.skills as { id: string }).id).toBe(created.id);
    expect(created.id).not.toBe(TREE);

    f.patchRow("skillTree", created.id as string, { skills: { id: "legacy", mainSkills: [] } });
    f.addRow("character", { id: id("h"), campaignId: TGT, race: "Haven", skillTreeProgress: { legacy: ["a"], other: ["b"] } });
    f.patchRow("skillTree", TREE, { skills: { id: TREE, mainSkills: [], note: "v2" } });

    const [item] = await visible();

    await applySourceChanges(f.db, TGT, { apply: [ref(item)], ignore: [] });

    const updated = rows("skillTree", TGT)[0];

    expect((updated.skills as { id: string }).id).toBe(updated.id);
    expect(f.store.get("character")![0].skillTreeProgress).toEqual({ [updated.id as string]: ["a"], other: ["b"] });
  });
});

describe("nullable JSON", () => {
  it("source null on update is written as DbNull", async () => {
    f.patchRow("spell", SPELL, { effects: { a: 1 } });
    await applySourceChanges(f.db, TGT, { apply: (await visible()).map(ref), ignore: [] });

    f.patchRow("spell", SPELL, { effects: null });

    const [item] = await visible();

    await applySourceChanges(f.db, TGT, { apply: [ref(item)], ignore: [] });

    expect(f.updates.at(-1)!.data.effects).toBe(Prisma.DbNull);
    expect(rows("spell", TGT)[0].effects).toBeNull();
  });
});

describe("written rows safety", () => {
  const OTHER = id("o");

  it("a ref to another campaign's content → 422", async () => {
    f.addCampaign({ id: "oth" });
    f.addRow("spell", { id: OTHER, campaignId: "oth", name: "Alien" });
    f.patchRow("unit", UNIT, { knownSpells: [SPELL, OTHER] });

    const [item] = await visible();

    await expect(applySourceChanges(f.db, TGT, { apply: [ref(item)], ignore: [] })).rejects.toMatchObject({ status: 422 });
  });

  it("a source id that survives remapping → 422", async () => {
    f.patchRow("unit", UNIT, { knownSpells: { [SPELL]: 1 } });

    const [item] = await visible();

    await expect(applySourceChanges(f.db, TGT, { apply: [ref(item)], ignore: [] })).rejects.toMatchObject({ status: 422 });
  });
});

describe("source access", () => {
  const run = (userId: string) => applySourceChanges(f.db, TGT, { apply: [], ignore: [] }, { userId });

  it("private source without a DM membership → 403", async () => {
    f.patchCampaign(SRC, { visibility: "private", members: [] });

    await expect(run("u")).rejects.toMatchObject({ status: 403 });

    f.patchCampaign(SRC, { members: [{ role: "player" }] });

    await expect(run("u")).rejects.toMatchObject({ status: 403 });
  });

  it("private source with a DM membership, or an official source → ok", async () => {
    f.patchCampaign(SRC, { visibility: "private", members: [{ role: "dm" }] });

    await expect(run("u")).resolves.toBeDefined();

    f.patchCampaign(SRC, { visibility: "official", members: [] });

    await expect(run("u")).resolves.toBeDefined();
  });
});

describe("sync scopes", () => {
  it("SYNC_SCOPES = bundle tables + rules + settings", () => {
    expect([...SYNC_SCOPES].sort()).toEqual([...BUNDLE_TABLES.map((t) => t.key), "rules", "settings"].sort());
  });
});

describe("credits", () => {
  it("exportCampaign віддає credits; null, коли їх немає", async () => {
    expect((await exportCampaign(f.db, SRC)).credits).toBeNull();

    f.patchCampaign(SRC, { credits: "SRD 5.2" });

    expect((await exportCampaign(f.db, SRC)).credits).toBe("SRD 5.2");
  });

  it("застосування змін копіює credits джерела", async () => {
    f.patchCampaign(SRC, { credits: "SRD 5.2" });
    f.patchRow("spell", SPELL, { name: "Bless II" });

    const [item] = await visible();

    await applySourceChanges(f.db, TGT, { apply: [ref(item)], ignore: [] });

    expect(f.campaign(TGT).credits).toBe("SRD 5.2");
  });

  it("без змін credits, правил і налаштувань кампанія не оновлюється", async () => {
    f.patchRow("spell", SPELL, { name: "Bless II" });

    const [item] = await visible();

    const update = vi.spyOn((f.db as unknown as { campaign: { update: (a: unknown) => Promise<unknown> } }).campaign, "update");

    await applySourceChanges(f.db, TGT, { apply: [ref(item)], ignore: [] });

    expect(update).not.toHaveBeenCalled();
  });
});
