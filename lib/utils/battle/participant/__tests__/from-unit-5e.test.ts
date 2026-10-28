import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: { race: { findFirst: vi.fn() } } }));

import { ParticipantSide } from "@/lib/constants/battle";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { attackDamageModifier } from "@/lib/utils/battle/attack/ability";
import { attacksPerAction } from "@/lib/utils/battle/attack/attacks-left";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant/from-unit";
import { joinParticipant, splitParticipant } from "@/lib/utils/battle/store/split-participant";
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

it("builds passive senses only for CR monsters", async () => {
  const fields = { statblock: { senses: { blindsight: 60, truesight: 30, darkvision: 120 } } };

  const monster = await build(homm({ ...fields, cr: 5 }));

  const hommUnit = await build(homm(fields));

  expect(collectModifiers([monster], monster.basicInfo.id, { flag: "sense" }).flags).toEqual(expect.arrayContaining([expect.objectContaining({ sense: "blindsight", range: 60 }), expect.objectContaining({ sense: "truesight", range: 30 })]));
  expect(collectModifiers([hommUnit], hommUnit.basicInfo.id, { flag: "sense" }).flags).toEqual([]);
});

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

  it("HOMM ignores populated monster-only fields and retains universal slots", async () => {
    const p = await build(homm({ ...HOMM_DEFAULTS, knownSpells: ["manual"], statblock: { creatureType: "dragon", senses: { blindsight: 60 } }, spellcasting: { ability: "wisdom", dc: 22, attackBonus: 14, spells: [{ spellId: "monster-spell", perBattle: 1 }] } }));

    expect(p.spellcasting).toMatchObject({ knownSpells: ["manual"], spellSlots: { universal: { max: 3, current: 3 } }, spellSaveDC: 13 });
    expect(p.spellcasting.grants).toBeUndefined();
    expect(p.battleData.pools).toBeUndefined();
    expect(p.abilities.creatureType).toBeUndefined();
    expect(p.battleData.senses).toBeUndefined();
  });

  it("мультиатака й легендарне без CR ігноруються", async () => {
    const p = await build(homm({ ...HOMM_DEFAULTS, multiattack: 3, legendaryActions: 2 }));

    expect(attacksPerAction(p, [p])).toBe(0);
    expect(p.battleData.legendary).toBeUndefined();
  });
});

describe("createBattleParticipantFromUnit: монстр 5e", () => {
  const monster = (over: Partial<UnitFromPrisma> = {}) => homm({ ...HOMM_DEFAULTS, cr: 5, proficiencyBonus: 3, multiattack: 2, legendaryActions: 3, legendaryResistances: 2, saveProficiencies: ["dexterity", "wisdom", "bogus"], ...over });

  it.each([undefined, {}, { spells: null }, { spells: "invalid" }])("missing/default/malformed spellcasting spells stay safe (%j)", async (spellcasting) => {
    const p = await build(monster({ spellcasting: spellcasting as never, knownSpells: ["manual"] }));

    expect(p.spellcasting.spellSlots).toEqual({});
    expect(p.spellcasting.grants).toEqual([{ spellId: "manual" }]);
    expect(p.battleData.pools).toBeUndefined();
  });

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

  it("grant overrides retain zero values, legendary-only and at-will entries", async () => {
    const p = await build(monster({ knownSpells: ["limited", "manual"], spellcasting: { ability: "wisdom", spells: [{ spellId: "limited", perBattle: 2, castLevel: 5, dc: 18, attackBonus: 0, legendaryOnly: true }, { spellId: "at-will" }] } }));

    expect(p.spellcasting.spellcastingAbility).toBe("wisdom");
    expect(p.spellcasting.spellSaveDC).toBe(13);
    expect(p.spellcasting.grants).toEqual([{ spellId: "limited", pool: "pool:spell:limited", cost: 1, castLevel: 5, dc: 18, attackBonus: 0, legendaryOnly: true }, { spellId: "at-will" }, { spellId: "manual" }]);
  });

  it("monster snapshot round-trips grants and statblock and hashes changed definitions", async () => {
    const p = await build(monster({ statblock: { creatureType: "dragon", senses: { blindsight: 60 } }, spellcasting: { spells: [{ spellId: "breath", perBattle: 1, recharge: 5 }] } }));

    const place = { orderIndex: 0, isPending: false };

    const stored = splitParticipant(p, place);

    expect(joinParticipant(stored, "b1")).toEqual(p);

    const changed = { ...p, spellcasting: { ...p.spellcasting, grants: [{ spellId: "breath", dc: 22 }] } };

    expect(splitParticipant(changed, place).snapshotHash).not.toBe(stored.snapshotHash);

    const spent = { ...p, battleData: { ...p.battleData, abilityUsage: { "pool:spell:breath": { battle: 1, round: 0, turn: 0 } } } };

    const used = splitParticipant(spent, place);

    expect(used.state.abilityUsage?.["pool:spell:breath"].battle).toBe(1);
    expect(used.snapshotHash).toBe(stored.snapshotHash);
  });

  it("CR monster snapshots statblock and grants without universal slots", async () => {
    const p = await build(monster({
      knownSpells: ["at-will"],
      statblock: { creatureType: "dragon", senses: { blindsight: 60 }, movement: { fly: 80 }, languages: "Draconic", telepathy: 120, lairResistances: 3 },
      spellcasting: { ability: "charisma", dc: 21, attackBonus: 13, spells: [{ spellId: "fireball", perBattle: 1, recharge: 5, castLevel: 3, dc: 18, attackBonus: 10 }] },
    }));

    expect(p.spellcasting).toMatchObject({ spellSlots: {}, knownSpells: ["at-will", "fireball"], spellcastingAbility: "charisma", spellSaveDC: 21, spellAttackBonus: 13 });
    expect(p.spellcasting.grants).toEqual([{ spellId: "fireball", pool: "pool:spell:fireball", cost: 1, castLevel: 3, dc: 18, attackBonus: 10 }, { spellId: "at-will" }]);
    expect(p.battleData.pools?.["pool:spell:fireball"]).toEqual({ label: "fireball", max: 1, rest: null, recharge: 5 });
    expect(p.abilities).toMatchObject({ creatureType: "dragon" });
    expect(p.battleData).not.toHaveProperty("creatureType");
    expect(p.battleData).toMatchObject({ senses: { blindsight: 60 }, movement: { fly: 80 }, languages: "Draconic", telepathy: 120 });
  });
});

 it("snapshots lair resistance baseline even without legendary actions", async () => {
  const p = await build(homm({ ...HOMM_DEFAULTS, cr: 3, legendaryResistances: 2, statblock: { lairResistances: 4 } }));

  expect(p.battleData.lair).toEqual({ active: false, baseResistances: 2, resistSpent: 0 });
  expect(p.battleData.lairResistances).toBe(4);
 });
