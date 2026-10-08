import { describe, expect, it } from "vitest";

import { countRaceSkills, modifiedAbilityScores, normalizePassiveAbility, raceMainSkillsForDisplay } from "@/lib/utils/races/race-summary";
import type { MainSkill } from "@/types/main-skills";
import type { Race } from "@/types/races";
import type { Skill } from "@/types/skills";

const race = { id: "r1", name: "Ельф", availableSkills: ["ms1"], passiveAbility: "Темний зір" } as unknown as Race;

const skill = (mainSkillId: string | null) => ({ id: `s-${mainSkillId}`, mainSkillId }) as unknown as Skill;

describe("race summary", () => {
  it("counts skills of allowed main skills plus skills without a main skill", () => {
    expect(countRaceSkills(race, [skill("ms1"), skill("ms2"), skill(null)])).toBe(2);
  });

  it("without main-skill limits counts every skill", () => {
    expect(countRaceSkills({ ...race, availableSkills: [] } as unknown as Race, [skill("ms1"), skill("ms2")])).toBe(2);
  });

  it("uses the tree skill count when the race has a tree", () => {
    expect(countRaceSkills(race, [skill("ms1"), skill("ms2")], 49)).toBe(49);
    expect(countRaceSkills(race, [skill("ms1"), skill("ms2")], null)).toBe(1);
  });

  it("shows all regular main skills when the race has no limits, else the listed ones", () => {
    const ms = [{ id: "ms1" }, { id: "ms2" }, { id: "racial" }, { id: "ultimate" }] as MainSkill[];

    expect(raceMainSkillsForDisplay({ ...race, availableSkills: [] } as unknown as Race, ms).map((m) => m.id)).toEqual(["ms1", "ms2"]);
    expect(raceMainSkillsForDisplay(race, ms).map((m) => m.id)).toEqual(["ms1"]);
  });

  it("normalizes a string passive ability and finds modified scores of an object one", () => {
    expect(normalizePassiveAbility(race)).toEqual({ description: "Темний зір", statImprovements: undefined, statModifiers: undefined });

    const passive = normalizePassiveAbility({ ...race, passiveAbility: { description: "Сила", statModifiers: { strength: { bonus: 2 } } } } as unknown as Race);

    expect(modifiedAbilityScores(passive).map((a) => a.key)).toEqual(["strength"]);
  });

  it("пасивка з порожнім описом і масивом модифікаторів — безпечні значення", () => {
    expect(normalizePassiveAbility({ passiveAbility: { description: null, statModifiers: [] } })).toEqual({ description: "", statImprovements: undefined, statModifiers: undefined });
    expect(normalizePassiveAbility({ passiveAbility: null })).toBeNull();
  });
});
