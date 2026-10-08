import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import type { CriticalEffectType } from "@/lib/constants/critical-effects";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { computeHitDamage } from "@/lib/utils/battle/attack/process/compute";
import { handleMiss } from "@/lib/utils/battle/attack/process/miss";
import { applyBalanceDamageMultiplier, balanceDamageMultiplier, scaleAdditionalDamage } from "@/lib/utils/battle/damage/balance-multiplier";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const club: BattleAttack = { id: "c", name: "Палиця", type: AttackType.MELEE, attackBonus: 0, damageDice: "2d6", damageType: "bludgeoning" };

const scaled = (p: BattleParticipant, damageMultiplier?: number): BattleParticipant => ({ ...p, battleData: { ...p.battleData, damageMultiplier } });

const attacker = makeParticipant({ id: "u", side: ParticipantSide.ENEMY });

const target = makeParticipant({ id: "t", hp: 99, maxHp: 99 });

const fireSpell: CastableSpell = {
  id: "s",
  name: "Вогонь",
  level: 1,
  groupId: null,
  definition: { dice: 1, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" }, effects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }], raceModifiers: [] },
};

const hit = (a: BattleParticipant, t: BattleParticipant = target) =>
  computeHitDamage({ attacker: a, target: t, attack: club, damageRolls: [3, 3], allParticipants: [a, t], attackRoll: { isCritical: false }, currentRound: 1 });

describe("damageMultiplier юніта", () => {
  it("відсутній або некоректний = ×1", () => {
    expect(balanceDamageMultiplier(attacker)).toBe(1);
    expect(balanceDamageMultiplier(scaled(attacker, 0))).toBe(1);
    expect(balanceDamageMultiplier(scaled(attacker, Number.NaN))).toBe(1);
  });

  it("округлює Math.round", () => {
    expect(applyBalanceDamageMultiplier(scaled(attacker, 1.5), 5).damage).toBe(8);
  });

  it("атака: шкода ×1.5 після кубиків і модифікаторів", () => {
    const base = hit(attacker).physicalDamage;

    const result = hit(scaled(attacker, 1.5));

    expect(result.physicalDamage).toBe(Math.round(base * 1.5));
    expect(result.totalFinalDamage).toBe(result.physicalDamage);
    expect(result.damageSteps.some((s) => s.label === "Рівний бій")).toBe(true);
  });

  it("атака: множник застосовується до опору, а не після", () => {
    const resistant = makeParticipant({
      id: "r",
      hp: 99,
      maxHp: 99,
      abilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "bludgeoning", percent: 50 }] })],
    });

    const base = hit(attacker, resistant);

    const result = hit(scaled(attacker, 1.5), resistant);

    expect(result.physicalDamage).toBe(Math.round(base.physicalDamage * 1.5));
    expect(result.totalFinalDamage).toBeLessThan(result.physicalDamage);
    expect(result.totalFinalDamage).toBeGreaterThan(base.totalFinalDamage);
  });

  it("заклинання: шкода ×1.5 до опору", () => {
    const run = (caster: BattleParticipant) => {
      const t = makeParticipant({ id: "t", hp: 99, maxHp: 99, side: ParticipantSide.ENEMY });

      const c = { ...caster, spellcasting: { ...caster.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } } };

      const r = castSpell({ caster: c, spell: fireSpell, targetIds: ["t"], allParticipants: [c, t], currentRound: 1, battleId: "b", diceRolls: [10] });

      return 99 - (r.allParticipantsUpdated.find((p) => p.basicInfo.id === "t")?.combatStats.currentHp ?? 99);
    };

    const base = run(attacker);

    expect(base).toBeGreaterThan(0);
    expect(run(scaled(attacker, 1.5))).toBe(Math.round(base * 1.5));
  });
});

