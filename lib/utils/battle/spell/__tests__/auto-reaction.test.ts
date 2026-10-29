import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { processAttack } from "@/lib/utils/battle/attack/process";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { InlineCast, SpellEffect } from "@/lib/utils/spells/model/schema";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

const map: BattleMapConfig = { cols: 60, rows: 10, background: null, opacity: 0.3 };

const at = (p: BattleParticipant, x: number): BattleParticipant => ({ ...p, battleData: { ...p.battleData, position: { x, y: 5 } } });

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

const inline = (over: Partial<InlineCast> = {}): InlineCast => ({
  targeting: { kind: "enemy", range: 60 },
  resolution: { kind: "auto" },
  dice: 2,
  dieSides: 8,
  effects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "lightning" }],
  anchorMarkId: "m",
  auto: { on: "attackAgainstMarked" },
  ...over,
});

const effects = (cast: InlineCast): SpellEffect[] => [
  { kind: "mark", markId: "m", duration: { rounds: 5 }, target: "eventTarget" },
  { kind: "grantCast", label: "Синтетична реакція", cost: "reaction", duration: { rounds: 5 }, cast },
];

const spell: (cast: InlineCast) => CastableSpell = (cast) => ({
  id: "nim",
  name: "Синтетична хмара",
  level: 3,
  groupId: null,
  definition: { dice: 0, cost: "action", targeting: { kind: "ally", range: 60 }, resolution: { kind: "auto" }, effects: effects(cast), raceModifiers: [] },
});

const holder = () => at(makeParticipant({ id: "h" }), 0);

const ward = () => at(makeParticipant({ id: "w", hp: 100, maxHp: 100 }), 2);

const foe = (id = "f", x = 3) => at(makeParticipant({ id, side: ParticipantSide.ENEMY, hp: 100, maxHp: 100 }), x);

const setup = (cast = inline(), foes: BattleParticipant[] = [foe()]) => {
  const h = holder();

  const w = ward();

  return all(castSpell({ caster: { ...h, spellcasting: { ...h.spellcasting, spellSlots: { "3": { max: 1, current: 1 } } } }, spell: spell(cast), targetIds: ["w"], allParticipants: [h, w, ...foes], currentRound: 1, battleId: "b", diceRolls: [], rng: () => 0.5, map }));
};

const strike = (ps: BattleParticipant[], attackerId: string, targetId: string, seed = () => 0.5) => {
  const attacker = ps.find((p) => p.basicInfo.id === attackerId) as BattleParticipant;

  const target = ps.find((p) => p.basicInfo.id === targetId) as BattleParticipant;

  return processAttack({ attacker, target, attack: sword, d20Roll: 15, damageRolls: [3], allParticipants: ps, currentRound: 1, battleId: "b", rng: seed, map, rules: DEFAULT_RULES });
};

const all = (r: { allParticipantsUpdated?: BattleParticipant[] }) => r.allParticipantsUpdated ?? [];

const hp = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id)?.combatStats.currentHp as number;

const reacted = (ps: BattleParticipant[]) => ps.find((p) => p.basicInfo.id === "h")?.actionFlags.hasUsedReaction;

