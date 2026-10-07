import { describe, expect, it } from "vitest";

import { HERO_EDGE, SCALE_MAX, SCALE_MIN, TARGET_ROUNDS } from "@/lib/constants/battle-balance";
import { computeFairScaling, type PartyPower, pickEnemyRoster, type UnitStats } from "@/lib/utils/battle/balance";

const unit = (unitId: string, level: number, hp: number, dpr: number, raceId: string | null = null): UnitStats => ({ unitId, name: unitId, level, hp, dpr, kpi: dpr / hp, raceId });

const LIBRARY: UnitStats[] = [
  unit("rat", 1, 8, 3),
  unit("goblin", 1, 15, 5),
  unit("wolf", 2, 30, 8),
  unit("orc", 3, 55, 12),
  unit("ogre", 4, 110, 20),
  unit("troll", 5, 180, 30),
];

const party = (heroes: number): PartyPower => ({ dpr: heroes * 14, hp: heroes * 60, heroCount: heroes });

describe("computeFairScaling", () => {
  it("цілі: HP = partyDpr × раунди, DPR = перевага × partyHp / раунди", () => {
    const s = computeFairScaling({ dpr: 20, hp: 100, heroCount: 1 }, [{ unitId: "orc", quantity: 1 }], LIBRARY);

    expect(s.target.hp).toBeCloseTo(20 * TARGET_ROUNDS);
    expect(s.target.dpr).toBeCloseTo((HERO_EDGE * 100) / TARGET_ROUNDS);
  });

  it("множники = ціль / база, у межах діапазону", () => {
    const s = computeFairScaling({ dpr: 20, hp: 100, heroCount: 1 }, [{ unitId: "ogre", quantity: 1 }], LIBRARY);

    expect(s.hpScale).toBeCloseTo(70 / 110);
    expect(s.dmgScale).toBeCloseTo(25.714 / 20, 2);
    expect(s.units.ogre.hpMult).toBeCloseTo(s.hpScale);
  });

  it("обрізає множники до [SCALE_MIN, SCALE_MAX]", () => {
    const tiny = computeFairScaling({ dpr: 2, hp: 5, heroCount: 1 }, [{ unitId: "troll", quantity: 1 }], LIBRARY);

    expect(tiny.hpScale).toBe(SCALE_MIN);
    expect(tiny.dmgScale).toBe(SCALE_MIN);

    const huge = computeFairScaling({ dpr: 400, hp: 4000, heroCount: 1 }, [{ unitId: "rat", quantity: 1 }], LIBRARY);

    expect(huge.hpScale).toBe(SCALE_MAX);
    expect(huge.dmgScale).toBe(SCALE_MAX);
  });

  it("стеля тіру: підсилений юніт тіру 1 не сильніший за найслабший юніт тіру 2", () => {
    const s = computeFairScaling({ dpr: 100, hp: 1000, heroCount: 4 }, [{ unitId: "goblin", quantity: 1 }], LIBRARY);

    expect(s.hpScale).toBe(SCALE_MAX);
    expect(15 * s.units.goblin.hpMult).toBeLessThanOrEqual(30 + 1e-9);
    expect(5 * s.units.goblin.dmgMult).toBeLessThanOrEqual(8 + 1e-9);
    expect(s.verdict).toBe("weak");
  });

  it("стеля не обмежує масштаб униз", () => {
    const s = computeFairScaling({ dpr: 4, hp: 20, heroCount: 1 }, [{ unitId: "goblin", quantity: 1 }], LIBRARY);

    expect(s.units.goblin.hpMult).toBeCloseTo(s.hpScale);
    expect(s.units.goblin.hpMult).toBeLessThan(1);
  });

  it("без вищого тіру стелі немає", () => {
    const s = computeFairScaling({ dpr: 1000, hp: 10000, heroCount: 4 }, [{ unitId: "troll", quantity: 1 }], LIBRARY);

    expect(s.units.troll.hpMult).toBe(SCALE_MAX);
  });

  it("стеля бере найближчий вищий тір, якщо t+1 немає", () => {
    const lib = [unit("a", 1, 10, 4), unit("b", 3, 20, 6)];

    const s = computeFairScaling({ dpr: 100, hp: 1000, heroCount: 4 }, [{ unitId: "a", quantity: 1 }], lib);

    expect(s.units.a.hpMult).toBe(2);
  });

  it("рівний бій: підказки немає", () => {
    const s = computeFairScaling(party(4), [{ unitId: "orc", quantity: 4 }], LIBRARY);

    expect(s.verdict).toBe("even");
    expect(s.hint).toBeNull();
  });

  it("слабко: підказує додати юнітів", () => {
    const s = computeFairScaling(party(4), [{ unitId: "goblin", quantity: 1 }], LIBRARY);

    expect(s.verdict).toBe("weak");
    expect(s.hint?.kind).toBe("weak");
    expect(s.hint?.changes.every((c) => c.delta > 0)).toBe(true);
  });

  it("забагато: підказує прибрати юнітів", () => {
    const s = computeFairScaling({ dpr: 10, hp: 40, heroCount: 1 }, [{ unitId: "ogre", quantity: 4 }], LIBRARY);

    expect(s.verdict).toBe("excess");
    expect(s.hint?.kind).toBe("excess");
    expect(s.hint?.changes.every((c) => c.delta < 0)).toBe(true);
  });

  it("порожній склад або герої без сили", () => {
    expect(computeFairScaling(party(4), [], LIBRARY).verdict).toBe("empty");
    expect(computeFairScaling({ dpr: 0, hp: 0, heroCount: 0 }, [{ unitId: "orc", quantity: 1 }], LIBRARY).verdict).toBe("empty");
  });
});

describe("pickEnemyRoster", () => {
  for (const heroes of [1, 4, 7]) {
    it(`партія з ${heroes}: множники в межах ±0.25, кількість у [⌈N/2⌉, 2N]`, () => {
      const pick = pickEnemyRoster(party(heroes), LIBRARY);

      expect(pick).not.toBeNull();
      expect(pick?.withinTolerance).toBe(true);
      expect(pick?.hpScale).toBeGreaterThanOrEqual(0.75);
      expect(pick?.hpScale).toBeLessThanOrEqual(1.25);
      expect(pick?.dmgScale).toBeGreaterThanOrEqual(0.75);
      expect(pick?.dmgScale).toBeLessThanOrEqual(1.25);

      const total = pick?.roster.reduce((a, r) => a + r.quantity, 0) ?? 0;

      expect(total).toBeGreaterThanOrEqual(Math.ceil(heroes / 2));
      expect(total).toBeLessThanOrEqual(heroes * 2);
    });
  }

  it("обмежується обраною расою", () => {
    const lib = [...LIBRARY, unit("skel", 2, 28, 7, "undead"), unit("zombie", 3, 50, 10, "undead")];

    const pick = pickEnemyRoster(party(4), lib, "undead");

    expect(pick?.roster.every((r) => ["skel", "zombie"].includes(r.unitId))).toBe(true);
  });

  it("порожня бібліотека → null", () => {
    expect(pickEnemyRoster(party(4), [])).toBeNull();
    expect(pickEnemyRoster(party(4), LIBRARY, "none")).toBeNull();
  });

  it("працює без вищого тіру в бібліотеці", () => {
    expect(pickEnemyRoster(party(4), [unit("only", 1, 40, 8)])).not.toBeNull();
  });

  it("при рівних варіантах обирає менше різних юнітів", () => {
    const pick = pickEnemyRoster(party(4), [unit("a", 2, 60, 14), unit("b", 2, 60, 14)]);

    expect(pick?.roster).toHaveLength(1);
  });
});
