import { describe, expect, it } from "vitest";

import { AttackType } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { rollModeReasons } from "@/lib/utils/battle/attack/bonus";
import { canUseInspiration, INSPIRATION_LABEL, spendInspiration } from "@/lib/utils/battle/attack/inspiration";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleAttack } from "@/types/battle";

const sword: BattleAttack = { id: "s", name: "Меч", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d8", damageType: "slashing" };

const on = { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, inspiration: true } };

describe("inspiration in attacks", () => {
  it("adds an advantage reason only when asked", () => {
    const p = createMockParticipant();

    expect(rollModeReasons(p, sword, [p], { inspiration: true }).advantage).toEqual([INSPIRATION_LABEL]);
    expect(rollModeReasons(p, sword, [p]).advantage).toEqual([]);
  });

  it("canUseInspiration needs the rule and the flag", () => {
    const p = createMockParticipant();

    const inspired = { ...p, battleData: { ...p.battleData, inspiration: true } };

    expect(canUseInspiration(inspired, on)).toBe(true);
    expect(canUseInspiration(inspired, DEFAULT_RULES)).toBe(false);
    expect(canUseInspiration(p, on)).toBe(false);
  });

  it("spendInspiration clears only the attacker", () => {
    const a = { ...createMockParticipant(), battleData: { ...createMockParticipant().battleData, inspiration: true } };

    const [after] = spendInspiration([a], a.basicInfo.id);

    expect(after.battleData.inspiration).toBe(false);
  });
});
