import { describe, expect, it } from "vitest";

import { type AttackPhaseInput, runAttackPhase } from "../run-attack-phase";

import { BRANCHES } from "@/data/library/branches";
import { branchSkills } from "@/data/library/build";
import { doubleStrike as unitDoubleStrike } from "@/data/library/unit-abilities";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

const bow: BattleAttack = { id: "bw", name: "Лук", type: AttackType.RANGED, attackBonus: 5, damageDice: "1d6", damageType: "piercing" };

const rewardAbility = BRANCHES.flatMap(branchSkills).flatMap((s) => s.abilities).find((a) => a.id === "reward");

const reward = resolved(rewardAbility as Ability);

const hero = (opts: { abilities?: ReturnType<typeof resolved>[]; pending?: number; maxTargets?: number } = {}): BattleParticipant => {
  const p = makeParticipant({ id: "a", abilities: opts.abilities });

  return {
    ...p,
    combatStats: { ...p.combatStats, maxTargets: opts.maxTargets ?? 1 },
    battleData: { ...p.battleData, attacks: [sword, bow], pendingExtraActions: opts.pending ?? 0 },
  };
};

const foe = (id: string, hp = 50) => makeParticipant({ id, side: ParticipantSide.ENEMY, hp, maxHp: 50 });

const attack = (order: BattleParticipant[], data: Partial<AttackPhaseInput["data"]>) =>
  runAttackPhase({ battle: { initiativeOrder: order, battleLog: [], currentRound: 1, currentTurnIndex: 0 }, data: { attackerId: "a", attackId: "sw", damageRolls: [6], ...data }, battleId: "b", userId: "u", isDM: true, rng: seq(0.5) });

const self = (r: ReturnType<typeof attack>) => r.finalInitiativeOrder.find((p) => p.basicInfo.id === "a") as BattleParticipant;

describe("«Нагорода»: kill refreshes the main action", () => {
  it("the library ability exists", () => {
    expect(rewardAbility?.effects).toEqual([{ kind: "grantAction", refreshAction: true }]);
  });

  it("a killing blow leaves the action available", () => {
    const r = attack([hero({ abilities: [reward] }), foe("t", 1)], { targetId: "t", d20Roll: 15 });

    expect(r.finalInitiativeOrder.find((p) => p.basicInfo.id === "t")?.combatStats.currentHp).toBeLessThanOrEqual(0);
    expect(self(r).actionFlags.hasUsedAction).toBe(false);
  });

  it("the refreshed action can attack again; the second kill (perTurn: 1) does not refresh", () => {
    const first = attack([hero({ abilities: [reward] }), foe("t", 1), foe("u", 1)], { targetId: "t", d20Roll: 15 });

    const second = attack(first.finalInitiativeOrder, { targetId: "u", d20Roll: 15 });

    expect(self(second).actionFlags.hasUsedAction).toBe(true);
  });

  it("no kill — the action is spent", () => {
    const r = attack([hero({ abilities: [reward] }), foe("t")], { targetId: "t", d20Roll: 15 });

    expect(self(r).actionFlags.hasUsedAction).toBe(true);
  });
});

describe("extra-action grants during an attack are counted once", () => {
  const doubleStrike = resolved(unitDoubleStrike("Подвійний удар", 100));

  it("unit «double strike» (+1 action after an attack) gives exactly one more attack", () => {
    const first = attack([hero({ abilities: [doubleStrike] }), foe("t")], { targetId: "t", d20Roll: 15 });

    expect(self(first).actionFlags.hasUsedAction).toBe(false);
    expect(self(first).battleData.pendingExtraActions ?? 0).toBe(0);

    const second = attack(first.finalInitiativeOrder, { targetId: "t", d20Roll: 15 });

    expect(self(second).actionFlags.hasUsedAction).toBe(true);
  });
});

describe("a multi-target volley is one action", () => {
  const volley = (order: BattleParticipant[], rolls = [15, 15]) => attack(order, { attackId: "bw", targetIds: ["t1", "t2"], attackRolls: rolls, damageRolls: [] });

  it("a hero with two actions keeps one after a two-target volley", () => {
    const r = volley([hero({ pending: 1, maxTargets: 2 }), foe("t1"), foe("t2")]);

    expect(r.allBattleActions.filter((e) => e.actionType === "attack")).toHaveLength(2);
    expect(self(r).actionFlags.hasUsedAction).toBe(false);
    expect(self(r).battleData.pendingExtraActions ?? 0).toBe(0);

    expect(self(volley(r.finalInitiativeOrder)).actionFlags.hasUsedAction).toBe(true);
  });

  it("a hero with one action spends it on the volley", () => {
    const r = volley([hero({ maxTargets: 2 }), foe("t1"), foe("t2")], [15, 3]);

    expect(self(r).actionFlags.hasUsedAction).toBe(true);
  });
});
