import { describe, expect, it } from "vitest";

import { unitDamageSummary } from "@/lib/utils/units/damage-summary";

describe("unitDamageSummary", () => {
  it("як у бою: кубики + характеристика: сила для ближньої, спритність для дальньої; найсильніша атака", () => {
    const s = unitDamageSummary({ strength: 18, dexterity: 12 }, [
      { damageDice: "1d6+1", type: "melee" },
      { damageDice: "1d4", type: "ranged" },
    ]);

    expect(s).toEqual({ average: 9, dice: "1d6+1", mod: 4, ability: "strength" });
    expect(unitDamageSummary({ strength: 10, dexterity: 16 }, [{ damageDice: "1d8", type: "ranged" }])).toEqual({ average: 8, dice: "1d8", mod: 3, ability: "dexterity" });
  });

  it("без модифікатора — лише кубики; від'ємний — з мінусом", () => {
    expect(unitDamageSummary({ strength: 10, dexterity: 10 }, [{ damageDice: "2d6", type: "melee" }])).toMatchObject({ dice: "2d6", mod: 0 });
    expect(unitDamageSummary({ strength: 8, dexterity: 10 }, [{ damageDice: "1d6", type: "melee" }])).toEqual({ average: 3, dice: "1d6", mod: -1, ability: "strength" });
  });

  it("без атак — null", () => {
    expect(unitDamageSummary({ strength: 10, dexterity: 10 }, [])).toBeNull();
  });
});
