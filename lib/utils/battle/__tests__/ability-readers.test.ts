import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { calculateAttackBonus, calculateAttackRoll, hasAdvantage, hasDisadvantage } from "@/lib/utils/battle/attack";
import { canPerformReaction, getCounterDamagePercent } from "@/lib/utils/battle/attack/reaction";
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

  it("контратака з прапорця", () => {
    const p = makeParticipant({ id: "a", abilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "counterAttack", attackKinds: ["ranged"], bonusPercent: 30 }] })] });

    expect(canPerformReaction(p, AttackType.RANGED)).toBe(true);
    expect(canPerformReaction(p, AttackType.MELEE)).toBe(false);
    expect(getCounterDamagePercent(p)).toBe(30);
  });

  it("контратака: відсотки з кількох джерел сумуються, як раніше", () => {
    const p = makeParticipant({
      id: "a",
      abilities: [
        resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "counterAttack", attackKinds: ["melee"], bonusPercent: 20 }] }),
        resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "counterAttack", attackKinds: ["melee"], bonusPercent: 10 }] }, { id: "s2" }),
      ],
    });

    expect(getCounterDamagePercent(p)).toBe(30);
  });
});

