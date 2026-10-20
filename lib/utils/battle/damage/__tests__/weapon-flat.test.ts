import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { CRITICAL_SUCCESS_EFFECTS, type CriticalEffect } from "@/lib/constants/critical-effects";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { computeHitDamage } from "@/lib/utils/battle/attack/process/compute";
import { resolveRetaliation } from "@/lib/utils/battle/attack/retaliation";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import { computeDamageBreakdown } from "@/lib/utils/battle/damage/breakdown";
import { WEAPON_FLAT_LABEL } from "@/lib/utils/battle/damage/weapon-flat";
import { getAttackAbilityModifier } from "@/lib/utils/common/calculations";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const weapon = (damageDice: string): BattleAttack => ({ id: "w", name: "Меч", type: AttackType.MELEE, attackBonus: 0, damageDice, damageType: "slashing" });

const asUnit = (p: BattleParticipant): BattleParticipant => ({ ...p, basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.UNIT } });

const attacker = asUnit(makeParticipant({ id: "a" }));

const target = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, hp: 99, maxHp: 99 });

const hit = (attack: BattleAttack, damageRolls: number[], attackRoll: { isCritical: boolean; criticalEffect?: CriticalEffect } = { isCritical: false }) =>
  computeHitDamage({ attacker, target, attack, damageRolls, allParticipants: [attacker, target], attackRoll, currentRound: 1 });

const stat = getAttackAbilityModifier(attacker.abilities, AttackType.MELEE);

describe("бонус зброї «+N» у damageDice", () => {
  it("удар: сума кубиків + N + характеристика, окремий крок", () => {
    const r = hit(weapon("3d8+15"), [4, 5, 6]);

    expect(r.physicalDamage).toBe(15 + 15 + stat);
    expect(r.damageSteps).toContainEqual(expect.objectContaining({ label: WEAPON_FLAT_LABEL, kind: "flat", value: 15 }));
  });

  it("без «+N» кроку немає", () => {
    expect(hit(weapon("3d8"), [4, 5, 6]).damageSteps.some((s) => s.label === WEAPON_FLAT_LABEL)).toBe(false);
  });

  it("крит double_damage не подвоює бонус", () => {
    const double = CRITICAL_SUCCESS_EFFECTS.find((e) => e.effect.type === "double_damage") as CriticalEffect;

    const plain = hit(weapon("2d6+5"), [3, 3]).physicalDamage;

    expect(hit(weapon("2d6+5"), [3, 3], { isCritical: true, criticalEffect: double }).physicalDamage).toBe((plain - 5) * 2 + 5);
  });

  it("крит max_damage рахує бонус один раз", () => {
    const max = CRITICAL_SUCCESS_EFFECTS.find((e) => e.effect.type === "max_damage") as CriticalEffect;

    expect(hit(weapon("2d6+5"), [1, 1], { isCritical: true, criticalEffect: max }).physicalDamage).toBe(12 + 5 + stat);
  });

  it("клієнтський розклад збігається з сервером; крит не подвоює бонус", () => {
    const attack = weapon("3d8+15");

    const params = { attacker, target, attack, damageRolls: [4, 5, 6], allParticipants: [attacker, target] };

    const server = hit(attack, [4, 5, 6]);

    const client = computeDamageBreakdown(params);

    expect(client.totalDamage).toBe(server.physicalDamage);
    expect(client.steps).toContainEqual(expect.objectContaining({ label: WEAPON_FLAT_LABEL, value: 15 }));
    expect(computeDamageBreakdown({ ...params, isCritical: true }).totalDamage).toBe((server.physicalDamage - 15) * 2 + 15);
  });

  it("прев'ю дорівнює середньому реального удару юніта «2d6+5»", () => {
    const attack = weapon("2d6+5");

    const expectedAvg = hit(attack, [3, 4]).physicalDamage;

    expect(averageAttackDamage(attacker, attack, [attacker, target]).total).toBe(expectedAvg);
  });

  it("відсіч теж отримує «+N»", () => {
    const withUnit = (id: string, side: ParticipantSide, dice: string): BattleParticipant => {
      const p = asUnit(makeParticipant({ id, side, hp: 60, maxHp: 60 }));

      return { ...p, battleData: { ...p.battleData, attacks: [weapon(dice)] } };
    };

    const run = (dice: string) => {
      const a = withUnit("a", ParticipantSide.ALLY, dice);

      const d = withUnit("d", ParticipantSide.ENEMY, dice);

      const r = resolveRetaliation({ participants: [a, d], attackerId: "a", defenderId: "d", attack: weapon(dice), attackRoll: { isCriticalFail: false }, round: 1, battleId: "b1", rng: seq(0.85) });

      return r?.participants.find((p) => p.basicInfo.id === "a")?.combatStats.currentHp;
    };

    const plain = run("1d6");

    expect(plain).toBeDefined();
    expect((plain as number) - (run("1d6+7") as number)).toBe(7);
  });
});
