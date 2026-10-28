import { describe, expect, it } from "vitest";

import { casterLevel, classSpellSlots, resolveClassEntries } from "../class-slots";

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

describe("class slots", () => {
  it("full caster 5 → 4/3/2", () => expect(classSpellSlots([e(cls({ caster: "full" }), 5)])).toEqual({ "1": { max: 4 }, "2": { max: 3 }, "3": { max: 2 } }));

  it("single half caster rounds up from level 2", () => {
    expect(casterLevel([e(cls({ caster: "half" }), 1)])).toBe(0);
    expect(casterLevel([e(cls({ caster: "half" }), 5)])).toBe(3);
  });

  it("single third caster rounds up from level 3", () => {
    expect(casterLevel([e(cls({ caster: "third" }), 2)])).toBe(0);
    expect(casterLevel([e(cls({ caster: "third" }), 4)])).toBe(2);
  });

  it("multiclass sums with floor", () =>
    expect(casterLevel([e(cls({ caster: "full" }), 3), e(cls({ caster: "half" }), 3), e(cls({ caster: "third" }), 3)])).toBe(5));

  it("non-caster + one half caster uses single-class rounding", () =>
    expect(casterLevel([e(cls({ caster: "none" }), 5), e(cls({ caster: "half" }), 3)])).toBe(2));

  it("pact is separate", () =>
    expect(classSpellSlots([e(cls({ caster: "pact" }), 5), e(cls({ caster: "full" }), 2)])).toEqual({ "1": { max: 3 }, pact: { level: 3, max: 2 } }));

  it("level 20 full caster has 9th circle", () => expect(classSpellSlots([e(cls({ caster: "full" }), 20)])["9"]).toEqual({ max: 1 }));

  it("unknown class is skipped", () => expect(classSpellSlots([{ classId: "x", level: 5, class: null, subclass: null }])).toEqual({}));

  it("resolve drops subclass not belonging to class", () => {
    const c = cls({ id: "a", subclasses: [{ id: "s1", name: "Чемпіон", features: [] }] });

    const [ok, bad, gone] = resolveClassEntries(
      [
        { classId: "a", subclassId: "s1", level: 3 },
        { classId: "a", subclassId: "zzz", level: 3 },
        { classId: "gone", level: 1 },
      ],
      { a: c },
    );

    expect(ok.subclass?.name).toBe("Чемпіон");
    expect(bad.subclass).toBeNull();
    expect(gone.class).toBeNull();
  });
});
