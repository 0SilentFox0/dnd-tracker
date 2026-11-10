import { describe, expect, it } from "vitest";

import type { Row } from "../data";
import { castCeiling, spellIssues } from "../spells";

const emberDart: Row = {"name":"Ember Dart","level":1,"cost":"action","description":"A hissing dart of flame that leaves its mark smouldering.","casting":{"magic":{"cn":4,"kind":"arcane","overcast":"dice","attribute":{"condition":"ablaze","levels":1}}},"targeting":{"kind":"enemy","range":90},"dice":1,"upcastDice":1,"spellEffects":[{"kind":"dealDamage","amount":{"spellRoll":100},"damageType":"magic"}],"ingredients":[{"name":"Charred Bone Chip","qty":1,"minGp":0.05,"consumed":true,"focus":false}],"componentFlags":{"v":true,"s":true,"m":true},"lists":["School of Embers"]};

describe("spellIssues", () => {
  it("accepts the Ember Dart roster row", () => {
    expect(spellIssues(emberDart)).toEqual([]);
  });

  it.each([
    ["a heal spell targeting an enemy", { effect: "heal", targeting: { kind: "enemy", range: 30 } }, "does not fit a heal spell"],
    ["a heal spell on an enemy-side area", { effect: "heal", targeting: { kind: "area", side: "enemy", range: 30, shape: { kind: "circle", radius: 10 } } }, "does not fit a heal spell"],
    ["a damage spell targeting an ally", { effect: "dmg", targeting: { kind: "ally", range: 30 } }, "does not fit a harmful spell"],
    ["a damage spell on an ally-side area", { effect: "dmg", targeting: { kind: "area", side: "ally", range: 30, shape: { kind: "circle", radius: 10 } } }, "does not fit a harmful spell"],
  ])("rejects %s", (_label, patch, message) => {
    const { effect, targeting } = patch;

    const row: Row = { ...emberDart, targeting, spellEffects: [{ kind: effect === "heal" ? "heal" : "dealDamage", amount: { spellRoll: 100 }, ...(effect === "heal" ? {} : { damageType: "magic" }) }], casting: { magic: { cn: 4, kind: "arcane", overcast: "dice", attribute: null } } };

    expect(spellIssues(row).join("\n")).toContain(message);
  });
});

describe("castCeiling", () => {
  const unit: Row = {
    characteristics: { base: { int: 55, fel: 50 }, move: 4 },
    abilities: [{ id: "armour", name: "Armour 2", trigger: { event: "passive" }, effects: [{ kind: "wfrpArmour", head: 2, body: 2, arm: 2, leg: 2 }] }],
  };

  it("subtracts armour from arcane casting and ignores it for prayers", () => {
    expect(castCeiling(unit, "arcane")).toBe(3);
    expect(castCeiling(unit, "miracle")).toBe(5);
  });
});
