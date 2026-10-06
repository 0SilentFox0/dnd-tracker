import { describe, expect, it } from "vitest";

import { damageDiceColumns } from "@/app/api/campaigns/[id]/spells/import/damage-dice-columns";

describe("damageDiceColumns", () => {
  it("перша група кубиків → колонки; \"d6\" = 1d6; текст після кубиків не заважає", () => {
    expect(damageDiceColumns("d6")).toEqual({ diceCount: 1, diceType: "d6" });
    expect(damageDiceColumns("2d8+3")).toEqual({ diceCount: 2, diceType: "d8" });
    expect(damageDiceColumns("3d6 fire")).toEqual({ diceCount: 3, diceType: "d6" });
    expect(damageDiceColumns("")).toEqual({ diceCount: null, diceType: null });
    expect(damageDiceColumns(undefined)).toEqual({ diceCount: null, diceType: null });
  });
});
