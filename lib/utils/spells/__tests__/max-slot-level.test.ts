import { describe, expect, it } from "vitest";

import { maxSlotLevelFor } from "@/lib/utils/spells/class-slots";
import type { GameClassData, ResolvedClassEntry } from "@/types/classes";

const cls = (caster: GameClassData["caster"]): GameClassData => ({ id: caster, name: caster, icon: null, color: null, hitDie: 8, savingThrows: [], proficiencies: { armor: [], weapons: [], tools: [] }, skillChoices: { count: 0, from: [] }, caster, spellcastingAbility: "intelligence", features: [], subclassLevel: 3, subclasses: [] });

const entry = (caster: GameClassData["caster"], level: number): ResolvedClassEntry => ({ classId: caster, level, class: cls(caster), subclass: null });

describe("maxSlotLevelFor", () => {
  it("highest slot of this class alone; pact counts its slot level", () => {
    expect(maxSlotLevelFor(entry("full", 1))).toBe(1);
    expect(maxSlotLevelFor(entry("full", 5))).toBe(3);
    expect(maxSlotLevelFor(entry("half", 1))).toBe(0);
    expect(maxSlotLevelFor(entry("half", 5))).toBe(2);
    expect(maxSlotLevelFor(entry("pact", 5))).toBe(3);
    expect(maxSlotLevelFor(entry("none", 20))).toBe(0);
  });
});
