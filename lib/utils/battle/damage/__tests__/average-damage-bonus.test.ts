import { describe, expect, it } from "vitest";

import { AttackType } from "@/lib/constants/battle";
import { textOf } from "@/lib/i18n/test/text";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import { attackSheet } from "@/lib/utils/characters/sheet/lines";
import type { BattleAttack } from "@/types/battle";

const bow = { id: "b", name: "Longbow", type: AttackType.RANGED, attackBonus: 0, damageDice: "1d8" } as BattleAttack;

describe("averageAttackDamage with weapon damageBonus", () => {
  it("adds damageBonus to the total and exposes a flat step; unchanged without it", () => {
    const p = createMockParticipant();

    const plain = averageAttackDamage(p, bow, [p]);

    const magic = averageAttackDamage(p, { ...bow, damageBonus: 1 }, [p]);

    expect(magic.total).toBe(plain.total + 1);
    expect(magic.steps).toHaveLength(plain.steps.length + 1);
    expect(magic.steps.at(-1)).toMatchObject({ kind: "flat", value: 1 });
    expect(plain.steps.some((s) => textOf(s.label) === "Бонус зброї")).toBe(false);
  });

  it("sheet shows a +N line only with damageBonus", () => {
    const p = createMockParticipant();

    const labels = (a: BattleAttack) => attackSheet(p, a).avgDamage.lines.map((l) => `${l.label}:${l.value}`);

    expect(labels({ ...bow, damageBonus: 1 })).toContain("battleLog.damage.steps.weaponBonus:+1");
    expect(labels(bow).some((l) => l.startsWith("battleLog.damage.steps.weaponBonus"))).toBe(false);
  });
});
