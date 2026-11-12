import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSyncDb } from "./fake-sync-db";
import { id, visible } from "./helpers";

import { importBundle } from "@/lib/server/templates/import-bundle";
import { prepareCampaignSource } from "@/lib/server/templates/prepare-source";
import { applySourceChanges } from "@/lib/server/templates/sync/apply";
import { classify } from "@/lib/server/templates/sync/classify";
import { loadSyncContext } from "@/lib/server/templates/sync/context";
import { baselineFromBundle } from "@/lib/server/templates/sync/hash";
import type { TranslationsV2 } from "@/lib/utils/templates/i18n/keys";
import type { SyncRef } from "@/types/campaigns";

const dictionary = vi.hoisted(() => ({ values: {} as TranslationsV2 }));

vi.mock("@/lib/server/templates/dictionaries", () => ({ templateTranslationsFor: (_key: string, locale: string) => locale === "uk" ? dictionary.values : {} }));

let f: ReturnType<typeof createFakeSyncDb>;

const setFenlore = (text: string) => {
  dictionary.values["spells/fenlore/name"] = { text, en: "Fenlore" };
  dictionary.values["lists/fenlore/name"] = { text, en: "Fenlore" };
};

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
  f.addCampaign({ id: source, kind: "template", visibility: "official", templateKey: "srd-5.2", locale: "en" });
  f.addRow("spell", { id: spell, campaignId: source, slug: "bless", name: "Bless", description: "Untranslated prose" });
  dictionary.values = { "spells/bless/name": { text: "Благословення", en: "Bless" } };
});

