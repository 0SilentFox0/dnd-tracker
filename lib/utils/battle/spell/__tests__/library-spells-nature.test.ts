import type { Prisma, Spell } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { SPELLS } from "@/data/library/spells";
import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { textOf } from "@/lib/i18n/test/text";
import { context } from "@/lib/server/battles/__tests__/mutations/fixtures";
import { createSpellMutation } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { allowedEffectKinds } from "@/lib/utils/abilities/editor";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { hasAdvantage } from "@/lib/utils/battle/attack/bonus";
import { runAttackPhase } from "@/lib/utils/battle/attack-phase/run-attack-phase";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import { applyResistance } from "@/lib/utils/battle/resistance";
import { castSpell } from "@/lib/utils/battle/spell";
import { resolveSpellTargets } from "@/lib/utils/battle/spell/spell-targeting";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";
import { calculateInitiative } from "@/lib/utils/battle/turn/initiative";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const spell = (key: string): CastableSpell => {
  const s = SPELLS.find((x) => x.key === key);

  if (!s) throw new Error(key);

  return { id: key, name: s.name, level: s.level, groupId: "nature", definition: { ...s.definition, raceModifiers: [] } };
};

const claw = { id: "claw", name: "Кіготь", type: "melee", attackBonus: 20, damageDice: "1d6", damageType: "slashing", targetType: "single" } as unknown as BattleAttack;

const slots = Object.fromEntries([1, 2, 3, 4, 5].map((l) => [String(l), { max: 3, current: 3 }]));

const mage = (level = 1): BattleParticipant => {
  const p = makeParticipant({ id: "mage", hp: 30, maxHp: 30, level });

  return { ...p, basicInfo: { ...p.basicInfo, controlledBy: "user-1" }, abilities: { ...p.abilities, initiative: 20, baseInitiative: 20 }, spellcasting: { ...p.spellcasting, spellSlots: slots } };
};

const unit = (id: string, side: ParticipantSide = ParticipantSide.ENEMY, hp = 100): BattleParticipant => {
  const p = makeParticipant({ id, side, hp, maxHp: hp });

  return {
    ...p,
    basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.UNIT, controlledBy: "dm" },
    abilities: { ...p.abilities, initiative: 10, baseInitiative: 10 },
    battleData: { ...p.battleData, attacks: [claw] },
  };
};

const scene: BattleSceneState = { id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 1, eventSeq: 0, pendingMoraleCheck: null, pendingCritChoice: null, startedAt: null, completedAt: null };

const FAIL = 1;

const PASS = 20;

function cast(key: string, order: BattleParticipant[], targetIds: string[], opts: { diceRolls?: number[]; saves?: Record<string, number> } = {}) {
  const caster = order.find((p) => p.basicInfo.id === "mage") as BattleParticipant;

  const def = spell(key);

  const resolved = resolveSpellTargets(order, caster, def, def.definition.targeting, targetIds);

  if (!resolved.ok) throw new Error(textOf(resolved.error));

  return castSpell({
    caster,
    spell: def,
    targetIds: resolved.targetIds,
    allParticipants: order,
    currentRound: 1,
    battleId: "b1",
    diceRolls: opts.diceRolls ?? [],
    saveRolls: Object.entries(opts.saves ?? {}).map(([participantId, roll]) => ({ participantId, roll })),
    rng: seq(0.99),
  });
}

const byId = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

/** Передає хід, поки не почнеться хід `id` (його старт уже оброблено: DoT, тривалості). */
function toTurnOf(id: string, ps: BattleParticipant[], s: BattleSceneState = scene) {
  let order = ps;

  let st = s;

  for (let i = 0; i < 20; i++) {
    const out = advanceTurn({ participants: order, pending: [], scene: st, rng: seq(0.99) });

    order = out.participants;
    st = { ...st, ...out.scene };

    if (order[st.turnIndex]?.basicInfo.id === id) return { order, scene: st };
  }

  throw new Error(`no turn for ${id}`);
}

function meleeBy(attackerId: string, targetId: string, order: BattleParticipant[], turnIndex: number) {
  return runAttackPhase({
    battle: { initiativeOrder: order, currentRound: 1, currentTurnIndex: turnIndex },
    data: { attackerId, targetId, attackId: "claw", d20Roll: 15, damageRolls: [3] },
    battleId: "b1",
    userId: "dm",
    isDM: true,
    rng: seq(0.5),
  });
}

