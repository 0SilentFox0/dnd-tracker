import { describe, expect, it } from "vitest";

import { invalidateCampaignLayer, isPlainCampaign, markPlainCampaign } from "@/lib/db/layer/cache";
import { campaignRelations, layeredModels } from "@/lib/db/layer/config";
import { compareValues, sortRows } from "@/lib/db/layer/sort";
import { createScopedDatabase, currentTransaction } from "@/lib/server/content/write-context";

describe("layer config derived from the schema", () => {
  const models = layeredModels();

  it("covers all 14 content models with their base twins and hide tables", () => {
    expect(Object.keys(models).sort()).toEqual(["Artifact", "ArtifactSet", "Background", "CampaignTrack", "Career", "Feat", "GameClass", "MainSkill", "Race", "Skill", "SkillTree", "Spell", "SpellGroup", "Unit"]);
    expect(models.GameClass).toMatchObject({ local: "gameClass", base: "gameClassBase", hideTable: "classes" });
    expect(models.Spell).toMatchObject({ local: "spell", base: "spellBase", hideTable: "spells" });
  });

  it("derives relations between layered models in both directions", () => {
    expect(models.Spell.relations.spellGroup).toMatchObject({ target: "SpellGroup", kind: "one", fk: "groupId" });
    expect(models.SpellGroup.relations.spells).toMatchObject({ target: "Spell", kind: "many", fk: "groupId" });
    expect(models.Skill.relations.grantedSpell).toMatchObject({ target: "Spell", kind: "one", fk: "grantedSpellId" });
    expect(models.Skill.relations.mainSkill).toMatchObject({ target: "MainSkill", kind: "one", fk: "mainSkillId" });
    expect(models.Unit.relations.race).toMatchObject({ target: "Race", kind: "one", fk: "raceId" });
    expect(models.Race.relations.units).toMatchObject({ target: "Unit", kind: "many", fk: "raceId" });
    expect(models.Artifact.relations.artifactSet).toMatchObject({ target: "ArtifactSet", kind: "one", fk: "setId" });
    expect(models.Spell.relations.summonUnit).toMatchObject({ target: "Unit", kind: "one", fk: "summonUnitId" });
    expect(models.Spell.relations.campaign).toBeUndefined();
  });

  it("lists the campaign relations that hold layered rows", () => {
    expect(Object.keys(campaignRelations()).sort()).toEqual(["artifactSets", "artifacts", "backgrounds", "careers", "classes", "feats", "mainSkills", "races", "skillTrees", "skills", "spellGroups", "spells", "tracks", "units"]);
  });

  it("base field sets exclude the local-only columns", () => {
    expect(models.Spell.baseFields.has("validFrom")).toBe(true);
    expect(models.Spell.baseFields.has("campaignId")).toBe(false);
  });
});

describe("union ordering", () => {
  it("puts nulls last ascending and first descending, like Postgres", () => {
    const rows = [{ v: 2 }, { v: null }, { v: 1 }];

    expect(sortRows(rows, { v: "asc" }).map((r) => r.v)).toEqual([1, 2, null]);
    expect(sortRows(rows, { v: "desc" }).map((r) => r.v)).toEqual([null, 2, 1]);
  });

  it("sorts by several keys and compares names case-insensitively with lowercase first", () => {
    const rows = [{ a: 1, n: "b" }, { a: 1, n: "B" }, { a: 0, n: "z" }];

    expect(sortRows(rows, [{ a: "asc" }, { n: "asc" }]).map((r) => r.n)).toEqual(["z", "b", "B"]);
    expect(compareValues("apple", "Banana")).toBeLessThan(0);
    expect(compareValues("Яблуко", "Zebra")).toBeGreaterThan(0);
  });
});

describe("campaign layer cache", () => {
  it("invalidates one campaign or everything", () => {
    markPlainCampaign("c1");
    markPlainCampaign("c2");
    invalidateCampaignLayer("c1");
    expect(isPlainCampaign("c1")).toBe(false);
    expect(isPlainCampaign("c2")).toBe(true);
    invalidateCampaignLayer();
    expect(isPlainCampaign("c2")).toBe(false);
  });
});

describe("scoped transactions", () => {
  it("expose the interactive transaction client while it is open and only then", async () => {
    const tx = { marker: "tx" };

    const base = { $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback(tx) };

    const scoped = createScopedDatabase(base);

    let inside: unknown;

    let leaked: (() => unknown) | undefined;

    expect(currentTransaction()).toBeUndefined();

    await scoped.$transaction(async () => {
      inside = currentTransaction();
      leaked = () => currentTransaction();
    });

    expect(inside).toBe(tx);
    expect(currentTransaction()).toBeUndefined();
    expect(leaked?.()).toBeUndefined();
  });

  it("passes batch transactions through untouched", async () => {
    const seen: unknown[] = [];

    const scoped = createScopedDatabase({ $transaction: async (ops: unknown[]) => { seen.push(ops);

 return ops; } });

    expect(await scoped.$transaction([1, 2] as never)).toEqual([1, 2]);
    expect(seen).toHaveLength(1);
  });
});