describe("localized SRD synchronization", () => {
  it("has no immediate diff and uses persisted locale rather than interface locale", async () => {
    await makeClone();
    expect(await diff()).toEqual([]);
    expect((await loadSyncContext(f.db, target)).templateOverlay).toBe(true);
  });
  it("handles English fallback, new translations, revisions, and apply followed by no diff", async () => {
    await makeClone();
    f.patchRow("spell", spell, { description: "Changed English" });
    expect(await diff()).toEqual([expect.objectContaining({ key: spell, status: "updated" })]);
    await applySourceChanges(f.db, target, { apply: (await diff()).map(ref), ignore: [] });
    expect(local("spell")[0].description).toBe("Changed English");
    expect(await diff()).toEqual([]);
    dictionary.values["spells/bless/description"] = { text: "Новий переклад", en: "Changed English" };
    await applySourceChanges(f.db, target, { apply: (await diff()).map(ref), ignore: [] });
    expect(local("spell")[0].description).toBe("Новий переклад");
    expect(await diff()).toEqual([]);
    dictionary.values["spells/bless/description"] = { text: "Редакція", en: "Changed English" };
    expect(await diff()).toEqual([expect.objectContaining({ key: spell, status: "updated" })]);
  });
  it("retains ignored and conflicting local content across translation changes", async () => {
    await makeClone();
    dictionary.values["spells/bless/name"] = { text: "Версія 2", en: "Bless" };
    await applySourceChanges(f.db, target, { apply: [], ignore: (await diff()).map(ref) });
    expect(await diff()).toEqual([]);
    dictionary.values["spells/bless/name"] = { text: "Версія 3", en: "Bless" };
    f.patchRow("spell", local("spell")[0].id as string, { name: "Mine" });
    expect(await diff()).toEqual([expect.objectContaining({ status: "conflict" })]);
    await applySourceChanges(f.db, target, { apply: [], ignore: [] });
    expect(local("spell")[0].name).toBe("Mine");
  });
  it("rejects stale translation hashes before writes", async () => {
    await makeClone();
    dictionary.values["spells/bless/name"] = { text: "Версія 2", en: "Bless" };

    const selection = (await diff()).map(ref);

    dictionary.values["spells/bless/name"] = { text: "Версія 3", en: "Bless" };
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
    f.addRow("gameClass", { id: klass, campaignId: source, slug: "wizard", name: "Wizard", spellList: "Wizard" });
    f.patchRow("spell", spell, { lists: ["Wizard"] });
    f.addRow("background", { id: id("g"), campaignId: source, slug: "sage", name: "Sage", choices: [{ spells: { lists: ["Wizard"] } }] });
    f.addRow("artifact", { id: base, campaignId: source, slug: "sword", name: "Sword", modifiers: [] });
    f.addRow("artifact", { id: property, campaignId: source, slug: "flaming", name: "Flaming", modifiers: [{ type: "itemStats", value: JSON.stringify({ property: { appliesTo: { bases: ["Sword"] } }, extra: true }) }] });
  });
  it.each(["classes", "spells"])("rejects selecting only %s during linked class rename, before writes", async (scope) => {
    await makeClone();
    dictionary.values["classes/wizard/name"] = { text: "Чарівник", en: "Wizard" };

    const selection = (await diff()).filter((i) => i.scope === scope).map(ref);

    await expect(applySourceChanges(f.db, target, { apply: selection, ignore: [] })).rejects.toMatchObject({ status: 409, params: { rows: expect.stringContaining("Wizard") } });
    expect(f.updates).toEqual([]);
  });
  it.each([base, property])("rejects partial base-name rename for %s including serialized itemStats", async (key) => {
    await makeClone();
    dictionary.values["artifacts/sword/name"] = { text: "Меч", en: "Sword" };
    await expect(applySourceChanges(f.db, target, { apply: (await diff()).filter((i) => i.key === key).map(ref), ignore: [] })).rejects.toMatchObject({ status: 409 });
    expect(f.updates).toEqual([]);
  });
  it("rejects a reference-only class rename that would bind to an unrelated local class", async () => {
    await makeClone();

    const wizardId = local("gameClass")[0].id;

    f.addRow("gameClass", { id: id("m"), campaignId: target, name: "Mage", sourceId: null });
    dictionary.values["classes/wizard/name"] = { text: "Mage", en: "Wizard" };

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
    dictionary.values["artifacts/sword/name"] = { text: "Blade", en: "Sword" };

    const before = structuredClone([...f.store.entries()]);

    const selection = (await diff()).filter((i) => i.key === property).map(ref);

    await expect(applySourceChanges(f.db, target, { apply: selection, ignore: [] })).rejects.toMatchObject({ status: 409, params: { rows: expect.stringContaining("Sword") } });
    expect([...f.store.entries()]).toEqual(before);
    expect(f.updates).toEqual([]);
  });
  it("allows a deliberate source reference retarget to another existing class provider", async () => {
    const cleric = id("c");

    f.addRow("gameClass", { id: cleric, campaignId: source, slug: "cleric", name: "Cleric", spellList: "Cleric" });
    await makeClone();
    f.patchRow("spell", spell, { lists: ["Cleric"] });
    await applySourceChanges(f.db, target, { apply: (await diff()).filter((i) => i.key === spell).map(ref), ignore: [] });
    expect(local("spell")[0].lists).toEqual(["Cleric"]);
    expect(await diff()).toEqual([]);
  });
  it("allows a deliberate serialized source reference retarget to another existing base provider", async () => {
    const axe = id("a");

    f.addRow("artifact", { id: axe, campaignId: source, slug: "axe", name: "Axe", modifiers: [] });
    await makeClone();
    f.patchRow("artifact", property, { modifiers: [{ type: "itemStats", value: JSON.stringify({ property: { appliesTo: { bases: ["Axe"] } }, extra: true }) }] });
    await applySourceChanges(f.db, target, { apply: (await diff()).filter((i) => i.key === property).map(ref), ignore: [] });

    const row = local("artifact").find((r) => r.sourceId === property);

    expect(JSON.parse((row?.modifiers as Array<{ value: string }>)[0].value).property.appliesTo.bases).toEqual(["Axe"]);
    expect(await diff()).toEqual([]);
  });
  it("accepts complete linked updates and tolerates unchanged unrelated unmatched references", async () => {
    f.addRow("spell", { id: id("u"), campaignId: source, slug: "unrelated", name: "Unrelated", lists: ["Custom unmatched"] });
    await makeClone();
    dictionary.values["classes/wizard/name"] = { text: "Чарівник", en: "Wizard" };
    dictionary.values["artifacts/sword/name"] = { text: "Меч", en: "Sword" };
    await applySourceChanges(f.db, target, { apply: (await diff()).map(ref), ignore: [] });
    expect(local("gameClass")[0].name).toBe("Чарівник");
    expect(local("spell").find((r) => r.sourceId === spell)?.lists).toEqual(["Чарівник"]);
    expect(await diff()).toEqual([]);
  });
  it("does not automatically overwrite ignored or conflicting linked references", async () => {
    await makeClone();
    dictionary.values["classes/wizard/name"] = { text: "Чарівник", en: "Wizard" };
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
  const table = (text: string) => ({ system: { key: "wfrp" }, tables: { miscastMinor: [{ max: 100, text, effects: [] }] } });

  beforeEach(() => {
    f.patchCampaign(source, { templateKey: "grim-d100", rules: table("A smell of scorched hair.") });
    f.addRow("career", { id: id("c"), campaignId: source, slug: "archivist", name: "Archivist", class: "Academic", tiers: [] });
    dictionary.values = { "rules/_/miscastMinor[0].text": { text: "Запах паленого волосся.", en: "A smell of scorched hair." }, "careers/archivist/name": { text: "Архіваріус", en: "Archivist" } };
  });
  it("has no immediate diff and stores localized rules and careers", async () => {
    await makeClone();
    expect((await loadSyncContext(f.db, target)).templateOverlay).toBe(true);
    expect(await diff()).toEqual([]);
    expect(f.campaign(target).rules).toMatchObject(table("Запах паленого волосся."));
    expect(local("career")[0].name).toBe("Архіваріус");
  });
  it("applies a new spell and a renamed spell-list translation without name-reference errors", async () => {
    f.addRow("spell", { id: id("1"), campaignId: source, slug: "fenlore", name: "Fenlore", lists: ["Fenlore"] });
    setFenlore("Болотна мудрість");
    await makeClone();
    expect(await diff()).toEqual([]);
    f.addRow("spell", { id: id("2"), campaignId: source, slug: "mire-step", name: "Mire Step", lists: ["Fenlore"] });
    setFenlore("Болотне знання");

    const items = await diff();

    expect(items.length).toBeGreaterThan(0);
    await applySourceChanges(f.db, target, { apply: items.map(ref), ignore: [] });
  });
  it("keeps the name-reference exemption when the clone has a local class", async () => {
    f.addRow("spell", { id: id("1"), campaignId: source, slug: "fenlore", name: "Fenlore", lists: ["Fenlore"] });
    setFenlore("Болотна мудрість");
    await makeClone();
    f.addRow("gameClass", { id: id("9"), campaignId: target, name: "Local" });
    f.addRow("spell", { id: id("2"), campaignId: source, slug: "mire-step", name: "Mire Step", lists: ["Fenlore"] });

    const items = await diff();

    expect(items.length).toBeGreaterThan(0);
    await expect(applySourceChanges(f.db, target, { apply: items.map(ref), ignore: [] })).resolves.toBeDefined();
  });
  it("reports a changed rule-table translation", async () => {
    await makeClone();
    dictionary.values["rules/_/miscastMinor[0].text"] = { text: "Інший запах.", en: "A smell of scorched hair." };
    expect(await diff()).toEqual([expect.objectContaining({ scope: "rules", key: "tables" })]);
  });
});
