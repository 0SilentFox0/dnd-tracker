import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { immunityAbilities } from "@/lib/utils/abilities/build/immunities";
import { calculateAttackBonus, calculateAttackRoll, hasAdvantage, hasDisadvantage, predictAttackNumbers } from "@/lib/utils/battle/attack";
import { calculateDamageWithModifiers } from "@/lib/utils/battle/damage";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant";
import { applyResistance } from "@/lib/utils/battle/resistance";
import type { BattleAttack } from "@/types/battle";

const bow: BattleAttack = { name: "Лук", type: AttackType.RANGED, attackBonus: 0, damageDice: "1d8", damageType: "piercing" };

describe("readers", () => {
  it("AC: пасивка + extra дії", () => {
    const p = makeParticipant({ id: "a", abilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1 }] })] });

    expect(getEffectiveArmorClass(p)).toBe(15);
    expect(getEffectiveArmorClass(p, [p], [{ kind: "modifyStat", stat: "armor", flat: 2 }])).toBe(17);
  });

  it("бонус атаки за типом, перевага дальня, недолік від цілі", () => {
    const archer = makeParticipant({
      id: "a",
      abilities: [
        resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attackBonus", attackKind: "ranged", flat: 1 }, { kind: "flag", flag: "advantage", attackKind: "ranged" }] }),
      ],
    });

    const shade = makeParticipant({ id: "s", side: ParticipantSide.ENEMY, abilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "disadvantageForAttackers" }] })] });

    const base = calculateAttackBonus(makeParticipant({ id: "z" }), bow);

    expect(calculateAttackBonus(archer, bow) - base).toBe(1);
    expect(hasAdvantage(archer, bow)).toBe(true);
    expect(hasDisadvantage(archer, bow, [archer, shade], { targetId: "s" })).toBe(true);
  });

  it("поріг криту з пасивки", () => {
    const p = makeParticipant({ id: "a", abilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "critThreshold", flat: -1 }] })] });

    expect(calculateAttackRoll(p, bow, 19).isCritical).toBe(true);
    expect(calculateAttackRoll(makeParticipant({ id: "b" }), bow, 19).isCritical).toBe(false);
  });

  it("шкода: пасивка + extra дії, подійний скіл не рахується", () => {
    const p = makeParticipant({
      id: "a",
      abilities: [
        resolved({ trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "ranged" }, percent: 50 }] }),
        resolved({ trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "dot", damagePerRound: 1, damageType: "bleed", duration: { rounds: 1 } }] }, { id: "s2" }),
      ],
    });

    const r = calculateDamageWithModifiers(p, 10, 0, AttackType.RANGED, { actionModifiers: [{ kind: "damageBonus", filter: { kind: "all" }, flat: 2 }] });

    expect(r.totalDamage).toBe(10 + 5 + 2);
  });

  it("резист: фізичний з пасивки, імунітет до вогню, spell для заклинань", () => {
    const p = makeParticipant({
      id: "a",
      abilities: [
        resolved({
          trigger: { event: "passive" },
          effects: [
            { kind: "flag", flag: "resistance", damageType: "physical", percent: 50 },
            { kind: "flag", flag: "resistance", damageType: "fire", percent: 100 },
            { kind: "flag", flag: "resistance", damageType: "spell", percent: 20 },
          ],
        }),
      ],
    });

    expect(applyResistance(p, 10, "slashing").finalDamage).toBe(5);
    expect(applyResistance(p, 10, "fire").immunityApplied).toBe(true);
    expect(applyResistance(p, 10, "cold", { fromSpell: true }).finalDamage).toBe(8);
  });

  it("прогноз для клієнта: AC і бонус атаки з умінь (артефакт +2 AC)", () => {
    const target = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, abilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 2 }] }, { type: "artifact" })] });

    const archer = makeParticipant({ id: "a", abilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attackBonus", flat: 1 }] })] });

    const r = predictAttackNumbers(archer, target, bow, [archer, target]);

    expect(r.targetAC).toBe(16);
    expect(r.totalBonus).toBe(calculateAttackBonus(makeParticipant({ id: "z" }), bow) + 1);
  });
  it("юніт з імунітетом до вогню не отримує вогняної шкоди", () => {
    const p = makeParticipant({ id: "u", abilities: immunityAbilities(["вогню"], { type: "unit", id: "u" }) });

    expect(applyResistance(p, 10, "fire").finalDamage).toBe(0);
    expect(applyResistance(p, 10, "fire", { fromSpell: true }).finalDamage).toBe(0);
  });
});

describe("calculateAttackRoll: rng", () => {
  it("критичний ефект береться з переданого rng", () => {
    const p = makeParticipant({ id: "a" });

    const bow = { id: "b", name: "Лук", type: AttackType.RANGED, attackBonus: 0, damageDice: "1d6", damageType: "piercing" } as BattleAttack;

    const pick = (v: number) => calculateAttackRoll(p, bow, 20, undefined, undefined, { rng: () => v }).criticalEffect?.id;

    expect(pick(0)).toBe(1);
    expect(pick(0.999)).not.toBe(1);
  });
});
