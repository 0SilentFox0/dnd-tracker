import { describe, expect, it, vi } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { CRITICAL_FAIL_EFFECTS, CRITICAL_SUCCESS_EFFECTS } from "@/lib/constants/critical-effects";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import type { Effect } from "@/lib/utils/abilities/schema";
import { createCritGate } from "@/lib/utils/battle/crit-choice/gate";
import type { CritPicker } from "@/lib/utils/battle/crit-choice/types";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { mulberry32 } from "@/lib/utils/common/rng";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import type { BattleParticipant } from "@/types/battle";

const fire: Effect = { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" };

const spell = (cost: "action" | "reaction" = "action"): CastableSpell => ({
  id: "sp",
  name: "Вогняний промінь",
  level: 0,
  groupId: "chaos",
  definition: { dice: 2, cost, targeting: { kind: "enemy", range: 60 }, resolution: { kind: "attack" }, effects: [fire], raceModifiers: [] },
});

const off = { ...DEFAULT_RULES, criticals: { ...DEFAULT_RULES.criticals, effects: false } };

const caster = (): BattleParticipant => {
  const p = makeParticipant({ id: "c" });

  return { ...p, spellcasting: { ...p.spellcasting, spellAttackBonus: 5 } };
};

const enemy = () => makeParticipant({ id: "e1", side: ParticipantSide.ENEMY, hp: 200, maxHp: 200 });

const hasEffect = (p: BattleParticipant, part: string) => p.battleData.activeEffects.some((e) => e.id.includes(part));

function cast(roll: number, opts: { crit?: CritPicker; rules?: typeof DEFAULT_RULES; rng?: () => number; diceRolls?: number[]; cost?: "action" | "reaction" } = {}) {
  const c = caster();

  const r = castSpell({
    caster: c,
    spell: spell(opts.cost),
    targetIds: ["e1"],
    allParticipants: [c, enemy()],
    currentRound: 1,
    battleId: "b",
    diceRolls: opts.diceRolls ?? [3, 3],
    dice: { count: 2, sides: 6 },
    attackRolls: [{ participantId: "e1", roll }],
    rng: opts.rng ?? (() => 0.5),
    rules: opts.rules ?? DEFAULT_RULES,
    crit: opts.crit,
  });

  const get = (id: string) => r.allParticipantsUpdated.find((p) => p.basicInfo.id === id) as BattleParticipant;

  return { r, c: get("c"), e: get("e1") };
}

const byType = (list: typeof CRITICAL_SUCCESS_EFFECTS, type: string) => list.find((x) => x.effect.type === type)!;

describe("криті атак заклинанням", () => {
  it("нат. 20 + double_damage: шкода ×2, тригер attack/success із ключем attack:c:e1:0", () => {
    const plain = cast(20, { rules: off });

    const gate = createCritGate({ rng: mulberry32(1), choices: { "attack:c:e1:0": byType(CRITICAL_SUCCESS_EFFECTS, "double_damage").id } });

    const doubled = cast(20, { crit: gate.pick });

    expect(200 - doubled.e.combatStats.currentHp).toBe(2 * (200 - plain.e.combatStats.currentHp));
    expect(gate.triggers).toEqual([{ source: "attack", kind: "success", actorId: "c", targetId: "e1", key: "attack:c:e1:0" }]);
  });

  it("нат. 1: тригер fail, промах, prone на кастері; effects off — без тригерів і кидків", () => {
    const crit = vi.fn<CritPicker>(() => byType(CRITICAL_FAIL_EFFECTS, "prone"));

    const miss = cast(1, { crit });

    expect(crit).toHaveBeenCalledWith({ source: "attack", kind: "fail", actorId: "c", targetId: "e1" });
    expect(miss.e.combatStats.currentHp).toBe(200);
    expect(hasEffect(miss.c, "prone")).toBe(true);

    const rng = vi.fn(() => 0.5);

    const crit2 = vi.fn<CritPicker>(() => byType(CRITICAL_FAIL_EFFECTS, "prone"));

    const quiet = cast(1, { crit: crit2, rules: off, rng });

    expect(crit2).not.toHaveBeenCalled();
    expect(rng).not.toHaveBeenCalled();
    expect(hasEffect(quiet.c, "prone")).toBe(false);
  });

  it("max_damage: кубики до максимуму (кидки 1,2 на 2к6 → +9); ac_debuff лягає на ціль", () => {
    const max = cast(20, { diceRolls: [1, 2], crit: () => byType(CRITICAL_SUCCESS_EFFECTS, "max_damage") });

    expect(200 - max.e.combatStats.currentHp).toBe(12);

    const debuff = cast(20, { crit: () => byType(CRITICAL_SUCCESS_EFFECTS, "ac_debuff") });

    expect(hasEffect(debuff.e, "ac-debuff")).toBe(true);
  });

  it("additional_damage додає 1к6 після кидка d20", () => {
    const plain = cast(20, { rules: off });

    const extra = cast(20, { crit: () => byType(CRITICAL_SUCCESS_EFFECTS, "additional_damage"), rng: () => 0.99 });

    expect(plain.e.combatStats.currentHp - extra.e.combatStats.currentHp).toBe(6);
  });

  it("без пікера й з effects on: випадковий ефект, рівно один rng()", () => {
    const rng = vi.fn(() => 0);

    const out = cast(20, { rng });

    expect(rng).toHaveBeenCalledTimes(1);
    expect(200 - out.e.combatStats.currentHp).toBe(12);
  });

  it("реакція не дає free_attack кастеру, власний каст дає", () => {
    const effect = byType(CRITICAL_SUCCESS_EFFECTS, "free_attack");

    const self = { ...effect, effect: { ...effect.effect, target: "self" as const } };

    const flags = (o: ReturnType<typeof cast>) => o.c.actionFlags.hasUsedAction;

    expect(flags(cast(20, { rules: off }))).toBe(true);
    expect(flags(cast(20, { crit: () => self }))).toBe(false);
    expect(flags(cast(20, { cost: "reaction", crit: () => self }))).toBe(flags(cast(20, { cost: "reaction", rules: off })));
  });
});
