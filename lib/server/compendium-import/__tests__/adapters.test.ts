import { describe, expect, it } from "vitest";

import { adaptCompendium } from "../adapt";
import { renderEntries } from "../entries";
import { canonicalKey } from "../identity";

const source = { name: "Synthetic", source: "Test" };

describe("generic compendium adapters", () => {
  it("uses source IDs, editions and parents rather than display abbreviations", () => {
    expect(canonicalKey("feat", " A ", "Test", "classic")).toBe(canonicalKey("feat", "a", "test", "classic"));
    expect(canonicalKey("feat", "a", "Test", "one")).not.toBe(canonicalKey("feat", "a", "Test", "classic"));
    expect(canonicalKey("subrace", "a", "Test", "one", ["p"])).not.toBe(canonicalKey("subrace", "a", "Test", "one", ["q"]));
  });

  it("renders tags and tables without HTML execution or media fetching", () => {
    const result = renderEntries(["Use {@spell Synthetic Ray|Test|the ray} and {@b caution}.", { type: "table", colLabels: ["A"], rows: [["B"]] }, { type: "image", href: { url: "https://invalid.test/a.png" } }, { type: "unknown", entries: ["Kept"] }]);

    expect(result.text).toContain("the ray");
    expect(result.text).toContain("caution");
    expect(result.text).toContain("B");
    expect(result.text).toContain("Kept");
    expect(result.text).not.toContain("a.png");
    expect(result.issues.map((i) => i.code)).toContain("UNSUPPORTED_ENTRY");
  });

  it("imports classic backgrounds without invented ASI or origin feats", () => {
    const result = adaptCompendium({ _meta: { edition: "classic" }, background: [{ ...source, entries: ["Synthetic description"], skillProficiencies: [{ arcana: true, "custom|Test": true }], toolProficiencies: [{ anyArtisansTool: 1 }], startingEquipment: [{ _: [{ value: 50 }] }] }] });

    const row = result.entries[0];

    expect(row.kind).toBe("backgrounds");
    expect(row.body).toMatchObject({ skillProficiencies: ["arcana"], toolProficiencies: [], choices: [], originFeatId: null });
    expect(row.body.equipmentText).toContain("50");
    expect(row.issues.some((i) => i.code === "MANUAL_CUSTOM_SKILL")).toBe(true);
    expect(row.notes).toContain("anyArtisansTool");
  });

  it("maps explicit origin feat refs and constrained source ASI", () => {
    const result = adaptCompendium({ _meta: { edition: "one" }, feat: [{ ...source, name: "First Gift", category: "O" }], background: [{ ...source, ability: [{ choose: { weighted: { from: ["str", "dex", "wis"], weights: [2, 1] } } }], feats: [{ "First Gift|Test": true }] }] });

    const bg = result.entries.find((e) => e.kind === "backgrounds")!;

    expect(bg.refs[0]).toMatchObject({ path: ["originFeatId"], kind: "feat", name: "First Gift", source: "Test" });
    expect(bg.body.choices).toMatchObject([{ kind: "abilityScore", points: 3, maxPerAbility: 2, max: 20 }]);
  });

  it("imports generic categories with manual coverage rather than fake mechanics", () => {
    const result = adaptCompendium({ spell: [{ ...source, level: 1, school: "V", entries: ["Synthetic magic"], damageInflict: ["fire"] }], monster: [{ ...source, ac: [12], hp: { average: 9 }, str: 10, dex: 12, con: 11, int: 8, wis: 10, cha: 6, cr: "1/4", action: [{ name: "Synthetic action", entries: ["Handle manually"] }] }], baseitem: [{ ...source, type: "M", weapon: true, dmg1: "1d6", dmgType: "P", weaponCategory: "simple", rarity: "none" }], feat: [{ ...source, prerequisite: [{ other: "A fictional requirement" }] }], race: [{ ...source, entries: ["Synthetic ancestry"] }], class: [{ ...source, hd: { faces: 8 }, proficiency: ["int", "wis"] }] });

    expect(result.entries.map((e) => e.kind)).toEqual(expect.arrayContaining(["spells", "spell-groups", "units", "artifacts", "feats", "races", "classes"]));
    expect(result.entries.find((e) => e.kind === "spells")?.body).toMatchObject({ executionMode: "manual", dice: 0, spellEffects: [] });
    expect(result.entries.find((e) => e.kind === "feats")?.body.prerequisite).toMatchObject({ manualText: expect.any(Array) });
    expect(result.entries.find((e) => e.kind === "units")?.notes).toContain("Synthetic action");
  });

  it("preserves unsupported fields and missing declarations as actionable issues", () => {
    const result = adaptCompendium({ feat: [{ ...source, strangeRule: 7 }], foundryFeat: [{ ...source }], magicvariant: [{ ...source, inherits: {} }] });

    expect(result.entries[0].issues.map((i) => i.code)).toEqual(expect.arrayContaining(["UNSUPPORTED_FIELD", "SOURCE_METADATA_MISSING"]));
    expect(result.issues.filter((i) => i.code === "UNSUPPORTED_CATEGORY")).toHaveLength(2);
    expect(JSON.stringify(result.issues)).not.toContain("strangeRule\":7");
  });

  it("automates only a complete simple attack template, retaining complex actions as text", () => {
    const result = adaptCompendium({ monster: [{ ...source, ac: [12], hp: { average: 9 }, str: 10, dex: 12, con: 11, int: 8, wis: 10, cha: 6, action: [{ name: "Poke", entries: ["{@atk mw} {@hit 4} to hit, reach 5 ft., one target. {@h}6 ({@damage 1d6 + 3}) piercing damage."] }, { name: "Special", entries: ["A fictional effect that needs manual resolution."] }] }] });

    expect(result.entries[0].body.attacks).toMatchObject([{ name: "Poke", attackBonus: 4, damageDice: "1d6+3", damageType: "piercing" }]);
    expect(result.entries[0].notes).toContain("Special");
  });

  it("does not fabricate sources, duplicate identities, or required monster HP", () => {
    const result = adaptCompendium({ feat: [{ name: "Missing" }, source, { ...source, name: " synthetic " }], monster: [{ ...source, ac: [12], hp: { special: "Unspecified" } }] });

    expect(result.issues.map((i) => i.code)).toEqual(expect.arrayContaining(["SOURCE_REQUIRED", "DUPLICATE_IDENTITY", "REQUIRED_MONSTER_STATS"]));
  });

  it("creates private DM notes only from matching manifest data", () => {
    const result = adaptCompendium({ book: [{ ...source, id: "bk", contents: [] }], bookData: [{ id: "bk", source: "Test", data: [{ name: "Chapter", entries: ["Synthetic story"] }] }] }, { categories: ["book"] });

    const page = result.entries.find((e) => e.kind === "scenarioPages")!;

    expect(page.body).toMatchObject({ kind: "note", status: "draft", characterId: null });
    expect(JSON.stringify(page.body.content)).toContain("Synthetic story");
    expect(page.body.content).toMatchObject({ sections: [{ rows: [{ story: { content: [] } }] }] });
  });

  it("requires an explicit material category before importing book text", () => {
    const result = adaptCompendium({ book: [{ ...source, id: "b" }], bookData: [{ id: "b", data: [{ name: "Chapter", entries: ["Private material"] }] }] });

    expect(result.entries).toHaveLength(0);
  });

  it("keeps the enclosing count of finite optional-feature choices and reports orphans", () => {
    const result = adaptCompendium({ class: [{ name: "Mage", source: "T", hd: { faces: 8 }, classFeatures: ["F|Mage|T|1|T"] }], classFeature: [{ name: "F", source: "T", className: "Mage", classSource: "T", level: 1, entries: [{ type: "options", count: 1, entries: [{ type: "refOptionalfeature", optionalfeature: "A|T" }, { type: "refOptionalfeature", optionalfeature: "B|T" }] }] }], optionalfeature: [{ name: "A", source: "T", entries: ["Option A"] }, { name: "B", source: "T", entries: ["Option B"] }, { name: "C", source: "T", entries: ["No owner"] }] });

    expect(result.entries[0].body.features).toMatchObject([{ choices: [{ count: 1, options: [{ name: "A" }, { name: "B" }] }] }]);
    expect((result.entries[0].body.features as Array<{ choices: unknown[] }>)[0].choices).toHaveLength(1);
    expect(result.issues.some((i) => i.code === "OPTIONAL_FEATURE_WITHOUT_OWNER")).toBe(true);
  });
});
