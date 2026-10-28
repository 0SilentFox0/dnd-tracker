import { describe, expect, it } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { createArtifactSchema, patchArtifactSchema } from "@/lib/schemas/artifacts";

const armor = { category: "heavy", base: 16, strength: 13, stealthDisadvantage: true };

describe("artifact armor field", () => {
  it("accepts armor only in the armor slot", () => {
    expect(createArtifactSchema.safeParse({ name: "Chain Mail", slot: "armor", armor }).success).toBe(true);

    const wrong = createArtifactSchema.safeParse({ name: "Sword", slot: "weapon", armor });

    expect(wrong.success).toBe(false);
    expect(wrong.error?.issues[0]).toMatchObject({ path: ["armor"], message: API_ERRORS.ARMOR_SLOT_ONLY });
  });

  it("patch: armor with another slot fails, armor without slot passes (resource checks the stored slot)", () => {
    expect(patchArtifactSchema.safeParse({ slot: "ring", armor }).success).toBe(false);
    expect(patchArtifactSchema.safeParse({ armor }).success).toBe(true);
    expect(patchArtifactSchema.safeParse({ slot: "armor", armor }).success).toBe(true);
  });

  it("validates ranges and category", () => {
    expect(createArtifactSchema.safeParse({ name: "X", slot: "armor", armor: { category: "cloth", base: 11 } }).success).toBe(false);
    expect(createArtifactSchema.safeParse({ name: "X", slot: "armor", armor: { category: "light", base: 0 } }).success).toBe(false);
    expect(createArtifactSchema.safeParse({ name: "X", slot: "armor", armor: { category: "light", base: 31 } }).success).toBe(false);
  });

  it("HOMM artifacts without armor still parse", () => {
    expect(createArtifactSchema.safeParse({ name: "Кільце", slot: "ring" }).success).toBe(true);
    expect(patchArtifactSchema.safeParse({ name: "Кільце" }).success).toBe(true);
  });
});
