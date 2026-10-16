import { describe, expect, it } from "vitest";

import { SPELLS } from "@/data/library/spells";
import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { findParticipant, isActive } from "@/lib/utils/abilities/engine/core/participants";
import { createMockParticipant, grantPassive } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { hasDisadvantage } from "@/lib/utils/battle/attack/bonus";
import { castSpell } from "@/lib/utils/battle/spell";
import { casterSpellDice } from "@/lib/utils/battle/spell/caster-dice";
import { resolveSpellTargets } from "@/lib/utils/battle/spell/spell-targeting";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";
import { checkVictoryConditions } from "@/lib/utils/battle/turn/victory";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const CHAOS = "chaos";

function spell(key: string): CastableSpell {
  const s = SPELLS.find((x) => x.key === key);

  if (!s) throw new Error(`no spell ${key}`);

  return { id: key, name: s.name, level: s.level, groupId: CHAOS, definition: { ...s.definition, raceModifiers: [] } };
}

const slots = Object.fromEntries([1, 2, 3, 4, 5].map((l) => [String(l), { max: 3, current: 3 }]));

function unit(id: string, side: ParticipantSide, init: number, hp = 200): BattleParticipant {
  const base = createMockParticipant();

  return {
    ...base,
    basicInfo: { ...base.basicInfo, id, name: id, side, sourceType: ParticipantSourceType.UNIT },
    abilities: { ...base.abilities, initiative: init, baseInitiative: init },
    combatStats: { ...base.combatStats, currentHp: hp, maxHp: hp },
    spellcasting: { spellSlots: { universal: { max: 3, current: 3 } }, knownSpells: [] },
  };
}

function hero(id = "c", init = 20, over: { level?: number; magicMultiplier?: number; mastery?: Record<string, "basic" | "advanced" | "expert"> } = {}): BattleParticipant {
  const base = createMockParticipant();

  return {
    ...base,
    basicInfo: { ...base.basicInfo, id, name: id, side: ParticipantSide.ALLY, sourceType: ParticipantSourceType.CHARACTER },
    abilities: { ...base.abilities, level: over.level ?? 1, initiative: init, baseInitiative: init, magicMultiplier: over.magicMultiplier },
    combatStats: { ...base.combatStats, currentHp: 100, maxHp: 100 },
    spellcasting: { spellSlots: slots, knownSpells: [], spellSaveDC: 13 },
    battleData: { ...base.battleData, schoolMastery: over.mastery },
  };
}

const enemy = (id: string, init = 10, hp = 200) => unit(id, ParticipantSide.ENEMY, init, hp);

const P = (ps: BattleParticipant[], id: string) => findParticipant(ps, id) as BattleParticipant;

const hp = (ps: BattleParticipant[], id: string) => P(ps, id).combatStats.currentHp;

function cast(key: string, caster: BattleParticipant, order: BattleParticipant[], targets: string[], over: { rolls?: number[]; saves?: { participantId: string; roll: number }[]; round?: number } = {}) {
  const sp = spell(key);

  const res = resolveSpellTargets(order, caster, sp, sp.definition.targeting, targets);

  if (!res.ok) throw new Error(res.error);

  return castSpell({ caster, spell: sp, targetIds: res.targetIds, allParticipants: order, currentRound: over.round ?? 1, battleId: "b", diceRolls: over.rolls ?? [], saveRolls: over.saves ?? [], rng: seq(0.99) });
}

const scene = (turnIndex: number, round = 1): BattleSceneState => ({ id: "b", campaignId: "camp", status: "active", round, turnIndex, version: 1, eventSeq: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null });

/** Ганяє next-turn, поки не настане хід `id` (до maxSteps переходів). */
function advanceTo(order: BattleParticipant[], s: BattleSceneState, id: string, maxSteps = 10) {
  let ps = order;

  let sc = s;

  for (let i = 0; i < maxSteps; i++) {
    const r = advanceTurn({ participants: ps, pending: [], scene: sc, rng: seq(0.99) });

    ps = r.participants;
    sc = { ...sc, ...r.scene } as BattleSceneState;

    if (ps[sc.turnIndex].basicInfo.id === id) return { ps, scene: sc };
  }

  throw new Error(`turn of ${id} never came`);
}

const melee: BattleAttack = { id: "a", name: "Удар", type: "melee", attackBonus: 0, damageDice: "1d6", damageType: "slashing" } as BattleAttack;

