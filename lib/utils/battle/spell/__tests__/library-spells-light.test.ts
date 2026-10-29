import { describe, expect, it } from "vitest";

import { SPELLS } from "@/data/library/spells";
import { AttackType, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { textOf } from "@/lib/i18n/test/text";
import { seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { findParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { processAttack } from "@/lib/utils/battle/attack/process";
import { movementBudget } from "@/lib/utils/battle/grid";
import { eventTextOf } from "@/lib/utils/battle/log/__tests__/event-text";
import { castSpell } from "@/lib/utils/battle/spell";
import { resolveSpellTargets } from "@/lib/utils/battle/spell/spell-targeting";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const spellOf = (key: string): CastableSpell => {
  const s = SPELLS.find((x) => x.key === key);

  if (!s) throw new Error(key);

  return {
    id: key,
    name: s.name,
    level: s.level,
    groupId: s.school,
    definition: { ...s.definition, raceModifiers: s.raceModifiers.map((m) => ({ raceId: m.raceKey, percent: m.percent })) },
  };
};

const unit = (id: string, side: ParticipantSide = ParticipantSide.ALLY, over: { hp?: number; maxHp?: number; raceId?: string; init?: number } = {}): BattleParticipant => {
  const b = createMockParticipant();

  return {
    ...b,
    basicInfo: { ...b.basicInfo, id, name: id, side, sourceType: ParticipantSourceType.UNIT, controlledBy: side === ParticipantSide.ALLY ? "user-1" : "dm" },
    abilities: { ...b.abilities, raceId: over.raceId, initiative: over.init ?? 10, baseInitiative: over.init ?? 10 },
    combatStats: { ...b.combatStats, currentHp: over.hp ?? 100, maxHp: over.maxHp ?? 100 },
    spellcasting: { ...b.spellcasting, spellSlots: { universal: { max: 5, current: 5 } } },
  };
};

const scene = (round: number, turnIndex: number): BattleSceneState => ({
  id: "b", campaignId: "c", status: "active", round, turnIndex, version: 1, eventSeq: 0, pendingMoraleCheck: null, pendingCritChoice: null, startedAt: null, completedAt: null,
});

const get = (ps: BattleParticipant[], id: string) => findParticipant(ps, id) as BattleParticipant;

function cast(key: string, caster: BattleParticipant, targetIds: string[], all: BattleParticipant[], o: { dice?: number[]; round?: number; saveRolls?: { participantId: string; roll: number }[] } = {}) {
  const spell = spellOf(key);

  const resolved = resolveSpellTargets(all, caster, spell, spell.definition.targeting, targetIds);

  if (!resolved.ok) throw new Error(textOf(resolved.error));

  return castSpell({ caster, spell, targetIds: resolved.targetIds, allParticipants: all, currentRound: o.round ?? 1, battleId: "b", diceRolls: o.dice ?? [], saveRolls: o.saveRolls, rng: seq(0.5) });
}

/** Ходить по колу, повертає учасника на початку кожного його ходу. */
function turnsOf(ps: BattleParticipant[], id: string, count: number, start = scene(1, 0)) {
  let order = ps;

  let s = start;

  const seen: BattleParticipant[] = [];

  for (let i = 0; i < count * order.length * 2 && seen.length < count; i++) {
    const out = advanceTurn({ participants: order, pending: [], scene: s, rng: seq(0.99) });

    order = out.participants;
    s = { ...s, ...out.scene };

    if (order[s.turnIndex].basicInfo.id === id) seen.push(order[s.turnIndex]);
  }

  return { seen, order, scene: s };
}

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d10", damageType: "slashing" };

const bow: BattleAttack = { id: "bw", name: "Лук", type: AttackType.RANGED, attackBonus: 5, damageDice: "1d10", damageType: "piercing" };

const armed = (p: BattleParticipant) => ({ ...p, battleData: { ...p.battleData, attacks: [sword, bow] } });

function attack(attacker: BattleParticipant, target: BattleParticipant, weapon: BattleAttack, d20: number, dmg = 8) {
  return processAttack({ attacker, target, attack: weapon, d20Roll: d20, damageRolls: [dmg], allParticipants: [attacker, target], currentRound: 1, battleId: "b", rng: seq(0.99) });
}

const hits = (r: ReturnType<typeof attack>) => !eventTextOf(r.battleAction).includes("промах");

describe("Світло: бібліотека", () => {
  it("13 заклинань школи", () => {
    expect(SPELLS.filter((s) => s.school === "Світло")).toHaveLength(13);
  });
});

describe("Божественна сила (+25 % шкоди, 3 раунди)", () => {
  const c = unit("c");

  const ally = armed(unit("a"));

  const foe = unit("e", ParticipantSide.ENEMY, { hp: 500, maxHp: 500 });

  const buffed = get(cast("divine-strength", c, ["a"], [c, ally, foe]).allParticipantsUpdated, "a");

  it("зброя: +25 %", () => {
    const plain = attack(ally, foe, sword, 15).damage?.finalDamage as number;

    const boosted = attack(buffed, foe, sword, 15).damage?.finalDamage as number;

    expect(boosted).toBe(Math.floor(plain * 1.25));
  });

  it("заклинання: +25 %", () => {
    const hit = (p: BattleParticipant) => 500 - get(cast("eldritch-arrow", p, ["e"], [p, foe], { dice: [4, 4, 4] }).allParticipantsUpdated, "e").combatStats.currentHp;

    expect(hit(buffed)).toBe(15);
    expect(hit(ally)).toBe(12);
  });
});

describe("Поспіх (+3 ініціативи, +10 фт швидкості, 3 раунди)", () => {
  it("змінює чергу з наступного раунду", () => {
    const c = unit("c", ParticipantSide.ALLY, { init: 20 });

    const slow = unit("a", ParticipantSide.ALLY, { init: 8 });

    const foe = unit("e", ParticipantSide.ENEMY, { init: 10 });

    const ps = cast("haste", c, ["a"], [c, foe, slow]).allParticipantsUpdated;

    const out = advanceTurn({ participants: ps, pending: [], scene: scene(1, 2), rng: seq(0.99) });

    expect(out.scene.round).toBe(2);
    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["c", "a", "e"]);
    expect(get(out.participants, "a").abilities.initiative).toBe(11);
  });

  it("додає 2 клітинки руху", () => {
    const c = unit("c");

    const a = unit("a");

    const before = movementBudget(a);

    const ps = cast("haste", c, ["a"], [c, a]).allParticipantsUpdated;

    expect(movementBudget(get(ps, "a"))).toBe(before + 2);
  });
});

describe("Регенерація (10 % maxHp на початку ходу, 3 раунди)", () => {
  it("лікує на початку своїх ходів рівно 3 рази, далі зникає", () => {
    const c = unit("c");

    const ally = unit("a", ParticipantSide.ALLY, { hp: 10, maxHp: 100 });

    const foe = unit("e", ParticipantSide.ENEMY, { hp: 500, maxHp: 500 });

    const ps = cast("regeneration", c, ["a"], [c, ally, foe]).allParticipantsUpdated;

    const { seen } = turnsOf(ps, "a", 4);

    expect(seen.map((p) => p.combatStats.currentHp)).toEqual([20, 30, 40, 40]);
    expect(seen[3].battleData.activeEffects).toHaveLength(0);
  });
});

describe("Очищення", () => {
  it("знімає дебафи, DoT і стани ворога, залишає бафи", () => {
    const c = unit("c");

    const foe = unit("e", ParticipantSide.ENEMY, { hp: 500, maxHp: 500 });

    let ally = unit("a");

    let ps = [c, ally, foe];

    ps = cast("frailty", { ...foe, spellcasting: c.spellcasting }, ["a"], ps).allParticipantsUpdated;
    ps = cast("plague", { ...get(ps, "e"), spellcasting: c.spellcasting }, ["a"], ps, { dice: [5] }).allParticipantsUpdated;
    ps = cast("roots", { ...get(ps, "e"), spellcasting: c.spellcasting }, ["a"], ps, { saveRolls: [{ participantId: "a", roll: 1 }] }).allParticipantsUpdated;
    ps = cast("stoneskin", c, ["a"], ps).allParticipantsUpdated;

    expect(get(ps, "a").battleData.activeEffects.length).toBeGreaterThanOrEqual(4);

    ally = get(cast("cleansing", c, ["a"], ps).allParticipantsUpdated, "a");

    expect(ally.battleData.activeEffects.map((e) => e.name)).toEqual(["Кам'яна шкіра"]);
  });

  it("Очищення зачарованого Ляльководом юніта не лишає його назавжди на нашому боці", () => {
    const c = unit("c");

    const foe = unit("e", ParticipantSide.ENEMY, { hp: 500, maxHp: 500 });

    const other = unit("e2", ParticipantSide.ENEMY, { hp: 500, maxHp: 500 });

    let ps = cast("puppet-master", c, ["e"], [c, foe, other], { saveRolls: [{ participantId: "e", roll: 1 }] }).allParticipantsUpdated;

    expect(get(ps, "e").basicInfo.side).toBe(ParticipantSide.ALLY);

    ps = cast("cleansing", get(ps, "c"), ["e"], ps).allParticipantsUpdated;

    const { order } = turnsOf(ps, "e", 3);

    expect(get(order, "e").basicInfo.side).toBe(ParticipantSide.ENEMY);
  });
});

describe("Кам'яна шкіра (+3 AC) і Праведна міць (+3 атаки, +15 % шкоди)", () => {
  const c = unit("c");

  const attacker = armed(unit("x", ParticipantSide.ENEMY));

  const ally = unit("a");

  it("+3 AC перетворює влучання на промах", () => {
    // бонус атаки 5+2+2 = 9; d20 = 6 → 15 проти AC 14 (влучання) і 17 (промах)
    expect(hits(attack(attacker, ally, sword, 6))).toBe(true);

    const stone = get(cast("stoneskin", c, ["a"], [c, ally, attacker]).allParticipantsUpdated, "a");

    expect(hits(attack(attacker, stone, sword, 6))).toBe(false);
  });

  it("Праведна міць: +3 до атаки і +15 % шкоди", () => {
    const hero = armed(unit("a"));

    const foe = unit("e", ParticipantSide.ENEMY, { hp: 500, maxHp: 500 });

    const might = get(cast("righteous-might", c, ["a"], [c, hero, foe]).allParticipantsUpdated, "a");

    // d20 = 2 → 11 (промах проти 14); з +3 → 14 (влучання)
    expect(hits(attack(hero, foe, sword, 2))).toBe(false);
    expect(hits(attack(might, foe, sword, 2))).toBe(true);

    const plain = attack(hero, foe, sword, 15).damage?.finalDamage as number;

    expect(attack(might, foe, sword, 15).damage?.finalDamage).toBe(Math.floor(plain * 1.15));
  });
});

describe("Ухилення (−50 % від дальніх атак)", () => {
  it("ріже дальню шкоду навпіл, ближню — ні", () => {
    const c = unit("c");

    const shooter = armed(unit("x", ParticipantSide.ENEMY));

    const ally = unit("a", ParticipantSide.ALLY, { hp: 500, maxHp: 500 });

    const ev = get(cast("evasion", c, ["a"], [c, ally, shooter]).allParticipantsUpdated, "a");

    const ranged = (t: BattleParticipant) => attack(shooter, t, bow, 15).damage?.finalDamage as number;

    const melee = (t: BattleParticipant) => attack(shooter, t, sword, 15).damage?.finalDamage as number;

    expect(ranged(ev)).toBe(Math.floor(ranged(ally) / 2));
    expect(melee(ev)).toBe(melee(ally));
  });
});

describe("Магічний імунітет (2 раунди: шкода заклинань і контроль)", () => {
  const c = unit("c");

  const enemyCaster = unit("x", ParticipantSide.ENEMY);

  const ally = unit("a", ParticipantSide.ALLY, { hp: 100, maxHp: 100 });

  const ps = cast("magic-immunity", c, ["a"], [c, ally, enemyCaster]).allParticipantsUpdated;

  const hostile = (key: string, dice: number[] = []) => get(cast(key, get(ps, "x"), ["a"], ps, { dice, saveRolls: [{ participantId: "a", roll: 1 }] }).allParticipantsUpdated, "a");

  it.each([
    ["eldritch-arrow", [5, 5, 5]],
    ["fireball", [5, 5, 5]],
    ["implosion", [5, 5, 5, 5, 5, 5, 5, 5]],
  ] as const)("пряма шкода %s = 0", (key, dice) => {
    expect(hostile(key, [...dice]).combatStats.currentHp).toBe(100);
  });

  it("Армагеддон не шкодить захищеному", () => {
    const r = cast("armageddon", get(ps, "x"), [], ps, { dice: [5, 5, 5, 5] });

    expect(get(r.allParticipantsUpdated, "a").combatStats.currentHp).toBe(100);
    expect(get(r.allParticipantsUpdated, "c").combatStats.currentHp).toBeLessThan(100);
  });

  it.each(["roots", "blindness", "confusion", "deep-freeze"])("стан контролю %s не накладається", (key) => {
    const after = hostile(key, key === "deep-freeze" ? [5, 5, 5, 5, 5, 5] : []);

    expect(after.battleData.activeEffects.filter((e) => e.type === "condition")).toHaveLength(0);
  });

  it("Магічний імунітет: DoT-заклинання (Чума, Колючі лози) не шкодять", () => {
    let order = ps;

    order = cast("plague", get(order, "x"), ["a"], order, { dice: [6] }).allParticipantsUpdated;
    order = cast("thorny-vines", get(order, "x"), ["a"], order, { dice: [6] }).allParticipantsUpdated;

    const { seen } = turnsOf(order, "a", 1);

    expect(seen[0].combatStats.currentHp).toBe(100);
  });

  it("тривалість: каст до ходу цілі — діє 2 її ходи, на третьому вже немає", () => {
    const { seen } = turnsOf(ps, "a", 3);

    expect(seen.map((p) => p.battleData.activeEffects.length)).toEqual([2, 2, 0]);
  });
});

describe("Телепортація", () => {
  it("лише нотатка DM, витрачає слот і дію", () => {
    const c = unit("c");

    const ally = unit("a");

    const r = cast("teleportation", c, ["a"], [c, ally]);

    expect(r.casterUpdated.spellcasting.spellSlots.universal.current).toBe(4);
    expect(r.casterUpdated.actionFlags.hasUsedAction).toBe(true);
    expect(eventTextOf(r.battleAction)).toContain("📜");
  });
});

describe("Божественна відплата", () => {
  it("+1 % шкоди за кожен 1 % втраченого HP", () => {
    const foe = unit("e", ParticipantSide.ENEMY, { hp: 500, maxHp: 500 });

    const hit = (hp: number) => {
      const c = unit("c", ParticipantSide.ALLY, { hp, maxHp: 100 });

      return 500 - get(cast("divine-retribution", c, ["e"], [c, foe], { dice: [5, 5, 5, 5, 5, 5] }).allParticipantsUpdated, "e").combatStats.currentHp;
    };

    expect(hit(100)).toBe(30);
    expect(hit(50)).toBe(45);
    expect(hit(10)).toBe(57);
  });
});

describe("Слово світла", () => {
  it("люди/ельфи/гноми/маги — імунітет, інші вороги отримують шкоду", () => {
    const c = unit("c");

    const foes = ["humans", "elves", "dwarves", "mages", "demons", "necromancers", "dark-elves"].map((r) => unit(r, ParticipantSide.ENEMY, { raceId: r }));

    const r = cast("word-of-light", c, [], [c, ...foes], { dice: [4, 4, 4] });

    const lost = Object.fromEntries(foes.map((f) => [f.basicInfo.id, 100 - get(r.allParticipantsUpdated, f.basicInfo.id).combatStats.currentHp]));

    expect(lost).toEqual({ humans: 0, elves: 0, dwarves: 0, mages: 0, demons: 12, necromancers: 12, "dark-elves": 12 });
  });

  it("сид мапить raceKey у id раси кампанії", async () => {
    const { mapRaceModifiers } = await import("@/scripts/seed/seed-library-lib");

    const races = new Map([["humans", "r-h"], ["elves", "r-e"], ["dwarves", "r-d"], ["mages", "r-m"]]);

    expect(mapRaceModifiers(SPELLS.find((s) => s.key === "word-of-light")?.raceModifiers ?? [], races).map((m) => m.raceId)).toEqual(["r-h", "r-e", "r-d", "r-m"]);
  });
});

describe("Воскресіння", () => {
  it("50 % maxHp і повернення в чергу ходів", () => {
    const c = unit("c");

    const fallen = { ...unit("a", ParticipantSide.ALLY, { hp: 0, maxHp: 80 }), combatStats: { ...unit("a").combatStats, currentHp: 0, maxHp: 80, status: "dead" as const } };

    const foe = unit("e", ParticipantSide.ENEMY, { hp: 500, maxHp: 500 });

    const ps = cast("resurrection", c, ["a"], [c, fallen, foe]).allParticipantsUpdated;

    expect(get(ps, "a").combatStats).toMatchObject({ currentHp: 40, status: "active" });

    const { seen } = turnsOf(ps, "a", 1);

    expect(seen).toHaveLength(1);
  });
});

describe("Вічне світло", () => {
  it("миттєве лікування кубиками + 2 тіки по 10 %", () => {
    const c = unit("c");

    const ally = unit("a", ParticipantSide.ALLY, { hp: 10, maxHp: 100 });

    const foe = unit("e", ParticipantSide.ENEMY, { hp: 500, maxHp: 500 });

    const ps = cast("eternal-light", c, ["a"], [c, ally, foe], { dice: [3, 3, 3, 3] }).allParticipantsUpdated;

    expect(get(ps, "a").combatStats.currentHp).toBe(22);

    const { seen } = turnsOf(ps, "a", 3);

    expect(seen.map((p) => p.combatStats.currentHp)).toEqual([32, 42, 42]);
  });
});

describe("тривалість «N раундів»", () => {
  it("бафф на 3 раунди на союзника, що вже ходив у цьому раунді, покриває 3 його наступні ходи", () => {
    const ally = unit("a");

    const c = unit("c");

    const foe = unit("e", ParticipantSide.ENEMY, { hp: 500, maxHp: 500 });

    // порядок a → c → e; c кастує у свій хід, коли a вже походив
    const ps = cast("stoneskin", c, ["a"], [ally, c, foe]).allParticipantsUpdated;

    const { seen } = turnsOf(ps, "a", 4, scene(1, 1));

    expect(seen.map((p) => p.battleData.activeEffects.length)).toEqual([1, 1, 1, 0]);
  });
});
