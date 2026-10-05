import { describe, expect, it } from "vitest";

import { AttackType } from "@/lib/constants/battle";
import { assertAttackRolls, assertReactionDamage, assertRollsWithinFormula, assertSpellRolls } from "@/lib/utils/battle/validation/dice-checks";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

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
    expect(() => assertAttackRolls(sword, { damageRolls: [8, 7], targetCount: 1 })).not.toThrow();
    expect(() => assertAttackRolls({ ...sword, damageDice: "2d6" }, { damageRolls: [1, 2, 3, 4, 5, 6], targetCount: 3 })).not.toThrow();
  });

  it("заклинання: d10 — до 10", () => {
    expect(() => assertSpellRolls({ diceCount: 2, diceType: "d10" }, [10, 1], 1)).not.toThrow();
    expect(() => assertSpellRolls({ diceCount: 2, diceType: "d10" }, [11], 1)).toThrow(expect.objectContaining({ code: "invalid_dice" }));
  });

  it("реакція: не більше подвоєного максимуму атаки захисника", () => {
    const defender = createMockParticipant({ battleData: { ...createMockParticipant().battleData, attacks: [sword] } });

    expect(() => assertReactionDamage(defender, 22)).not.toThrow();
    expect(() => assertReactionDamage(defender, 23)).toThrow(expect.objectContaining({ code: "invalid_dice" }));
    expect(() => assertReactionDamage(defender, undefined)).not.toThrow();
  });

  it("diceType без префікса d (\"10\") теж розуміється", () => {
    expect(() => assertSpellRolls({ diceCount: 1, diceType: "10" }, [10], 1)).not.toThrow();
  });
});
