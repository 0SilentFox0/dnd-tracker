import { describe, expect, it } from "vitest";

import { createSpellSchema } from "@/lib/schemas/spells";

const minimal = { name: "Тест", description: null, appearanceDescription: null, stackable: false, maxStacks: null, concentration: false };

describe("createSpellSchema level", () => {
  it("accepts cantrip and 9th circle", () => {
    expect(createSpellSchema.safeParse({ ...minimal, level: 0 }).success).toBe(true);
    expect(createSpellSchema.safeParse({ ...minimal, level: 9 }).success).toBe(true);
    expect(createSpellSchema.safeParse({ ...minimal, level: 10 }).success).toBe(false);
  });
});