describe("Корені (roots)", () => {
  const order = () => [mage(), unit("e1")];

  it("успішний рятівний кидок Сили — без ефекту", () => {
    const r = cast("roots", order(), ["e1"], { saves: { e1: PASS } });

    expect(byId(r.allParticipantsUpdated, "e1").battleData.activeEffects).toHaveLength(0);
  });

  it("провал: −2 ініціативи і заборона ближніх і дальніх атак", () => {
    const r = cast("roots", order(), ["e1"], { saves: { e1: FAIL } });

    const e1 = byId(r.allParticipantsUpdated, "e1");

    expect(hasEffectMarker(e1, "disable_melee_attacks")).toBe(true);
    expect(hasEffectMarker(e1, "disable_ranged_attacks")).toBe(true);
    expect(calculateInitiative(e1, r.allParticipantsUpdated)).toBe(calculateInitiative(unit("e1")) - 2);
  });

  it("Корені: заборона ближніх атак ще діє на наступному ході ворога («1 раунд»)", () => {
    const r = cast("roots", order(), ["e1"], { saves: { e1: FAIL } });

    const { order: o } = toTurnOf("e1", r.allParticipantsUpdated);

    expect(hasEffectMarker(byId(o, "e1"), "disable_melee_attacks")).toBe(true);
  });

  it("Корені/Сплутування: рушій атаки відхиляє ближню атаку з disable_melee_attacks", () => {
    const e1 = unit("e1");

    const rooted = { ...e1, battleData: { ...e1.battleData, activeEffects: [{ id: "r", name: "Корені", type: "condition" as const, duration: 2, appliedAt: { round: 1, timestamp: new Date() }, effects: [{ type: "disable_melee_attacks", value: 1 }] }] } };

    expect(() => meleeBy("e1", "mage", [rooted, mage()], 0)).toThrow();
  });
});

describe("Слово лікування (healing-word)", () => {
  it("витрачає бонусну дію, а не дію; лікування обмежене maxHp", () => {
    const hurt = { ...mage(), combatStats: { ...mage().combatStats, currentHp: 25 } };

    const r = cast("healing-word", [hurt, unit("e1")], ["mage"], { diceRolls: [6, 6, 6] });

    expect(r.casterUpdated.actionFlags).toMatchObject({ hasUsedAction: false, hasUsedBonusAction: true });
    expect(r.casterUpdated.combatStats.currentHp).toBe(30);
  });

  it("мутація дозволяє каст після використаної дії й відхиляє після використаної бонусної", async () => {
    const def = SPELLS.find((s) => s.key === "healing-word")?.definition;

    const row = { id: "hw", campaignId: "c1", name: "Слово лікування", level: 1, groupId: null, icon: null, dice: def?.dice, cost: def?.cost, targeting: def?.targeting, resolution: def?.resolution, spellEffects: def?.effects, raceModifiers: [] } as unknown as Spell;

    const m = createSpellMutation({ loadSpell: vi.fn(async () => row), loadPool: async () => ({ units: [], races: [] }) });

    const base = { ...mage(), spellcasting: { ...mage().spellcasting, knownSpells: ["hw"] } };

    const acted = { ...base, actionFlags: { ...base.actionFlags, hasUsedAction: true } };

    const body = { casterId: "mage", spellId: "hw", targetIds: ["mage"], diceRolls: [1, 1, 1] };

    await expect(m(context({ participants: [acted, unit("e1")] }), body as never)).resolves.toBeDefined();

    const bonused = { ...base, actionFlags: { ...base.actionFlags, hasUsedBonusAction: true } };

    await expect(m(context({ participants: [bonused, unit("e1")] }), body as never)).rejects.toMatchObject({ code: "action_used" });
  });
});

describe("Колючі лози (thorny-vines)", () => {
  it("отрута б'є на початку кожного з 3 наступних ходів ворога, потім спадає", () => {
    const r = cast("thorny-vines", [mage(), unit("e1")], ["e1"], { diceRolls: [5] });

    let o = r.allParticipantsUpdated;

    let s = scene;

    const hp: number[] = [];

    for (let i = 0; i < 4; i++) {
      ({ order: o, scene: s } = toTurnOf("e1", o, s));
      hp.push(byId(o, "e1").combatStats.currentHp);
    }

    expect(hp).toEqual([95, 90, 85, 85]);
  });
});

