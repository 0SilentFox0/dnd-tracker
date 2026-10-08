import { describe, expect, it } from "vitest";

import { unitDamageSummary } from "@/lib/utils/units/damage-summary";

describe("unitDamageSummary", () => {
  it("як у бою: кубики + СИЛ для ближньої, + СПР для дальньої; найсильніша атака", () => {
    const s = unitDamageSummary({ strength: 18, dexterity: 12 }, [
      { damageDice: "1d6+1", type: "melee" },
      { damageDice: "1d4", type: "ranged" },
    ]);

    expect(s).toEqual({ average: 9, formula: "1d6+1 +4 СИЛ" });
    expect(unitDamageSummary({ strength: 10, dexterity: 16 }, [{ damageDice: "1d8", type: "ranged" }])).toEqual({ average: 8, formula: "1d8 +3 СПР" });
  });

  it("без модифікатора — лише кубики; від'ємний — з мінусом", () => {
    expect(unitDamageSummary({ strength: 10, dexterity: 10 }, [{ damageDice: "2d6", type: "melee" }])?.formula).toBe("2d6");
    expect(unitDamageSummary({ strength: 8, dexterity: 10 }, [{ damageDice: "1d6", type: "melee" }])).toEqual({ average: 3, formula: "1d6 −1 СИЛ" });
  });

  it("без атак — null", () => {
    expect(unitDamageSummary({ strength: 10, dexterity: 10 }, [])).toBeNull();
  });
});
