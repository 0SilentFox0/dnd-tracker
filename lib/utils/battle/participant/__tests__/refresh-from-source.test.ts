import { describe, expect, it } from "vitest";

import { makeEffect, makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { refreshFromSource } from "@/lib/utils/battle/participant/refresh-from-source";
import type { BattleParticipant } from "@/types/battle";

const oldAb = resolved({ trigger: { event: "passive" }, effects: [] }, { id: "old" });

const newAb = resolved({ trigger: { event: "passive" }, effects: [] }, { id: "new" });

function withSlots(p: BattleParticipant, slots: BattleParticipant["spellcasting"]["spellSlots"]): BattleParticipant {
  return { ...p, spellcasting: { ...p.spellcasting, spellSlots: slots } };
}

describe("refreshFromSource", () => {
  it("replaces abilities, attacks and spells, keeps live battle state", () => {
    const base = makeParticipant({ id: "p", hp: 7, abilities: [oldAb] });

    const live: BattleParticipant = {
      ...base,
      battleData: { ...base.battleData, activeEffects: [makeEffect("e")], abilityUsage: { k: { perBattle: 1 } } as never, hpMultiplier: 1.5, damageMultiplier: 1.2 },
      actionFlags: { ...base.actionFlags, hasUsedAction: true },
    };

    const fresh: BattleParticipant = {
      ...makeParticipant({ id: "p", hp: 99, abilities: [newAb] }),
      spellcasting: { ...base.spellcasting, knownSpells: ["s1"], spellSaveDC: 15, spellAttackBonus: 6, spellSlots: {} },
    };

    fresh.battleData = { ...fresh.battleData, attacks: [{ name: "Новий" } as never], hpMultiplier: 1, damageMultiplier: 1 };

    const out = refreshFromSource(live, fresh);

    expect(out.battleData.resolvedAbilities).toEqual([newAb]);
    expect(out.battleData.attacks).toEqual(fresh.battleData.attacks);
    expect(out.spellcasting).toMatchObject({ knownSpells: ["s1"], spellSaveDC: 15, spellAttackBonus: 6 });
    expect(out.combatStats.currentHp).toBe(7);
    expect(out.battleData.activeEffects).toHaveLength(1);
    expect(out.battleData.abilityUsage).toEqual(live.battleData.abilityUsage);
    expect(out.actionFlags.hasUsedAction).toBe(true);
    expect(out.battleData.hpMultiplier).toBe(1.5);
    expect(out.battleData.damageMultiplier).toBe(1.2);
  });

  it("takes grid size and speed from the library, keeps live morale", () => {
    const base = makeParticipant({ id: "p", hp: 7 });

    const live = { ...base, combatStats: { ...base.combatStats, speed: 30, morale: 3 } };

    const fresh = makeParticipant({ id: "p", hp: 99 });

    fresh.combatStats = { ...fresh.combatStats, gridSize: 2, speed: 40, morale: 1 };

    const out = refreshFromSource(live, fresh);

    expect(out.combatStats).toMatchObject({ gridSize: 2, speed: 40, morale: 3, currentHp: 7 });
  });

  describe("spell slots", () => {
    const run = (live: Record<string, { max: number; current: number }>, fresh: Record<string, { max: number; current: number }>) =>
      refreshFromSource(withSlots(makeParticipant({ id: "p" }), live), withSlots(makeParticipant({ id: "p" }), fresh)).spellcasting.spellSlots;

    it("a new key appears full", () => {
      expect(run({ "1": { max: 2, current: 2 } }, { "1": { max: 2, current: 2 }, "3": { max: 2, current: 2 } })["3"]).toEqual({ max: 2, current: 2 });
    });

    it("spent slots stay spent when max grows", () => {
      expect(run({ "1": { max: 2, current: 0 } }, { "1": { max: 4, current: 4 } })["1"]).toEqual({ max: 4, current: 2 });
    });

    it("lowered max clamps current", () => {
      expect(run({ "1": { max: 4, current: 4 } }, { "1": { max: 2, current: 2 } })["1"]).toEqual({ max: 2, current: 2 });
    });

    it("a slot removed in the library drops to max 0", () => {
      expect(run({ "2": { max: 1, current: 1 } }, {})["2"]).toEqual({ max: 0, current: 0 });
    });
  });
});

describe("refreshFromSource pools", () => {
  it("drops live pools when the fresh build has none", () => {
    const base = makeParticipant({ id: "p", hp: 7 });

    const live = { ...base, battleData: { ...base.battleData, pools: { "pool:c:x": { label: "X", max: 2, rest: "long" as const } } } };

    expect(refreshFromSource(live, makeParticipant({ id: "p", hp: 7 })).battleData.pools).toBeUndefined();
  });
});
