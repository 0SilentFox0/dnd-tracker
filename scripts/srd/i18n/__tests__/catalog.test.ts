import { describe, expect, it } from "vitest";

import type { SrdData } from "../../lib/types";
import { classOf, extractCatalog, hashText } from "../catalog";

const data = (over: Record<string, unknown[]>) => ({ "spell-groups": [], spells: [], races: [], classes: [], feats: [], backgrounds: [], units: [], artifacts: [], ...over }) as unknown as SrdData;

describe("extractCatalog", () => {
  it("дедуплікує однакові тексти й збирає види", () => {
    const entries = extractCatalog(data({ feats: [{ slug: "f", name: "Alert", description: "Stay alert and ready" }], races: [{ slug: "r", name: "Elf", abilities: [{ id: "a", name: "Alert", description: "Stay alert and ready" }] }] }));

    expect(entries.map((e) => e.en).sort()).toEqual(["Alert", "Elf", "Stay alert and ready"]);
    expect(entries.find((e) => e.en === "Alert")?.kinds.sort()).toEqual(["feats", "races"]);
  });

  it("пропускає рядки без слів і не бере slug та id", () => {
    const entries = extractCatalog(data({ spells: [{ slug: "srd_fireball", name: "Fireball", description: "1d6", abilities: [{ id: "breath-weapon", text: "+5" }] }] }));

    expect(entries.map((e) => e.en)).toEqual(["Fireball"]);
  });

  it("не бере casting.text (ключ тривалості)", () => {
    expect(extractCatalog(data({ spells: [{ slug: "s", name: "Fireball", casting: { text: "bonus-action" } }] })).map((e) => e.en)).toEqual(["Fireball"]);
  });

  it("розрізняє клас name і description з однаковим текстом", () => {
    expect(hashText("n", "Light")).not.toBe(hashText("d", "Light"));
  });
});

describe("contextual prose", () => {
  it("classifies omitted prose without translating mechanical lookalikes", () => {
    const entries = extractCatalog(data({ classes: [{ name: "Bard", proficiencies: { armor: ["Light armor"], weapons: ["Simple weapons"], tools: ["Musical Instruments"], multiclass: { armor: ["Shields"], skills: { from: ["acrobatics"] } } }, tools: ["smith"], properties: "heavy" }], backgrounds: [{ toolProficiencies: ["Artisan tools"] }], spells: [{ casting: { text: "reaction", trigger: "When a creature moves" }, trigger: "reaction" }], units: [{ statblock: { alignment: "lawful good", languages: "Common, Draconic" }, attacks: [{ properties: "plus acid damage" }] }], artifacts: [{ weapon: { properties: "Mastery: Vex" } }] }));

    expect(entries.map((e) => e.en).sort()).toEqual(["Bard", "Light armor", "Simple weapons", "Musical Instruments", "Shields", "Artisan tools", "When a creature moves", "lawful good", "Common, Draconic", "plus acid damage", "Mastery: Vex"].sort());
    expect(classOf("trigger", "casting")).toBe("d");
    expect(classOf("trigger", "abilities")).toBeNull();
  });
});
