import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { buildSpellSuccessAction } from "@/lib/utils/battle/spell/process-actions";
import type { BattleSpell } from "@/lib/utils/battle/types/spell-process";

const caster = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "c", name: "Мирон" } });

const target = (hp: number) => createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "t", name: "Голем" }, combatStats: { ...createMockParticipant().combatStats, currentHp: hp } });

const spell = { id: "s", name: "Вогняна стріла", level: 1, damageType: "damage" } as unknown as BattleSpell;

const build = (afterHp: number) =>
  buildSpellSuccessAction(caster, spell, ["t"], [caster, target(50)], [target(afterHp)], [target(50)], { totalDamage: 14, breakdown: [], resistanceBreakdown: [] }, {}, [], "b", 1);

describe("лог шкідливого закляття", () => {
  it("імунітет: показує 0 і розрахункову шкоду", () => {
    expect(build(50).resultText).toBe("Мирон використав Вогняна стріла завдавши 0 урону (14 поглинуто опором/імунітетом)");
  });

  it("без опору — як і раніше", () => {
    expect(build(36).resultText).toBe("Мирон використав Вогняна стріла завдавши 14 урону");
  });
});
