import { describe, expect, it } from "vitest";

import { convertFeats, parsePrerequisite } from "../convert/feats";
import { FIXTURE_4F4_DIR, loadOpen5e } from "../lib/open5e";

import { createFeatSchema } from "@/lib/schemas/feats";

const feats = convertFeats(loadOpen5e(FIXTURE_4F4_DIR));

const feat = (name: string) => feats.find((f) => f.name === name)!;

describe("parsePrerequisite", () => {
  it("level, any-of scores, the rest as text", () => {
    expect(parsePrerequisite("")).toEqual({});
    expect(parsePrerequisite("Level 4+")).toEqual({ level: 4 });
    expect(parsePrerequisite("Level 4+, Strength or Dexterity 13+")).toEqual({ level: 4, scores: { abilities: ["strength", "dexterity"], min: 13 } });
    expect(parsePrerequisite("Fighting Style Feature")).toEqual({ text: "Fighting Style Feature" });
    expect(parsePrerequisite("Level 19+, Spellcasting Feature")).toEqual({ level: 19, text: "Spellcasting Feature" });
  });
});

describe("convertFeats", () => {
  it("types, repeatable from the «Repeatable» benefit, description without it", () => {
    expect(feat("Alert")).toMatchObject({ type: "origin", repeatable: false, prerequisite: {} });
    expect(feat("Ability Score Improvement")).toMatchObject({ type: "general", repeatable: true, prerequisite: { level: 4 }, abilities: [] });
    expect(feat("Magic Initiate").repeatable).toBe(true);
    expect(feat("Skilled").repeatable).toBe(true);
    expect(feat("Archery")).toMatchObject({ type: "fightingStyle", prerequisite: { text: "Fighting Style Feature" } });
    expect(feat("Boon of Fate")).toMatchObject({ type: "epicBoon", prerequisite: { level: 19 } });
    expect(feat("Alert").description).toContain("**Initiative Proficiency.**");
    expect(feat("Magic Initiate").description).not.toContain("Repeatable");
  });

  it("mechanics: Alert initiative = prof, Archery +2 ranged, Defense +1 AC in armor, notes elsewhere", () => {
    expect(feat("Alert").abilities[0]).toMatchObject({ id: "initiative-proficiency", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "initiative", flat: { formula: "prof" } }] });
    expect(feat("Archery").abilities[0].effects).toEqual([{ kind: "modifyStat", stat: "attackBonus", flat: 2, attackKind: "ranged" }]);
    expect(feat("Defense").abilities[0]).toMatchObject({ condition: { type: "armorWorn", categories: ["light", "medium", "heavy"] }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1 }] });
    expect(feat("Savage Attacker").abilities[0].effects).toEqual([{ kind: "note", text: "Savage Attacker" }]);
  });

  it("choices: ASI 2/20, Grappler STR|DEX 1/20, boons 1/30, Skilled 3 skills, Magic Initiate two spell picks", () => {
    expect(feat("Ability Score Improvement").choices).toEqual([expect.objectContaining({ kind: "abilityScore", points: 2, max: 20 })]);
    expect(feat("Grappler").choices).toEqual([expect.objectContaining({ kind: "abilityScore", abilities: ["strength", "dexterity"], points: 1, max: 20 })]);
    expect(feat("Boon of Fate").choices).toEqual([expect.objectContaining({ kind: "abilityScore", points: 1, max: 30 })]);
    expect(feat("Skilled").choices).toEqual([expect.objectContaining({ kind: "skill", count: 3 })]);
    expect(feat("Magic Initiate").choices.map((c) => [c.kind, c.count, c.spells?.minLevel, c.spells?.maxLevel])).toEqual([["spell", 2, 0, 0], ["spell", 1, 1, 1]]);
    expect(feat("Magic Initiate").choices[0].spells?.lists).toEqual(["Cleric", "Druid", "Wizard"]);
  });

  it("every row passes the feat schema", () => {
    for (const f of feats) {
      const { slug: _slug, ...row } = f;

      expect(createFeatSchema.safeParse(row).success, f.name).toBe(true);
    }
  });
});