describe("Хаос: кубики і множники", () => {
  it("кубики: N + ⌊рівень героя / 3⌋, грані за майстерністю школи", () => {
    const sp = spell("eldritch-arrow");

    const g = { dice: sp.definition.dice, groupId: CHAOS };

    expect(casterSpellDice(hero("c", 20, { level: 1 }), g)).toEqual({ count: 3, sides: 6 });
    expect(casterSpellDice(hero("c", 20, { level: 6, mastery: { [CHAOS]: "advanced" } }), g)).toEqual({ count: 5, sides: 8 });
    expect(casterSpellDice(hero("c", 20, { level: 9, mastery: { [CHAOS]: "expert" } }), g)).toEqual({ count: 6, sides: 10 });
  });

  it("опис «+1 кубик за кожні 3 рівні героя»: юніт теж отримує надбавку за свій рівень (не баг рушія, уточнення опису)", () => {
    const u = unit("u", ParticipantSide.ENEMY, 10);

    expect(casterSpellDice({ ...u, abilities: { ...u.abilities, level: 6 } }, { dice: 3, groupId: CHAOS })).toEqual({ count: 5, sides: 6 });
  });

  it("heroMagicMultiplier множить шкоду героя", () => {
    const c = hero("c", 20, { magicMultiplier: 1.5 });

    const r = cast("eldritch-arrow", c, [c, enemy("e")], ["e"], { rolls: [4, 4, 4] });

    expect(hp(r.allParticipantsUpdated, "e")).toBe(200 - 18);
  });

  it("balance damageMultiplier ворожого юніта масштабує шкоду заклинання", () => {
    const u = enemy("u");

    const scaled = { ...u, battleData: { ...u.battleData, damageMultiplier: 2 } };

    const target = hero("h");

    const r = cast("eldritch-arrow", scaled, [target, scaled], ["h"], { rolls: [3, 3, 3] });

    expect(hp(r.allParticipantsUpdated, "h")).toBe(100 - 18);
  });

  it("опір і імунітет до стихії діють на пряму шкоду", () => {
    const c = hero();

    const res = grantPassive(enemy("r"), [{ kind: "flag", flag: "resistance", damageType: "fire", percent: 50 }]);

    const imm = grantPassive(enemy("i"), [{ kind: "flag", flag: "resistance", damageType: "fire", percent: 100 }]);

    const a = cast("eldritch-arrow", c, [c, res], ["r"], { rolls: [4, 4, 4] });

    const b = cast("eldritch-arrow", c, [c, imm], ["i"], { rolls: [4, 4, 4] });

    expect(hp(a.allParticipantsUpdated, "r")).toBe(200 - 6);
    expect(hp(b.allParticipantsUpdated, "i")).toBe(200);
  });
});