describe("множник застосовується рівно раз на кожному шляху шкоди", () => {
  const resistant = makeParticipant({
    id: "r",
    hp: 99,
    maxHp: 99,
    abilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "bludgeoning", percent: 50 }] })],
  });

  const timesMultiplier = (r: ReturnType<typeof hit>) => r.damageCalculation.breakdown.filter((l) => l.includes("рівний бій")).length;

  const crit = (effectType: CriticalEffectType, a: BattleParticipant, t: BattleParticipant = target, extra: Partial<Parameters<typeof computeHitDamage>[0]> = {}) =>
    computeHitDamage({
      attacker: a,
      target: t,
      attack: club,
      damageRolls: [3, 3],
      allParticipants: [a, t],
      attackRoll: { isCritical: true, criticalEffect: { id: 1, name: "Крит", description: "", type: "success", flavor: [], effect: { type: effectType } } },
      currentRound: 1,
      ...extra,
    });

  it("крит double_damage: ×2 від кубиків, потім множник один раз, потім опір", () => {
    const base = crit("double_damage", attacker, resistant);

    const result = crit("double_damage", scaled(attacker, 1.5), resistant);

    expect(result.physicalDamage).toBe(Math.round(base.physicalDamage * 1.5));
    expect(timesMultiplier(result)).toBe(1);
    expect(result.totalFinalDamage).toBeLessThan(result.physicalDamage);
  });

  it("крит max_damage: максимум кубиків, множник один раз", () => {
    const base = crit("max_damage", attacker);

    const result = crit("max_damage", scaled(attacker, 1.5));

    expect(result.physicalDamage).toBe(Math.round(base.physicalDamage * 1.5));
    expect(timesMultiplier(result)).toBe(1);
  });

  it("частка шкоди між цілями береться від уже масштабованої шкоди", () => {
    const base = hit(attacker);

    const result = computeHitDamage({ attacker: scaled(attacker, 1.5), target, attack: club, damageRolls: [3, 3], allParticipants: [attacker, target], attackRoll: { isCritical: false }, currentRound: 1, damageMultiplier: 0.5 });

    expect(result.physicalDamage).toBe(Math.round(base.physicalDamage * 1.5));
    expect(result.totalFinalDamage).toBe(Math.floor(result.physicalDamage * 0.5));
    expect(timesMultiplier(result)).toBe(1);
  });

  it("контратака bonusPercent: множник до бонусу, один раз", () => {
    const base = computeHitDamage({ attacker, target, attack: club, damageRolls: [3, 3], allParticipants: [attacker, target], attackRoll: { isCritical: false }, currentRound: 1, bonusPercent: 50 });

    const result = computeHitDamage({ attacker: scaled(attacker, 1.5), target, attack: club, damageRolls: [3, 3], allParticipants: [attacker, target], attackRoll: { isCritical: false }, currentRound: 1, bonusPercent: 50 });

    const unscaled = hit(attacker).physicalDamage;

    expect(base.physicalDamage).toBe(Math.floor(unscaled * 1.5));
    expect(result.physicalDamage).toBe(Math.floor(Math.round(unscaled * 1.5) * 1.5));
    expect(timesMultiplier(result)).toBe(1);
  });

  describe("заклинання", () => {
    const aoe: CastableSpell = {
      ...fireSpell,
      definition: { ...fireSpell.definition, targeting: { kind: "area", side: "enemy", maxTargets: 2 }, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" }, effects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire", falloff: [100, 50] }] },
    };

    const run = (caster: BattleParticipant, saves: Array<{ participantId: string; roll: number }>) => {
      const t1 = makeParticipant({ id: "t1", hp: 99, maxHp: 99, side: ParticipantSide.ENEMY });

      const t2 = makeParticipant({ id: "t2", hp: 99, maxHp: 99, side: ParticipantSide.ENEMY });

      const c = { ...caster, spellcasting: { ...caster.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } } };

      const out = castSpell({ caster: c, spell: aoe, targetIds: ["t1", "t2"], allParticipants: [c, t1, t2], currentRound: 1, battleId: "b", diceRolls: [10], saveRolls: saves });

      return ["t1", "t2"].map((id) => 99 - (out.allParticipantsUpdated.find((p) => p.basicInfo.id === id)?.combatStats.currentHp ?? 99));
    };

    it("спад і успішне збереження-на-половину рахуються від масштабованої суми", () => {
      const saves = [{ participantId: "t1", roll: 1 }, { participantId: "t2", roll: 20 }];

      const base = run(attacker, saves);

      const result = run(scaled(attacker, 1.5), saves);

      expect(result[0]).toBe(Math.round(base[0] * 1.5));
      expect(result[1]).toBeGreaterThan(0);
      expect(result[1]).toBeLessThan(result[0]);
    });
  });

  describe("гарантована шкода при промаху", () => {
    const flow = (a: BattleParticipant, t: BattleParticipant) => ({ ps: [a, t], messages: [], summons: [], ctx: { round: 1, rng: Math.random } });

    const miss = (a: BattleParticipant, t: BattleParticipant) =>
      handleMiss({
        flow: flow(a, t) as never,
        attackerId: a.basicInfo.id,
        targetId: t.basicInfo.id,
        attack: { ...club, guaranteedDamage: 10 },
        d20Roll: 2,
        attackRoll: { isCritical: false } as never,
        targetAC: 15,
        currentRound: 1,
        battleId: "b",
      });

    it("множиться до опору", () => {
      expect(99 - (miss(attacker, target).targetUpdated?.combatStats.currentHp ?? 99)).toBe(10);
      expect(99 - (miss(scaled(attacker, 1.5), target).targetUpdated?.combatStats.currentHp ?? 99)).toBe(15);
      expect(99 - (miss(scaled(attacker, 1.5), resistant).targetUpdated?.combatStats.currentHp ?? 99)).toBeLessThan(15);
    });
  });

  it("додаткова шкода зі зміненого списку масштабується рівно раз", () => {
    const list = [{ type: "fire", value: 4 }, { type: "cold", value: 3 }];

    expect(scaleAdditionalDamage(scaled(attacker, 1.5), list)).toEqual([{ type: "fire", value: 6 }, { type: "cold", value: 5 }]);
    expect(scaleAdditionalDamage(attacker, list)).toBe(list);
  });
});
