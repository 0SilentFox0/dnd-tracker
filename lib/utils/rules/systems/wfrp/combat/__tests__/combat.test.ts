import { describe, expect, it } from "vitest";

import { reverseRoll } from "../../percentile";
import { LOCATIONS } from "../constants";
import { CRIT_TABLE, rollCrit } from "../crit-table";
import { computeWfrpDamage } from "../damage";
import { hitLocation } from "../location";
import { resolveOpposed } from "../opposed";

import { mulberry32 } from "@/lib/utils/common/rng";

const rng = mulberry32(1);

const opposed = (attacker: number, defender: number, extra: Partial<Parameters<typeof resolveOpposed>[0]> = {}) =>
  resolveOpposed({ attackerTarget: 50, defenderTargets: [{ kind: "parry", target: 40 }], rng, presetRolls: { attacker, defender }, ...extra });

describe("resolveOpposed", () => {
  it.each([
    ["auto success hits even vs strong defender", 5, 10, true],
    ["auto failure 96 misses", 96, 99, false],
    ["both fail is a miss", 70, 80, false],
    ["higher SL wins", 20, 35, true],
    ["defender higher SL wins", 45, 10, false],
    ["tie goes to attacker", 35, 25, true],
    ["fumble double misses", 55, 90, false],
    ["critical double on success hits", 22, 70, true],
  ])("%s", (_n, a, d, hit) => {
    const r = opposed(a, d);

    expect(r.isHit).toBe(hit);
    expect(r.attackerWon).toBe(hit);
  });

  it("computes net SL", () => {
    expect(opposed(10, 35).netSl).toBe(3);
    expect(opposed(10, 25).netSl).toBe(2);
  });

  it("picks the best defender target", () => {
    const r = resolveOpposed({
      attackerTarget: 50,
      defenderTargets: [{ kind: "parry", target: 30 }, { kind: "shield", target: 60 }, { kind: "dodge", target: 45 }],
      rng,
      presetRolls: { attacker: 30, defender: 30 },
    });

    expect(r.defender.kind).toBe("shield");
    expect(r.defender.target).toBe(60);
  });

  it("applies attacker SL modifier", () => {
    expect(opposed(30, 80, { attackerSlMod: 2 }).attacker.sl).toBe(4);
  });

  it("works without defender targets", () => {
    expect(opposed(30, 80, { defenderTargets: [] }).isHit).toBe(true);
  });

  it("rolls with rng when no preset", () => {
    const r = resolveOpposed({ attackerTarget: 50, defenderTargets: [{ kind: "dodge", target: 30 }], rng: mulberry32(7) });

    expect(r.attacker.rawRoll).toBeGreaterThanOrEqual(1);
  });
});

describe("hitLocation", () => {
  it.each([
    [1, "head"], [9, "head"], [10, "arm"], [24, "arm"], [25, "arm"], [44, "arm"],
    [45, "body"], [79, "body"], [80, "leg"], [89, "leg"], [90, "leg"], [100, "leg"],
  ])("reversed %i is %s", (reversed, loc) => {
    expect(hitLocation(reverseRoll(reversed))).toBe(loc);
  });

  it("reverses the raw roll", () => {
    expect(hitLocation(90)).toBe("head");
    expect(hitLocation(1)).toBe("arm");
  });
});

describe("computeWfrpDamage", () => {
  it("sums and subtracts", () => {
    const r = computeWfrpDamage({ weapon: 4, sb: 3, netSl: 2, tb: 3, ap: 1 });

    expect(r.total).toBe(5);
    expect(r.steps).toEqual([
      { key: "weapon", value: 4 }, { key: "sb", value: 3 }, { key: "netSl", value: 2 }, { key: "tb", value: -3 }, { key: "ap", value: -1 },
    ]);
  });

  it("has minimum damage 1", () => {
    expect(computeWfrpDamage({ weapon: 1, sb: 0, netSl: 0, tb: 5, ap: 5 }).total).toBe(1);
  });
});

describe("rollCrit", () => {
  it("every row of every table is reachable", () => {
    for (const loc of LOCATIONS) {
      const ids = new Set<string>();

      for (let roll = 1; roll <= 100; roll++) ids.add(rollCrit(loc, rng, roll).id);

      expect([...ids].sort()).toEqual(CRIT_TABLE[loc].map((_r, i) => `${loc}.${i + 1}`));
    }
  });

  it("returns text key, bonus and marker", () => {
    expect(rollCrit("head", rng, 100)).toEqual({ id: "head.5", textKey: "battleLog.wfrp.crit.head.5", bonusDamage: 5, markerKey: "unconscious" });
    expect(rollCrit("leg", rng, 1)).toEqual({ id: "leg.1", textKey: "battleLog.wfrp.crit.leg.1", bonusDamage: 1 });
  });

  it("rolls from rng without preset", () => {
    expect(rollCrit("body", mulberry32(3)).id).toMatch(/^body\.[1-5]$/);
  });
});
