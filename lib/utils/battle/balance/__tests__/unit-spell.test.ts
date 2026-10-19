import { describe, expect, it } from "vitest";

import { TARGET_ROUNDS, UNIT_SPELL_SLOTS } from "@/lib/constants/battle-balance";
import { buildPartyPower, effectiveUnit, type PartyPower, type UnitStats } from "@/lib/utils/battle/balance";
import { hitChance, unitSpellDpr } from "@/lib/utils/battle/balance/hit-chance";
import { summonedUnitIds } from "@/lib/utils/battle/balance/unit-library";
import type { UnitSpellPower } from "@/types/battle-setup";

const fireball: UnitSpellPower = { dpr: 54, damageType: "fire", weaponDpr: 10 };

const share = (spell: number, weapon: number) => {
  const casts = Math.min(UNIT_SPELL_SLOTS, TARGET_ROUNDS);

  return (casts * spell + (TARGET_ROUNDS - casts) * weapon) / TARGET_ROUNDS;
};

describe("unitSpellDpr", () => {
  it("слоти: закляття лише на частину раундів, решту — зброя", () => {
    expect(unitSpellDpr(fireball, {})).toBeCloseTo(share(54, 10));
  });

  it("рятунок «половина» зрізає шкоду на частку успішних рятунків партії", () => {
    const spell = { ...fireball, save: { ability: "dexterity" as const, dc: 12, half: true } };

    const success = hitChance(2, 12);

    expect(unitSpellDpr(spell, { saves: { dexterity: 2 } })).toBeCloseTo(share(54 * (1 - success / 2), 10));
    expect(unitSpellDpr({ ...spell, save: { ...spell.save, half: false } }, { saves: { dexterity: 2 } })).toBeCloseTo(share(54 * (1 - success), 10));
  });

  it("невідомі рятунки партії — запасний шанс, а не повна шкода", () => {
    const spell = { ...fireball, save: { ability: "wisdom" as const, dc: 12, half: false } };

    expect(unitSpellDpr(spell, {})).toBeLessThan(unitSpellDpr(fireball, {}));
  });

  it("опір партії до типу шкоди зменшує закляття", () => {
    expect(unitSpellDpr(fireball, { spellResist: { fire: 50 } })).toBeCloseTo(share(27, 10));
    expect(unitSpellDpr(fireball, { spellResist: { cold: 50 } })).toBeCloseTo(share(54, 10));
  });

  it("коли закляття проти партії слабше за зброю — лише зброя з поправкою на влучання", () => {
    expect(unitSpellDpr({ ...fireball, dpr: 8, weaponDpr: 10 }, {})).toBe(10);
  });

  it("effectiveUnit бере шкоду закляття з урахуванням партії", () => {
    const u: UnitStats = { unitId: "u", name: "u", level: 6, hp: 100, dpr: 54, kpi: 0.54, raceId: null, spell: fireball };

    const party: PartyPower = { dpr: 100, hp: 400, heroCount: 3, spellResist: { fire: 50 } };

    expect(effectiveUnit(u, party).dpr).toBeCloseTo(share(27, 10));
  });
});

describe("buildPartyPower: рятунки й опір заклять", () => {
  it("середнє серед тих, хто їх звітує; відсутній тип — 0 %", () => {
    const party = buildPartyPower([
      { stats: { dpr: 10, hp: 50, saves: { dexterity: 4 }, spellResist: { fire: 50 } }, hero: true },
      { stats: { dpr: 10, hp: 50, saves: { dexterity: 0 }, spellResist: {} }, hero: true },
      { stats: { dpr: 5, hp: 20 }, quantity: 3, hero: false },
    ]);

    expect(party.saves?.dexterity).toBe(2);
    expect(party.spellResist?.fire).toBe(25);
  });
});

describe("summonedUnitIds", () => {
  it("знаходить unitId у вкладених ефектах summon; група/тір без unitId не рахуються", () => {
    const ids = summonedUnitIds([
      [{ kind: "summon", unitId: "phoenix" }],
      [{ id: "a", trigger: { event: "battleStart" }, effects: [{ kind: "summon", unitId: "imp", count: 2 }] }],
      [{ effects: [{ kind: "summon", group: "Демони", tier: 3 }] }],
      null,
    ]);

    expect([...ids].sort()).toEqual(["imp", "phoenix"]);
  });
});
