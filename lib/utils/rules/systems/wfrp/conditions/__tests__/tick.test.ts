import { describe, expect, it } from "vitest";

import { wfrpAbilitiesOf } from "../../combat/participant";
import { applyWfrpConditionTo } from "../apply";
import type { WfrpConditionKey } from "../catalog";
import { conditionLevel } from "../levels";
import { wfrpConditionsTurnStart } from "../tick";

import { CombatStatus } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyDamageConsequences } from "@/lib/utils/battle/damage/consequences";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import type { BattleParticipant } from "@/types/battle";

const src = textRef("battleWfrp.log.removed", { target: "x", condition: "y" });

const make = (hp: number, conds: Array<[WfrpConditionKey, number]> = [], status?: BattleParticipant["combatStats"]["status"]): BattleParticipant => {
  const base = makeParticipant({ id: "a", hp, maxHp: 20 });

  const withStats: BattleParticipant = { ...base, abilities: { ...base.abilities, ...wfrpAbilitiesOf(DEFAULT_CHARACTERISTICS, { head: 0, arm: 0, body: 1, leg: 0 }) } };

  const p = conds.reduce<BattleParticipant>((acc, [key, levels]) => applyWfrpConditionTo(acc, { key, levels, round: 1, sourceName: src }).participant, withStats);

  return status ? { ...p, combatStats: { ...p.combatStats, status } } : p;
};

const tick = (p: BattleParticipant, rng: () => number) => wfrpConditionsTurnStart([p], "a", { round: 2, rng, rules: WFRP_RULES, applyDamage: applyDamageConsequences });

const withBreakOnDamage = (p: BattleParticipant): BattleParticipant => ({
  ...p,
  battleData: { ...p.battleData, activeEffects: [...p.battleData.activeEffects, { id: "bod", abilityKey: "test:bod", name: "bod", type: "buff", rounds: 3, effects: [], breakOnDamage: true } as never] },
});

const self = (r: ReturnType<typeof tick>) => r.participants[0];

describe("wfrpConditionsTurnStart", () => {
  it("bleeding damage drops breakOnDamage effects; no damage keeps them", () => {
    const hurt = tick(withBreakOnDamage(make(10, [["bleeding", 1]])), () => 0.5);

    expect(self(hurt).battleData.activeEffects.some((e) => e.id === "bod")).toBe(false);

    const calm = tick(withBreakOnDamage(make(10)), () => 0.5);

    expect(self(calm).battleData.activeEffects.some((e) => e.id === "bod")).toBe(true);
  });

  it("bleeding deals its level in wounds", () => {
    const r = tick(make(10, [["bleeding", 2]]), () => 0.5);

    expect(self(r).combatStats.currentHp).toBe(8);
    expect(r.downed).toBe(false);
    expect(JSON.stringify(r.messages)).toContain("battleWfrp.log.tick.bleeding");
  });

  it("bleeding may knock the bearer out (10% per level)", () => {
    const hit = tick(make(10, [["bleeding", 2]]), () => 0.19);

    expect(conditionLevel(self(hit), "unconscious")).toBe(1);
    expect(self(hit).combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
    expect(hit.downed).toBe(true);

    const miss = tick(make(10, [["bleeding", 2]]), () => 0.21);

    expect(conditionLevel(self(miss), "unconscious")).toBe(0);
    expect(miss.downed).toBe(false);
  });

  it("ablaze deals 1d10 + level - 1 - TB - body AP, at least 1", () => {
    expect(self(tick(make(10, [["ablaze", 1]]), () => 0.75)).combatStats.currentHp).toBe(6);
    expect(self(tick(make(10, [["ablaze", 1]]), () => 0)).combatStats.currentHp).toBe(9);
  });

  it("bleeding to 0 wounds goes through the zero-hp rule", () => {
    const r = tick(make(2, [["bleeding", 3]]), () => 0.99);

    expect(self(r).combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
    expect(r.downed).toBe(true);
    expect(JSON.stringify(r.messages)).toContain("battleLog.wfrp.unconscious");
  });

  it("tick damage never takes wounds below 0 (unconscious, not dead)", () => {
    for (const cond of [["bleeding", 3], ["ablaze", 5]] as Array<[WfrpConditionKey, number]>) {
      const r = tick(make(1, [cond]), () => 0.99);

      expect(self(r).combatStats.currentHp).toBe(0);
      expect(self(r).combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
    }
  });

  it("an inactive bearer does not tick", () => {
    const p = make(10, [["bleeding", 2]], CombatStatus.UNCONSCIOUS);

    const r = tick(p, seq(0));

    expect(r.participants[0]).toBe(p);
    expect(r.downed).toBe(false);
  });

  it("no conditions leaves the list untouched", () => {
    const ps = [make(10)];

    const r = wfrpConditionsTurnStart(ps, "a", { round: 2, rng: seq(0.5), rules: WFRP_RULES, applyDamage: applyDamageConsequences });

    expect(r.participants).toBe(ps);
    expect(r.messages).toEqual([]);
    expect(r.downed).toBe(false);
  });
});
