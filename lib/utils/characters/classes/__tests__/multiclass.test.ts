import { describe, expect, it } from "vitest";

import { multiclassBlockedBy, multiclassReasons } from "@/lib/utils/characters/classes/multiclass";

const scores = (over: Partial<Record<"strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma", number>> = {}) => ({ strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, ...over });

describe("multiclassBlockedBy", () => {
  it("passes when current and new class requirements are met", () => {
    expect(multiclassBlockedBy([{ name: "Fighter" }], { name: "Wizard" }, scores({ strength: 13, intelligence: 13 }))).toBeNull();
  });

  it("blocks on the new class", () => {
    expect(multiclassBlockedBy([{ name: "Fighter" }], { name: "Wizard" }, scores({ strength: 15 }))).toBe("Wizard");
  });

  it("blocks on the current class", () => {
    expect(multiclassBlockedBy([{ name: "Wizard" }], { name: "Rogue" }, scores({ dexterity: 14 }))).toBe("Wizard");
  });

  it("Fighter accepts STR or DEX; Paladin needs STR and CHA", () => {
    expect(multiclassBlockedBy([{ name: "Fighter" }], { name: "Rogue" }, scores({ dexterity: 13 }))).toBeNull();
    expect(multiclassBlockedBy([{ name: "Rogue" }], { name: "Paladin" }, scores({ dexterity: 13, strength: 13 }))).toBe("Paladin");
  });

  it("does not restrict classes without a requirement entry", () => {
    expect(multiclassBlockedBy([{ name: "Knight" }], { name: "Necromancer" }, scores())).toBeNull();
  });
});

describe("multiclassReasons", () => {
  it("is empty for classes without requirements", () => {
    expect(multiclassReasons([{ name: "Knight" }], { name: "Necromancer" }, scores())).toEqual([]);
  });

  it("names the new class and the shortfall", () => {
    expect(multiclassReasons([{ name: "Fighter" }], { name: "Wizard" }, scores({ strength: 15 }))).toEqual([{ className: "Wizard", abilities: ["intelligence"], need: 13, have: 10 }]);
  });

  it("reports each unmet group of a multi-group class", () => {
    expect(multiclassReasons([{ name: "Fighter" }], { name: "Paladin" }, scores({ strength: 14 }))).toEqual([{ className: "Paladin", abilities: ["charisma"], need: 13, have: 10 }]);
    expect(multiclassReasons([], { name: "Monk" }, scores())).toHaveLength(2);
  });

  it("uses the best ability of an either-or group as `have`", () => {
    expect(multiclassReasons([], { name: "Fighter" }, scores({ strength: 11, dexterity: 12 }))).toEqual([{ className: "Fighter", abilities: ["strength", "dexterity"], need: 13, have: 12 }]);
  });

  it("blames the existing class whose requirement is no longer met", () => {
    expect(multiclassReasons([{ name: "Wizard" }], { name: "Rogue" }, scores({ dexterity: 14 })).map((r) => r.className)).toEqual(["Wizard"]);
  });
});
