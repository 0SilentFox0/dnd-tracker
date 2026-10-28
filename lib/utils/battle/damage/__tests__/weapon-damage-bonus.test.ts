import { describe, expect, it } from "vitest";

import { AttackType } from "@/lib/constants/battle";
import { applyWeaponFlat, weaponFlatOf } from "@/lib/utils/battle/damage/weapon-flat";
import type { BattleAttack } from "@/types/battle";

const attack = (over: Partial<BattleAttack>): BattleAttack => ({ id: "ls+w2", name: "Longsword (+2)", type: AttackType.MELEE, attackBonus: 2, damageDice: "1d8", damageType: "slashing", ...over });

describe("weapon damageBonus", () => {
  it("adds to the weapon flat, alone and with a dice flat", () => {
    expect(weaponFlatOf(attack({ damageBonus: 2 }))).toBe(2);
    expect(weaponFlatOf(attack({ damageDice: "1d8+1", damageBonus: 2 }))).toBe(3);
    expect(weaponFlatOf(attack({}))).toBe(0);
    expect(applyWeaponFlat(10, attack({ damageBonus: 2 }))).toMatchObject({ damage: 12, step: { kind: "flat", value: 2, after: 12 } });
  });
});
