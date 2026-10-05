import { describe, expect, it } from "vitest";

import { joinParticipant, splitParticipant } from "@/lib/utils/battle/store/split-participant";
import { hashJson, stableStringify } from "@/lib/utils/battle/store/stable-json";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { BattleParticipant } from "@/types/battle";

function richParticipant(): BattleParticipant {
  const base = createMockParticipant();

  return {
    ...base,
    basicInfo: { ...base.basicInfo, avatar: "https://x/a.png", instanceNumber: 2 },
    combatStats: { ...base.combatStats, currentHp: 7, tempHp: 3, morale: -1, status: "unconscious" },
    spellcasting: {
      spellcastingAbility: "wisdom",
      spellSaveDC: 13,
      spellSlots: { "1": { max: 3, current: 1 }, "2": { max: 2, current: 2 } },
      knownSpells: ["s1", "s2"],
    },
    battleData: {
      ...base.battleData,
      attacks: [{ name: "Меч", type: "melee", attackBonus: 5, damageDice: "1d8+3", damageType: "slashing" }],
      activeEffects: [{ id: "e1", name: "Отрута", duration: 2 } as never],
      skillUsageCounts: { sk1: 1 },
      pendingExtraActions: 1,
      extras: { critThreshold: 19 },
    } as BattleParticipant["battleData"],
    actionFlags: { hasUsedAction: true, hasUsedBonusAction: false, hasUsedReaction: true, hasExtraTurn: false },
  };
}

describe("stableStringify", () => {
  it("не залежить від порядку ключів", () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(stableStringify({ a: { c: 3, d: 2 }, b: 1 }));
    expect(hashJson({ b: 1, a: 2 })).toBe(hashJson({ a: 2, b: 1 }));
  });

  it("ігнорує undefined як JSON", () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe(stableStringify({ a: 1 }));
  });
});

describe("splitParticipant / joinParticipant", () => {
  it("round-trip повертає того самого учасника", () => {
    const p = richParticipant();

    const stored = splitParticipant(p, { orderIndex: 3, isPending: false });

    expect(joinParticipant(stored, p.basicInfo.battleId)).toEqual(p);
  });

  it("гарячі поля — у колонках", () => {
    const stored = splitParticipant(richParticipant(), { orderIndex: 3, isPending: true });

    expect(stored.columns).toMatchObject({
      id: "p1",
      orderIndex: 3,
      isPending: true,
      extraTurnOf: null,
      currentHp: 7,
      tempHp: 3,
      morale: -1,
      status: "unconscious",
      initiative: 10,
      hasUsedAction: true,
      hasUsedReaction: true,
    });
  });

  it("поточні слоти і ефекти — у state, максимум слотів — у snapshot", () => {
    const stored = splitParticipant(richParticipant(), { orderIndex: 0, isPending: false });

    expect(stored.state.spellSlotsCurrent).toEqual({ "1": 1, "2": 2 });
    expect(stored.state.activeEffects).toHaveLength(1);
    expect(stableStringify(stored.snapshot)).not.toContain('"current"');
    expect(stableStringify(stored.snapshot)).not.toContain('"activeEffects"');
  });

  it("зміна лише HP не змінює snapshotHash", () => {
    const p = richParticipant();

    const a = splitParticipant(p, { orderIndex: 0, isPending: false });

    const b = splitParticipant(
      { ...p, combatStats: { ...p.combatStats, currentHp: 1 } },
      { orderIndex: 0, isPending: false },
    );

    expect(b.snapshotHash).toBe(a.snapshotHash);
  });

  it("бафф AC змінює snapshotHash", () => {
    const p = richParticipant();

    const a = splitParticipant(p, { orderIndex: 0, isPending: false });

    const b = splitParticipant(
      { ...p, combatStats: { ...p.combatStats, armorClass: p.combatStats.armorClass + 2 } },
      { orderIndex: 0, isPending: false },
    );

    expect(b.snapshotHash).not.toBe(a.snapshotHash);
  });

  it("pendingScopedArtifactBonuses не зберігається", () => {
    const p = richParticipant();

    p.battleData.pendingScopedArtifactBonuses = [{} as never];

    const stored = splitParticipant(p, { orderIndex: 0, isPending: false });

    expect(stableStringify(stored.snapshot)).not.toContain("pendingScopedArtifactBonuses");
  });

  it("дробові HP/мораль/ініціатива округлюються — колонки INTEGER не мають падати", () => {
    const p = richParticipant();

    const stored = splitParticipant(
      {
        ...p,
        abilities: { ...p.abilities, initiative: 12.5 },
        combatStats: { ...p.combatStats, currentHp: 7.4, tempHp: 0.6, maxHp: 20.2, morale: -0.7 },
      },
      { orderIndex: 0, isPending: false },
    );

    for (const key of ["currentHp", "tempHp", "maxHp", "morale", "initiative"] as const) {
      expect(Number.isInteger(stored.columns[key])).toBe(true);
    }
  });
});
