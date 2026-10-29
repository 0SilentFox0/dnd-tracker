import { describe, expect, it } from "vitest";

import { classesLabel, classHp, classSaves, classSpellcastingAbility, classTotalLevel, hitDiceLabel, subclassesLabel } from "..";

import type { GameClassData, ResolvedClassEntry } from "@/types/classes";

const cls = (over: Partial<GameClassData> = {}): GameClassData => ({
  id: "c",
  name: "Клас",
  icon: null,
  color: null,
  hitDie: 8,
  savingThrows: [],
  proficiencies: { armor: [], weapons: [], tools: [] },
  skillChoices: { count: 0, from: [] },
  caster: "none",
  spellcastingAbility: null,
  features: [],
  subclassLevel: null,
  subclasses: [],
  ...over,
});

const e = (c: GameClassData, level: number): ResolvedClassEntry => ({ classId: c.id, level, class: c, subclass: null });

describe("class derived stats", () => {
  it("hp: first level max die, then average", () => expect(classHp([e(cls({ hitDie: 10 }), 3)], 14)).toBe(10 + 2 + 2 * (6 + 2)));

  it("hp: multiclass — only the first class gets max die", () =>
    expect(classHp([e(cls({ hitDie: 10 }), 1), e(cls({ hitDie: 6 }), 2)], 10)).toBe(10 + 4 + 4));

  it("hp: multiclassing into a new class adds that class's average die, not the first class's", () => {
    const wizard = cls({ id: "wizard", hitDie: 6 });

    const fighter = cls({ id: "fighter", hitDie: 10 });

    const before = classHp([e(wizard, 3)], 14);

    expect(classHp([e(wizard, 3), e(fighter, 1)], 14)).toBe(before + (10 / 2 + 1 + 2));
  });

  it("hp: at least 1 per level", () => expect(classHp([e(cls({ hitDie: 6 }), 3)], 1)).toBe(3));

  it("hp: unknown class contributes nothing", () => expect(classHp([{ classId: "x", level: 4, class: null, subclass: null }], 10)).toBe(0));

  it("saves: union of first class and manual", () =>
    expect(
      classSaves(
        [e(cls({ savingThrows: ["strength", "constitution"] }), 1), e(cls({ savingThrows: ["wisdom", "charisma"] }), 1)],
        { dexterity: true, wisdom: false },
      ),
    ).toEqual(["strength", "dexterity", "constitution"]));

  it("spellcasting ability falls back to first caster class", () => {
    const entries = [e(cls({ caster: "none" }), 1), e(cls({ caster: "pact", spellcastingAbility: "charisma" }), 1)];

    expect(classSpellcastingAbility(entries, null)).toBe("charisma");
    expect(classSpellcastingAbility(entries, "wisdom")).toBe("wisdom");
    expect(classSpellcastingAbility(entries, "bogus")).toBe("charisma");
  });

  it("labels", () => {
    expect(classesLabel([e(cls({ name: "Воїн" }), 5), e(cls({ name: "Чарівник" }), 2)])).toBe("Воїн 5 / Чарівник 2");
    expect(hitDiceLabel([e(cls({ hitDie: 10 }), 5), e(cls({ hitDie: 6 }), 2)])).toBe("5d10 + 2d6");
    expect(subclassesLabel([e(cls(), 1)])).toBeNull();
    expect(
      subclassesLabel([
        { ...e(cls(), 3), subclass: { id: "a", name: "Чемпіон", features: [] } },
        { ...e(cls(), 3), subclass: { id: "b", name: "Пакт клинка", features: [] } },
      ]),
    ).toBe("Чемпіон, Пакт клинка");
  });

  it("total level counts unknown classes", () => expect(classTotalLevel([{ classId: "a", level: 3 }, { classId: "gone", level: 2 }])).toBe(5));

  it("hp/saves: початковий клас — лише entries[0]; видалений перший нічого не передає наступним", () => {
    const dangling = { classId: "x", level: 1, class: null, subclass: null } as ResolvedClassEntry;

    expect(classHp([dangling, e(cls({ hitDie: 10 }), 1)], 10)).toBe(6 + 0);
    expect(classSaves([dangling, e(cls({ savingThrows: ["strength"] }), 1)], {})).toEqual([]);
  });
});