describe("Місячний промінь (moonbeam)", () => {
  it("повна шкода, і атаки по цілі мають перевагу", () => {
    const r = cast("moonbeam", [mage(), unit("e1")], ["e1"], { diceRolls: [5, 5, 5] });

    const ps = r.allParticipantsUpdated;

    expect(byId(ps, "e1").combatStats.currentHp).toBe(85);
    expect(hasAdvantage(byId(ps, "mage"), claw, ps, undefined, { targetId: "e1" })).toBe(true);
  });

  it("підсвічування тримається 2 ходи цілі, на третьому знімається", () => {
    const r = cast("moonbeam", [mage(), unit("e1")], ["e1"], { diceRolls: [5, 5, 5] });

    const lit = (o: BattleParticipant[]) => findFlags(o, "e1", "advantageForAttackers").length;

    const first = toTurnOf("e1", r.allParticipantsUpdated);

    const second = toTurnOf("e1", first.order, first.scene);

    const third = toTurnOf("e1", second.order, second.scene);

    expect([lit(first.order), lit(second.order), lit(third.order)]).toEqual([1, 1, 0]);
  });
});

describe("Рій ос (wasp-swarm)", () => {
  const order = () => [mage(), unit("e1"), unit("e2"), unit("e3"), unit("e4")];

  it("до 3 цілей: шкода й −2 ініціативи кожній", () => {
    const r = cast("wasp-swarm", order(), ["e1", "e2", "e3"], { diceRolls: [3, 4] });

    for (const id of ["e1", "e2", "e3"]) {
      const p = byId(r.allParticipantsUpdated, id);

      expect(p.combatStats.currentHp).toBe(93);
      expect(calculateInitiative(p, r.allParticipantsUpdated)).toBe(calculateInitiative(unit(id)) - 2);
    }
  });

  it("4 цілі — відхилено", () => {
    expect(() => cast("wasp-swarm", order(), ["e1", "e2", "e3", "e4"], { diceRolls: [3, 4] })).toThrow("Забагато цілей");
  });
});

describe("Дух лісу (forest-spirit)", () => {
  const ally = () => ({ ...unit("a1", ParticipantSide.ALLY, 50), combatStats: { ...unit("a1", ParticipantSide.ALLY, 50).combatStats, currentHp: 10 } });

  it("регенерація 10 % maxHp на 3 ходи союзника", () => {
    const r = cast("forest-spirit", [mage(), ally(), unit("e1")], ["a1"]);

    let o = r.allParticipantsUpdated;

    let s = scene;

    const hp: number[] = [];

    for (let i = 0; i < 4; i++) {
      ({ order: o, scene: s } = toTurnOf("a1", o, s));
      hp.push(byId(o, "a1").combatStats.currentHp);
    }

    expect(hp).toEqual([15, 20, 25, 25]);
  });

  it("опір 50 % до отрути для прямої шкоди", () => {
    const r = cast("forest-spirit", [mage(), ally(), unit("e1")], ["a1"]);

    expect(applyResistance(byId(r.allParticipantsUpdated, "a1"), 10, "poison", { participants: r.allParticipantsUpdated }).finalDamage).toBe(5);
  });

  it("Дух лісу: опір до отрути зменшує й отруту з часом (DoT)", () => {
    const r = cast("forest-spirit", [mage(), ally(), unit("e1")], ["a1"]);

    const cast1 = byId(r.allParticipantsUpdated, "a1");

    const poisoned = { ...cast1, combatStats: { ...cast1.combatStats, currentHp: 20 } };

    const withDot = { ...poisoned, battleData: { ...poisoned.battleData, activeEffects: [...poisoned.battleData.activeEffects, { id: "plague", name: "Чума", type: "debuff" as const, duration: 2, appliedAt: { round: 1, timestamp: new Date() }, effects: [], dotDamage: { damagePerRound: 10, damageType: "poison" } }] } };

    const o = r.allParticipantsUpdated.map((p) => (p.basicInfo.id === "a1" ? withDot : p));

    const { order: after } = toTurnOf("a1", o);

    // 20 HP − 5 (отрута з опором) + 5 (регенерація)
    expect(byId(after, "a1").combatStats.currentHp).toBe(20);
  });
});

describe("Сплутування (entangle)", () => {
  it("до 3 ворогів, кидок Сили: хто провалив — без ближніх атак", () => {
    const r = cast("entangle", [mage(), unit("e1"), unit("e2")], ["e1", "e2"], { saves: { e1: FAIL, e2: PASS } });

    expect(hasEffectMarker(byId(r.allParticipantsUpdated, "e1"), "disable_melee_attacks")).toBe(true);
    expect(byId(r.allParticipantsUpdated, "e2").battleData.activeEffects).toHaveLength(0);
  });

  it("Сплутування: заборона ще діє на наступному ході ворога", () => {
    const r = cast("entangle", [mage(), unit("e1")], ["e1"], { saves: { e1: FAIL } });

    const { order: o, scene: s } = toTurnOf("e1", r.allParticipantsUpdated);

    expect(() => meleeBy("e1", "mage", o, s.turnIndex)).toThrow();
  });
});

