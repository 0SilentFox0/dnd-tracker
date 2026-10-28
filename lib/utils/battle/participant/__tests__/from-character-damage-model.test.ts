import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { parseRules } from "@/lib/utils/rules/schema";
import type { GameClassData } from "@/types/classes";

const base = {
  id: "ch1", campaignId: "c1", name: "Герой", race: "Людина", class: "Воїн", level: 3,
  strength: 10, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10,
  armorClass: 12, speed: 30, initiative: 0, morale: 1, controlledBy: "u1", immunities: [], knownSpells: [],
  equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: "warrior", classes: [],
};

const fighter = {
  id: "fighter", name: "Воїн", icon: null, color: null, hitDie: 10, savingThrows: ["strength", "constitution"],
  proficiencies: { armor: [], weapons: [], tools: [] }, skillChoices: { count: 0, from: [] },
  caster: "none", spellcastingAbility: null, features: [], subclassLevel: 3, subclasses: [],
} as GameClassData;

const build = (rules: object, classes: Array<{ classId: string; level: number }>) => {
  const context = {
    skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [],
    racesByName: { "Людина": null }, campaign: { maxLevel: 20 }, skillsById: {}, artifactsById: {}, artifactSetsById: {}, artifactSetMemberIds: {},
    rules: parseRules(rules), classesById: { fighter },
  } as never;

  return createBattleParticipantFromCharacter({ ...base, classes } as never, "b1", ParticipantSide.ALLY, undefined, context);
};

describe("damageModel", () => {
  it("sets damageModel only when a class resolves", async () => {
    expect((await build({ classes: { enabled: true } }, [{ classId: "fighter", level: 3 }])).abilities.damageModel).toBe("5e");
    expect((await build({ classes: { enabled: true } }, [])).abilities.damageModel).toBeUndefined();
    expect((await build({}, [{ classId: "fighter", level: 3 }])).abilities.damageModel).toBeUndefined();
    expect((await build({ classes: { enabled: true } }, [{ classId: "ghost", level: 3 }])).abilities.damageModel).toBeUndefined();
  });
});
