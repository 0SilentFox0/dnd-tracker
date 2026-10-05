import { describe, expect, it } from "vitest";

import { immunityAbilities } from "@/lib/utils/abilities/build/immunities";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";

describe("immunityAbilities", () => {
  it("мапить шкоду, контроль, страх; інше — нотатка", () => {
    const [a] = immunityAbilities([" Вогню ", "отруєння", "магії", "контролю", "страху", "сповільнення"], { type: "unit", id: "u1" });

    expect(a.key).toBe("unit:u1:immunities");
    expect(a.effects).toEqual([
      { kind: "flag", flag: "resistance", damageType: "fire", percent: 100 },
      { kind: "flag", flag: "resistance", damageType: "poison", percent: 100 },
      { kind: "flag", flag: "resistance", damageType: "spell", percent: 100 },
      { kind: "flag", flag: "conditionImmunity", conditions: "all" },
      { kind: "flag", flag: "conditionImmunity", conditions: ["fear"] },
      { kind: "note", text: "Імунітет: сповільнення" },
    ]);
    expect(AbilitiesSchema.safeParse([a]).success).toBe(true);
  });

  it("порожньо → без вміння; дублікати зливаються", () => {
    expect(immunityAbilities([], { type: "character", id: "c" })).toEqual([]);
    expect(immunityAbilities(["вогню", "вогня", "fire"], { type: "character", id: "c" })[0].effects).toHaveLength(1);
  });
});
