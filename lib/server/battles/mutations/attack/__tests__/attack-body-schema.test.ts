import { describe, expect, it, vi } from "vitest";

import { attackBodySchema } from "../attack-mutation";

vi.mock("server-only", () => ({}));

const base = { attackerId: "r", targetId: "t", d20Roll: 15, damageRolls: [1] };

describe("attackBodySchema cunningStrike", () => {
  it("accepts known effects", () => {
    expect(attackBodySchema.parse({ ...base, cunningStrike: ["trip", "poison"] }).cunningStrike).toEqual(["trip", "poison"]);
  });

  it("is optional", () => {
    expect(attackBodySchema.parse(base).cunningStrike).toBeUndefined();
  });

  it("rejects unknown effects and an empty list", () => {
    expect(attackBodySchema.safeParse({ ...base, cunningStrike: ["bogus"] }).success).toBe(false);
    expect(attackBodySchema.safeParse({ ...base, cunningStrike: [] }).success).toBe(false);
  });
});
