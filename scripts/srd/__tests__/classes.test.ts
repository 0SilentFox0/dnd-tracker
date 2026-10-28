import { describe, expect, it } from "vitest";

import { convertClasses, parseCoreTraits } from "../convert/classes";
import { FIXTURE_DIR, loadOpen5e } from "../lib/open5e";

import { DND_SKILLS } from "@/lib/constants/skills";

const classes = convertClasses(loadOpen5e(FIXTURE_DIR));

const cls = (name: string) => classes.find((c) => c.name === name)!;

const at = (name: string, level: number) => cls(name).features.find((f) => f.level === level)?.abilities ?? [];

describe("convertClasses", () => {
  it("only base classes as rows, subclasses nested", () => {
    expect(classes.map((c) => c.name)).toEqual(["Bard", "Fighter", "Monk", "Wizard"]);
    expect(cls("Fighter").subclasses.map((s) => ({ id: s.id, name: s.name }))).toEqual([{ id: "champion", name: "Champion" }]);
    expect(cls("Bard").subclasses[0].id).toBe("college-of-lore");
  });

  it("Fighter core traits", () => {
    expect(cls("Fighter")).toMatchObject({ hitDie: 10, savingThrows: ["strength", "constitution"], caster: "none", spellcastingAbility: null, subclassLevel: 3 });
    expect(cls("Fighter").proficiencies).toEqual({ armor: ["Light, Medium, and Heavy armor and Shields"], weapons: ["Simple and Martial weapons"], tools: [], multiclass: { armor: ["Light armor", "Medium armor", "Shields"], weapons: ["Martial weapons"] } });
    expect(cls("Fighter").skillChoices.count).toBe(2);
    expect(cls("Fighter").skillChoices.from).toEqual(["acrobatics", "animalHandling", "athletics", "history", "insight", "intimidation", "persuasion", "perception", "survival"]);
  });

  it("Extra Attack, Second Wind, Action Surge (2 only, scaled by the table), no table columns", () => {
    expect(at("Fighter", 5).find((a) => a.name === "Extra Attack")).toMatchObject({ id: "extra-attack-5", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attacksPerAction", flat: 1 }] });
    expect(at("Fighter", 1).find((a) => a.name === "Second Wind")).toMatchObject({
      id: "second-wind-1",
      trigger: { event: "bonusAction" },
      limits: { perRest: { rest: "long", uses: { scale: "second-wind-uses" } } },
      effects: [{ kind: "heal", amount: "1d10", target: "self" }, { kind: "heal", amount: { formula: "class_level" }, target: "self" }],
    });
    expect(at("Fighter", 2).some((a) => a.id === "action-surge-2")).toBe(true);
    expect(at("Fighter", 2).find((a) => a.id === "action-surge-2")).toMatchObject({ trigger: { event: "action" }, effects: [{ kind: "grantAction", extraActions: 2 }] });
    expect(at("Fighter", 17).some((a) => a.id === "action-surge-17")).toBe(false);

    const names = cls("Fighter").features.flatMap((f) => f.abilities.map((a) => a.name));

    expect(names).not.toContain("Proficiency Bonus");
    expect(names).not.toContain("Core Fighter Traits");
    expect(names.filter((n) => n === "Second Wind")).toHaveLength(1);
  });

  it("Champion Improved Critical at 3", () => {
    const f = cls("Fighter").subclasses[0].features.find((g) => g.level === 3)!;

    expect(f.abilities.find((a) => a.name === "Improved Critical")).toMatchObject({ effects: [{ kind: "modifyStat", stat: "critThreshold", flat: -1 }] });
  });

  it("Wizard: full caster on Intelligence, no spell-list feature", () => {
    expect(cls("Wizard")).toMatchObject({ hitDie: 6, caster: "full", spellcastingAbility: "intelligence" });
    expect(cls("Wizard").features.flatMap((f) => f.abilities).some((a) => /Spell List/i.test(a.name))).toBe(false);
  });

  it("Bard: any 3 skills; subclass marker without a level row lands at 3", () => {
    expect(cls("Bard").skillChoices).toEqual({ count: 3, from: [...DND_SKILLS] });
    expect(at("Bard", 3).some((a) => a.id === "bard-subclass-3")).toBe(true);
  });

  it("Monk: typo fixed, column-like feature keeps only its first level", () => {
    const movement = cls("Monk").features.flatMap((f) => f.abilities.map((a) => ({ level: f.level, a }))).filter((x) => x.a.name === "Unarmored Movement");

    expect(movement.map((x) => x.level)).toEqual([2]);
    expect(movement[0].a.effects).toEqual([{ kind: "modifyStat", stat: "speed", flat: { scale: "unarmored-movement" } }]);
  });

  it("parseCoreTraits handles typos and long weapon lists", () => {
    const desc = "|||\n|---|---|\n|Skill Proficiencies|Choose 2: Arcana, History, In sight, Na ture, or Religion|\n|Weapon Proficiencies|Simple weapons and Martial weapons that have the Finesse or Light property|\n|Tool Proficiencies|Thieves' Tools|\n|Armor Training|None|";

    expect(parseCoreTraits(desc)).toEqual({
      skillChoices: { count: 2, from: ["arcana", "history", "insight", "nature", "religion"] },
      proficiencies: { armor: [], weapons: ["Simple weapons", "Martial weapons that have the Finesse or Light property"], tools: ["Thieves' Tools"] },
    });
  });
});
