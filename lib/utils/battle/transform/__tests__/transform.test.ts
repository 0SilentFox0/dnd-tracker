import { describe, expect, it } from "vitest";

import { CombatStatus, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { textOf } from "@/lib/i18n/test/text";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { dropConcentration } from "@/lib/utils/battle/concentration";
import { applyDamageConsequences } from "@/lib/utils/battle/damage/consequences";
import { textsOf } from "@/lib/utils/battle/log/__tests__/event-text";
import { castSpell } from "@/lib/utils/battle/spell";
import { applyTransforms } from "@/lib/utils/battle/transform/apply-transforms";
import { revertExpiredTransforms } from "@/lib/utils/battle/transform/revert";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import { SpellDefinitionSchema, type SpellEffect } from "@/lib/utils/spells/model/schema";
import type { BattleParticipant } from "@/types/battle";

const rules = { ...DEFAULT_RULES, concentration: { enabled: true, dcCap: null }, deathSaves: { ...DEFAULT_RULES.deathSaves, enabled: true } };

const beast = {
  id: "frog",
  campaignId: "c",
  name: "Жаба",
  raceId: null,
  level: 1,
  strength: 8,
  dexterity: 12,
  constitution: 10,
  intelligence: 2,
  wisdom: 8,
  charisma: 3,
  armorClass: 11,
  initiative: 0,
  speed: 20,
  gridSize: 1,
  maxHp: 4,
  proficiencyBonus: 2,
  attacks: [{ name: "Укус", attackBonus: 3, damageDice: "1d4", damageType: "piercing", type: "melee" }],
  knownSpells: [],
  avatar: null,
  createdAt: new Date(),
  immunities: [],
  morale: 0,
  maxTargets: 1,
  minTargets: 1,
  abilities: [],
  levelScaling: null,
  cr: null,
  xp: null,
  multiattack: 1,
  legendaryActions: 0,
  legendaryResistances: 0,
  saveProficiencies: [],
  statblock: { movement: { walk: 20 } },
  spellcasting: {},
  sourceId: null,
  sourceHash: null,
};

const deps = { loadPool: async () => ({ units: [beast as never], races: [] }) };

const effect: SpellEffect = { kind: "transform", unitId: "frog", revertAtZero: true, duration: { rounds: 5 } };

const spell = (concentration = false): CastableSpell => ({
  id: "hex-frog",
  name: "Синтетична жаба",
  level: 1,
  groupId: null,
  definition: { dice: 0, cost: "action", concentration, targeting: { kind: "enemy", range: 30 }, resolution: { kind: "save", ability: "wisdom", onSuccess: "none" }, effects: [effect], raceModifiers: [] },
});

const mage = () => {
  const c = makeParticipant({ id: "mage" });

  return { ...c, spellcasting: { ...c.spellcasting, spellSaveDC: 10, spellSlots: { "1": { max: 2, current: 2 } } } };
};

const victim = (): BattleParticipant => {
  const v = makeParticipant({ id: "orc", side: ParticipantSide.ENEMY, hp: 30, maxHp: 40 });

  return { ...v, basicInfo: { ...v.basicInfo, sourceType: ParticipantSourceType.UNIT }, abilities: { ...v.abilities, intelligence: 14, strength: 18, modifiers: { ...v.abilities.modifiers, intelligence: 2, strength: 4 } }, combatStats: { ...v.combatStats, armorClass: 16, tempHp: 3 } };
};

const cast = (roll: number, concentration = false) => {
  const c = mage();

  const result = castSpell({ caster: c, spell: spell(concentration), targetIds: ["orc"], allParticipants: [c, victim()], currentRound: 2, battleId: "b", diceRolls: [], saveRolls: [{ participantId: "orc", roll }], rng: () => 0.5, rules });

  return result;
};

const transformed = async (concentration = false) => {
  const r = cast(1, concentration);

  const out = await applyTransforms(r.allParticipantsUpdated as BattleParticipant[], r.transforms ?? [], { campaignId: "c", battleId: "b", rules, deps, round: 2 });

  return { out, r, orc: out.order.find((p) => p.basicInfo.id === "orc") as BattleParticipant };
};

describe("transform: каст", () => {
  it("провал кидка дає запит, успіх — ні", () => {
    expect(cast(1).transforms).toEqual([expect.objectContaining({ targetId: "orc", unitId: "frog", expiresRound: 7 })]);
    expect(cast(20).transforms).toBeUndefined();
  });

  it("схема приймає ефект і відхиляє без revertAtZero", () => {
    const base = spell().definition;

    expect(SpellDefinitionSchema.safeParse(base).success).toBe(true);
    expect(SpellDefinitionSchema.safeParse({ ...base, effects: [{ ...effect, revertAtZero: false }] }).success).toBe(false);
  });
});

describe("transform: форма", () => {
  it("HP, КЗ, фізичні характеристики, швидкість і атаки з юніта; розум свій", async () => {
    const { orc, out } = await transformed();

    expect(orc.combatStats).toMatchObject({ maxHp: 4, currentHp: 4, armorClass: 11, speed: 20, tempHp: 0 });
    expect(orc.abilities).toMatchObject({ strength: 8, intelligence: 14 });
    expect(orc.abilities.modifiers.strength).toBe(-1);
    expect(orc.battleData.attacks[0].name).toBe("Укус");
    expect(orc.battleData.transform?.saved).toMatchObject({ maxHp: 40, currentHp: 30, tempHp: 3, armorClass: 16, strength: 18 });
    expect(orc.battleData.activeEffects.some((e) => e.abilityKey === "transform:" + orc.battleData.transform?.castId)).toBe(true);
    expect(textOf(out.messages[0])).toContain("Жаба");
  });

  it("немає юніта — форма не змінюється", async () => {
    const r = cast(1);

    const out = await applyTransforms(r.allParticipantsUpdated as BattleParticipant[], r.transforms ?? [], { campaignId: "c", battleId: "b", rules, deps: { loadPool: async () => ({ units: [], races: [] }) }, round: 2 });

    expect(out.order.find((p) => p.basicInfo.id === "orc")?.battleData.transform).toBeUndefined();
    expect(textsOf(out.messages)).toEqual(["форму перетворення не знайдено"]);
  });
});

describe("transform: відкат", () => {
  it("шкода 15 при 4 HP форми: відкат і −11 справжнім HP (спершу тимчасові)", async () => {
    const { orc } = await transformed();

    const after = { ...orc, combatStats: { ...orc.combatStats, currentHp: 0, status: CombatStatus.UNCONSCIOUS } };

    const r = applyDamageConsequences({ before: orc, after, amount: 15, rules, rng: () => 0.5, participants: [after] });

    expect(r.participant.battleData.transform).toBeUndefined();
    expect(r.participant.combatStats).toMatchObject({ maxHp: 40, currentHp: 22, tempHp: 0, armorClass: 16, status: CombatStatus.ACTIVE });
    expect(r.participant.abilities.strength).toBe(18);
    expect(r.participant.battleData.attacks).toEqual(victim().battleData.attacks);
    expect(r.participant.battleData.activeEffects).toEqual([]);
    expect(r.participants[0]).toBe(r.participant);
    expect(textOf(r.messages[0])).toContain("11");
  });

  it("надлишок валить справжню форму: наслідки для неї (юніт гине)", async () => {
    const { orc } = await transformed();

    const lethal = { ...orc, battleData: { ...orc.battleData, transform: { ...(orc.battleData.transform as NonNullable<typeof orc.battleData.transform>), saved: { ...(orc.battleData.transform as NonNullable<typeof orc.battleData.transform>).saved, currentHp: 5, tempHp: 0 } } } };

    const after = { ...lethal, combatStats: { ...lethal.combatStats, currentHp: 0, status: CombatStatus.UNCONSCIOUS } };

    const r = applyDamageConsequences({ before: lethal, after, amount: 20, rules, rng: () => 0.5, participants: [after] });

    expect(r.participant.combatStats).toMatchObject({ currentHp: 0, status: CombatStatus.DEAD });
  });

  it("шкода рівно по HP форми: відкат без втрат справжніх HP", async () => {
    const { orc } = await transformed();

    const after = { ...orc, combatStats: { ...orc.combatStats, currentHp: 0, status: CombatStatus.UNCONSCIOUS } };

    const r = applyDamageConsequences({ before: orc, after, amount: 4, rules, rng: () => 0.5, participants: [after] });

    expect(r.participant.combatStats).toMatchObject({ currentHp: 30, tempHp: 3, status: CombatStatus.ACTIVE });
  });

  it("форма вижила — без змін", async () => {
    const { orc } = await transformed();

    const after = { ...orc, combatStats: { ...orc.combatStats, currentHp: 1 } };

    const r = applyDamageConsequences({ before: orc, after, amount: 3, rules, rng: () => 0.5, participants: [after] });

    expect(r.participant.battleData.transform).toBeDefined();
    expect(r.participant.combatStats.maxHp).toBe(4);
  });
});

describe("transform: згасання", () => {
  it("за часом відновлює все; ще не час — той самий масив", async () => {
    const { out } = await transformed();

    expect(revertExpiredTransforms(out.order, 7).participants).toBe(out.order);

    const { participants, messages } = revertExpiredTransforms(out.order, 8);

    const orc = participants.find((p) => p.basicInfo.id === "orc") as BattleParticipant;

    expect(orc.combatStats).toMatchObject({ maxHp: 40, currentHp: 30, tempHp: 3, armorClass: 16 });
    expect(orc.abilities.strength).toBe(18);
    expect(orc.battleData.transform).toBeUndefined();
    expect(orc.battleData.activeEffects).toEqual([]);
    expect(textOf(messages[0])).toContain("звичайну форму");
  });

  it("втрата концентрації кастера повертає звичайну форму", async () => {
    const { out } = await transformed(true);

    const withConc = out.order;

    expect(revertExpiredTransforms(withConc, 3).participants).toBe(withConc);

    const dropped = dropConcentration(withConc, "mage", "").participants;

    const orc = revertExpiredTransforms(dropped, 3).participants.find((p) => p.basicInfo.id === "orc") as BattleParticipant;

    expect(orc.battleData.transform).toBeUndefined();
    expect(orc.combatStats.maxHp).toBe(40);
  });

  it("повторне перетворення зберігає справжню форму, а не попередню", async () => {
    const { r, orc } = await transformed();

    const again = await applyTransforms(r.allParticipantsUpdated.map((p) => (p.basicInfo.id === "orc" ? orc : p)) as BattleParticipant[], r.transforms ?? [], { campaignId: "c", battleId: "b", rules, deps, round: 3 });

    expect(again.order.find((p) => p.basicInfo.id === "orc")?.battleData.transform?.saved.maxHp).toBe(40);
  });
});

describe("transform: шкода заклинанням", () => {
  const bolt = (): CastableSpell => ({
    id: "bolt",
    name: "Снаряд",
    level: 1,
    groupId: null,
    definition: { dice: 2, cost: "action", concentration: false, targeting: { kind: "enemy", range: 30 }, resolution: { kind: "auto" }, effects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "force" }], raceModifiers: [] },
  });

  const hitForm = async (ruleset: Ruleset) => {
    const { orc } = await transformed();

    const c = mage();

    const r = castSpell({ caster: c, spell: bolt(), targetIds: ["orc"], allParticipants: [c, orc], currentRound: 3, battleId: "b", diceRolls: [4, 4], saveRolls: [], rng: () => 0.5, rules: ruleset });

    return (r.allParticipantsUpdated as BattleParticipant[]).find((p) => p.basicInfo.id === "orc") as BattleParticipant;
  };

  it.each([
    ["правила смертельних/концентрації увімкнені", rules],
    ["правила за замовчуванням", DEFAULT_RULES],
  ])("шкода 8 при 4 HP форми: форма втрачена, надлишок 4 йде на справжні HP (%s)", async (_n, ruleset) => {
    const orc = await hitForm(ruleset);

    expect(orc.battleData.transform).toBeUndefined();
    expect(orc.combatStats).toMatchObject({ maxHp: 40, currentHp: 29, tempHp: 0 });
  });
});
