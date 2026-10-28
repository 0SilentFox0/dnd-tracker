import { describe, expect, it } from "vitest";

import { rogue, sorcerer } from "./fixtures";

import { levelUpChoiceDefs, MULTICLASS_SKILLS_ID } from "@/lib/utils/characters/choices/class-choices";

describe("levelUpChoiceDefs", () => {
  it("choices opening at the new level plus earlier table-scaled ones", () => {
    expect(levelUpChoiceDefs(sorcerer, null, 2).map((c) => c.id)).toEqual(["cantrips", "metamagic"]);
    expect(levelUpChoiceDefs(sorcerer, null, 4).map((c) => c.id)).toEqual(["cantrips", "metamagic", "ability-score-improvement-4"]);
    expect(levelUpChoiceDefs(sorcerer, null, 3).map((c) => c.id)).toEqual(["cantrips", "metamagic"]);
  });
});

describe("multiclass skill grant", () => {
  const ranger = { ...rogue, multiclassProficiencies: { armor: [], weapons: [], skills: { count: 1, from: ["stealth", "survival"] } } };

  it("a non-first class with multiclass skills adds one skill choice at level 1", () => {
    const defs = levelUpChoiceDefs(ranger, null, 1, true);

    expect(defs.find((c) => c.id === MULTICLASS_SKILLS_ID)).toMatchObject({ kind: "skill", count: 1, level: 1, skills: ["stealth", "survival"] });
    expect(levelUpChoiceDefs(ranger, null, 2, true).some((c) => c.id === MULTICLASS_SKILLS_ID)).toBe(false);
  });

  it("the first class and classes without the grant get nothing", () => {
    expect(levelUpChoiceDefs(ranger, null, 1).some((c) => c.id === MULTICLASS_SKILLS_ID)).toBe(false);
    expect(levelUpChoiceDefs(rogue, null, 1, true).some((c) => c.id === MULTICLASS_SKILLS_ID)).toBe(false);
  });
});
