import { describe, expect, it } from "vitest";

import { updateMainSkillSchema } from "@/lib/schemas/main-skills";
import { updateSpellGroupSchema, updateSpellSchema } from "@/lib/schemas/spells";

describe("constructor content fields", () => {
  it("spell fx: valid passes, unknown archetype fails, null clears", () => {
    expect(updateSpellSchema.safeParse({ fx: { archetype: "swarm" } }).success).toBe(true);
    expect(updateSpellSchema.safeParse({ fx: { archetype: "nope" } }).success).toBe(false);
    expect(updateSpellSchema.safeParse({ fx: null }).success).toBe(true);
  });

  it("spell group: hex color and known icon", () => {
    expect(updateSpellGroupSchema.safeParse({ color: "#12a52b", icon: "moon" }).success).toBe(true);
    expect(updateSpellGroupSchema.safeParse({ color: "green" }).success).toBe(false);
    expect(updateSpellGroupSchema.safeParse({ icon: "skull" }).success).toBe(false);
  });

  it("main skill role: known role or null", () => {
    expect(updateMainSkillSchema.safeParse({ role: "magic" }).success).toBe(true);
    expect(updateMainSkillSchema.safeParse({ role: null }).success).toBe(true);
    expect(updateMainSkillSchema.safeParse({ role: "wizardry" }).success).toBe(false);
  });
});
