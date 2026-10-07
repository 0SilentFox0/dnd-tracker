import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { computeHitDamage } from "@/lib/utils/battle/attack/process/compute";
import { applyBalanceDamageMultiplier, balanceDamageMultiplier } from "@/lib/utils/battle/damage/balance-multiplier";
import { computeSpellDamageAndApply } from "@/lib/utils/battle/spell/process-damage";
import type { BattleSpell } from "@/lib/utils/battle/types/spell-process";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const club: BattleAttack = { id: "c", name: "Палиця", type: AttackType.MELEE, attackBonus: 0, damageDice: "2d6", damageType: "bludgeoning" };

const scaled = (p: BattleParticipant, damageMultiplier?: number): BattleParticipant => ({ ...p, battleData: { ...p.battleData, damageMultiplier } });

const attacker = makeParticipant({ id: "u", side: ParticipantSide.ENEMY });

const target = makeParticipant({ id: "t", hp: 99, maxHp: 99 });

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
    const spell = { id: "s", name: "Вогонь", level: 1, type: "target", damageType: "damage", damageElement: "fire", description: "" } as BattleSpell;

    const run = (caster: BattleParticipant) => {
      const t = makeParticipant({ id: "t", hp: 99, maxHp: 99 });

      return computeSpellDamageAndApply({ caster, spell, damageRolls: [10], savingThrows: [], updatedTargets: [t], allParticipants: [caster, t] });
    };

    const base = run(attacker).spellCalculation.totalDamage ?? 0;

    const result = run(scaled(attacker, 1.5));

    expect(base).toBeGreaterThan(0);
    expect(result.spellCalculation.totalDamage).toBe(Math.round(base * 1.5));
    expect(result.updatedTargets[0].combatStats.currentHp).toBe(99 - Math.round(base * 1.5));
  });
});
