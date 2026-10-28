import { describe, expect, it } from "vitest";

import { adaptCompendium } from "../adapt";

import { createBackgroundSchema } from "@/lib/schemas/backgrounds";
import { createFeatSchema } from "@/lib/schemas/feats";
import { createRaceSchema } from "@/lib/schemas/races";

const base = { name: "Synthetic", source: "Test", entries: ["Synthetic text."] };

const adapt = (kind: "race" | "background" | "feat", row: Record<string, unknown>) => adaptCompendium({ _meta: { edition: "one" }, [kind]: [{ ...base, ...row }] }).entries.find((e) => e.inputKind === kind)!;

const codes = (e: { issues: Array<{ code: string }> }) => e.issues.map((i) => i.code);

type Loose = Array<Record<string, any>>;

describe("race traits", () => {
  const entry = adapt("race", { size: ["S", "M"], speed: { walk: 25, swim: 30 }, darkvision: 60, languageProficiencies: [{ common: true, anyStandard: 1 }], resist: ["cold"] });

  it("size, speed, languages and senses become a text head, speed delta and sense ability", () => {
    const text = (entry.body.passiveAbility as { description: string }).description;

    expect(text).toContain("Розмір: малий або середній");
    expect(text).toContain("ходьба 25 фт., плавання 30 фт.");
    expect(text).toContain("Темний зір: 60 фт.");
    expect(text).toContain("Мови: common, any Standard (вибір: 1)");
    expect(entry.body.abilities).toEqual([
      expect.objectContaining({ id: "race-speed", effects: [{ kind: "modifyStat", stat: "speed", flat: -5 }] }),
      expect.objectContaining({ id: "race-darkvision", effects: [{ kind: "flag", flag: "sense", sense: "darkvision", range: 60 }] }),
      expect.objectContaining({ id: "race-resist", effects: [{ kind: "flag", flag: "resistance", damageType: "cold", percent: 50 }] }),
    ]);
    expect(createRaceSchema.safeParse(entry.body).success).toBe(true);
  });

  it("non-walk movement is reported manual, standard speed adds no modifier", () => {
    expect(codes(entry)).toContain("MANUAL_RACE_MOVEMENT");
    expect(codes(entry)).not.toContain("UNSUPPORTED_FIELD");

    const plain = adapt("race", { speed: 30, size: ["M"] });

    expect(plain.body.abilities).toEqual([]);
    expect(codes(plain)).not.toContain("MANUAL_RACE_MOVEMENT");
  });

  it("resist with a choice stays manual", () => {
    expect(codes(adapt("race", { resist: [{ choose: { from: ["fire", "cold"] } }] }))).toContain("MANUAL_RACE_RESIST");
  });

  it("weighted ASI with a limited pool and amount stays a structured choice", () => {
    expect(adapt("race", { ability: [{ choose: { from: ["int", "wis"], amount: 1 } }] }).body.choices).toMatchObject([{ kind: "abilityScore", points: 1, maxPerAbility: 1, abilities: ["intelligence", "wisdom"] }]);
  });

  it("subrace option carries fixed ASI and traits as abilities", () => {
    const result = adaptCompendium({ _meta: { edition: "one" }, race: [{ ...base, name: "People" }], subrace: [{ ...base, name: "Hill", raceName: "People", raceSource: "Test", ability: [{ con: 1 }], darkvision: 30 }] });

    const sub = result.entries.find((e) => e.inputKind === "subrace")!;

    const option = (sub.body.choices as Array<{ options: Array<{ abilities: unknown[]; description: string }> }>)[0].options[0];

    expect(option.abilities).toEqual([expect.objectContaining({ id: "race-asi", effects: [{ kind: "modifyStat", stat: "constitution", flat: 1 }] }), expect.objectContaining({ id: "race-darkvision" })]);
    expect(option.description).toContain("Темний зір: 30 фт.");
    expect(codes(sub)).not.toContain("UNSUPPORTED_FIELD");
  });
});

