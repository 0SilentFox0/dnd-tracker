import { describe, expect, it } from "vitest";

import { AttackType } from "@/lib/constants/battle";
import { ARMOR_FACTOR_MAX, ARMOR_FACTOR_MIN, REF_HERO_HIT, REF_UNIT_HIT } from "@/lib/constants/battle-balance";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { calculateAttackBonus } from "@/lib/utils/battle/attack/bonus";
import {
  armorFactors,
  buildPartyPower,
  computeFairScaling,
  effectiveUnit,
  getUnitStats,
  hitChance,
  type PartyPower,
  pickEnemyRoster,
  unitMember,
  type UnitStats,
} from "@/lib/utils/battle/balance";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const unit = (unitId: string, hp: number, dpr: number, extra: Partial<UnitStats> = {}): UnitStats => ({ unitId, name: unitId, level: 1, hp, dpr, kpi: dpr / hp, raceId: null, ...extra });

const party = (extra: Partial<PartyPower> = {}): PartyPower => ({ dpr: 42, hp: 180, heroCount: 3, ...extra });

describe("hitChance", () => {
  it("d20 + бонус ≥ КД", () => {
    expect(hitChance(5, 15)).toBeCloseTo(0.55);
    expect(hitChance(6, 13)).toBeCloseTo(0.7);
  });

  it("натуральна 1 завжди промах, 20 — завжди влучання", () => {
    expect(hitChance(0, 30)).toBe(0.05);
    expect(hitChance(20, 10)).toBe(0.95);
  });
});

describe("armorFactors", () => {
  it("без КД або влучання — 1", () => {
    expect(armorFactors({}, { toHit: 7, ac: 15 })).toEqual({ hp: 1, dpr: 1 });
    expect(armorFactors({ ac: 16, attackBonus: 8 }, {})).toEqual({ hp: 1, dpr: 1 });
  });

  it("ефективне HP = REF_HERO_HIT / шанс героїв; DPR = шанс юніта / REF_UNIT_HIT", () => {
    const f = armorFactors({ ac: 15, attackBonus: 6 }, { toHit: 7, ac: 14 });

    expect(f.hp).toBeCloseTo(REF_HERO_HIT / hitChance(7, 15));
    expect(f.dpr).toBeCloseTo(hitChance(6, 14) / REF_UNIT_HIT);
  });

  it("обрізає до [ARMOR_FACTOR_MIN, ARMOR_FACTOR_MAX]", () => {
    expect(armorFactors({ ac: 30, attackBonus: -10 }, { toHit: 0, ac: 30 })).toEqual({ hp: ARMOR_FACTOR_MAX, dpr: ARMOR_FACTOR_MIN });
  });

  it("закляття не кидають проти КД: діє лише частка зброї в шкоді партії", () => {
    const full = armorFactors({ ac: 18 }, { toHit: 5 }).hp;

    expect(armorFactors({ ac: 18 }, { toHit: 5, weaponShare: 0 }).hp).toBe(1);
    expect(armorFactors({ ac: 18 }, { toHit: 5, weaponShare: 0.5 }).hp).toBeCloseTo(1 + 0.5 * (full - 1));
  });
});

describe("getUnitStats: КД і влучання", () => {
  it("влучання найкращої атаки = рушій (calculateAttackBonus) на учаснику з цього юніта", () => {
    const base = makeParticipant({ id: "u" });

    const bite = { id: "b", name: "Укус", type: AttackType.MELEE, attackBonus: 1, damageDice: "1d6", damageType: "piercing" } as BattleAttack;

    const volley = { id: "v", name: "Залп", type: AttackType.RANGED, attackBonus: 0, damageDice: "2d8", damageType: "piercing" } as BattleAttack;

    const p: BattleParticipant = {
      ...base,
      basicInfo: { ...base.basicInfo, sourceType: "unit" },
      abilities: { ...base.abilities, strength: 16, dexterity: 14, proficiencyBonus: 3 },
      combatStats: { ...base.combatStats, armorClass: 15 },
      battleData: { ...base.battleData, attacks: [bite, volley], resolvedAbilities: [] },
    };

    const stats = getUnitStats({ id: "u", name: "u", maxHp: 30, level: 4, strength: 16, dexterity: 14, armorClass: 15, proficiencyBonus: 3, attacks: [bite, volley] });

    expect(stats.ac).toBe(15);
    expect(stats.attackBonus).toBe(calculateAttackBonus(p, volley, [p]));
  });

  it("юніт, чия сила в закляттях, не має влучання; без майстерності — теж", () => {
    const fire = { dice: 8, targeting: { kind: "allEnemies" }, spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }] };

    expect(getUnitStats({ id: "m", name: "m", maxHp: 20, level: 3, proficiencyBonus: 2, attacks: [{ damageDice: "1d4", type: "melee" }], spells: [fire] }).attackBonus).toBeUndefined();
    expect(getUnitStats({ id: "m", name: "m", maxHp: 20, level: 3, attacks: [{ damageDice: "1d4", type: "melee" }] }).attackBonus).toBeUndefined();
  });
});

