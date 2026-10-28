import { describe, expect, it } from "vitest";

import { sorcerer } from "./fixtures";

import { levelUpChoiceDefs } from "@/lib/utils/characters/choices/class-choices";

describe("levelUpChoiceDefs", () => {
  it("choices opening at the new level plus earlier table-scaled ones", () => {
    expect(levelUpChoiceDefs(sorcerer, null, 2).map((c) => c.id)).toEqual(["cantrips", "metamagic"]);
    expect(levelUpChoiceDefs(sorcerer, null, 4).map((c) => c.id)).toEqual(["cantrips", "metamagic", "ability-score-improvement-4"]);
    expect(levelUpChoiceDefs(sorcerer, null, 3).map((c) => c.id)).toEqual(["cantrips", "metamagic"]);
  });
});
