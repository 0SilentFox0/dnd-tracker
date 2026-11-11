import { describe, expect, it } from "vitest";

import { classOf } from "../catalog";
import { extractKeyed } from "../keys";

type Rows = Record<string, object[]>;

const en = (data: Rows) => extractKeyed(data, Object.keys(data)).map((e) => e.en);

describe("extractKeyed classification", () => {
  it("keeps equal texts of different rows as separate keys", () => {
    const entries = extractKeyed({ feats: [{ slug: "f", name: "Alert", description: "Stay alert and ready" }], races: [{ slug: "r", name: "Elf", abilities: [{ id: "a", name: "Alert", description: "Stay alert and ready" }] }] }, ["feats", "races"]);

    expect(entries.map((e) => e.en).sort()).toEqual(["Alert", "Alert", "Elf", "Stay alert and ready", "Stay alert and ready"]);
    expect(new Set(entries.map((e) => e.key)).size).toBe(5);
  });

  it("skips strings without words and never takes slug or id", () => {
    expect(en({ spells: [{ slug: "srd_fireball", name: "Fireball", description: "1d6", abilities: [{ id: "breath-weapon", text: "+5" }] }] })).toEqual(["Fireball"]);
  });

  it("skips casting.text (a duration key)", () => {
    expect(en({ spells: [{ slug: "s", name: "Fireball", casting: { text: "bonus-action" } }] })).toEqual(["Fireball"]);
  });

});

describe("contextual prose", () => {
  it("classifies omitted prose without translating mechanical lookalikes", () => {
    const entries = en({
      classes: [{ slug: "bard", name: "Bard", proficiencies: { armor: ["Light armor"], weapons: ["Simple weapons"], tools: ["Musical Instruments"], multiclass: { armor: ["Shields"], skills: { from: ["acrobatics"] } } }, tools: ["smith"], properties: "heavy" }],
      backgrounds: [{ slug: "b", toolProficiencies: ["Artisan tools"] }],
      spells: [{ slug: "s", casting: { text: "reaction", trigger: "When a creature moves" }, trigger: "reaction" }],
      units: [{ slug: "u", statblock: { alignment: "lawful good", languages: "Common, Draconic" }, attacks: [{ properties: "plus acid damage" }] }],
      artifacts: [{ slug: "a", weapon: { properties: "Mastery: Vex" } }],
    });

    expect(entries.sort()).toEqual(["Bard", "Light armor", "Simple weapons", "Musical Instruments", "Shields", "Artisan tools", "When a creature moves", "lawful good", "Common, Draconic", "plus acid damage", "Mastery: Vex"].sort());
    expect(classOf("trigger", "casting")).toBe("d");
    expect(classOf("trigger", "abilities")).toBeNull();
  });
});

describe("classOf for Grim fields", () => {
  it("classifies tier trappings and top-level career class only", () => {
    expect(classOf("trappings", "tiers")).toBe("d");
    expect(classOf("class", "", ["class"])).toBe("n");
    expect(classOf("class", "x", ["x", "class"])).toBeNull();
    expect(classOf("status", "tiers")).toBeNull();
  });
});
