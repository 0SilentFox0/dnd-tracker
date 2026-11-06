import { describe, expect, it } from "vitest";

import { rollCreation } from "../roll";
import { parseProfile } from "../schema";

import { mulberry32 } from "@/lib/utils/common/rng";

const profile = parseProfile({
  careerTable: [{ max: 40, careerId: "a" }, { max: 100, careerId: "b" }],
  randomTalentCount: 3,
  randomTalents: [{ max: 50, featId: "x" }, { max: 100, featId: "y" }],
});

describe("rollCreation", () => {
  it("rolls 2 careers, 10 stats in 2..20 and the random talents", () => {
    const r = rollCreation(mulberry32(7), profile);

    expect(r.careerRolls).toHaveLength(2);
    expect(r.careerRolls.every((c) => ["a", "b"].includes(c.careerId) && c.roll >= 1 && c.roll <= 100)).toBe(true);
    expect(r.statRolls).toHaveLength(10);
    expect(r.statRolls.every((v) => v >= 2 && v <= 20)).toBe(true);
    expect(r.randomTalents).toHaveLength(3);
    expect(r.randomTalents.every((f) => ["x", "y"].includes(f))).toBe(true);
  });

  it("is deterministic per seed", () => {
    expect(rollCreation(mulberry32(42), profile)).toEqual(rollCreation(mulberry32(42), profile));
  });

  it("returns no talents for an empty table", () => {
    expect(rollCreation(mulberry32(1), parseProfile({ randomTalentCount: 2, careerTable: [{ max: 100, careerId: "a" }] })).randomTalents).toEqual([]);
  });

  it("returns no career rolls for an empty career table", () => {
    expect(rollCreation(mulberry32(1), parseProfile({})).careerRolls).toEqual([]);
  });
});
