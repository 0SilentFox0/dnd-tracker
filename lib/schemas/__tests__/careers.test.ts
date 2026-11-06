import { describe, expect, it } from "vitest";

import { createCareerSchema, updateCareerSchema } from "../careers";

const tier = (over = {}) => ({ name: "T", characteristics: ["ws"], skills: ["athletics", "melee:basic"], talents: ["f1"], trappings: ["Sword"], ...over });

const tiers = (n: number) => Array.from({ length: n }, () => tier());

describe("career schemas", () => {
  it("accepts exactly four tiers", () => {
    expect(createCareerSchema.safeParse({ name: "Soldier", tiers: tiers(4) }).success).toBe(true);
  });

  it.each([3, 5])("rejects %i tiers", (n) => {
    expect(createCareerSchema.safeParse({ name: "Soldier", tiers: tiers(n) }).success).toBe(false);
    expect(updateCareerSchema.safeParse({ tiers: tiers(n) }).success).toBe(false);
  });

  it("rejects a bad skill key or characteristic", () => {
    expect(createCareerSchema.safeParse({ name: "S", tiers: [tier({ skills: ["Bad Key"] }), ...tiers(3)] }).success).toBe(false);
    expect(createCareerSchema.safeParse({ name: "S", tiers: [tier({ characteristics: ["zz"] }), ...tiers(3)] }).success).toBe(false);
  });

  it("caps list length at 40", () => {
    expect(createCareerSchema.safeParse({ name: "S", tiers: [tier({ trappings: Array(41).fill("x") }), ...tiers(3)] }).success).toBe(false);
  });

  it("allows partial update without tiers", () => {
    expect(updateCareerSchema.safeParse({ name: "New" }).success).toBe(true);
  });
});
