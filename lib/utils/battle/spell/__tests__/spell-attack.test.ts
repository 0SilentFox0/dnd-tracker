import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { Effect } from "@/lib/utils/abilities/schema";
import { textsOf } from "@/lib/utils/battle/log/__tests__/event-text";
import { castSpell } from "@/lib/utils/battle/spell";
import { spellAttackBonus } from "@/lib/utils/battle/spell/power";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const fire: Effect = { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" };

const spell: CastableSpell = {
  id: "sp",
  name: "Вогняний промінь",
  level: 0,
  groupId: "chaos",
  definition: { dice: 2, cost: "action", targeting: { kind: "enemy", range: 60 }, resolution: { kind: "attack" }, effects: [fire], raceModifiers: [] },
};

const map: BattleMapConfig = { cols: 20, rows: 20, background: null, opacity: 0.3 };

const doubled = { ...DEFAULT_RULES, criticals: { ...DEFAULT_RULES.criticals, doubleDice: true } };

const at = (p: BattleParticipant, position: GridPoint): BattleParticipant => ({ ...p, battleData: { ...p.battleData, position } });

const caster = (fiveE = false): BattleParticipant => {
  const p = makeParticipant({ id: "c" });

  return { ...p, abilities: { ...p.abilities, ...(fiveE && { damageModel: "5e" as const }) }, spellcasting: { ...p.spellcasting, spellAttackBonus: 5 } };
};

const enemy = (id: string) => makeParticipant({ id, side: ParticipantSide.ENEMY, hp: 200, maxHp: 200 });

const hp = (r: { allParticipantsUpdated: BattleParticipant[] }, id: string) => r.allParticipantsUpdated.find((p) => p.basicInfo.id === id)?.combatStats.currentHp as number;

function cast(over: { roll?: number; rules?: typeof DEFAULT_RULES; targets?: string[]; others?: BattleParticipant[]; caster?: BattleParticipant; rng?: () => number; map?: BattleMapConfig } = {}) {
  const c = over.caster ?? caster();

  const targets = over.targets ?? ["e1"];

  return castSpell({
    caster: c,
    spell,
    targetIds: targets,
    allParticipants: [c, ...(over.others ?? [enemy("e1")])],
    currentRound: 1,
    battleId: "b",
    diceRolls: [3, 3],
    dice: { count: 2, sides: 6 },
    attackRolls: over.roll === undefined ? undefined : targets.map((participantId) => ({ participantId, roll: over.roll as number })),
    rng: over.rng ?? seq(0.5),
    rules: over.rules,
    map: over.map,
  });
}

describe("spellAttackBonus", () => {
  it("takes the explicit bonus, else proficiency plus the casting modifier", () => {
    expect(spellAttackBonus(caster())).toBe(5);

    const p = caster();

    const wizard = { ...p, abilities: { ...p.abilities, proficiencyBonus: 3, modifiers: { ...p.abilities.modifiers, intelligence: 4 } }, spellcasting: { ...p.spellcasting, spellAttackBonus: undefined, spellcastingAbility: "intelligence" as const } };

    expect(spellAttackBonus(wizard)).toBe(7);
  });
});

describe("атака заклинанням", () => {
  it("hit deals the dice damage", () => {
    const r = cast({ roll: 12 });

    expect(hp(r, "e1")).toBe(194);
    expect(r.battleAction.actionDetails.spellAttacks).toEqual([{ participantId: "e1", roll: 12, total: 17, ac: 14, hit: true, crit: false }]);
  });

  it("miss deals nothing and logs it", () => {
    const r = cast({ roll: 5 });

    expect(hp(r, "e1")).toBe(200);
    expect(textsOf(r.messages).join("|")).toContain("атака заклинанням 5+5=10 проти КЗ 14 — промах");
    expect(r.battleAction.actionDetails.spellAttacks?.[0]).toMatchObject({ hit: false, crit: false });
  });

  it("natural 20 hits regardless of AC and doubles the dice with doubleDice", () => {
    const r = cast({ roll: 20, rules: doubled });

    expect(hp(r, "e1")).toBe(200 - 6 - 8);
    expect(r.battleAction.actionDetails.spellAttacks?.[0]).toMatchObject({ hit: true, crit: true });
    expect(textsOf(r.messages).join("|")).toContain("крит — кубики подвоєно");
  });

  it("a crit without doubleDice is a plain hit", () => {
    const r = cast({ roll: 20, rules: DEFAULT_RULES });

    expect(hp(r, "e1")).toBe(194);
  });

  it("natural 1 misses", () => {
    expect(hp(cast({ roll: 1 }), "e1")).toBe(200);
  });

  it("a preset roll does not touch the rng", () => {
    const rng = () => {
      throw new Error("rng used");
    };

    expect(hp(cast({ roll: 12, rng }), "e1")).toBe(194);
  });

  it("without a preset the server rolls the d20", () => {
    const r = cast({ rng: seq(0.55) });

    expect(r.battleAction.actionDetails.spellAttacks?.[0].roll).toBe(12);
  });

  it("an enemy nearby gives a ranged 5e spell attack a second d20", () => {
    const c = at(caster(true), { x: 2, y: 2 });

    const r = cast({ caster: c, map, roll: 15, rng: seq(0), others: [at(enemy("e1"), { x: 6, y: 2 }), at(enemy("e2"), { x: 3, y: 2 })] });

    expect(r.battleAction.actionDetails.spellAttacks?.[0].roll).toBe(1);
    expect(hp(r, "e1")).toBe(200);
  });

  it("an adjacent target is a melee attack with no second d20", () => {
    const c = at(caster(true), { x: 2, y: 2 });

    const r = cast({ caster: c, map, roll: 15, rng: () => { throw new Error("rng used"); }, others: [at(enemy("e1"), { x: 3, y: 2 })] });

    expect(hp(r, "e1")).toBe(194);
  });

  it("non-enemy targets resolve as auto without a roll", () => {
    const ally = makeParticipant({ id: "a", hp: 50, maxHp: 50 });

    const r = cast({ targets: ["a"], others: [ally], rng: () => { throw new Error("rng used"); } });

    expect(hp(r, "a")).toBe(44);
    expect(r.battleAction.actionDetails.spellAttacks).toBeUndefined();
  });

  describe("passive modifiers", () => {
    const withStat = (stat: "critThreshold" | "attackBonus", flat: number): BattleParticipant => {
      const p = makeParticipant({ id: "c", abilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat, flat }] } as never)] });

      return { ...p, spellcasting: { ...p.spellcasting, spellAttackBonus: 5 } };
    };

    it("critThreshold lowers the crit roll", () => {
      const r = cast({ roll: 19, rules: doubled, caster: withStat("critThreshold", -1) });

      expect(r.battleAction.actionDetails.spellAttacks?.[0]).toMatchObject({ hit: true, crit: true });
      expect(cast({ roll: 19, rules: doubled }).battleAction.actionDetails.spellAttacks?.[0]).toMatchObject({ crit: false });
    });

    it("attackBonus stat adds to the spell attack total", () => {
      const r = cast({ roll: 8, caster: withStat("attackBonus", 1) });

      expect(r.battleAction.actionDetails.spellAttacks?.[0]).toMatchObject({ total: 14, hit: true });
      expect(cast({ roll: 8 }).battleAction.actionDetails.spellAttacks?.[0]).toMatchObject({ total: 13, hit: false });
    });
  });
});
