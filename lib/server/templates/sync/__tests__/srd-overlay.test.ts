import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSyncDb } from "./fake-sync-db";
import { id, visible } from "./helpers";

import { GRIM_TEMPLATE_NAME, SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { importBundle } from "@/lib/server/templates/import-bundle";
import { prepareCampaignSource } from "@/lib/server/templates/prepare-source";
import { applySourceChanges } from "@/lib/server/templates/sync/apply";
import { classify } from "@/lib/server/templates/sync/classify";
import { loadSyncContext } from "@/lib/server/templates/sync/context";
import { baselineFromBundle } from "@/lib/server/templates/sync/hash";
import { hashText } from "@/lib/srd/i18n/catalog";
import type { SyncRef } from "@/types/campaigns";

const dictionary = vi.hoisted(() => ({ values: {} as Record<string, string> }));

vi.mock("@/lib/server/templates/template-translations", () => ({ templateTranslationsFor: (_key: string, locale: string) => locale === "uk" ? dictionary.values : {} }));

let f: ReturnType<typeof createFakeSyncDb>;

const source = "source", target = "target", spell = id("s"), klass = id("k"), base = id("b"), property = id("p");

const ref = ({ scope, key, sourceHash, status }: SyncRef) => ({ scope, key, sourceHash, status });

const diff = async () => visible(classify(await loadSyncContext(f.db, target)));

const local = (delegate: string) => (f.store.get(delegate) ?? []).filter((r) => r.campaignId === target);

async function makeClone(locale: "en" | "uk" = "uk") {
  const prepared = await prepareCampaignSource(f.db, source, { userId: "dm", mode: "create", contentLocale: locale });

  f.addCampaign({ id: target, createdFromId: prepared.id, locale: prepared.contentLocale, ...prepared.bundle.settings, rules: prepared.bundle.rules });

  const { hashes } = await importBundle(f.db, prepared.bundle, target);

  f.syncs.set(target, { sourceCampaignId: source, baseline: baselineFromBundle(prepared.bundle, hashes) });
}

beforeEach(() => {
  f = createFakeSyncDb();
  f.addCampaign({ id: source, kind: "template", visibility: "official", templateKey: SRD_TEMPLATE_NAME, locale: "en" });
  f.addRow("spell", { id: spell, campaignId: source, name: "Bless", description: "Untranslated prose" });
  dictionary.values = { [hashText("n", "Bless")]: "Благословення" };
});

describe("localized SRD synchronization", () => {
  it("has no immediate diff and uses persisted locale rather than interface locale", async () => {
    await makeClone();
    expect(await diff()).toEqual([]);
    expect((await loadSyncContext(f.db, target)).srdOverlay).toBe(true);
  });
  it("handles English fallback, new translations, revisions, and apply followed by no diff", async () => {
    await makeClone();
    f.patchRow("spell", spell, { description: "Changed English" });
    expect(await diff()).toEqual([expect.objectContaining({ key: spell, status: "updated" })]);
    await applySourceChanges(f.db, target, { apply: (await diff()).map(ref), ignore: [] });
    expect(local("spell")[0].description).toBe("Changed English");
    expect(await diff()).toEqual([]);
    dictionary.values[hashText("d", "Changed English")] = "Новий переклад";
    await applySourceChanges(f.db, target, { apply: (await diff()).map(ref), ignore: [] });
    expect(local("spell")[0].description).toBe("Новий переклад");
    expect(await diff()).toEqual([]);
    dictionary.values[hashText("d", "Changed English")] = "Редакція";
    expect(await diff()).toEqual([expect.objectContaining({ key: spell, status: "updated" })]);
  });
  it("retains ignored and conflicting local content across translation changes", async () => {
    await makeClone();
    dictionary.values[hashText("n", "Bless")] = "Версія 2";
    await applySourceChanges(f.db, target, { apply: [], ignore: (await diff()).map(ref) });
    expect(await diff()).toEqual([]);
    dictionary.values[hashText("n", "Bless")] = "Версія 3";
    f.patchRow("spell", local("spell")[0].id as string, { name: "Mine" });
    expect(await diff()).toEqual([expect.objectContaining({ status: "conflict" })]);
    await applySourceChanges(f.db, target, { apply: [], ignore: [] });
    expect(local("spell")[0].name).toBe("Mine");
  });
  it("rejects stale translation hashes before writes", async () => {
    await makeClone();
    dictionary.values[hashText("n", "Bless")] = "Версія 2";

    const selection = (await diff()).map(ref);

    dictionary.values[hashText("n", "Bless")] = "Версія 3";
    await expect(applySourceChanges(f.db, target, { apply: selection, ignore: [] })).rejects.toMatchObject({ status: 409 });
    expect(f.updates).toEqual([]);
  });
  it.each(["legacy", "private", "null"])("preserves %s source/language behavior", async (mode) => {
    await makeClone("en");

    if (mode === "legacy") f.patchCampaign(source, { locale: "uk" });

    if (mode === "private") f.patchCampaign(source, { visibility: "private", members: [{ role: "dm" }] });

    f.patchCampaign(target, { locale: mode === "null" ? null : "uk" });
    expect(await diff()).toEqual([]);
    expect((await loadSyncContext(f.db, target)).source.id).toBe(source);
  });
});

describe("SRD effective name reference graph", () => {
  beforeEach(() => {
    f.addRow("gameClass", { id: klass, campaignId: source, name: "Wizard", spellList: "Wizard" });
    f.patchRow("spell", spell, { lists: ["Wizard"] });
    f.addRow("background", { id: id("g"), campaignId: source, name: "Sage", choices: [{ spells: { lists: ["Wizard"] } }] });
    f.addRow("artifact", { id: base, campaignId: source, name: "Sword", modifiers: [] });
    f.addRow("artifact", { id: property, campaignId: source, name: "Flaming", modifiers: [{ type: "itemStats", value: JSON.stringify({ property: { appliesTo: { bases: ["Sword"] } }, extra: true }) }] });
  });
  it.each(["classes", "spells"])("rejects selecting only %s during linked class rename, before writes", async (scope) => {
    await makeClone();
    dictionary.values[hashText("n", "Wizard")] = "Чарівник";

    const selection = (await diff()).filter((i) => i.scope === scope).map(ref);

    await expect(applySourceChanges(f.db, target, { apply: selection, ignore: [] })).rejects.toMatchObject({ status: 409, params: { rows: expect.stringContaining("Wizard") } });
    expect(f.updates).toEqual([]);
  });
  it.each([base, property])("rejects partial base-name rename for %s including serialized itemStats", async (key) => {
    await makeClone();
    dictionary.values[hashText("n", "Sword")] = "Меч";
    await expect(applySourceChanges(f.db, target, { apply: (await diff()).filter((i) => i.key === key).map(ref), ignore: [] })).rejects.toMatchObject({ status: 409 });
    expect(f.updates).toEqual([]);
  });
  it("rejects a reference-only class rename that would bind to an unrelated local class", async () => {
    await makeClone();

    const wizardId = local("gameClass")[0].id;

    f.addRow("gameClass", { id: id("m"), campaignId: target, name: "Mage", sourceId: null });
    dictionary.values[hashText("n", "Wizard")] = "Mage";

    const before = structuredClone([...f.store.entries()]);

    const selection = (await diff()).filter((i) => i.key === spell).map(ref);

    await expect(applySourceChanges(f.db, target, { apply: selection, ignore: [] })).rejects.toMatchObject({ status: 409, params: { rows: expect.stringContaining("Wizard") } });
    expect([...f.store.entries()]).toEqual(before);
    expect(f.updates).toEqual([]);
    expect(local("gameClass").find((r) => r.id === wizardId)?.name).toBe("Wizard");
  });
  it("rejects a serialized base reference rename that would bind to an unrelated local artifact", async () => {
    await makeClone();
    f.addRow("artifact", { id: id("m"), campaignId: target, name: "Blade", sourceId: null, modifiers: [] });
    dictionary.values[hashText("n", "Sword")] = "Blade";

    const before = structuredClone([...f.store.entries()]);

    const selection = (await diff()).filter((i) => i.key === property).map(ref);

    await expect(applySourceChanges(f.db, target, { apply: selection, ignore: [] })).rejects.toMatchObject({ status: 409, params: { rows: expect.stringContaining("Sword") } });
    expect([...f.store.entries()]).toEqual(before);
    expect(f.updates).toEqual([]);
  });
  it("allows a deliberate source reference retarget to another existing class provider", async () => {
    const cleric = id("c");

    f.addRow("gameClass", { id: cleric, campaignId: source, name: "Cleric", spellList: "Cleric" });
    await makeClone();
    f.patchRow("spell", spell, { lists: ["Cleric"] });
    await applySourceChanges(f.db, target, { apply: (await diff()).filter((i) => i.key === spell).map(ref), ignore: [] });
    expect(local("spell")[0].lists).toEqual(["Cleric"]);
    expect(await diff()).toEqual([]);
  });
  it("allows a deliberate serialized source reference retarget to another existing base provider", async () => {
    const axe = id("a");

    f.addRow("artifact", { id: axe, campaignId: source, name: "Axe", modifiers: [] });
    await makeClone();
    f.patchRow("artifact", property, { modifiers: [{ type: "itemStats", value: JSON.stringify({ property: { appliesTo: { bases: ["Axe"] } }, extra: true }) }] });
    await applySourceChanges(f.db, target, { apply: (await diff()).filter((i) => i.key === property).map(ref), ignore: [] });

    const row = local("artifact").find((r) => r.sourceId === property);

    expect(JSON.parse((row?.modifiers as Array<{ value: string }>)[0].value).property.appliesTo.bases).toEqual(["Axe"]);
    expect(await diff()).toEqual([]);
  });
  it("accepts complete linked updates and tolerates unchanged unrelated unmatched references", async () => {
    f.addRow("spell", { id: id("u"), campaignId: source, name: "Unrelated", lists: ["Custom unmatched"] });
    await makeClone();
    dictionary.values[hashText("n", "Wizard")] = "Чарівник";
    dictionary.values[hashText("n", "Sword")] = "Меч";
    await applySourceChanges(f.db, target, { apply: (await diff()).map(ref), ignore: [] });
    expect(local("gameClass")[0].name).toBe("Чарівник");
    expect(local("spell").find((r) => r.sourceId === spell)?.lists).toEqual(["Чарівник"]);
    expect(await diff()).toEqual([]);
  });
  it("does not automatically overwrite ignored or conflicting linked references", async () => {
    await makeClone();
    dictionary.values[hashText("n", "Wizard")] = "Чарівник";
    f.patchRow("spell", local("spell")[0].id as string, { description: "My description" });

    const items = await diff();

    expect(items.find((i) => i.key === spell)?.status).toBe("conflict");
    await expect(applySourceChanges(f.db, target, { apply: items.filter((i) => i.scope === "classes").map(ref), ignore: items.filter((i) => i.scope === "spells").map(ref) })).rejects.toMatchObject({ status: 409 });
    expect(local("spell")[0].description).toBe("My description");
    expect(f.updates).toEqual([]);
  });
  it("rejects newly introduced unmatched references but leaves unrelated sources alone", async () => {
    await makeClone();
    f.patchRow("spell", spell, { lists: ["Missing class"] });
    await expect(applySourceChanges(f.db, target, { apply: (await diff()).map(ref), ignore: [] })).rejects.toMatchObject({ status: 409 });
    f.patchCampaign(source, { templateKey: "Custom" });
    await applySourceChanges(f.db, target, { apply: (await diff()).map(ref), ignore: [] });
    expect(local("spell")[0].lists).toEqual(["Missing class"]);
  });
});

describe("localized Grim synchronization", () => {
  const table = (text: string) => ({ tables: { miscastMinor: [{ max: 100, text, effects: [] }] } });

  beforeEach(() => {
    f.patchCampaign(source, { templateKey: GRIM_TEMPLATE_NAME, rules: table("A smell of scorched hair.") });
    f.addRow("career", { id: id("c"), campaignId: source, name: "Archivist", class: "Academic", tiers: [] });
    dictionary.values = { [hashText("d", "A smell of scorched hair.")]: "Запах паленого волосся.", [hashText("n", "Archivist")]: "Архіваріус" };
  });
  it("has no immediate diff and stores localized rules and careers", async () => {
    await makeClone();
    expect((await loadSyncContext(f.db, target)).srdOverlay).toBe(true);
    expect(await diff()).toEqual([]);
    expect(f.campaign(target).rules).toMatchObject(table("Запах паленого волосся."));
    expect(local("career")[0].name).toBe("Архіваріус");
  });
  it("applies a new spell and a renamed spell-list translation without name-reference errors", async () => {
    f.addRow("spell", { id: id("1"), campaignId: source, name: "Fenlore", lists: ["Fenlore"] });
    dictionary.values[hashText("n", "Fenlore")] = "Болотна мудрість";
    await makeClone();
    expect(await diff()).toEqual([]);
    f.addRow("spell", { id: id("2"), campaignId: source, name: "Mire Step", lists: ["Fenlore"] });
    dictionary.values[hashText("n", "Fenlore")] = "Болотне знання";

    const items = await diff();

    expect(items.length).toBeGreaterThan(0);
    await applySourceChanges(f.db, target, { apply: items.map(ref), ignore: [] });
  });
  it("reports a changed rule-table translation", async () => {
    await makeClone();
    dictionary.values[hashText("d", "A smell of scorched hair.")] = "Інший запах.";
    expect(await diff()).toEqual([expect.objectContaining({ scope: "rules", key: "tables" })]);
  });
});