describe("buildPartyPower", () => {
  it("сума сили, середнє КД, влучання зважене на шкоду зброєю", () => {
    const p = buildPartyPower([
      { stats: { dpr: 10, hp: 50, toHit: 8, ac: 16, weaponDpr: 10 }, hero: true },
      { stats: { dpr: 20, hp: 30, toHit: 4, ac: 12, weaponDpr: 5 }, hero: true },
      { stats: unitMember({ dpr: 6, hp: 20, ac: 13, attackBonus: 5 }), quantity: 2, hero: false },
    ]);

    expect(p).toMatchObject({ dpr: 42, hp: 120, heroCount: 2 });
    expect(p.toHit).toBeCloseTo((8 * 10 + 4 * 5 + 5 * 12) / 27);
    expect(p.weaponShare).toBeCloseTo(27 / 42);
    expect(p.ac).toBeCloseTo((16 + 12 + 13 * 2) / 4);
  });

  it("без КД і влучання — лише сума, як раніше", () => {
    expect(buildPartyPower([{ stats: { dpr: 10, hp: 50 }, hero: true }])).toEqual({ dpr: 10, hp: 50, heroCount: 1 });
  });
});

describe("чесний баланс з КД", () => {
  const plain = [unit("a", 30, 8), unit("b", 60, 15, { level: 2 })];

  const armored = [unit("a", 30, 8, { ac: 16, attackBonus: 5 }), unit("b", 60, 15, { level: 2, ac: 14, attackBonus: 6 })];

  it("без КД/влучання в партії результат ідентичний старому", () => {
    const roster = [{ unitId: "a", quantity: 3 }];

    expect(computeFairScaling(party(), roster, armored)).toEqual(computeFairScaling(party(), roster, plain));
    expect(pickEnemyRoster(party(), armored)).toEqual(pickEnemyRoster(party(), plain));
  });

  it("юніт з високим КД отримує менший hpMult і менший склад, ніж такий самий з низьким КД", () => {
    const p = party({ toHit: 6 });

    const tough = [unit("x", 28, 16, { ac: 17, attackBonus: 5 })];

    const soft = [unit("x", 28, 16, { ac: 11, attackBonus: 5 })];

    const roster = [{ unitId: "x", quantity: 3 }];

    expect(computeFairScaling(p, roster, tough).units.x.hpMult).toBeLessThan(computeFairScaling(p, roster, soft).units.x.hpMult);

    const size = (lib: UnitStats[]) => (pickEnemyRoster(p, lib)?.roster ?? []).reduce((a, r) => a + r.quantity, 0);

    expect(size(tough)).toBeLessThan(size(soft));
  });

  it("партія з високим влучанням бачить менше ефективного HP юніта", () => {
    const u = unit("x", 40, 8, { ac: 15 });

    expect(effectiveUnit(u, party({ toHit: 10 })).hp).toBeLessThan(effectiveUnit(u, party({ toHit: 4 })).hp);
  });

  it("юніт з високим влучанням проти партії з низьким КД — більший ефективний DPR і менший dmgMult", () => {
    const p = party({ ac: 12 });

    const roster = [{ unitId: "x", quantity: 3 }];

    const sharp = [unit("x", 30, 8, { attackBonus: 9 })];

    const blunt = [unit("x", 30, 8, { attackBonus: 3 })];

    expect(effectiveUnit(sharp[0], p).dpr).toBeGreaterThan(effectiveUnit(blunt[0], p).dpr);
    expect(computeFairScaling(p, roster, sharp).units.x.dmgMult).toBeLessThan(computeFairScaling(p, roster, blunt).units.x.dmgMult);
  });
});