describe("auto reactions", () => {
  it("an attack on the marked target triggers the holder's reaction at the attacker", () => {
    const r = strike(setup(), "f", "w");

    expect(hp(all(r), "f")).toBeLessThan(100);
    expect(reacted(all(r))).toBe(true);
    expect(r.battleAction.resultText).toContain("Синтетична реакція");
  });

  it("a miss triggers it too", () => {
    const ps = setup();

    const attacker = ps.find((p) => p.basicInfo.id === "f") as BattleParticipant;

    const target = ps.find((p) => p.basicInfo.id === "w") as BattleParticipant;

    const r = processAttack({ attacker, target, attack: { ...sword, attackBonus: -20 }, d20Roll: 2, damageRolls: [3], allParticipants: ps, currentRound: 1, battleId: "b", rng: () => 0.5, map, rules: DEFAULT_RULES });

    expect(hp(all(r), "f")).toBeLessThan(100);
  });

  it("an attacker beyond the range from the marked target gets no reaction", () => {
    const r = strike(setup(inline(), [foe("f", 20)]), "f", "w");

    expect(hp(all(r), "f")).toBe(100);
    expect(reacted(all(r))).toBe(false);
  });

  it("an attacker exactly at the range limit is hit", () => {
    const r = strike(setup(inline(), [foe("f", 14)]), "f", "w");

    expect(hp(all(r), "f")).toBeLessThan(100);
  });

  it("an attack on an unmarked creature does nothing", () => {
    const ps = setup(inline(), [foe(), at(makeParticipant({ id: "w2", hp: 100, maxHp: 100 }), 4)]);

    const r = strike(ps, "f", "w2");

    expect(hp(all(r), "f")).toBe(100);
  });

  it("no reaction when the holder has already spent it", () => {
    const ps = setup().map((p) => (p.basicInfo.id === "h" ? { ...p, actionFlags: { ...p.actionFlags, hasUsedReaction: true } } : p));

    expect(hp(all(strike(ps, "f", "w")), "f")).toBe(100);
  });

  it("no reaction when the marked target is already at 0 HP", () => {
    const ps = setup().map((p) => (p.basicInfo.id === "w" ? { ...p, combatStats: { ...p.combatStats, currentHp: 0 } } : p));

    const r = strike(ps, "f", "w");

    expect(hp(all(r), "f")).toBe(100);
    expect(reacted(all(r))).toBe(false);
  });

  it("an ally attacking the marked target does not trigger it", () => {
    const ps = [...setup(), at(makeParticipant({ id: "a2", hp: 100, maxHp: 100 }), 3)];

    const r = strike(ps, "a2", "w");

    expect(hp(all(r), "a2")).toBe(100);
    expect(reacted(all(r))).toBe(false);
  });

  it("the reaction fires once per reaction and the same seed gives the same dice", () => {
    const ps = setup();

    const first = strike(ps, "f", "w", () => 0.7);

    const again = strike(ps, "f", "w", () => 0.7);

    expect(hp(all(first), "f")).toBe(hp(all(again), "f"));

    const second = strike(all(first), "f", "w", () => 0.7);

    expect(hp(all(second), "f")).toBe(hp(all(first), "f"));
  });

  it("a spell attack on the marked target triggers it as well, without recursion", () => {
    const ps = setup();

    const f = ps.find((p) => p.basicInfo.id === "f") as BattleParticipant;

    const bolt: CastableSpell = { id: "bolt", name: "Синтетичний промінь", level: 0, groupId: null, definition: { dice: 1, cost: "action", targeting: { kind: "enemy", range: 60 }, resolution: { kind: "attack" }, effects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }], raceModifiers: [] } };

    const r = castSpell({ caster: f, spell: bolt, targetIds: ["w"], allParticipants: ps, currentRound: 1, battleId: "b", diceRolls: [3], rng: () => 0.5, map });

    expect(hp(all(r), "f")).toBeLessThan(100);
    expect(reacted(all(r))).toBe(true);
  });

  it("a damage-triggered reaction ignores a miss and fires on a hit", () => {
    const ps = setup(inline({ auto: { on: "damageToMarked" } }));

    const attacker = ps.find((p) => p.basicInfo.id === "f") as BattleParticipant;

    const target = ps.find((p) => p.basicInfo.id === "w") as BattleParticipant;

    const miss = processAttack({ attacker, target, attack: { ...sword, attackBonus: -20 }, d20Roll: 2, damageRolls: [3], allParticipants: ps, currentRound: 1, battleId: "b", rng: () => 0.5, map, rules: DEFAULT_RULES });

    expect(hp(all(miss), "f")).toBe(100);
    expect(reacted(all(miss))).toBe(false);
    expect(hp(all(strike(ps, "f", "w")), "f")).toBeLessThan(100);
  });
});
