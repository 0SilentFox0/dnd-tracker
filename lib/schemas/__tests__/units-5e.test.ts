import { describe, expect, it } from "vitest";

import { createUnitSchema, importUnitSchema, updateUnitSchema } from "@/lib/schemas/units";

describe("unit 5e fields", () => {
  it("create: дефолти HOMM", () => {
    expect(createUnitSchema.parse({ name: "Гоблін" })).toMatchObject({ multiattack: 1, legendaryActions: 0, legendaryResistances: 0, saveProficiencies: [] });
    expect(createUnitSchema.parse({ name: "Гоблін" }).cr).toBeUndefined();
  });

  it("CR лише з таблиці; null дозволено", () => {
    expect(createUnitSchema.safeParse({ name: "X", cr: 0.25 }).success).toBe(true);
    expect(createUnitSchema.safeParse({ name: "X", cr: 0.3 }).success).toBe(false);
    expect(createUnitSchema.safeParse({ name: "X", cr: 31 }).success).toBe(false);
    expect(updateUnitSchema.parse({ cr: null }).cr).toBeNull();
  });

  it("межі лічильників і ключі рятівних кидків", () => {
    expect(createUnitSchema.safeParse({ name: "X", multiattack: 0 }).success).toBe(false);
    expect(createUnitSchema.safeParse({ name: "X", legendaryActions: 6 }).success).toBe(false);
    expect(createUnitSchema.safeParse({ name: "X", saveProficiencies: ["luck"] }).success).toBe(false);
    expect(updateUnitSchema.parse({})).toEqual({});
  });

  it("import приймає поля 5e", () => {
    expect(importUnitSchema.parse({ name: "Огр", cr: 2, multiattack: 2, saveProficiencies: ["strength"] })).toMatchObject({ cr: 2, multiattack: 2, saveProficiencies: ["strength"], legendaryActions: 0 });
  });
});
