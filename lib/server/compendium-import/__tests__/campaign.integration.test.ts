import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import fixture from "./fixtures/universal.synthetic.json";

const localDb = await vi.hoisted(async () => {
  const { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } = await import("@/lib/server/test-support/local-db");

  if (!isLocalDevDatabaseEnv()) return false;

  for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) process.env[key] = singleConnectionDatabaseUrl(key);

  return true;
});

vi.mock("@/lib/cache/tags", async original => ({ ...await original<object>(), invalidateReference: vi.fn() }));

import { canonicalKey } from "../identity";
import { previewPresentation } from "../presentation";
import { prismaImportRepository } from "../repository";
import { confirmImport, type ImportInput, previewImport } from "../service";

import { prisma } from "@/lib/db";
import { createCampaignFromBundle } from "@/lib/server/campaigns/create-campaign";
import { resolveCharacterChoices } from "@/lib/server/characters/choices/resolve-choices";
import { featsResource } from "@/lib/server/content/resources/feats";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { loadStoryChapters } from "@/lib/server/scenario/player-story";
import { searchScenarioPages } from "@/lib/server/scenario/search";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
import { applySource, getSourceDiff } from "@/lib/server/templates/sync/service";
import { categoryInventory, projectInput } from "@/lib/utils/compendium-import/flow";
import { parseRules } from "@/lib/utils/rules/schema";

const userId = randomUUID(), name = `Task21 integration ${userId}`, secret = "synthetic-task21-local-integration-secret";

const owned: string[] = [];

let campaignId: string;

const actor = (id = campaignId) => ({ campaignId: id, userId, isDM: true, via: "session" as const, scopes: null });

const input: ImportInput = projectInput(fixture, categoryInventory(fixture).filter(c => c.supported).map(c => c.kind), { rulesPatch: { classes: { enabled: true } } });

async function commit(value: ImportInput, key: string) {
  const p = await previewImport(actor(), value, secret, prismaImportRepository);

  expect(p.report.readyToImport).toBe(true);

  return confirmImport(actor(), value, p.token, key, secret, prismaImportRepository);
}

