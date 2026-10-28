import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { exhaustionLevel } from "@/lib/utils/battle/conditions";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { parseRules } from "@/lib/utils/rules/schema";
import type { GameClassData } from "@/types/classes";

const base = {
  id: "ch1", campaignId: "c1", name: "Герой", race: "Людина", class: "Воїн", level: 3,
  strength: 10, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10,
  armorClass: 12, speed: 30, initiative: 0, morale: 1, controlledBy: "u1", immunities: [], knownSpells: [],
  equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: "warrior", classes: [], resources: {}, inspiration: false,
};

const surge = { id: "surge", name: "Другий подих", trigger: { event: "action" }, limits: { perRest: { rest: "short", uses: 1 } }, effects: [{ kind: "note", text: "x" }] };

const cls = (over: Partial<GameClassData> & { id: string }): GameClassData => ({
  name: over.id, icon: null, color: null, hitDie: 10, savingThrows: ["strength", "constitution"],
  proficiencies: { armor: [], weapons: [], tools: [] }, skillChoices: { count: 0, from: [] },
  caster: "none", spellcastingAbility: null, features: [], subclassLevel: 3, subclasses: [], ...over,
});

const fighter = cls({ id: "fighter", name: "Воїн", features: [{ level: 1, abilities: [surge as never] }] });

const warlock = cls({ id: "warlock", name: "Чорнокнижник", hitDie: 8, caster: "pact", spellcastingAbility: "charisma", savingThrows: ["wisdom", "charisma"] });

const FIGHTER3 = [{ classId: "fighter", level: 3 }];

const build = (outOfCombat: object, character: object, extra: object = {}) => {
  const context = {
    skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [],
    racesByName: { "Людина": null }, campaign: { maxLevel: 20 }, skillsById: {}, artifactsById: {}, artifactSetsById: {}, artifactSetMemberIds: {},
    rules: parseRules({ classes: { enabled: true }, outOfCombat, ...extra }), classesById: { fighter, warlock },
  } as never;

  return createBattleParticipantFromCharacter({ ...base, classes: FIGHTER3, ...character } as never, "b1", ParticipantSide.ALLY, undefined, context);
};

const PERSIST = { persistResources: true };

describe("battle start from stored resources", () => {
  it("persistResources off: full resources, stored state ignored (HOMM behaviour)", async () => {
    const p = await build({}, { resources: { hp: 1, exhaustion: 3, charges: { "class:fighter:surge": { used: 1, rest: "short" } } }, inspiration: true });

    expect(p.combatStats.currentHp).toBe(p.combatStats.maxHp);
    expect(p.combatStats.status).toBe("active");
    expect(exhaustionLevel(p)).toBe(0);
    expect(p.battleData.abilityUsage).toEqual({});
    expect(p.battleData.inspiration).toBeUndefined();
  });

  it("HP and temp HP from resources; stored HP above max is clamped", async () => {
    const hurt = await build(PERSIST, { resources: { hp: 5, tempHp: 4 } });

    expect(hurt.combatStats).toMatchObject({ currentHp: 5, tempHp: 4, status: "active" });

    const over = await build(PERSIST, { resources: { hp: 9999 } });

    expect(over.combatStats.currentHp).toBe(over.combatStats.maxHp);
  });

  it("0 HP starts unconscious; with death saves — dying", async () => {
    const down = await build(PERSIST, { resources: { hp: 0 } });

    expect(down.combatStats).toMatchObject({ currentHp: 0, status: "unconscious" });
    expect(down.battleData.deathSaves).toBeUndefined();

    const dying = await build(PERSIST, { resources: { hp: 0 } }, { deathSaves: { enabled: true } });

    expect(dying.combatStats.status).toBe("unconscious");
    expect(dying.battleData.deathSaves).toEqual({ successes: 0, failures: 0, stable: false });
  });

  it("dead stays dead", async () => {
    expect((await build(PERSIST, { resources: { dead: true, hp: 0 } })).combatStats).toMatchObject({ currentHp: 0, status: "dead" });
  });

  it("pact slots: spent subtracted, never below 0", async () => {
    const one = await build(PERSIST, { classes: [{ classId: "warlock", level: 3 }], resources: { slotsSpent: { pact: 1 } } });

    expect(one.spellcasting.spellSlots?.pact).toMatchObject({ max: 2, current: 1 });

    const none = await build(PERSIST, { classes: [{ classId: "warlock", level: 3 }], resources: { slotsSpent: { pact: 5 } } });

    expect(none.spellcasting.spellSlots?.pact?.current).toBe(0);
  });

  it("perRest charges become battle usage", async () => {
    const p = await build(PERSIST, { resources: { charges: { "class:fighter:surge": { used: 1, rest: "short" }, "gone:x:y": { used: 3, rest: "long" } } } });

    expect(p.battleData.abilityUsage).toEqual({ "class:fighter:surge": { battle: 1, round: 0, turn: 0 } });
  });

  it("exhaustion 4 (2014) halves max HP and clamps the stored HP to it", async () => {
    const fresh = await build(PERSIST, {});

    const tired = await build(PERSIST, { resources: { exhaustion: 4, hp: 9999 } });

    expect(exhaustionLevel(tired)).toBe(4);
    expect(tired.combatStats.maxHp).toBe(Math.ceil(fresh.combatStats.maxHp / 2));
    expect(tired.combatStats.currentHp).toBe(tired.combatStats.maxHp);
  });

  it("inspiration comes from the column when the rule is on", async () => {
    expect((await build({ inspiration: true }, { inspiration: true })).battleData.inspiration).toBe(true);
    expect((await build({ inspiration: true }, { inspiration: false })).battleData.inspiration).toBe(false);
  });
});
