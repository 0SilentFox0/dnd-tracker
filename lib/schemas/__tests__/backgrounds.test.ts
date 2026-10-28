import { describe, expect, it } from "vitest";

import { createBackgroundSchema } from "@/lib/schemas/backgrounds";

describe("background schema", () => {
  it("defaults optional benefits without altering biography", () => {
    expect(createBackgroundSchema.parse({ name: "Sage" })).toMatchObject({ choices: [], skillProficiencies: [], toolProficiencies: [] });
  });
  it("rejects invalid skills and class-only or lineage choices", () => {
    expect(createBackgroundSchema.safeParse({ name: "Sage", skillProficiencies: ["hacking"] }).success).toBe(false);
    for (const choice of [{ kind: "option", lineage: true, options: [{ id: "a", name: "A", abilities: [] }] }, { kind: "skill", count: { scale: "picks" } }]) {
      expect(createBackgroundSchema.safeParse({ name: "Sage", choices: [{ id: "test", label: "Test", ...choice }] }).success).toBe(false);
    }
  });
});