describe.skipIf(!localDb)("Task21 synthetic campaign integration", () => {
  beforeAll(async () => {
    await prisma.user.create({ data: { id: userId, email: `${userId}@task21.example.test`, displayName: "Task21 Synthetic DM" } });

    const c = await createCampaignFromBundle({ userId, name, bundle: null });

    campaignId = c.campaign.id; owned.push(campaignId);
  });
  afterAll(async () => {
    for (const id of owned.reverse()) {
      const c = await prisma.campaign.findUniqueOrThrow({ where: { id } });

      if (c.dmUserId !== userId || !c.name.startsWith(name)) throw Error("Task21 cleanup ownership mismatch");

      await prisma.campaign.delete({ where: { id } });
    }
    await prisma.user.deleteMany({ where: { id: userId, email: `${userId}@task21.example.test` } });
    await prisma.$disconnect();
  });

  it("fills every native library and private notes in one confirm, preserves attribution and reports manual work", async () => {
    const before = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });

    const p = await previewImport(actor(), input, secret, prismaImportRepository);

    expect(p.report.counts.errors).toBe(0);
    expect(p.report.readyToPlay).toBe(false);
    expect(await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } })).toEqual(before);
    for (const table of [prisma.spell, prisma.unit, prisma.artifact, prisma.race, prisma.gameClass, prisma.feat, prisma.background, prisma.scenarioPage, prisma.compendiumEntry, prisma.compendiumImportRun]) {
      expect(await (table.count as unknown as (args: { where: { campaignId: string } }) => Promise<number>)({ where: { campaignId } })).toBe(0);
    }

    const report = await confirmImport(actor(), input, p.token, "all", secret, prismaImportRepository);

    expect(report.counts.created).toBe(21);
    expect(await confirmImport(actor(), input, p.token, "all", secret, prismaImportRepository)).toEqual(report);
    for (const table of [prisma.spell, prisma.spellGroup, prisma.unit, prisma.artifact, prisma.race, prisma.gameClass, prisma.feat, prisma.background]) expect(await (table.count as unknown as (args: { where: { campaignId: string } }) => Promise<number>)({ where: { campaignId } })).toBeGreaterThan(0);
    expect(report.countsByCategory.book).toMatchObject({ mapped: 1, skipped: 0 });
    expect(report.countsByCategory.bookData).toMatchObject({ mapped: 1, skipped: 0 });
    expect(report.countsByCategory.foundryFeat).toMatchObject({ mapped: 0, skipped: 1 });
    expect(report.nextActions.every(a => a.action.length > 0)).toBe(true);
    expect(report.nextActions.map(a => a.code)).toEqual(expect.arrayContaining(["MANUAL_PREREQUISITE", "MANUAL_CLASS_FEATURE", "UNSUPPORTED_CATEGORY", "CHARACTERS_REQUIRED"]));

    const cls = await prisma.gameClass.findFirstOrThrow({ where: { campaignId } });

    expect(JSON.stringify(cls.features)).toContain("Synthetic class description");
    expect(JSON.stringify(cls.features)).toContain("Synthetic owned option");
    expect(JSON.stringify(cls.subclasses)).toContain("Synthetic subclass description");

    const bg = await prisma.background.findMany({ where: { campaignId } });

    expect(bg).toHaveLength(3);
    expect(bg.filter(b => b.name.includes("Synthetic Scholar"))).toHaveLength(2);
    expect(bg.find(b => !b.originFeatId)?.choices).toEqual([]);

    const origin = await prisma.feat.findUniqueOrThrow({ where: { id: bg.find(b => b.originFeatId)!.originFeatId! } });

    expect(origin).toMatchObject({ campaignId, type: "origin" });

    const spell = await prisma.spell.findFirstOrThrow({ where: { campaignId } });

    expect(spell.executionMode).toBe("manual");

    const provenance = await prisma.compendiumEntry.findFirstOrThrow({ where: { campaignId, kind: "spells" } });

    expect(provenance.attribution).toMatchObject({ page: 7 });
    expect((await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } })).credits).toContain("Synthetic Author");

    const notes = await prisma.scenarioPage.findMany({ where: { campaignId } });

    expect(notes.length).toBeGreaterThanOrEqual(2);
    expect(notes.every(n => n.kind === "note" && n.status === "draft" && n.characterId === null)).toBe(true);
    expect(await searchScenarioPages(campaignId, "SYN21_PRIVATE_PAYLOAD")).toHaveLength(2);
    expect(await loadStoryChapters("no-player", campaignId)).toEqual([]);
    expect(await prisma.battleScene.count({ where: { campaignId } })).toBe(0);

    const again = await previewImport(actor(), input, secret, prismaImportRepository);

    expect(again.report.counts).toMatchObject({ created: 0, updated: 0, errors: 0 });
    expect(again.report.nextActions.some(a => a.code === "LOCAL_CONFLICT")).toBe(false);
    await confirmImport(actor(), input, again.token, "repeat", secret, prismaImportRepository);
  });

  it("blocks missing/non-origin refs, exposes category dependencies and excludes their closure", async () => {
    const value = { json: JSON.stringify({ _meta: fixture._meta, feat: [{ name: "Not Origin", source: "SYN21", category: "G" }], background: [{ name: "Invalid Ref", source: "SYN21", feats: [{ "Not Origin|SYN21": true }] }, { name: "Missing Ref", source: "SYN21", feats: [{ "Absent|SYN21": true }] }] }) };

    const p = await previewImport(actor(), value, secret, prismaImportRepository);

    expect(p.report.readyToImport).toBe(false);
    expect(p.report.nextActions.map(a => a.code)).toEqual(expect.arrayContaining(["BACKGROUND_FEAT_INVALID", "UNRESOLVED_REF"]));

    const excludedKeys = previewPresentation(value).graph.filter(r => r.kind === "backgrounds").map(r => r.key);

    const filtered = await previewImport(actor(), { ...value, excludedKeys }, secret, prismaImportRepository);

    expect(filtered.report.readyToImport).toBe(true);
    expect(filtered.report.rows.every(r => r.kind !== "backgrounds")).toBe(true);

    const fresh = { json: JSON.stringify({ _meta: fixture._meta, background: [{ name: "Unselected Feat", source: "SYN21", feats: [{ "NotSelected|SYN21": true }] }] }) };

    expect((await previewImport(actor(), fresh, secret, prismaImportRepository)).report.readyToImport).toBe(false);
  });

  it("keeps local conflicts, allows explicit overwrite, rejects stale state and non-session DM access", async () => {
    const feat = await prisma.feat.findFirstOrThrow({ where: { campaignId, name: "Synthetic Requirement" } });

    const stale = await previewImport(actor(), input, secret, prismaImportRepository);

    await prisma.feat.update({ where: { id: feat.id }, data: { description: "Local Task21 edit" } });
    await expect(confirmImport(actor(), input, stale.token, "stale", secret, prismaImportRepository)).rejects.toThrow("PREVIEW_STALE");

    const kept = await commit(input, "keep");

    expect(kept.nextActions.some(a => a.code === "LOCAL_CONFLICT")).toBe(true);
    expect((await prisma.feat.findUniqueOrThrow({ where: { id: feat.id } })).description).toBe("Local Task21 edit");
    await commit({ ...input, overwriteKeys: [canonicalKey("feat", "Synthetic Requirement", "SYN21", "one")] }, "overwrite");
    expect((await prisma.feat.findUniqueOrThrow({ where: { id: feat.id } })).description).not.toBe("Local Task21 edit");
    for (const bad of [{ ...actor(), via: "token" as const }, { ...actor(), isDM: false }, { ...actor(), userId: randomUUID() }]) await expect(previewImport(bad, input, secret, prismaImportRepository)).rejects.toThrow("FORBIDDEN");
  });

  it("versions explicit DM-note reimport and preserves notes, nested IDs and provenance through bundle clone and scoped source sync", async () => {
    const changed = structuredClone(fixture);

    changed.bookData[0].data[0].entries = ["SYN21_PRIVATE_PAYLOAD revised fictional chapter"];
    await commit({ ...input, json: JSON.stringify(changed) }, "note-update");

    const note = await prisma.scenarioPage.findFirstOrThrow({ where: { campaignId, title: { contains: "Synthetic Handbook" } } });

    expect(note.version).toBe(1);
    expect(await prisma.scenarioPageVersion.count({ where: { pageId: note.id } })).toBe(1);

    const origin = await prisma.feat.findFirstOrThrow({ where: { campaignId, type: "origin" } });

    const sourceSpell = await prisma.spell.findFirstOrThrow({ where: { campaignId } });

    await withCampaignContentWrite(campaignId, () => featsResource.update(actor(), origin, featsResource.schemas.update.parse({ choices: [{ id: "synthetic-option", label: "Manual native option", kind: "option", options: [{ id: "synthetic-gift", name: "Synthetic gift", spells: [{ level: 1, spellId: sourceSpell.id }] }] }] })));

    const bundle = await exportCampaign(prisma, campaignId);

    const clone = await createCampaignFromBundle({ userId, name: `${name} clone`, bundle, createdFromId: campaignId });

    owned.push(clone.campaign.id);

    const targetId = clone.campaign.id;

    const clonedBg = await prisma.background.findFirstOrThrow({ where: { campaignId: targetId, originFeatId: { not: null } } });

    expect((await prisma.feat.findUniqueOrThrow({ where: { id: clonedBg.originFeatId! } })).campaignId).toBe(targetId);

    const targetSpell = await prisma.spell.findFirstOrThrow({ where: { campaignId: targetId } });

    expect(targetSpell.executionMode).toBe("manual");

    const targetOrigin = await prisma.feat.findUniqueOrThrow({ where: { id: clonedBg.originFeatId! } });

    expect(JSON.stringify(targetOrigin.choices)).toContain(targetSpell.id);
    expect(JSON.stringify(targetOrigin.choices)).not.toContain(sourceSpell.id);

    const srcClass = await prisma.gameClass.findFirstOrThrow({ where: { campaignId } });

    const dstClass = await prisma.gameClass.findFirstOrThrow({ where: { campaignId: targetId } });

    expect(dstClass.features).toEqual(srcClass.features);
    expect((await prisma.scenarioPage.findFirstOrThrow({ where: { campaignId: targetId, title: note.title } })).content).toEqual(note.content);
    expect(await prisma.compendiumEntry.count({ where: { campaignId: targetId } })).toBe(await prisma.compendiumEntry.count({ where: { campaignId } }));

    const next = structuredClone(changed);

    next.feat[1].entries = ["Updated synthetic prerequisite description"];
    next.bookData[0].data[0].entries = ["Second explicit DM update"];
    await commit({ ...input, json: JSON.stringify(next) }, "source-update");

    const diff = await getSourceDiff(actor(targetId), "feats");

    const item = diff.items.find(i => i.name === "Synthetic Requirement")!;

    expect(item).toBeDefined();
    await applySource(actor(targetId), { apply: [{ scope: item.scope, key: item.key, sourceHash: item.sourceHash, status: item.status }], ignore: [] });
    expect((await prisma.feat.findFirstOrThrow({ where: { campaignId: targetId, name: "Synthetic Requirement" } })).description).toContain("Updated synthetic");
    expect((await prisma.scenarioPage.findFirstOrThrow({ where: { campaignId: targetId, title: note.title } })).content).toEqual(note.content);
  });

  it("bootstraps only an explicitly selected available SRD dependency and requires mixed-edition consent", async () => {
    const template = await prisma.campaign.findFirstOrThrow({ where: { kind: "template", visibility: "official", name: "5e SRD 5.2" } });

    const parent = await prisma.gameClass.findFirstOrThrow({ where: { campaignId: template.id }, orderBy: { name: "asc" } });

    const root = { _meta: { edition: "classic", sources: fixture._meta.sources }, subclass: [{ name: "Synthetic SRD Path", source: "SYN21", className: parent.name, classSource: "MISSING21", shortName: "Syn", subclassFeatures: [`Synthetic SRD Feature|${parent.name}|MISSING21|Syn|SYN21|3|SYN21`] }], subclassFeature: [{ name: "Synthetic SRD Feature", source: "SYN21", className: parent.name, classSource: "MISSING21", subclassShortName: "Syn", subclassSource: "SYN21", level: 3, entries: ["Synthetic subclass description"] }] };

    const value = { json: JSON.stringify(root) };

    const missing = await previewImport(actor(), value, secret, prismaImportRepository);

    expect(missing.report.readyToImport).toBe(false);

    const dependencies = [{ refKey: canonicalKey("class", parent.name, "MISSING21", "classic"), templateId: template.id, kind: "classes" as const, localId: parent.id, edition: "one" as const }];

    await expect(previewImport(actor(), { ...value, dependencies }, secret, prismaImportRepository)).rejects.toThrow("MIXED_EDITION_CONFIRMATION_REQUIRED");

    const saved = await commit({ ...value, dependencies, allowMixedEdition: true }, "dependency");

    expect(saved.rows.some(r => r.kind === "classes")).toBe(true);
    expect(saved.rows.filter(r => r.kind === "classes").length).toBeLessThan(await prisma.gameClass.count({ where: { campaignId: template.id } }));
    expect(await prisma.campaignSourceSync.count({ where: { campaignId } })).toBe(0);
    expect(await prisma.campaign.findUniqueOrThrow({ where: { id: template.id } })).toEqual(template);
  });

  it("uses imported backgrounds with existing Choices/Picks and rolls back a used ASI update without inventory or biography changes", async () => {
    const bg = await prisma.background.findFirstOrThrow({ where: { campaignId, originFeatId: { not: null } } });

    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });

    const character = await prisma.character.create({ data: { campaignId, controlledBy: userId, type: "hero", name: "Task21 synthetic hero", race: "Synthetic People", class: "Synthetic Adept", background: "Keep biography", inventory: { create: { equipped: {}, items: [], gold: 37 } } } });

    const cls = await prisma.gameClass.findFirstOrThrow({ where: { campaignId } });

    const spell = await prisma.spell.findFirstOrThrow({ where: { campaignId } });

    const origin = await prisma.feat.findUniqueOrThrow({ where: { id: bg.originFeatId! } });

    // Additional-spell DSL remains explicit manual coverage; configure the existing
    // native Choice in the editor/resource, then exercise its nested character Pick.
    const unsupported = { json: JSON.stringify({ _meta: fixture._meta, feat: [{ name: "Synthetic DSL", source: "SYN21", additionalSpells: [{ innate: { "1": ["Synthetic Ray|SYN21"] } }] }] }) };

    const manual = await previewImport(actor(), unsupported, secret, prismaImportRepository);

    expect(manual.report.nextActions.some(a => a.code === "UNSUPPORTED_FIELD")).toBe(true);
    await withCampaignContentWrite(campaignId, () => featsResource.update(actor(), origin, featsResource.schemas.update.parse({ choices: [{ id: "synthetic-spell", label: "Synthetic manual spell choice", kind: "spell", count: 1, spells: { lists: [], minLevel: 0, maxLevel: 0 } }] })));

    const before = { raceChoices: {}, feats: [], classes: [{ classId: cls.id, level: 1 }] };

    const after = { ...before, backgroundId: bg.id, backgroundChoices: { "ability-scores": [{ id: "strength" }, { id: "strength" }, { id: "dexterity" }] }, backgroundFeatPicks: { "synthetic-spell": [{ id: spell.id }] } };

    const choice = await resolveCharacterChoices({ campaignId, rules: parseRules(campaign.rules), isDM: true, character, before, after, db: prisma });

    if (!choice.ok) throw Error(JSON.stringify(await choice.response.json()));

    expect(choice.state.backgroundFeatPicks).toEqual(after.backgroundFeatPicks);
    await prisma.character.update({ where: { id: character.id }, data: choice.fields });

    const changed = structuredClone(fixture);

    changed.background[1].ability = [{ choose: { weighted: { from: ["str", "dex", "cha"], weights: [2, 1] } } }];

    const value = { ...input, json: JSON.stringify(changed) };

    const p = await previewImport(actor(), value, secret, prismaImportRepository);

    await expect(confirmImport(actor(), value, p.token, "used-asi", secret, prismaImportRepository)).rejects.toMatchObject({ status: 409 });
    expect((await prisma.background.findUniqueOrThrow({ where: { id: bg.id } })).choices).toEqual(bg.choices);
    expect(await prisma.compendiumImportRun.count({ where: { campaignId, idempotencyKey: "used-asi" } })).toBe(0);

    const saved = await prisma.character.findUniqueOrThrow({ where: { id: character.id }, include: { inventory: true } });

    expect(saved.backgroundChoices).toEqual(after.backgroundChoices);
    expect(saved.backgroundFeatPicks).toEqual(after.backgroundFeatPicks);
    expect(saved.strength).toBe(character.strength + 2);
    expect(saved.background).toBe("Keep biography");
    expect(saved.inventory).toMatchObject({ gold: 37, items: [] });
  });
});
