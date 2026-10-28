import { describe, expect, it } from "vitest";

import { ChoicesBodySchema, ChoiceSchema, ClassChoicesSchema, FeatChoicesSchema, PicksSchema, RaceChoicesSchema } from "@/lib/schemas/choices";
import { createFeatSchema, updateFeatSchema } from "@/lib/schemas/feats";

const option = (id: string, extra: object = {}) => ({ id, name: id, abilities: [], ...extra });

const lineage = { id: "elven-lineage", label: "Elven Lineage", kind: "option", lineage: true, options: [option("drow"), option("wood-elf")] };

describe("ChoiceSchema", () => {
  it("defaults level 1 and count 1; kind fields are required", () => {
    expect(ChoiceSchema.parse({ id: "x", label: "X", kind: "skill" })).toMatchObject({ level: 1, count: 1 });
    expect(ChoiceSchema.safeParse({ id: "x", label: "X", kind: "option" }).success).toBe(false);
    expect(ChoiceSchema.safeParse({ id: "x", label: "X", kind: "feat" }).success).toBe(false);
    expect(ChoiceSchema.safeParse({ id: "x", label: "X", kind: "abilityScore" }).success).toBe(false);
    expect(ChoiceSchema.safeParse({ id: "x", label: "X", kind: "spell" }).success).toBe(false);
    expect(ChoiceSchema.safeParse({ id: "x", label: "X", kind: "spell", spells: { lists: ["Wizard"], minLevel: 1, maxLevel: "slots" } }).success).toBe(true);
  });

  it("option ids unique, requires point to known options", () => {
    expect(ChoiceSchema.safeParse({ id: "x", label: "X", kind: "option", options: [option("a"), option("a")] }).success).toBe(false);
    expect(ChoiceSchema.safeParse({ id: "x", label: "X", kind: "option", options: [option("a", { requires: ["b"] })] }).success).toBe(false);
    expect(ChoiceSchema.safeParse({ id: "x", label: "X", kind: "option", options: [option("b"), option("a", { requires: ["b"] })] }).success).toBe(true);
  });

  it("ids are kebab slugs", () => {
    expect(ChoiceSchema.safeParse({ id: "Elven Lineage", label: "X", kind: "skill" }).success).toBe(false);
  });
});

describe("owner rules", () => {
  it("race: count is a number, at most one lineage, unique ids", () => {
    expect(RaceChoicesSchema.safeParse([lineage]).success).toBe(true);
    expect(RaceChoicesSchema.safeParse([lineage, { ...lineage, id: "other" }]).success).toBe(false);
    expect(RaceChoicesSchema.safeParse([{ id: "k", label: "K", kind: "skill", count: { scale: "cantrips" } }]).success).toBe(false);
    expect(RaceChoicesSchema.safeParse([lineage, lineage]).success).toBe(false);
  });

  it("class: scale counts allowed, lineage not", () => {
    expect(ClassChoicesSchema.safeParse([{ id: "metamagic", label: "Metamagic", level: 2, kind: "option", count: { scale: "metamagic" }, options: [option("quickened")] }]).success).toBe(true);
    expect(ClassChoicesSchema.safeParse([lineage]).success).toBe(false);
  });

  it("feat: no nested feat choices, no scale, no lineage", () => {
    expect(FeatChoicesSchema.safeParse([{ id: "asi", label: "ASI", kind: "abilityScore", points: 2, max: 20 }]).success).toBe(true);
    expect(FeatChoicesSchema.safeParse([{ id: "f", label: "F", kind: "feat", featTypes: ["origin"] }]).success).toBe(false);
    expect(FeatChoicesSchema.safeParse([{ id: "s", label: "S", kind: "skill", count: { scale: "x" } }]).success).toBe(false);
  });
});

describe("picks and bodies", () => {
  it("picks: nested picks one level deep; body needs a field", () => {
    expect(PicksSchema.safeParse({ "ability-score-improvement-4": [{ id: "feat1", picks: { asi: [{ id: "strength" }, { id: "strength" }] } }] }).success).toBe(true);
    expect(PicksSchema.parse({ a: [{ id: "x", picks: { b: [{ id: "y", picks: { c: [] } }] } }] }).a[0].picks?.b[0]).toEqual({ id: "y" });
    expect(ChoicesBodySchema.safeParse({}).success).toBe(false);
    expect(ChoicesBodySchema.safeParse({ feats: [{ id: "f1", source: "origin" }] }).success).toBe(true);
    expect(ChoicesBodySchema.safeParse({ feats: [{ id: "f1", source: "class" }] }).success).toBe(false);
  });
});

describe("feat schemas", () => {
  it("create defaults; prerequisite shape; update is partial", () => {
    expect(createFeatSchema.parse({ name: "Alert" })).toMatchObject({ type: "general", repeatable: false, prerequisite: {}, abilities: [], choices: [] });
    expect(createFeatSchema.safeParse({ name: "G", prerequisite: { level: 4, scores: { abilities: ["strength", "dexterity"], min: 13 } } }).success).toBe(true);
    expect(createFeatSchema.safeParse({ name: "G", type: "boon" }).success).toBe(false);
    expect(updateFeatSchema.parse({ repeatable: true })).toEqual({ repeatable: true });
  });
});
