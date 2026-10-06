import { describe, expect, it } from "vitest";

import { AttackType } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { getCharacterStats, getUnitStats } from "@/lib/utils/battle/balance";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const sword = { id: "s", name: "Меч", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d8", damageType: "slashing" } as BattleAttack;

const bow = { id: "b", name: "Лук", type: AttackType.RANGED, attackBonus: 0, damageDice: "1d6", damageType: "piercing" } as BattleAttack;

function hero(attacks: BattleAttack[], abilities = makeParticipant({ id: "h" }).battleData.resolvedAbilities): BattleParticipant {
  const p = makeParticipant({ id: "h", level: 5, maxHp: 44, abilities });

  return { ...p, abilities: { ...p.abilities, meleeMultiplier: 1, rangedMultiplier: 1 }, battleData: { ...p.battleData, attacks } };
}

describe("getCharacterStats з учасника бою", () => {
  it("ближня і дальня — середнє реального удару; фізичний DPR — краща; HP — з учасника", () => {
    const p = hero([sword, bow]);

    const s = getCharacterStats({ participant: p });

    expect(s.dprBreakdown.meleeAvg).toBe(averageAttackDamage(p, sword, [p]).total);
    expect(s.dprBreakdown.rangedAvg).toBe(averageAttackDamage(p, bow, [p]).total);
    expect(s.dpr).toBe(Math.max(s.dprBreakdown.meleeAvg, s.dprBreakdown.rangedAvg));
    expect(s.hp).toBe(44);
  });

  it("пасивний бонус ближньої шкоди входить у DPR", () => {
    const rage = resolved({ trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 50 }] });

    expect(getCharacterStats({ participant: hero([sword], [rage]) }).dprBreakdown.meleeAvg).toBeGreaterThan(getCharacterStats({ participant: hero([sword]) }).dprBreakdown.meleeAvg);
  });

  it("без зброї — удар героя без кубиків зброї", () => {
    const p = hero([]);

    const fists = { name: "", type: AttackType.MELEE, attackBonus: 0, damageDice: "", damageType: "physical" } as BattleAttack;

    expect(getCharacterStats({ participant: p }).dprBreakdown.meleeAvg).toBe(averageAttackDamage(p, fists, [p]).total);
  });
});

const unit = (attacks: Array<{ damageDice: string; type: string }>) =>
  getUnitStats({ id: "u", name: "u", maxHp: 20, level: 1, strength: 14, dexterity: 12, attacks });

describe("баланс: середня шкода з кубиків", () => {
  it("юніт: кубики зброї + модифікатор характеристики", () => {
    expect(unit([{ damageDice: "1d8+2", type: "melee" }]).dpr).toBe(8.5);
  });

  it("«d6» без кількості — це 1d6 (§4.5)", () => {
    expect(unit([{ damageDice: "d6", type: "ranged" }]).dpr).toBe(4.5);
  });
});
