import { describe, expect, it } from "vitest";

import { getUnitStats } from "@/lib/utils/battle/balance";

describe("getUnitStats: кубики без кількості", () => {
  it("\"d8\" = 1d8 (раніше 0 → фолбек 3.5)", () => {
    expect(getUnitStats({ id: "u", name: "u", maxHp: 10, level: 1, attacks: [{ damageDice: "d8", type: "melee" }] }).dpr).toBe(4.5);
  });

  it("вільний текст \"2d6 + STR\" — середнє першої групи (7)", () => {
    expect(getUnitStats({ id: "u", name: "u", maxHp: 10, level: 1, attacks: [{ damageDice: "2d6 + STR", type: "melee" }] }).dpr).toBe(7);
  });
});