describe("Землетрус (earthquake)", () => {
  it("усі вороги: провал — повна шкода + недолік, успіх — половина без недоліку", () => {
    const o = [mage(), unit("e1"), unit("e2")];

    const r = cast("earthquake", o, ["e1", "e2"], { diceRolls: [5, 4], saves: { e1: FAIL, e2: PASS } });

    const ps = r.allParticipantsUpdated;

    expect(byId(ps, "e1").combatStats.currentHp).toBe(91);
    expect(byId(ps, "e2").combatStats.currentHp).toBe(96);
    expect(findFlags(ps, "e1", "disadvantage")).toHaveLength(1);
    expect(findFlags(ps, "e2", "disadvantage")).toHaveLength(0);
  });

  it("Землетрус: недолік ще діє на наступному ході ворога", () => {
    const r = cast("earthquake", [mage(), unit("e1")], ["e1"], { diceRolls: [5, 4], saves: { e1: FAIL } });

    const { order: o } = toTurnOf("e1", r.allParticipantsUpdated);

    expect(findFlags(o, "e1", "disadvantage")).toHaveLength(1);
  });
});

describe("Хвиля зцілення (healing-wave)", () => {
  it("лікує живих союзників до maxHp, не воскрешає полеглих, не лікує ворогів", () => {
    const hurt = (id: string, hp: number) => ({ ...unit(id, ParticipantSide.ALLY, 50), combatStats: { ...unit(id, ParticipantSide.ALLY, 50).combatStats, currentHp: hp, ...(hp === 0 && { status: "unconscious" as const }) } });

    const foe = { ...unit("e1"), combatStats: { ...unit("e1").combatStats, currentHp: 10 } };

    const r = cast("healing-wave", [mage(), hurt("a1", 10), hurt("a2", 48), hurt("a3", 0), foe], [], { diceRolls: [3, 3, 3] });

    const ps = r.allParticipantsUpdated;

    expect(byId(ps, "a1").combatStats.currentHp).toBe(19);
    expect(byId(ps, "a2").combatStats.currentHp).toBe(50);
    expect(byId(ps, "a3").combatStats).toMatchObject({ currentHp: 0, status: "unconscious" });
    expect(byId(ps, "e1").combatStats.currentHp).toBe(10);
  });
});

