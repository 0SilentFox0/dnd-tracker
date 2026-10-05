import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { checkVictoryConditions } from "@/lib/utils/battle/battle-victory";
import { resolveTargetId, syncOriginalFromSlot, syncSlotFromOriginal } from "@/lib/utils/battle/turn/extra-turn";
import { createMockParticipant } from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";

const base = createMockParticipant();

const hero = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "hero" } });

const slot = {
  ...hero,
  basicInfo: { ...hero.basicInfo, id: "hero-extra-1", isExtraTurnSlot: true, extraTurnOf: "hero" },
};

const goblin = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "gob", side: ParticipantSide.ENEMY } });

describe("extra turn slot", () => {
  it("на початку ходу слот бере поточний стан оригіналу (шкода, отримана раніше)", () => {
    const hurt = { ...hero, combatStats: { ...hero.combatStats, currentHp: 4 } };

    const order = syncSlotFromOriginal([hurt, goblin, slot], 2);

    expect(order[2].combatStats.currentHp).toBe(4);
    expect(order[2].basicInfo.id).toBe("hero-extra-1");
  });

  it("після ходу слота стан повертається оригіналу (шкода від реакції, витрачені слоти)", () => {
    const usedSlot = {
      ...slot,
      combatStats: { ...slot.combatStats, currentHp: 2 },
      spellcasting: { ...slot.spellcasting, spellSlots: { "1": { max: 2, current: 0 } } },
    };

    const order = syncOriginalFromSlot([hero, goblin, usedSlot], 2);

    expect(order[0].combatStats.currentHp).toBe(2);
    expect(order[0].spellcasting.spellSlots["1"].current).toBe(0);
    expect(order[0].basicInfo.id).toBe("hero");
  });

  it("ціль-слот перенаправляється на оригінал", () => {
    expect(resolveTargetId([hero, slot], "hero-extra-1")).toBe("hero");
    expect(resolveTargetId([hero, slot], "gob")).toBe("gob");
  });

  it("перевірка перемоги не рахує слот живим союзником", () => {
    const downed = { ...hero, combatStats: { ...hero.combatStats, currentHp: 0, status: "unconscious" as const } };

    expect(checkVictoryConditions([downed, goblin, slot]).result).toBe("defeat");
  });
});