describe("background equipment and proficiencies", () => {
  const entry = adapt("background", { toolProficiencies: [{ "thieves' tools": true, anyArtisansTool: 1 }], languageProficiencies: [{ "Elvish|Test": true }], startingEquipment: [{ _: ["rope|phb", { item: "candle|phb", quantity: 5 }, { special: "a keepsake" }, { value: 1100 }], a: ["dagger|phb"], b: [{ equipmentType: "weaponSimple" }] }] });

  it("renders equipment readably with money in coins and alternatives", () => {
    expect(entry.body.equipmentText).toBe("rope, candle ×5, a keepsake, 11 зм; на вибір: a) dagger; b) будь-яка: weapon Simple");
    expect(codes(entry)).toContain("MANUAL_EQUIPMENT");
    expect(createBackgroundSchema.safeParse(entry.body).success).toBe(true);
  });

  it("fixed tools stay structured, tool choices and languages go to the description with a manual issue", () => {
    expect(entry.body.toolProficiencies).toEqual(["thieves' tools"]);
    expect(entry.body.description).toContain("Інструменти: thieves' tools, any Artisans Tool (вибір: 1)");
    expect(entry.body.description).toContain("Мови: Elvish");
    expect(codes(entry)).toContain("MANUAL_TOOL_CHOICE");
  });

  it("no raw JSON notes when everything parsed", () => {
    const clean = adapt("background", { skillProficiencies: [{ arcana: true }], toolProficiencies: [{ "smith's tools": true }] });

    expect(clean.notes).toBe("");
    expect(codes(clean)).not.toContain("MANUAL_TOOL_CHOICE");
  });

  it("links a single origin feat through originFeatId", () => {
    const result = adaptCompendium({ _meta: { edition: "one" }, feat: [{ ...base, name: "Gift", category: "O" }], background: [{ ...base, feats: [{ "Gift|Test": true }] }] });

    expect(result.entries.find((e) => e.kind === "backgrounds")!.refs).toEqual([expect.objectContaining({ path: ["originFeatId"], kind: "feat", name: "Gift" })]);
  });
});

describe("feat prerequisites, resist and spells", () => {
  it("level and ability scores become structured prerequisites", () => {
    const entry = adapt("feat", { prerequisite: [{ level: 4, ability: [{ str: 13 }, { dex: 13 }] }] });

    expect(entry.body.prerequisite).toEqual({ manualText: [], level: 4, scores: { abilities: ["strength", "dexterity"], min: 13 }, text: expect.stringContaining("рівень 4+") });
    expect(codes(entry)).not.toContain("MANUAL_PREREQUISITE");
    expect(createFeatSchema.safeParse(entry.body).success).toBe(true);
  });

  it("free-text and unknown requirement keys stay manual text", () => {
    const entry = adapt("feat", { prerequisite: [{ level: 4, other: "Be a member", race: [{ name: "elf" }] }] });

    expect(entry.body.prerequisite).toMatchObject({ level: 4, manualText: ["Be a member", expect.stringContaining("race:")] });
    expect(codes(entry)).toContain("MANUAL_PREREQUISITE");
    expect(adapt("feat", { prerequisite: [{ level: 4 }, { level: 8 }] }).body.prerequisite).toMatchObject({ manualText: expect.any(Array) });
  });

  it("resist becomes a passive ability", () => {
    const entry = adapt("feat", { resist: ["poison"] });

    expect(entry.body.abilities).toEqual([expect.objectContaining({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "poison", percent: 50 }] })]);
    expect(codes(entry)).not.toContain("UNSUPPORTED_FIELD");
  });

  it("additionalSpells: daily, per-spell, filters, cantrips and at-will leveled spells", () => {
    const entry = adapt("feat", {
      ability: [{ choose: { from: ["int", "wis"], amount: 1 } }],
      additionalSpells: [{ ability: "int", innate: { _: { will: ["zap|Test#c", "bless|Test"], daily: { "1e": ["fog|Test", "gust|Test"], "1": [{ choose: "level=1|school=D;C" }] } } }, known: { _: ["light|Test#c"] }, expanded: { s1: ["x"] } }],
    });

    const choices = entry.body.choices as Loose;

    const daily = choices.find((c) => c.options?.[0]?.name === "Fog")!;

    expect(daily).toMatchObject({ kind: "option", count: 2 });
    expect(daily.options[0].spells[0].grant).toEqual({ uses: 1, rest: "long", dcAbility: "intelligence" });

    const filter = choices.find((c) => c.kind === "spell")!;

    expect(filter).toMatchObject({ spells: { lists: [], minLevel: 1, maxLevel: 1 }, grant: { uses: 1, rest: "long", dcAbility: "intelligence" } });
    expect(filter.description).toContain("Divination");
    expect(choices.find((c) => c.options?.[0]?.name === "Zap")!.options[0].spells[0].grant).toBeUndefined();
    expect(choices.find((c) => c.options?.[0]?.name === "Light")).toBeDefined();
    expect(entry.refs.map((r) => r.name).sort()).toEqual(["fog", "gust", "light", "zap"]);

    for (const ref of entry.refs) expect(ref.path[0]).toBe("choices");

    expect(codes(entry)).toContain("MANUAL_FEAT_SPELLS");
    expect(entry.notes).toContain("atWill");
    expect(entry.notes).toContain("expanded");
    expect(createFeatSchema.safeParse(entry.body).success).toBe(true);
  });
});
