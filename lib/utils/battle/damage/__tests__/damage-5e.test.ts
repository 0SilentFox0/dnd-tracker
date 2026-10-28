import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { attackAbilityFor } from "@/lib/utils/battle/attack/ability";
import { calculateAttackBonus } from "@/lib/utils/battle/attack/bonus";
import { computeHitDamage } from "@/lib/utils/battle/attack/process/compute";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import { heroAttackDamageParts, heroDamageContext } from "@/lib/utils/battle/damage/hero-damage";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const base = createMockParticipant();

const fiveE = createMockParticipant({
  abilities: { ...base.abilities, level: 5, damageModel: "5e", strength: 14, dexterity: 18, modifiers: { ...base.abilities.modifiers, strength: 2, dexterity: 4 } },
});

const target = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "t1", side: ParticipantSide.ENEMY } });

const rapier: BattleAttack = { id: "r", name: "Рапіра", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d8", damageType: "piercing", traits: ["finesse"] };

const club: BattleAttack = { id: "c", name: "Палиця", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d4", damageType: "bludgeoning" };

const dagger: BattleAttack = { id: "d:off", name: "Кинджал", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d4", damageType: "piercing", traits: ["light", "finesse"], hand: "off" };

const bow: BattleAttack = { id: "b", name: "Лук", type: AttackType.RANGED, attackBonus: 0, damageDice: "1d6", damageType: "piercing" };

const javelin: BattleAttack = { id: "j", name: "Дротик", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d6", damageType: "piercing", traits: ["thrown"], range: "30/120" };



const hit = (attacker: BattleParticipant, attack: BattleAttack, rolls: number[]) =>
  computeHitDamage({ attacker, target, attack, damageRolls: rolls, allParticipants: [attacker, target], attackRoll: { isCritical: false }, currentRound: 1 }).physicalDamage;

const withAbility = (p: BattleParticipant, effect: { kind: "flag"; flag: "twoWeaponFighting" }): BattleParticipant => ({
  ...p,
  battleData: { ...p.battleData, resolvedAbilities: [resolved({ trigger: { event: "passive" }, effects: [effect] })] },
});

describe("шкода атаки 5e", () => {
  it("formula has no hero dice or level", () => {
    expect(heroAttackDamageParts(fiveE, rapier).formula).toBe("1d8");
    expect(heroDamageContext(fiveE, rapier, [5]).heroLevelPart).toBe(0);
  });

  it("finesse uses the better of STR/DEX", () => {
    expect(hit(fiveE, rapier, [5])).toBe(9);
    expect(calculateAttackBonus(fiveE, rapier)).toBe(4 + fiveE.abilities.proficiencyBonus);
  });

  it("plain melee uses STR, ranged DEX, thrown melee STR", () => {
    expect(hit(fiveE, club, [3])).toBe(5);
    expect(attackAbilityFor(fiveE, bow)).toBe("dexterity");
    expect(attackAbilityFor(fiveE, javelin)).toBe("strength");
  });

  it("off-hand drops positive modifier unless twoWeaponFighting", () => {
    expect(hit(fiveE, dagger, [3])).toBe(3);
    expect(calculateAttackBonus(fiveE, dagger)).toBe(4 + fiveE.abilities.proficiencyBonus);
    expect(hit(withAbility(fiveE, { kind: "flag", flag: "twoWeaponFighting" }), dagger, [3])).toBe(7);
  });

  it("off-hand keeps negative modifier", () => {
    const weak = { ...fiveE, abilities: { ...fiveE.abilities, dexterity: 8, strength: 8, modifiers: { ...fiveE.abilities.modifiers, strength: -1, dexterity: -1 } } };

    expect(hit(weak, dagger, [3])).toBe(2);
  });

  it("average equals real hit", () => {
    expect(averageAttackDamage(fiveE, rapier, [fiveE]).total).toBe(8);
  });
});

describe("безоружний удар 5e", () => {
  const unarmed: BattleAttack = { id: "default-melee", name: "Удар", type: AttackType.MELEE, attackBonus: 0, damageDice: "1", damageType: "physical" };

  it("deals 1 + STR with no dice", () => {
    expect(hit(fiveE, unarmed, [])).toBe(3);
  });
});
