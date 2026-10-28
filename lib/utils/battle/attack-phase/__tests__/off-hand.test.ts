import { describe, expect, it } from "vitest";

import { findAttack } from "../request";
import { type AttackPhaseInput, runAttackPhase } from "../run-attack-phase";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const main: BattleAttack = { id: "m", name: "Кинджал", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d4", damageType: "piercing", traits: ["light"] };

const off: BattleAttack = { id: "m:off", name: "Кинджал (друга рука)", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d4", damageType: "piercing", traits: ["light"], hand: "off" };

interface Opts {
  fiveE?: boolean;
  attacks?: BattleAttack[];
  light?: boolean;
  bonusUsed?: boolean;
}

const hero = (o: Opts = {}): BattleParticipant => {
  const p = makeParticipant({ id: "a" });

  return {
    ...p,
    abilities: { ...p.abilities, ...(o.fiveE === false ? {} : { damageModel: "5e" as const }) },
    actionFlags: { ...p.actionFlags, hasUsedBonusAction: o.bonusUsed ?? false },
    battleData: { ...p.battleData, attacks: o.attacks ?? [main, off], ...(o.light === false ? {} : { attackedWithLight: true }), attacksLeft: 1 },
  };
};

const foe = makeParticipant({ id: "f", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 });

const run = (h: BattleParticipant, data: Partial<AttackPhaseInput["data"]> = {}) =>
  runAttackPhase({
    battle: { initiativeOrder: [{ ...h, actionFlags: { ...h.actionFlags, hasUsedAction: true } }, foe], currentRound: 1, currentTurnIndex: 0 },
    data: { attackerId: "a", targetId: "f", attackId: "m:off", offHand: true, d20Roll: 15, damageRolls: [3], ...data },
    battleId: "b",
    userId: "u",
    isDM: true,
    rng: seq(0.5),
  });

const message = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as Error).message;
  }
};

describe("off-hand attack", () => {
  it("success spends the bonus action, leaves action and attacksLeft", () => {
    const self = run(hero()).finalInitiativeOrder.find((p) => p.basicInfo.id === "a") as BattleParticipant;

    expect(self.actionFlags.hasUsedBonusAction).toBe(true);
    expect(self.actionFlags.hasUsedAction).toBe(true);
    expect(self.battleData.attacksLeft).toBe(1);
  });

  it("non-5e hero is rejected", () => {
    expect(message(() => run(hero({ fiveE: false })))).toBe(API_ERRORS.OFF_HAND_NOT_ALLOWED);
  });

  it("no off-hand weapon", () => {
    expect(message(() => run(hero({ attacks: [main] })))).toBe(API_ERRORS.NO_OFF_HAND_WEAPON);
  });

  it("bonus action already used", () => {
    expect(message(() => run(hero({ bonusUsed: true })))).toBe(API_ERRORS.BONUS_ACTION_USED);
  });

  it("needs a prior light melee attack", () => {
    expect(message(() => run(hero({ light: false })))).toBe(API_ERRORS.OFF_HAND_NEEDS_ATTACK);
  });

  it("two-handed off-hand weapon", () => {
    expect(message(() => run(hero({ attacks: [main, { ...off, traits: ["light", "twoHanded"] }] })))).toBe(API_ERRORS.OFF_HAND_TWO_HANDED);
  });

  it("non-light off-hand weapon", () => {
    expect(message(() => run(hero({ attacks: [main, { ...off, traits: [] }] })))).toBe(API_ERRORS.OFF_HAND_NOT_LIGHT);
  });

  it("off attack without offHand is rejected", () => {
    expect(message(() => run(hero(), { offHand: false }))).toBe(API_ERRORS.OFF_HAND_NEEDS_ATTACK);
  });

  it("multi-target strike spends the bonus once", () => {
    const self = run(hero(), { targetIds: ["f", "f"] }).finalInitiativeOrder.find((p) => p.basicInfo.id === "a") as BattleParticipant;

    expect(self.actionFlags.hasUsedBonusAction).toBe(true);
  });

  it("ranged off-hand weapon is rejected", () => {
    expect(message(() => run(hero({ attacks: [main, { ...off, type: AttackType.RANGED }] })))).toBe(API_ERRORS.OFF_HAND_NOT_MELEE);
  });

  it("findAttack default skips the off-hand attack unless requested", () => {
    const h = hero({ attacks: [off, main] });

    expect(findAttack(h, undefined)).toBe(main);
    expect(findAttack(h, undefined, true)).toBe(off);
  });
});
