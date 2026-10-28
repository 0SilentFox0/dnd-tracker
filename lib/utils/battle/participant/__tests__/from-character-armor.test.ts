import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { armorStatsColumns } from "@/lib/utils/artifacts/armor-stats";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import { parseRules } from "@/lib/utils/rules/schema";
import type { GameClassData } from "@/types/classes";

const chain = { id: "art1", campaignId: "c1", name: "Chain Mail", slot: "armor", setId: null, bonuses: {}, abilities: [], icon: null, ...armorStatsColumns({ category: "heavy", base: 16, strength: 13, stealthDisadvantage: true }) };

const base = {
  id: "ch1", campaignId: "c1", name: "Герой", race: "Людина", class: "Воїн", level: 5,
  strength: 12, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10,
  armorClass: 12, speed: 30, initiative: 0, morale: 0, controlledBy: "u1", immunities: [], knownSpells: [],
  equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: "warrior", classes: [],
};

const fighter: GameClassData = {
  id: "fighter", name: "Fighter", icon: null, color: null, hitDie: 10, savingThrows: ["strength", "constitution"],
  proficiencies: { armor: ["Light, Medium, and Heavy armor and Shields"], weapons: ["Simple and Martial weapons"], tools: [] }, skillChoices: { count: 0, from: [] },
  caster: "none", spellcastingAbility: null, features: [], subclassLevel: 3, subclasses: [],
  multiclassProficiencies: { armor: ["Light armor", "Medium armor", "Shields"], weapons: ["Martial weapons"] },
};

const wizard: GameClassData = {
  ...fighter, id: "wizard", name: "Wizard", hitDie: 6, proficiencies: { armor: [], weapons: ["Simple weapons"], tools: [] }, multiclassProficiencies: { armor: [], weapons: [] },
};

const build = (rules: Ruleset, character: object) => {
  const context = {
    skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [],
    racesByName: { "Людина": null }, campaign: { maxLevel: 20 }, skillsById: {}, artifactsById: { art1: chain }, artifactSetsById: {}, artifactSetMemberIds: {},
    rules, classesById: { fighter, wizard },
  } as never;

  return createBattleParticipantFromCharacter({ ...base, ...character } as never, "b1", ParticipantSide.ALLY, undefined, context);
};

const enabled = parseRules({ classes: { enabled: true } });

const wearing = { inventory: { equipped: { armor: "art1" } } };

describe("КЗ героя з класами", () => {
  it("Fighter 5 у Chain Mail із Силою 12: КЗ 16, швидкість 20, перешкода скритності", async () => {
    const p = await build(enabled, { ...wearing, classes: [{ classId: "fighter", level: 5 }] });

    expect(p.combatStats.armorClass).toBe(16);
    expect(p.combatStats.speed).toBe(20);
    expect(p.battleData.resolvedAbilities.find((a) => a.key === "artifact:art1:armor-penalties")?.effects).toContainEqual({ kind: "flag", flag: "checkDisadvantage", skills: ["stealth"] });
  });

  it("без броні: 10 + Спр, Character.armorClass не читається", async () => {
    const p = await build(enabled, { dexterity: 16, classes: [{ classId: "fighter", level: 5 }] });

    expect(p.combatStats.armorClass).toBe(13);
    expect(p.combatStats.speed).toBe(30);
  });

  it("HOMM і герой без класів: КЗ з персонажа, без штрафів навіть у броні з моделлю", async () => {
    for (const p of [await build(DEFAULT_RULES, wearing), await build(enabled, wearing)]) {
      expect(p.combatStats.armorClass).toBe(12);
      expect(p.combatStats.speed).toBe(30);
      expect(p.battleData.resolvedAbilities.some((a) => a.id === "armor-penalties")).toBe(false);
    }
  });
});

describe("володіння мультикласу", () => {
  it("Wizard → Fighter: лише таблиця мультикласу Fighter (без важкої броні)", async () => {
    const p = await build(enabled, { classes: [{ classId: "wizard", level: 1 }, { classId: "fighter", level: 1 }] });

    expect(p.abilities.proficiencies).toEqual({ armor: ["Light armor", "Medium armor", "Shields"], weapons: ["Simple weapons", "Martial weapons"] });
  });

  it("Fighter → Wizard: Wizard нічого не додає", async () => {
    const p = await build(enabled, { classes: [{ classId: "fighter", level: 1 }, { classId: "wizard", level: 1 }] });

    expect(p.abilities.proficiencies).toEqual({ armor: ["Light, Medium, and Heavy armor and Shields"], weapons: ["Simple and Martial weapons"] });
  });
});
