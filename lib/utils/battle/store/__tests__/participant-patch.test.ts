import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { buildParticipantPatch, FULL_PARTICIPANT } from "@/lib/utils/battle/store";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const before = createMockParticipant({
  spellcasting: { ...createMockParticipant().spellcasting, spellSlots: { "1": { max: 2, current: 2 } } },
});

const effect = { id: "e1", name: "Кровотеча", duration: 2 } as unknown as ActiveEffect;

describe("buildParticipantPatch", () => {
  it("без змін у колонках і стані — null", () => {
    expect(buildParticipantPatch(before, structuredClone(before))).toBeNull();
  });

  it("лише змінені поля з колонок і стану, згруповані за розділами", () => {
    const after: BattleParticipant = {
      ...before,
      combatStats: { ...before.combatStats, currentHp: 3 },
      actionFlags: { ...before.actionFlags, hasUsedAction: true },
      battleData: { ...before.battleData, activeEffects: [effect] },
      spellcasting: { ...before.spellcasting, spellSlots: { "1": { max: 2, current: 1 } } },
    };

    expect(buildParticipantPatch(before, after)).toEqual({
      id: before.basicInfo.id,
      combatStats: { currentHp: 3 },
      actionFlags: { hasUsedAction: true },
      battleData: { activeEffects: [effect] },
      spellcasting: { spellSlots: { "1": { max: 2, current: 1 } } },
    });
  });

  it("поле стану зникло (undefined) — потрібен повний учасник", () => {
    const withExtra = { ...before, battleData: { ...before.battleData, pendingExtraActions: 1 } };

    const { pendingExtraActions: _gone, ...battleData } = withExtra.battleData;

    expect(buildParticipantPatch(withExtra, { ...withExtra, battleData })).toBe(FULL_PARTICIPANT);
  });

  it("поля знімка (напр. AC) не потрапляють у патч", () => {
    const after = { ...before, combatStats: { ...before.combatStats, armorClass: before.combatStats.armorClass + 2 } };

    expect(buildParticipantPatch(before, after)).toBeNull();
  });
});
