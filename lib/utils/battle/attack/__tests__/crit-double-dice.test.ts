import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { critDamageRolls } from "@/lib/utils/battle/attack/crit-dice";
import { processAttack } from "@/lib/utils/battle/attack/process";
import { computeDamageBreakdown } from "@/lib/utils/battle/damage";
import { heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import { eventTextOf } from "@/lib/utils/battle/log/__tests__/event-text";
import { diceCount } from "@/lib/utils/common/dice";
import { parseRules } from "@/lib/utils/rules/schema";
import type { BattleAttack } from "@/types/battle";

const base = createMockParticipant();

const hero = createMockParticipant({
  abilities: { ...base.abilities, level: 5, damageModel: "5e", strength: 14, dexterity: 18, modifiers: { ...base.abilities.modifiers, strength: 2, dexterity: 4 } },
});

const target = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "t1", side: ParticipantSide.ENEMY }, combatStats: { ...base.combatStats, currentHp: 99, maxHp: 99 } });

const rapier: BattleAttack = { id: "r", name: "Рапіра", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d8", damageType: "piercing", traits: ["finesse"] };

const attackWith = (opts: { d20: number; damageRolls: number[]; doubleDice: boolean; rng?: () => number }) =>
  processAttack({
    attacker: hero,
    target,
    attack: rapier,
    d20Roll: opts.d20,
    damageRolls: opts.damageRolls,
    allParticipants: [hero, target],
    currentRound: 1,
    battleId: "b1",
    recordDice: true,
    rng: opts.rng ?? (() => 0.5),
    rules: parseRules({ criticals: { doubleDice: opts.doubleDice, effects: false } }),
  });

const hpLost = (r: ReturnType<typeof processAttack>) => 99 - r.targetUpdated.combatStats.currentHp;

describe("critDamageRolls", () => {
  it("server adds the second set", () => {
    const r = critDamageRolls({ formula: "1d8", rolls: [5], rng: () => 0.5 });

    expect(r.rolls).toHaveLength(2);
    expect(r.serverRolled).toHaveLength(1);
  });

  it("keeps a full double set", () => {
    expect(critDamageRolls({ formula: "2d6", rolls: [1, 2, 3, 4], rng: () => 0 })).toEqual({ rolls: [1, 2, 3, 4], serverRolled: [] });
  });

  it("leaves an empty formula untouched", () => {
    expect(critDamageRolls({ formula: "", rolls: [], rng: () => 0 })).toEqual({ rolls: [], serverRolled: [] });
  });
});

describe("processAttack crit with doubleDice", () => {
  it("doubles dice, not the modifier", () => {
    expect(hpLost(attackWith({ d20: 20, damageRolls: [5, 3], doubleDice: true }))).toBe(5 + 3 + 4);
  });

  it("server rolls the missing set and logs it", () => {
    const r = attackWith({ d20: 20, damageRolls: [5], doubleDice: true, rng: () => 0.5 });

    expect(hpLost(r)).toBe(5 + 5 + 4);
    expect(r.battleAction.actionDetails.diceRolls?.find((g) => g.kind === "damage")?.dice.map((d) => !!d.server)).toEqual([false, true]);
    expect(eventTextOf(r.battleAction)).toContain("крит: кубики шкоди подвоєно (сервер: 5)");
  });

  it("HOMM default: crit without effects adds nothing", () => {
    expect(hpLost(attackWith({ d20: 20, damageRolls: [5], doubleDice: false }))).toBe(5 + 4);
  });
});

describe("breakdown preview with doubleDice", () => {
  const rules = parseRules({ criticals: { doubleDice: true, effects: false } });

  const preview = (damageRolls: number[], extra: object = {}) => computeDamageBreakdown({ attacker: hero, target, attack: rapier, damageRolls, allParticipants: [hero, target], isCritical: true, ...extra }).totalDamage;

  it("doubles dice, not the modifier, and matches the server", () => {
    expect(preview([5, 3], { rules })).toBe(5 + 3 + 4);
    expect(preview([5, 3], { rules })).toBe(hpLost(attackWith({ d20: 20, damageRolls: [5, 3], doubleDice: true })));
  });

  it("estimates the second set from a single set", () => {
    expect(preview([5], { rules })).toBe(5 + 5 + 4);
  });

  it("without rules or doubleDice keeps the unconditional x2", () => {
    expect(preview([5])).toBe((5 + 4) * 2);
    expect(preview([5], { rules: parseRules({ criticals: { effects: false } }) })).toBe((5 + 4) * 2);
  });
});

describe("HOMM hero crit with doubleDice", () => {
  const hommHero = createMockParticipant({ abilities: { ...base.abilities, level: 5 } });

  const sword: BattleAttack = { id: "s", name: "Меч", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d8", damageType: "slashing" };

  const set = diceCount(heroAttackDamageParts(hommHero, sword).formula);

  const rolls = Array(2 * set).fill(3);

  it("server damage equals the preview when both dice sets are sent", () => {
    const rules = parseRules({ criticals: { doubleDice: true, effects: false } });

    const server = processAttack({ attacker: hommHero, target, attack: sword, d20Roll: 20, damageRolls: rolls, allParticipants: [hommHero, target], currentRound: 1, battleId: "b1", recordDice: true, rng: () => 0.5, rules });

    const preview = computeDamageBreakdown({ attacker: hommHero, target, attack: sword, damageRolls: rolls, allParticipants: [hommHero, target], isCritical: true, rules }).totalDamage;

    expect(set).toBeGreaterThan(1);
    expect(hpLost(server)).toBe(preview);
  });
});

describe("critDamageRolls lenient formula", () => {
  it("counts the dice of free text like the wizard does", () => {
    const r = critDamageRolls({ formula: "2d6 + MOD", rolls: [1, 2], rng: () => 0 });

    expect(r.rolls).toHaveLength(4);
    expect(r.serverRolled).toHaveLength(2);
  });
});
