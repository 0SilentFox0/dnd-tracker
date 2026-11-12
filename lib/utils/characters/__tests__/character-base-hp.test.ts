import { describe, expect, it } from "vitest";

import { characterBaseHp } from "@/lib/utils/characters/hero-hp";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { heroBaseHp } from "@/systems/d20/rules/progression/hero-hp";
import type { GameClassData, ResolvedClassEntry } from "@/types/classes";

const fighter = { id: "f", name: "Воїн", hitDie: 10, subclasses: [] } as unknown as GameClassData;

const c = { level: 3, constitution: 14, archetype: null };

const rules = DEFAULT_RULES;

const hero = heroBaseHp(c, rules.heroScaling).total;

describe("characterBaseHp", () => {
  it("без класів — формула героя", () => {
    expect(characterBaseHp(c, { rules }).total).toBe(hero);
    expect(characterBaseHp(c, { rules, entries: [] }).total).toBe(hero);
  });

  it("запис без знайденого класу — формула героя", () => {
    const entries: ResolvedClassEntry[] = [{ classId: "gone", level: 3, class: null, subclass: null }];

    expect(characterBaseHp(c, { rules, entries }).total).toBe(hero);
  });

  it("формула героя береться з правил кампанії", () => {
    const custom = { ...rules, heroScaling: { ...rules.heroScaling, hpBaseLevels: 1, hpConCoefficient: 1 } };

    expect(characterBaseHp(c, { rules: custom }).total).toBe(heroBaseHp(c, custom.heroScaling).total);
    expect(characterBaseHp(c, { rules: custom }).total).not.toBe(hero);
  });

  it("класи рахуються за кістками хітів", () => {
    const entries: ResolvedClassEntry[] = [{ classId: "f", level: 3, class: fighter, subclass: null }];

    const hp = characterBaseHp(c, { rules, entries });

    expect(hp.total).toBe(12 + 8 + 8);
    expect(hp.breakdown).toEqual([{ label: "characterProfile.sheet.lines.hitDice", params: { dice: "3d10" } }]);
  });
});
