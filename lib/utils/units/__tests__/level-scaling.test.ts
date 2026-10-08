import { describe, expect, it } from "vitest";

import { AttackType } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { scaleSummon } from "@/lib/utils/units/level-scaling";

const base = makeParticipant({ id: "s", hp: 15, maxHp: 15 });

const skeleton = {
  ...base,
  battleData: { ...base.battleData, attacks: [{ id: "a", name: "Удар", type: AttackType.MELEE, attackBonus: 3, damageDice: "2d6", damageType: "slashing" }] },
};

const scaling = { hpPerLevel: 6, damagePerLevel: 1, attackPerTwoLevels: 1 };

describe("scaleSummon", () => {
  it("scales HP, damage and attack bonus by caster level", () => {
    const out = scaleSummon(skeleton, scaling, 10);

    expect(out.combatStats).toMatchObject({ maxHp: 75, currentHp: 75 });
    expect(out.battleData.attacks[0]).toMatchObject({ damageDice: "2d6+10", attackBonus: 8 });
  });

  it("keeps the summon unchanged without caster level", () => {
    expect(scaleSummon(skeleton, scaling, undefined)).toBe(skeleton);
  });

  it("keeps the summon unchanged without valid scaling", () => {
    expect(scaleSummon(skeleton, null, 10)).toBe(skeleton);
    expect(scaleSummon(skeleton, { hpPerLevel: "x" }, 10)).toBe(skeleton);
  });

  it("adds to an existing flat damage bonus", () => {
    const flat = { ...skeleton, battleData: { ...skeleton.battleData, attacks: [{ ...skeleton.battleData.attacks[0], damageDice: "1d8+2" }] } };

    expect(scaleSummon(flat, scaling, 3).battleData.attacks[0].damageDice).toBe("1d8+5");
  });
});