describe("Хаос: заклинання", () => {
  it("Потойбічна стріла: сума кубиків вогнем, слот і дія витрачені", () => {
    const c = hero();

    const r = cast("eldritch-arrow", c, [c, enemy("e")], ["e"], { rolls: [1, 2, 3] });

    expect(hp(r.allParticipantsUpdated, "e")).toBe(194);
    expect(r.casterUpdated.spellcasting.spellSlots["1"].current).toBe(2);
    expect(r.casterUpdated.actionFlags.hasUsedAction).toBe(true);
  });

  it("Кам'яні шипи: до 2 ворогів, кожен отримує повну шкоду одного кидка; третя ціль відхилена", () => {
    const c = hero();

    const order = [c, enemy("e1"), enemy("e2"), enemy("e3")];

    const r = cast("stone-spikes", c, order, ["e1", "e2"], { rolls: [5, 6] });

    expect([hp(r.allParticipantsUpdated, "e1"), hp(r.allParticipantsUpdated, "e2")]).toEqual([189, 189]);

    const sp = spell("stone-spikes");

    expect(resolveSpellTargets(order, c, sp, sp.definition.targeting, ["e1", "e2", "e3"]).ok).toBe(false);
  });

  it("Крижаний болт: шкода холодом + ворог атакує з невигідністю в свій наступний хід (ціль ходить пізніше в тому ж раунді)", () => {
    const c = hero("c", 20);

    const order = [c, enemy("e", 10)];

    const r = cast("ice-bolt", c, order, ["e"], { rolls: [2, 2, 2] });

    expect(hp(r.allParticipantsUpdated, "e")).toBe(194);

    const { ps } = advanceTo(r.allParticipantsUpdated, scene(0), "e");

    expect(hasDisadvantage(P(ps, "e"), melee, ps)).toBe(true);
  });

  it("Крижаний болт: невигідність у наступний хід ворога, який уже ходив цього раунду", () => {
    const c = hero("c", 5);

    const order = [enemy("e", 10), c];

    const r = cast("ice-bolt", c, order, ["e"], { rolls: [2, 2, 2] });

    const { ps } = advanceTo(r.allParticipantsUpdated, scene(1), "e");

    expect(hasDisadvantage(P(ps, "e"), melee, ps)).toBe(true);
  });

  it("Блискавка: шкода + −2 ініціативи, що переставляє ворога в черзі наступного раунду", () => {
    const c = hero("c", 20);

    const order = [c, enemy("e", 11), hero("b", 10)];

    const r = cast("lightning-bolt", c, order, ["e"], { rolls: [1, 1, 1] });

    expect(hp(r.allParticipantsUpdated, "e")).toBe(197);

    const { ps, scene: sc } = advanceTo(r.allParticipantsUpdated, scene(0), "b");

    const next = advanceTo(ps, sc, "c");

    expect(next.scene.round).toBe(2);
    expect(next.ps.map((p) => p.basicInfo.id)).toEqual(["c", "b", "e"]);
  });

  it("Вогняна куля: рятівний кидок Спритності, успіх — половина, провал — повна", () => {
    const c = hero();

    const order = [c, enemy("e1"), enemy("e2"), enemy("e3")];

    const r = cast("fireball", c, order, ["e1", "e2", "e3"], { rolls: [5, 5, 5], saves: [{ participantId: "e1", roll: 20 }, { participantId: "e2", roll: 2 }, { participantId: "e3", roll: 2 }] });

    expect(["e1", "e2", "e3"].map((id) => hp(r.allParticipantsUpdated, id))).toEqual([193, 185, 185]);
    expect(r.battleAction.actionDetails.savingThrows).toHaveLength(3);
  });

  it("Вогняна стіна: один кидок на всіх ворогів, тікає на початку ходу кожного ворога 3 рази", () => {
    const c = hero("c", 20);

    const order = [c, enemy("e1", 10), enemy("e2", 9)];

    const r = cast("fire-wall", c, order, ["e1"], { rolls: [4] });

    expect(hp(r.allParticipantsUpdated, "e1")).toBe(200);

    let ps = r.allParticipantsUpdated;

    let sc = scene(0);

    for (let i = 0; i < 12; i++) {
      const step = advanceTurn({ participants: ps, pending: [], scene: sc, rng: seq(0.99) });

      ps = step.participants;
      sc = { ...sc, ...step.scene } as BattleSceneState;
    }

    expect([hp(ps, "e1"), hp(ps, "e2")]).toEqual([188, 188]);
    expect(P(ps, "e1").battleData.activeEffects).toHaveLength(0);
  });

  it("Вогняна стіна: опір вогню зменшує тіки DoT", () => {
    const c = hero("c", 20);

    const res = grantPassive(enemy("e", 10), [{ kind: "flag", flag: "resistance", damageType: "fire", percent: 50 }]);

    const r = cast("fire-wall", c, [c, res], ["e"], { rolls: [4] });

    const { ps } = advanceTo(r.allParticipantsUpdated, scene(0), "e");

    expect(hp(ps, "e")).toBe(198);
  });

  it("Вогняна стіна: тік DoT, що добиває останнього ворога, дає перемогу", () => {
    const c = hero("c", 20);

    const r = cast("fire-wall", c, [c, enemy("e", 10, 3)], ["e"], { rolls: [4] });

    const step = advanceTurn({ participants: r.allParticipantsUpdated, pending: [], scene: scene(0), rng: seq(0.99) });

    expect(isActive(P(step.participants, "e"))).toBe(false);
    expect(step.scene.status).toBe("completed");
  });

  it("Коло зими: провал — повна шкода і −2 ініціативи; успіх — половина без штрафу", () => {
    const c = hero();

    const r = cast("circle-of-winter", c, [c, enemy("e1"), enemy("e2")], ["e1", "e2"], { rolls: [4, 4, 4], saves: [{ participantId: "e1", roll: 1 }, { participantId: "e2", roll: 20 }] });

    expect([hp(r.allParticipantsUpdated, "e1"), hp(r.allParticipantsUpdated, "e2")]).toEqual([188, 194]);
    expect(P(r.allParticipantsUpdated, "e1").battleData.activeEffects).toHaveLength(1);
    expect(P(r.allParticipantsUpdated, "e2").battleData.activeEffects).toHaveLength(0);
  });

  it("Коло зими: −2 ініціативи на 1 раунд реально переставляє ворога в черзі наступного раунду", () => {
    const c = hero("c", 20);

    const order = [c, enemy("e", 11), hero("b", 10)];

    const r = cast("circle-of-winter", c, order, ["e"], { rolls: [1, 1, 1], saves: [{ participantId: "e", roll: 1 }] });

    const next = advanceTo(r.allParticipantsUpdated, scene(0), "c");

    expect(next.ps.map((p) => p.basicInfo.id)).toEqual(["c", "b", "e"]);
  });

  it("Коло зими: ворог, що вже походив, теж переставляється в наступному раунді, а в наступному за ним — повертається", () => {
    const c = hero("c", 10);

    const order = [enemy("e", 11), c, hero("b", 9)];

    const r = cast("circle-of-winter", c, order, ["e"], { rolls: [1, 1, 1], saves: [{ participantId: "e", roll: 1 }] });

    const round2 = advanceTo(r.allParticipantsUpdated, scene(1), "c");

    expect(round2.ps.map((p) => p.basicInfo.id)).toEqual(["c", "e", "b"]);

    const endOfRound2 = advanceTo(round2.ps, round2.scene, "b");

    const round3 = advanceTo(endOfRound2.ps, endOfRound2.scene, "e");

    expect(round3.scene.round).toBe(3);
    expect(round3.ps.map((p) => p.basicInfo.id)).toEqual(["e", "c", "b"]);
  });

  it("Ланцюгова блискавка: 100 → 50 → 25 → 13 %", () => {
    const c = hero();

    const order = [c, enemy("e1"), enemy("e2"), enemy("e3"), enemy("e4")];

    const r = cast("chain-lightning", c, order, ["e1", "e2", "e3", "e4"], { rolls: [10, 10] });

    expect(["e1", "e2", "e3", "e4"].map((id) => 200 - hp(r.allParticipantsUpdated, id))).toEqual([20, 10, 5, 2]);
  });

  it("Метеоритний дощ: усі вороги кидають Спритність, успіх — половина", () => {
    const c = hero();

    const r = cast("meteor-shower", c, [c, enemy("e1"), enemy("e2")], [], { rolls: [5, 5], saves: [{ participantId: "e1", roll: 20 }, { participantId: "e2", roll: 1 }] });

    expect([hp(r.allParticipantsUpdated, "e1"), hp(r.allParticipantsUpdated, "e2")]).toEqual([195, 190]);
  });

  it("Глибока заморозка: провал — повна шкода і ворог втрачає дію у свій хід", () => {
    const c = hero("c", 20);

    const r = cast("deep-freeze", c, [c, enemy("e", 10)], ["e"], { rolls: [1, 1, 1, 1, 1, 1], saves: [{ participantId: "e", roll: 1 }] });

    expect(hp(r.allParticipantsUpdated, "e")).toBe(194);

    const { ps } = advanceTo(r.allParticipantsUpdated, scene(0), "e");

    expect(P(ps, "e").actionFlags.hasUsedAction).toBe(true);
  });

  it("Глибока заморозка: успіх — половина, без заморозки", () => {
    const c = hero("c", 20);

    const r = cast("deep-freeze", c, [c, enemy("e", 10)], ["e"], { rolls: [2, 2, 2, 2, 2, 2], saves: [{ participantId: "e", roll: 20 }] });

    expect(hp(r.allParticipantsUpdated, "e")).toBe(194);

    const { ps } = advanceTo(r.allParticipantsUpdated, scene(0), "e");

    expect(P(ps, "e").actionFlags.hasUsedAction).toBe(false);
  });

  it("Армагеддон: вогонь по всіх — ворогах, союзниках і заклинателю", () => {
    const c = hero();

    const r = cast("armageddon", c, [c, hero("a", 5), enemy("e")], [], { rolls: [2, 2, 2, 2] });

    expect([hp(r.allParticipantsUpdated, "c"), hp(r.allParticipantsUpdated, "a"), hp(r.allParticipantsUpdated, "e")]).toEqual([92, 92, 192]);
  });

  it("Імплозія: силова шкода вбиває ціль, а бій фіксує перемогу", () => {
    const c = hero();

    const r = cast("implosion", c, [c, enemy("e", 10, 30)], ["e"], { rolls: [6, 6, 6, 6, 6, 6, 6, 6] });

    const e = P(r.allParticipantsUpdated, "e");

    expect(isActive(e)).toBe(false);
    expect(checkVictoryConditions(r.allParticipantsUpdated).result).toBe("victory");
  });
});
