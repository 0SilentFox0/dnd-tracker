import { describe, expect, it } from "vitest";

import { createUnitSchema, importUnitsSchema } from "@/lib/schemas/units";
import { unitCreateData } from "@/lib/utils/units/unit-create-data";
import { UnitCharacteristicsSchema } from "@/systems/wfrp/rules/characteristics/schema";

describe("unit characteristics", () => {
  it("the wfrp unit schema merges defaults", () => {
    const parsed = UnitCharacteristicsSchema.parse({ base: { ws: 50 } });

    expect(parsed.base).toMatchObject({ ws: 50, bs: 30 });
    expect(parsed.move).toBe(4);
  });

  it("createUnitSchema keeps the system data opaque", () => {
    expect(createUnitSchema.parse({ name: "Orc", characteristics: { base: { ws: 50 } } }).characteristics).toEqual({ base: { ws: 50 } });
  });

  it("importUnitsSchema passes characteristics", () => {
    const { units } = importUnitsSchema.parse({ units: [{ name: "Orc", characteristics: { base: { ws: 50 } } }] });

    expect(units[0].characteristics?.base).toEqual({ ws: 50 });
  });

  it("unitCreateData includes characteristics only when given", () => {
    expect(unitCreateData("c", createUnitSchema.parse({ name: "Orc" }))).not.toHaveProperty("characteristics");
    expect(unitCreateData("c", createUnitSchema.parse({ name: "Orc", characteristics: {} }))).toHaveProperty("characteristics");
  });
});
