import { describe, expect, it } from "vitest";

import { createArtifactSchema, patchArtifactSchema } from "@/lib/schemas/artifacts";

const property = { property: { appliesTo: { kinds: ["weapon"] } } };

describe("artifact item field", () => {
  it("property only in weapon/armor/shield slots", () => {
    expect(createArtifactSchema.safeParse({ name: "Flame Tongue", slot: "weapon", item: property }).success).toBe(true);
    expect(createArtifactSchema.safeParse({ name: "Armor +1", slot: "armor", item: { property: { appliesTo: { kinds: ["armor", "shield"] } } } }).success).toBe(true);
    expect(createArtifactSchema.safeParse({ name: "X", slot: "ring", item: property }).success).toBe(false);
  });

  it("a property may carry only +N weapon bonuses and no armor", () => {
    expect(createArtifactSchema.safeParse({ name: "Weapon +1", slot: "weapon", item: property, weapon: { attackBonus: 1, damageBonus: 1 } }).success).toBe(true);
    expect(createArtifactSchema.safeParse({ name: "X", slot: "weapon", item: property, weapon: { damageDice: "1d8" } }).success).toBe(false);
    expect(createArtifactSchema.safeParse({ name: "X", slot: "armor", item: { property: { appliesTo: { kinds: ["armor"] } } }, armor: { category: "light", base: 11 } }).success).toBe(false);
  });

  it("PATCH: item null clears; property with weapon dice refused", () => {
    expect(patchArtifactSchema.safeParse({ item: null }).success).toBe(true);
    expect(patchArtifactSchema.safeParse({ item: property, weapon: { damageDice: "1d8" } }).success).toBe(false);
    expect(patchArtifactSchema.safeParse({ slot: "boots", item: property }).success).toBe(false);
  });

  it("damageBonus within −20…20", () => {
    expect(createArtifactSchema.safeParse({ name: "S", slot: "weapon", weapon: { damageBonus: 3 } }).success).toBe(true);
    expect(createArtifactSchema.safeParse({ name: "S", slot: "weapon", weapon: { damageBonus: 21 } }).success).toBe(false);
  });
});
