import { describe, expect, it } from "vitest";

import { characterBaseHp, heroBaseHp } from "@/lib/utils/characters/hero-hp";
import type { GameClassData, ResolvedClassEntry } from "@/types/classes";

const fighter = { id: "f", name: "Воїн", hitDie: 10, subclasses: [] } as unknown as GameClassData;

const c = { level: 3, constitution: 14, archetype: null };

describe("characterBaseHp", () => {
  it("без класів — формула героя", () => {
    expect(characterBaseHp(c, {}).total).toBe(heroBaseHp(c).total);
    expect(characterBaseHp(c, { entries: [] }).total).toBe(heroBaseHp(c).total);
  });

  it("запис без знайденого класу — формула героя", () => {
    const entries: ResolvedClassEntry[] = [{ classId: "gone", level: 3, class: null, subclass: null }];

    expect(characterBaseHp(c, { entries }).total).toBe(heroBaseHp(c).total);
  });

  it("класи рахуються за кістками хітів", () => {
    const entries: ResolvedClassEntry[] = [{ classId: "f", level: 3, class: fighter, subclass: null }];

    const hp = characterBaseHp(c, { entries });

    expect(hp.total).toBe(12 + 8 + 8);
    expect(hp.breakdown).toEqual(["Кістки хітів: 3d10"]);
  });
});
