import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import { parseRules } from "@/lib/utils/rules/schema";
import type { GameClassData } from "@/types/classes";

const base = {
  id: "ch1", campaignId: "c1", name: "Герой", race: "Людина", class: "Воїн", level: 3,
  strength: 10, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10,
  armorClass: 12, speed: 30, initiative: 0, morale: 1, controlledBy: "u1", immunities: [], knownSpells: [],
  equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: "warrior", classes: [],
};

const note = (name: string) => ({ id: name, name, trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armorClass", flat: 1 }] });

const cls = (over: Partial<GameClassData> & { id: string }): GameClassData => ({
  name: over.id, icon: null, color: null, hitDie: 10, savingThrows: ["strength", "constitution"],
  proficiencies: { armor: [], weapons: [], tools: [] }, skillChoices: { count: 0, from: [] },
  caster: "none", spellcastingAbility: null, features: [], subclassLevel: 3, subclasses: [], ...over,
});

const fighter = cls({
  id: "fighter", name: "Воїн",
  features: [{ level: 1, abilities: [note("f1") as never] }, { level: 3, abilities: [note("f3") as never] }],
  subclasses: [{ id: "champ", name: "Чемпіон", features: [{ level: 3, abilities: [note("c3") as never] }] }],
});

const warlock = cls({ id: "warlock", name: "Чорнокнижник", hitDie: 8, caster: "pact", spellcastingAbility: "charisma", savingThrows: ["wisdom", "charisma"] });

const build = (rules: Ruleset, character: object, classesById: Record<string, GameClassData> = { fighter, warlock }) => {
  const context = {
    skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [],
    racesByName: { "Людина": null }, campaign: { maxLevel: 20 }, skillsById: {}, artifactsById: {}, artifactSetsById: {}, artifactSetMemberIds: {},
    rules, classesById,
  } as never;

  return createBattleParticipantFromCharacter({ ...base, ...character } as never, "b1", ParticipantSide.ALLY, undefined, context);
};

const enabled = parseRules({ classes: { enabled: true } });

describe("учасник від класів", () => {
  it("HOMM без змін: класи ввімкнені, але у персонажа їх немає", async () => {
    const strip = (p: Awaited<ReturnType<typeof build>>) => ({ ...p, basicInfo: { ...p.basicInfo, id: "x" }, battleData: { ...p.battleData } });

    const a = strip(await build(enabled, { archetype: "ranger", savingThrows: { wisdom: true }, spellSlots: { "1": { max: 2, current: 0 } } }));

    const b = strip(await build(DEFAULT_RULES, { archetype: "ranger", savingThrows: { wisdom: true }, spellSlots: { "1": { max: 2, current: 0 } } }));

    expect(a.combatStats.maxHp).toBe(b.combatStats.maxHp);
    expect(a.abilities.saveProficiencies).toEqual(b.abilities.saveProficiencies);
    expect(a.abilities.meleeMultiplier).toBe(b.abilities.meleeMultiplier);
    expect(a.spellcasting.spellSlots).toEqual(b.spellcasting.spellSlots);
    expect(a).toEqual(b);
  });

  it("клас вимкнено правилами — поле classes ігнорується", async () => {
    const p = await build(DEFAULT_RULES, { classes: [{ classId: "fighter", level: 3 }] });

    const q = await build(DEFAULT_RULES, {});

    expect(p.combatStats.maxHp).toBe(q.combatStats.maxHp);
  });

  it("усі classId невідомі — шлях HOMM, не мертвий учасник", async () => {
    const p = await build(enabled, { classes: [{ classId: "ghost", level: 5 }] });

    const q = await build(DEFAULT_RULES, {});

    expect(p.combatStats.maxHp).toBe(q.combatStats.maxHp);
    expect(p.combatStats.maxHp).toBeGreaterThan(0);
    expect(p.abilities.meleeMultiplier).toBe(q.abilities.meleeMultiplier);
    expect(p.battleData.resolvedAbilities).toEqual(q.battleData.resolvedAbilities);
  });

  it("HP від кісток хітів, архетип ігнорується", async () => {
    const p = await build(enabled, { classes: [{ classId: "fighter", level: 3 }] });

    expect(p.combatStats.maxHp).toBe(28);
    expect(p.abilities.meleeMultiplier).toBe(1);
  });

  it("рятівні — першого класу плюс ручні", async () => {
    const p = await build(enabled, { classes: [{ classId: "fighter", level: 1 }, { classId: "warlock", level: 1 }], savingThrows: { intelligence: true } });

    expect(new Set(p.abilities.saveProficiencies)).toEqual(new Set(["strength", "constitution", "intelligence"]));
  });

  it("вміння до рівня класу та підклас, source.type class", async () => {
    const low = await build(enabled, { classes: [{ classId: "fighter", subclassId: "champ", level: 2 }] });

    const names = low.battleData.resolvedAbilities.map((a) => a.name);

    expect(names).toContain("f1");
    expect(names).not.toContain("f3");
    expect(low.battleData.resolvedAbilities.filter((a) => a.source.type === "class").length).toBe(low.battleData.resolvedAbilities.length);

    const high = await build(enabled, { classes: [{ classId: "fighter", subclassId: "champ", level: 3 }] });

    const sub = high.battleData.resolvedAbilities.find((a) => a.name === "c3");

    expect(sub?.source).toMatchObject({ type: "class", id: "champ", name: "Воїн: Чемпіон" });
  });

  it("невідомий classId пропускається; початковий клас — лише entries[0]", async () => {
    const p = await build(enabled, { classes: [{ classId: "ghost", level: 5 }, { classId: "fighter", level: 3 }] });

    expect(p.combatStats.maxHp).toBe(24);
  });

  it("слоти пакту й характеристика заклинань", async () => {
    const p = await build(enabled, { classes: [{ classId: "warlock", level: 2 }] });

    expect(p.spellcasting.spellSlots.pact).toEqual({ level: 1, max: 2, current: 2 });
    expect(p.spellcasting.spellcastingAbility).toBe("charisma");
    expect(p.spellcasting.spellSaveDC).toBeDefined();
  });
});
