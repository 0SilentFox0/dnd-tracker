import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { processAttack } from "@/lib/utils/battle/attack/process";
import { eventTextOf, rowLines, textsOf } from "@/lib/utils/battle/log/__tests__/event-text";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";
import type { BattleAttack, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { cols: 40, rows: 10, background: null, opacity: 0.3 };

const at = (p: BattleParticipant, position: GridPoint): BattleParticipant => ({ ...p, battleData: { ...p.battleData, position } });

const bow: BattleAttack = { id: "bow", name: "Лук", type: AttackType.RANGED, attackBonus: 5, damageDice: "1d6", damageType: "piercing" };

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

const caster = (dc = 30) => {
  const c = at(makeParticipant({ id: "c" }), { x: 0, y: 5 });

  return { ...c, spellcasting: { ...c.spellcasting, spellSaveDC: dc, spellSlots: { "1": { max: 2, current: 2 } } } };
};

const foe = (x = 1, hp = 200) => at(makeParticipant({ id: "f", side: ParticipantSide.ENEMY, hp, maxHp: hp }), { x, y: 5 });

const rider = (over: Partial<Extract<SpellEffect, { kind: "hitRider" }>> = {}): SpellEffect => ({ kind: "hitRider", attackKind: "ranged", extraDice: "1d6", damageType: "force", charges: 3, duration: { rounds: 5 }, ...over });

const spellOf = (effects: SpellEffect[]): CastableSpell => ({
  id: "sp",
  name: "Синтетичний заряд",
  level: 1,
  groupId: null,
  definition: { dice: 0, cost: "action", targeting: { kind: "self" }, resolution: { kind: "auto" }, effects, raceModifiers: [] },
});

const armed = (effects: SpellEffect[], dc?: number) => {
  const c = caster(dc);

  const r = castSpell({ caster: c, spell: spellOf(effects), targetIds: [], allParticipants: [c, foe()], currentRound: 1, battleId: "b", diceRolls: [], rng: () => 0.5, map });

  return r.allParticipantsUpdated;
};

const strike = (ps: BattleParticipant[], attack: BattleAttack, d20Roll: number, rules = DEFAULT_RULES) => {
  const attacker = ps.find((p) => p.basicInfo.id === "c") as BattleParticipant;

  const target = ps.find((p) => p.basicInfo.id === "f") as BattleParticipant;

  return processAttack({ attacker, target, attack, d20Roll, damageRolls: [3], allParticipants: ps, currentRound: 1, battleId: "b", rng: () => 0.5, map, rules });
};

const charges = (ps?: BattleParticipant[]) => ps?.find((p) => p.basicInfo.id === "c")?.battleData.activeEffects.find((e) => e.hitRider)?.hitRider?.chargesLeft;

describe("hitRider", () => {
  it("three hits spend three charges; a miss keeps them", () => {
    let ps = armed([rider()]);

    expect(charges(ps)).toBe(3);

    ps = strike(ps, bow, 2).allParticipantsUpdated as BattleParticipant[];
    expect(charges(ps)).toBe(3);

    const hit = strike(ps, bow, 15);

    expect(rowLines(hit.damage?.breakdown ?? []).join(" ")).toContain("Синтетичний заряд: +");
    ps = hit.allParticipantsUpdated as BattleParticipant[];
    expect(charges(ps)).toBe(2);

    ps = strike(ps, bow, 15).allParticipantsUpdated as BattleParticipant[];
    ps = strike(ps, bow, 15).allParticipantsUpdated as BattleParticipant[];
    expect(charges(ps)).toBeUndefined();
  });

  it("deals the extra dice on top of the weapon damage and wrong attack kind is ignored", () => {
    const ps = armed([rider()]);

    const base = strike(ps, sword, 15);

    const ranged = strike(ps, bow, 15);

    expect(charges(base.allParticipantsUpdated)).toBe(3);
    expect(rowLines(base.battleAction.actionDetails.damageRows ?? []).join(" ")).not.toContain("Синтетичний заряд");
    expect(rowLines(ranged.battleAction.actionDetails.damageRows ?? []).join(" ")).toContain("Синтетичний заряд: +4");
  });

  it("consumeOnMiss spends a charge on a miss", () => {
    const ps = armed([rider({ consumeOnMiss: true })]);

    expect(charges(strike(ps, bow, 2).allParticipantsUpdated)).toBe(2);
  });

  it("a crit doubles the rider dice when the ruleset doubles dice", () => {
    const ps = armed([rider()]);

    const rules = { ...DEFAULT_RULES, criticals: { ...DEFAULT_RULES.criticals, doubleDice: true, effects: false } };

    const plain = strike(ps, bow, 15, rules);

    const crit = strike(ps, bow, 20, rules);

    const lost = (r: ReturnType<typeof strike>) => 200 - r.targetUpdated.combatStats.currentHp;

    expect(eventTextOf(crit.battleAction)).toContain("2d6 = 8");
    expect(eventTextOf(plain.battleAction)).toContain("1d6 = 4");
    expect(lost(crit)).toBeGreaterThan(lost(plain));
  });

  it("a failed save pushes the target away", () => {
    const ps = armed([rider({ save: { ability: "strength", onFail: [{ kind: "push", feet: 15, from: "caster" }] } })], 30);

    const r = strike(ps, bow, 15);

    expect(r.targetUpdated.battleData.position?.x).toBe(4);
  });

  it("a passed save leaves the target in place", () => {
    const ps = armed([rider({ save: { ability: "strength", onFail: [{ kind: "push", feet: 15, from: "caster" }] } })], 0);

    expect(strike(ps, bow, 15).targetUpdated.battleData.position?.x).toBe(1);
  });

  it("the rider that downs the target does not trigger the save", () => {
    const ps = armed([rider({ save: { ability: "strength", onFail: [{ kind: "push", feet: 15, from: "caster" }] } })], 30).map((p) => (p.basicInfo.id === "f" ? { ...p, combatStats: { ...p.combatStats, currentHp: 5, maxHp: 5 } } : p));

    const r = strike(ps, bow, 15);

    expect(r.targetUpdated.combatStats.currentHp).toBe(0);
    expect(r.targetUpdated.battleData.position?.x).toBe(1);
  });
});

describe("moveSelf", () => {
  const run = (target: BattleParticipant, extra: BattleParticipant[] = []) => {
    const c = caster();

    const spell = { ...spellOf([{ kind: "moveSelf", to: "adjacentToTarget" }]), definition: { ...spellOf([]).definition, targeting: { kind: "enemy" as const }, effects: [{ kind: "moveSelf", to: "adjacentToTarget" }] as SpellEffect[] } };

    const r = castSpell({ caster: c, spell, targetIds: ["f"], allParticipants: [c, target, ...extra], currentRound: 1, battleId: "b", diceRolls: [], rng: () => 0.5, map });

    return { r, me: r.allParticipantsUpdated.find((p) => p.basicInfo.id === "c") as BattleParticipant };
  };

  it("moves the caster to the nearest free cell next to the target without provoking", () => {
    const { me, r } = run(foe(10));

    expect(me.battleData.position).toEqual({ x: 9, y: 5 });
    expect(textsOf(r.messages).join(" ")).toContain("переміщується");
  });

  it("a surrounded target leaves the caster in place with a log line", () => {
    const ring = [-1, 0, 1].flatMap((dx) => [-1, 0, 1].filter((dy) => dx !== 0 || dy !== 0).map((dy) => at(makeParticipant({ id: `r${dx}${dy}`, side: ParticipantSide.ENEMY }), { x: 10 + dx, y: 5 + dy })));

    const { me, r } = run(foe(10), ring);

    expect(me.battleData.position).toEqual({ x: 0, y: 5 });
    expect(textsOf(r.messages).join(" ")).toContain("немає вільної клітинки");
  });
});
