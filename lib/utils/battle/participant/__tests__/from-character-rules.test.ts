import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { awaitsMoraleCheck } from "@/lib/utils/battle/morale/awaits-check";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { parseRules } from "@/lib/utils/rules/schema";

const character = {
  id: "ch1", campaignId: "c1", name: "Герой", race: "Людина", class: "Воїн", level: 5,
  strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
  armorClass: 12, speed: 30, initiative: 0, morale: 1, controlledBy: "u1", immunities: [], knownSpells: [],
  equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: "ranger",
};

const context = {
  skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [],
  racesByName: { "Людина": { id: "r", campaignId: "c1", name: "Людина", icon: null, color: null, availableSkills: [], disabledSkills: [], spellSlotProgression: [], passiveAbility: null, abilities: [] } },
  campaign: { maxLevel: 20 }, skillsById: {}, artifactsById: {}, artifactSetsById: {}, artifactSetMemberIds: {},
} as never;

describe("createBattleParticipantFromCharacter: правила бою без повного контексту", () => {
  it("мораль вимкнена в зафіксованих правилах: moraleCap 0 і ходу ніщо не блокує", async () => {
    const rules = parseRules({ morale: { enabled: false } });

    const p = await createBattleParticipantFromCharacter(character as never, "b1", ParticipantSide.ALLY, undefined, context, { artifactRows: [], rules });

    expect(p.abilities.moraleCap).toBe(0);
    expect(awaitsMoraleCheck({ participants: [p], scene: { turnIndex: 0, pendingMoraleCheck: null } }, p.basicInfo.id)).toBe(false);
  });

  it("без rules лишаються типові: moraleCap 3", async () => {
    const p = await createBattleParticipantFromCharacter(character as never, "b1", ParticipantSide.ALLY, undefined, context);

    expect(p.abilities.moraleCap).toBe(3);
  });
});

describe("createBattleParticipantFromCharacter: навички героя", () => {
  it("skills { stealth: true, foo: true } -> skillProficiencies [stealth]; без навичок поля немає", async () => {
    const p = await createBattleParticipantFromCharacter({ ...character, skills: { stealth: true, foo: true } } as never, "b1", ParticipantSide.ALLY, undefined, context);

    expect(p.abilities.skillProficiencies).toEqual(["stealth"]);

    const q = await createBattleParticipantFromCharacter({ ...character, skills: {} } as never, "b1", ParticipantSide.ALLY, undefined, context);

    expect("skillProficiencies" in q.abilities).toBe(false);
  });
});
