import { describe, expect, it } from "vitest";

import { elementOf } from "@/lib/utils/battle/fx";

describe("elementOf", () => {
  it.each([
    ["fire", "fire"], ["cold", "cold"], ["lightning", "lightning"], ["thunder", "lightning"], ["acid", "poison"], ["poison", "poison"],
    ["necrotic", "necrotic"], ["radiant", "radiant"], ["psychic", "arcane"], ["force", "arcane"], ["magic", "arcane"],
    ["slashing", "physical"], ["piercing", "physical"], ["bludgeoning", "physical"], ["bleed", "physical"],
  ])("%s → %s", (type, el) => expect(elementOf(type, "arcane")).toBe(el));

  it("unknown or missing → fallback", () => {
    expect(elementOf(undefined, "nature")).toBe("nature");
    expect(elementOf("all", "arcane")).toBe("arcane");
  });
});
