import { describe, expect, it } from "vitest";

import { AttackType } from "@/lib/constants/battle";
import { assertAttackRolls, assertRollsWithinFormula, assertSpellRolls } from "@/lib/utils/battle/validation/dice-checks";

const sword = { name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8+3", damageType: "slashing" };

describe("dice checks", () => {
  it("кидок поза кубиком, нецілий, нуль, від'ємний — invalid_dice", () => {
    for (const rolls of [[9], [2.5], [0], [-1]]) {
      expect(() => assertRollsWithinFormula("1d8", rolls, 2)).toThrow(expect.objectContaining({ code: "invalid_dice" }));
    }
  });

  it("кидків більше, ніж дозволено — invalid_dice", () => {
    expect(() => assertRollsWithinFormula("1d8", [1, 2, 3], 2)).toThrow(expect.objectContaining({ code: "invalid_dice" }));
  });

  it("атака: крит (подвоєні кубики) і кілька цілей проходять", () => {
    expect(() => assertAttackRolls(sword.damageDice, { damageRolls: [8, 7], targetCount: 1 })).not.toThrow();
    expect(() => assertAttackRolls("2d6", { damageRolls: [1, 2, 3, 4, 5, 6], targetCount: 3 })).not.toThrow();
  });

  it("заклинання: кількість і грані мають збігатися з формулою", () => {
    expect(() => assertSpellRolls({ count: 2, sides: 10 }, [10, 1])).not.toThrow();
    expect(() => assertSpellRolls({ count: 2, sides: 10 }, [11, 1])).toThrow(expect.objectContaining({ code: "invalid_dice" }));
    expect(() => assertSpellRolls({ count: 2, sides: 10 }, [5])).toThrow(expect.objectContaining({ code: "invalid_dice" }));
    expect(() => assertSpellRolls({ count: 2, sides: 10 }, [5, 5, 5])).toThrow(expect.objectContaining({ code: "invalid_dice" }));
  });

  it("заклинання без кубиків: кидків немає", () => {
    expect(() => assertSpellRolls({ count: 0, sides: 6 }, [])).not.toThrow();
    expect(() => assertSpellRolls({ count: 0, sides: 6 }, [3])).toThrow(expect.objectContaining({ code: "invalid_dice" }));
  });
});