describe("Шторм природи (nature-storm)", () => {
  it("усі вороги отримують шкоду й стан «без заклинань»", () => {
    const r = cast("nature-storm", [mage(), unit("e1"), unit("e2")], [], { diceRolls: [2, 2, 2] });

    for (const id of ["e1", "e2"]) {
      const p = byId(r.allParticipantsUpdated, id);

      expect(p.combatStats.currentHp).toBe(94);
      expect(hasEffectMarker(p, "disable_spell_casting")).toBe(true);
    }
  });

  it("Шторм природи: ворог не може чаклувати на своєму наступному ході", async () => {
    const r = cast("nature-storm", [mage(), unit("e1")], [], { diceRolls: [2, 2, 2] });

    const { order: o, scene: s } = toTurnOf("e1", r.allParticipantsUpdated);

    const e1 = byId(o, "e1");

    const caster = { ...e1, spellcasting: { ...e1.spellcasting, spellSlots: { universal: { max: 1, current: 1 } }, knownSpells: ["x"] } };

    const row = { id: "x", campaignId: "c1", name: "X", level: 1, groupId: null, icon: null, dice: 0, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" }, spellEffects: [], raceModifiers: [] } as unknown as Spell;

    const m = createSpellMutation({ loadSpell: vi.fn(async () => row), loadPool: async () => ({ units: [], races: [] }) });

    const ps = o.map((p) => (p.basicInfo.id === "e1" ? caster : p));

    await expect(m(context({ participants: ps, scene: { ...context().scene, ...s }, isDM: true, userId: "dm" }), { casterId: "e1", spellId: "x", targetIds: ["mage"], diceRolls: [] } as never)).rejects.toMatchObject({ code: "action_rejected" });
  });
});

describe("Відродження лісу (forest-rebirth)", () => {
  it("усі полеглі союзники (зокрема прикликані) повертаються з 30 % HP і отримують хід", () => {
    const down = (id: string, status: "dead" | "unconscious", hp: number, side: ParticipantSide = ParticipantSide.ALLY) => {
      const p = unit(id, side, 50);

      return { ...p, combatStats: { ...p.combatStats, currentHp: hp, status } };
    };

    const summoned = { ...down("s1", "dead", -3), battleData: { ...down("s1", "dead", -3).battleData, summonedBy: "mage" } };

    const r = cast("forest-rebirth", [mage(), down("a1", "unconscious", 0), summoned, unit("e1"), down("e2", "dead", 0, ParticipantSide.ENEMY)], []);

    const ps = r.allParticipantsUpdated;

    expect(byId(ps, "a1").combatStats).toMatchObject({ currentHp: 15, status: "active" });
    expect(byId(ps, "s1").combatStats).toMatchObject({ currentHp: 15, status: "active" });
    expect(byId(ps, "e2").combatStats.status).toBe("dead");

    const after = advanceTurn({ participants: ps, pending: [], scene, rng: seq(0.99) });

    expect(after.participants[after.scene.turnIndex ?? -1].basicInfo.id).toBe("a1");
  });

  it("без полеглих — відхилено", () => {
    expect(() => cast("forest-rebirth", [mage(), unit("e1")], [])).toThrow("Немає полеглих");
  });
});

describe("Прикликання (Фенікс, елементалі)", () => {
  const unitRow = (id: string, levelScaling: unknown) =>
    ({
      id, campaignId: "c1", name: id, raceId: null, level: 7, strength: 14, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10,
      armorClass: 16, initiative: 19, speed: 30, maxHp: 40, proficiencyBonus: 2, attacks: [{ name: "Кігті", type: "melee", attackBonus: 4, damageDice: "2d10", damageType: "fire" }], knownSpells: [], avatar: null, createdAt: new Date(), immunities: [], morale: 0, maxTargets: 1, minTargets: 1, abilities: [], levelScaling,
    }) as unknown as UnitFromPrisma;

  it.each(["call-of-the-beast", "summon-fire-elemental", "summon-water-elemental", "summon-air-elemental", "summon-earth-elemental"])("%s: юніт під контролем гравця, на боці заклинателя, масштабований рівнем", async (key) => {
    const lib = SPELLS.find((s) => s.key === key);

    const effects = (lib?.definition.effects ?? []).map((e) => (e.kind === "summon" ? { ...e, unitId: "u-db" } : e));

    const row = { id: key, campaignId: "c1", name: lib?.name, level: lib?.level, groupId: null, icon: null, dice: 0, cost: "action", targeting: lib?.definition.targeting, resolution: lib?.definition.resolution, spellEffects: effects, raceModifiers: [] } as unknown as Spell;

    const m = createSpellMutation({ loadSpell: vi.fn(async () => row), loadPool: async () => ({ units: [unitRow("u-db", { hpPerLevel: 10, damagePerLevel: 1, attackPerTwoLevels: 1 })], races: [] as Prisma.RaceGetPayload<object>[] }) });

    const caster = { ...mage(6), spellcasting: { ...mage(6).spellcasting, knownSpells: [key] } };

    const out = await m(context({ participants: [caster, unit("e1")] }), { casterId: "mage", spellId: key, targetIds: [], diceRolls: [] } as never);

    const summoned = out.participants.find((p) => p.battleData.summonedBy === "mage") as BattleParticipant;

    expect(summoned).toBeDefined();
    expect(summoned.basicInfo).toMatchObject({ side: ParticipantSide.ALLY, controlledBy: "user-1" });
    expect(summoned.combatStats.maxHp).toBe(40 + 60);
    expect(out.participants.at(-1)?.basicInfo.id).toBe(summoned.basicInfo.id);
    expect(byId(out.participants, "mage").spellcasting.spellSlots[String(lib?.level)].current).toBe(2);
  });
});

describe("Аватар (avatar)", () => {
  it("прикликає Аватара Смерті й витрачає слот", () => {
    const r = cast("avatar", [mage(), unit("e1")], []);

    expect(r.summons.map((s) => s.unitId)).toEqual(["neutral-death-avatar"]);
    expect(r.casterUpdated.spellcasting.spellSlots["4"].current).toBe(2);
  });

  it("редактор заклинання дозволяє ефект summon (DM обирає юніта)", () => {
    expect(allowedEffectKinds({ event: "action" })).toContain("summon");
  });
});
