import { describe, expect, it } from "vitest";

import { AbilitiesSchema } from "@/lib/utils/abilities/schema";
import { specialAbilitiesToAbilities } from "@/lib/utils/units/special-abilities";

describe("specialAbilitiesToAbilities", () => {
  it("пасивні нотатки і бонусна дія", () => {
    const abilities = specialAbilitiesToAbilities([
      { name: "Тотем", description: "Ставить тотем", type: "active", actionType: "bonus_action", spellId: "sp" },
      { name: "Шкіра", type: "passive" },
    ]);

    expect(abilities.map((a) => a.trigger.event)).toEqual(["bonusAction", "passive"]);
    expect(abilities[1].effects).toEqual([{ kind: "note", text: "Шкіра" }]);
    expect(AbilitiesSchema.safeParse(abilities).success).toBe(true);
  });

  it("сміття і записи без назви пропускаються", () => {
    expect(specialAbilitiesToAbilities(null)).toEqual([]);
    expect(specialAbilitiesToAbilities([{ description: "без назви" }, 42])).toEqual([]);
  });
});
