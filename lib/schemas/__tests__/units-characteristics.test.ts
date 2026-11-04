import { describe, expect, it } from "vitest";

import { createUnitSchema, importUnitsSchema } from "@/lib/schemas/units";
import { unitCreateData } from "@/lib/utils/units/unit-create-data";

describe("unit characteristics", () => {
  it("createUnitSchema merges defaults", () => {
    const unit = createUnitSchema.parse({ name: "Orc", characteristics: { base: { ws: 50 } } });

    expect(unit.characteristics?.base).toMatchObject({ ws: 50, bs: 30 });
    expect(unit.characteristics?.move).toBe(4);
  });

  it("importUnitsSchema passes characteristics", () => {
    const { units } = importUnitsSchema.parse({ units: [{ name: "Orc", characteristics: { base: { ws: 50 } } }] });

    expect(units[0].characteristics?.base.ws).toBe(50);
  });

  it("unitCreateData includes characteristics only when given", () => {
    expect(unitCreateData("c", createUnitSchema.parse({ name: "Orc" }))).not.toHaveProperty("characteristics");
    expect(unitCreateData("c", createUnitSchema.parse({ name: "Orc", characteristics: {} }))).toHaveProperty("characteristics");
  });
});
