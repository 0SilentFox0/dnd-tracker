import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: { race: { findFirst: vi.fn() } } }));

import { ParticipantSide } from "@/lib/constants/battle";
import { attackDamageModifier } from "@/lib/utils/battle/attack/ability";
import { attacksPerAction } from "@/lib/utils/battle/attack/attacks-left";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant/from-unit";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const homm = (over: Partial<UnitFromPrisma> = {}) =>
  ({
    id: "u1", campaignId: "c1", name: "Гоблін", raceId: null, level: 3,
    strength: 10, dexterity: 18, constitution: 10, intelligence: 8, wisdom: 14, charisma: 16,
    armorClass: 12, initiative: 1, speed: 30, gridSize: 1, maxHp: 30, proficiencyBonus: 2,
    attacks: [{ name: "Кинджал", attackBonus: 0, damageDice: "1d4", damageType: "piercing", type: "melee", traits: ["finesse"] }],
    knownSpells: [], avatar: null, createdAt: new Date(0), immunities: [], morale: 0, maxTargets: 1, minTargets: 1, abilities: [], levelScaling: null,
    sourceId: null, sourceHash: null,
    ...over,
  }) as UnitFromPrisma;

const HOMM_DEFAULTS = { cr: null, xp: null, multiattack: 1, legendaryActions: 0, legendaryResistances: 0, saveProficiencies: [] } as Partial<UnitFromPrisma>;

const build = (u: UnitFromPrisma) => createBattleParticipantFromUnit(u, "b1", ParticipantSide.ENEMY, 1, {});

describe("createBattleParticipantFromUnit: HOMM без змін", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => vi.useRealTimers());

  it("нові колонки з дефолтами не змінюють snapshot", async () => {
    const before = await build(homm());

    const after = await build(homm(HOMM_DEFAULTS));

    expect(after).toStrictEqual(before);
    expect(after.abilities.damageModel).toBeUndefined();
    expect(after.basicInfo).not.toHaveProperty("xp");
    expect(after.battleData).not.toHaveProperty("legendary");
    expect(after.spellcasting.spellSaveDC).toBe(8 + 2 + 3);
    expect(after.spellcasting.spellcastingAbility).toBeUndefined();
    expect(attacksPerAction(after, [after])).toBe(0);
    expect(attackDamageModifier(after, after.battleData.attacks[0])).toBe(0);
  });

  it("мультиатака й легендарне без CR ігноруються", async () => {
    const p = await build(homm({ ...HOMM_DEFAULTS, multiattack: 3, legendaryActions: 2 }));

    expect(attacksPerAction(p, [p])).toBe(0);
    expect(p.battleData.legendary).toBeUndefined();
  });
});

describe("createBattleParticipantFromUnit: монстр 5e", () => {
  const monster = () => homm({ ...HOMM_DEFAULTS, cr: 5, proficiencyBonus: 3, multiattack: 2, legendaryActions: 3, legendaryResistances: 2, saveProficiencies: ["dexterity", "wisdom", "bogus"] });

  it("модель 5e, СК з найкращої ментальної, рятівні, XP, легендарне", async () => {
    const p = await build(monster());

    expect(p.abilities.damageModel).toBe("5e");
    expect(p.spellcasting.spellcastingAbility).toBe("charisma");
    expect(p.spellcasting.spellSaveDC).toBe(8 + 3 + 3);
    expect(p.abilities.saveProficiencies).toEqual(["dexterity", "wisdom"]);
    expect(p.basicInfo.xp).toBe(1800);
    expect(p.battleData.legendary).toEqual({ actions: 3, actionsLeft: 3, resistLeft: 2 });
  });

  it("мультиатака через collectModifiers; шкода фехтувальною — модифікатор Спр", async () => {
    const p = await build(monster());

    expect(attacksPerAction(p, [p])).toBe(1);
    expect(attackDamageModifier(p, p.battleData.attacks[0])).toBe(4);
  });

  it("ручне XP перекриває таблицю; без легендарного — без legendary", async () => {
    const p = await build(homm({ ...HOMM_DEFAULTS, cr: 0.25, xp: 75 }));

    expect(p.basicInfo.xp).toBe(75);
    expect(p.battleData.legendary).toBeUndefined();
  });

  it("СК враховує rules.formulas.saveDcBase", async () => {
    const p = await createBattleParticipantFromUnit(monster(), "b1", ParticipantSide.ENEMY, 1, {}, { ...DEFAULT_RULES, formulas: { saveDcBase: 10, proficiencyBase: 2, proficiencyEvery: 4 } });

    expect(p.spellcasting.spellSaveDC).toBe(10 + 3 + 3);
  });
});
