import { describe, expect, it } from "vitest";

import { mitigateWfrpDamage } from "../mitigate";
import { wfrpAbilitiesOf } from "../participant";
import { resolveWfrpAttack } from "../resolve-attack";

import { AttackType } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import type { TraitSize } from "@/lib/utils/abilities/schema/kinds";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { withStats } from "@/systems/wfrp/rules/__tests__/slot-fixtures";
import { attackOf } from "@/systems/wfrp/rules/__tests__/slot-fixtures";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import type { BattleAttack } from "@/types/battle";

const unit = (id: string, extra: { size?: TraitSize; ward?: number; tb?: number } = {}) => {
  const p = makeParticipant({ id, hp: 10, maxHp: 10 });

  return withStats({ ...p, abilities: { ...p.abilities, ...wfrpAbilitiesOf(DEFAULT_CHARACTERISTICS) } }, { sb: 0, tb: extra.tb ?? 0, ...(extra.size && { size: extra.size }), ...(extra.ward !== undefined && { ward: extra.ward }) });
};

const d10 = (n: number) => () => (n - 1) / 10 + 0.01;

const ctx = (target: ReturnType<typeof unit>, over: object = {}, attacker = unit("a")) => ({ attacker, target, weapon: 4, amount: 5, margin: 1, location: "body" as const, crit: false, rng: () => 0.5, rules: WFRP_RULES, attack: { id: "w", name: "w", type: AttackType.MELEE, attackBonus: 0, damageDice: "", damageType: "physical" } as BattleAttack, ...over });

describe("mitigateWfrpDamage traits", () => {
  it("ward 7 negates the hit on d10 7, with one ward step and no crit", () => {
    let calls = 0;

    const rng = () => (calls++, d10(7)());

    const r = mitigateWfrpDamage(ctx(unit("t", { ward: 7 }), { crit: true, rng }));

    expect(r.amount).toBe(0);
    expect(r.steps.map((s) => s.key)).toEqual(["ward"]);
    expect(r.afterHit).toBeUndefined();
    expect(calls).toBe(1);
  });

  it("ward 7 on d10 6 leaves the damage", () => {
    const r = mitigateWfrpDamage(ctx(unit("t", { ward: 7 }), { rng: d10(6) }));

    expect(r.amount).toBe(5);
  });

  it("ward 10 saves only on a 10, ward 1 always", () => {
    expect(mitigateWfrpDamage(ctx(unit("t", { ward: 10 }), { rng: d10(9) })).amount).toBe(5);
    expect(mitigateWfrpDamage(ctx(unit("t", { ward: 10 }), { rng: d10(10) })).amount).toBe(0);
    expect(mitigateWfrpDamage(ctx(unit("t", { ward: 1 }), { rng: d10(1) })).amount).toBe(0);
  });

  it("no ward consumes no rng", () => {
    const rng = () => { throw new Error("rng used"); };

    expect(mitigateWfrpDamage(ctx(unit("t"), { rng })).amount).toBe(5);
  });

  it("size step sits after netSl and before tb", () => {
    const r = mitigateWfrpDamage(ctx(unit("t", { tb: 1 }), {}, unit("a", { size: "large" })));

    expect(r.steps.map((s) => s.key)).toEqual(["weapon", "netSl", "size", "tb"]);
    expect(r.steps.find((s) => s.key === "size")?.value).toBe(5);
    expect(r.amount).toBe(4 + 1 + 5 - 1);
  });
});

describe("resolveWfrpAttack size", () => {
  const sword = { id: "sw", name: "S", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d6", damageType: "slashing" } as BattleAttack;

  const fighter = (id: string, size?: TraitSize) => {
    const p = makeParticipant({ id, hp: 20, maxHp: 20 });

    const characteristics = { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40, bs: 40, ag: 40 } };

    return withStats({ ...p, abilities: { ...p.abilities, ...wfrpAbilitiesOf(characteristics) } }, { ...(size && { size }) });
  };

  const target = (attack: BattleAttack, a: ReturnType<typeof fighter>, t: ReturnType<typeof fighter>) =>
    attackOf(resolveWfrpAttack({ attacker: a, target: t, attack, participants: [a, t], rules: WFRP_RULES, rng: () => 0.5, manualRoll: 30, sceneState: undefined }).attackRoll)?.target;

  it("average vs large gives +10 to hit, melee and ranged", () => {
    expect(target(sword, fighter("a"), fighter("t", "large"))).toBe(50);
    expect(target({ ...sword, type: AttackType.RANGED }, fighter("a"), fighter("t", "large"))).toBe(50);
    expect(target(sword, fighter("a", "large"), fighter("t"))).toBe(40);
  });
});
