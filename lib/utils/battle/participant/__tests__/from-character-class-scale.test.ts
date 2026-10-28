import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import { parseRules } from "@/lib/utils/rules/schema";
import type { GameClassData } from "@/types/classes";

const levels = (f: (l: number) => string) => Array.from({ length: 20 }, (_, i) => f(i + 1));

const base = {
  id: "ch1", campaignId: "c1", name: "Герой", race: "Людина", class: "Монах", level: 5,
  strength: 10, dexterity: 14, constitution: 12, intelligence: 10, wisdom: 16, charisma: 10,
  armorClass: 12, speed: 30, initiative: 0, morale: 0, controlledBy: "u1", immunities: [], knownSpells: [],
  equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: "warrior", classes: [],
};

const monk: GameClassData = {
  id: "monk", name: "Monk", icon: null, color: null, hitDie: 8, savingThrows: ["strength", "dexterity"],
  proficiencies: { armor: [], weapons: [], tools: [] }, skillChoices: { count: 0, from: [] },
  caster: "none", spellcastingAbility: null, subclassLevel: 3, subclasses: [],
  columns: [{ key: "focus-points", label: "Focus Points", values: levels((l) => (l === 1 ? "" : String(l))), pool: { rest: "short" } }],
  features: [{ level: 2, abilities: [{ id: "pd", name: "Patient Defense", trigger: { event: "bonusAction" }, limits: { pool: { key: "focus-points", cost: 1 } }, effects: [{ kind: "note", text: "n" }] }] }],
};

const build = (rules: Ruleset, character: object) =>
  createBattleParticipantFromCharacter({ ...base, ...character } as never, "b1", ParticipantSide.ALLY, undefined, {
    skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [], racesByName: { "Людина": null }, campaign: { maxLevel: 20 },
    skillsById: {}, artifactsById: {}, artifactSetsById: {}, artifactSetMemberIds: {}, rules, classesById: { monk },
  } as never);

describe("числа класу на учаснику", () => {
  it("Monk 5: пул Focus 5/5 і ключ пулу на вмінні", async () => {
    const p = await build(parseRules({ classes: { enabled: true } }), { classes: [{ classId: "monk", level: 5 }] });

    expect(p.battleData.pools).toEqual({ "pool:monk:focus-points": { label: "Focus Points", max: 5, rest: "short" } });
    expect(p.battleData.resolvedAbilities.find((a) => a.id === "pd")?.limits?.pool).toEqual({ key: "pool:monk:focus-points", cost: 1 });
  });

  it("HOMM-герой: ключа pools немає", async () => {
    const p = await build(DEFAULT_RULES, {});

    expect("pools" in p.battleData).toBe(false);
  });
});
