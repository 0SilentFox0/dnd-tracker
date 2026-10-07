/**
 * Тести для runAttackPhase (CODE_AUDIT 5.9) — фокус на validation
 * branches, які кидають BattleRuleError (400-ті) або BattleAccessError (403/404).
 *
 * Сам processAttack не мокається — у success-path він запуститься,
 * але це лише 1 simple smoke-test. Решта 10 — validation-only,
 * які короткозамикають до processAttack.
 */

import { describe, expect, it } from "vitest";

import {
  type AttackPhaseInput,
  runAttackPhase,
} from "../run-attack-phase";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

function meleeAttack(over: Partial<BattleAttack> = {}): BattleAttack {
  return {
    id: "atk-1",
    name: "Sword",
    type: "melee",
    bonusToHit: 5,
    damageDice: "1d6",
    damageType: "physical",
    targetType: "single",
    ...over,
  } as unknown as BattleAttack;
}

function makeAttacker(over: Partial<BattleParticipant> = {}): BattleParticipant {
  const base = createMockParticipant({
    basicInfo: {
      ...createMockParticipant().basicInfo,
      id: "atk",
      name: "Атакувальник",
      side: ParticipantSide.ALLY,
      controlledBy: "user-1",
    },
    ...over,
  });

  return {
    ...base,
    battleData: {
      ...base.battleData,
      attacks: [meleeAttack()],
    },
  };
}

function makeTarget(): BattleParticipant {
  return createMockParticipant({
    basicInfo: {
      ...createMockParticipant().basicInfo,
      id: "tgt",
      name: "Ціль",
      side: ParticipantSide.ENEMY,
    },
  });
}

function makeInput(over: Partial<AttackPhaseInput> = {}): AttackPhaseInput {
  const attacker = makeAttacker();

  const target = makeTarget();

  return {
    battle: {
      initiativeOrder: [attacker, target],
      battleLog: [],
      currentRound: 1,
      currentTurnIndex: 0,
    },
    data: {
      attackerId: attacker.basicInfo.id,
      targetId: target.basicInfo.id,
      d20Roll: 15,
      damageRolls: [4],
    },
    battleId: "b1",
    userId: "user-1",
    isDM: false,
    ...over,
  };
}

describe("runAttackPhase — error path validation", () => {
  it("throws 400 коли немає d20Roll/attackRoll/attackRolls", () => {
    expect(() =>
      runAttackPhase(
        makeInput({
          data: {
            attackerId: "atk",
            targetId: "tgt",
            damageRolls: [4],
          },
        }),
      ),
    ).toThrow(BattleRuleError);

    try {
      runAttackPhase(
        makeInput({
          data: {
            attackerId: "atk",
            targetId: "tgt",
            damageRolls: [4],
          },
        }),
      );
    } catch (e) {
      expect(e).toBeInstanceOf(BattleRuleError);
      expect((e as Error).message).toContain("d20Roll");
    }
  });

  it("throws 404 коли attacker не існує в initiativeOrder", () => {
    try {
      runAttackPhase(
        makeInput({
          data: {
            attackerId: "ghost",
            targetId: "tgt",
            d20Roll: 10,
            damageRolls: [4],
          },
        }),
      );
      throw new Error("should not reach");
    } catch (e) {
      expect(e).toBeInstanceOf(BattleAccessError);
      expect((e as BattleAccessError).status).toBe(404);
      expect((e as Error).message).toContain("Атакуючого немає");
    }
  });

  it("throws 403 коли користувач не DM і не контролює attacker", () => {
    try {
      runAttackPhase(makeInput({ userId: "wrong-user" }));
      throw new Error("should not reach");
    } catch (e) {
      expect(e).toBeInstanceOf(BattleAccessError);
      expect((e as BattleAccessError).status).toBe(403);
    }
  });

  it("DM може атакувати незалежно від userId", () => {
    // success-path до processAttack — побічні ефекти не перевіряємо
    expect(() =>
      runAttackPhase(makeInput({ userId: "anyone", isDM: true })),
    ).not.toThrow();
  });

  it("throws 404 коли немає валідних targets", () => {
    try {
      runAttackPhase(
        makeInput({
          data: {
            attackerId: "atk",
            targetId: "ghost",
            d20Roll: 10,
            damageRolls: [4],
          },
        }),
      );
      throw new Error("should not reach");
    } catch (e) {
      expect(e).toBeInstanceOf(BattleAccessError);
      expect((e as BattleAccessError).status).toBe(404);
      expect((e as Error).message).toContain("Цілей немає");
    }
  });

  it("throws 400 коли currentTurnIndex вказує на іншого учасника", () => {
    try {
      runAttackPhase(
        makeInput({
          battle: {
            initiativeOrder: [makeAttacker(), makeTarget()],
            battleLog: [],
            currentRound: 1,
            currentTurnIndex: 1, // target's turn, не attacker
          },
          isDM: true, // bypass auth, але turn mismatch перевіряється все одно
        }),
      );
      throw new Error("should not reach");
    } catch (e) {
      expect(e).toBeInstanceOf(BattleRuleError);
      expect((e as Error).message).toContain("не хід атакуючого");
    }
  });

  it("throws 400 коли attacker вже використав action", () => {
    const attacker = makeAttacker({
      actionFlags: {
        hasUsedAction: true,
        hasUsedBonusAction: false,
        hasUsedReaction: false,
        hasExtraTurn: false,
      },
    });

    try {
      runAttackPhase(
        makeInput({
          battle: {
            initiativeOrder: [attacker, makeTarget()],
            battleLog: [],
            currentRound: 1,
            currentTurnIndex: 0,
          },
        }),
      );
      throw new Error("should not reach");
    } catch (e) {
      expect(e).toBeInstanceOf(BattleRuleError);
      expect((e as Error).message).toContain("уже використав");
    }
  });

  it("throws 400 коли attacker не active (dead/unconscious)", () => {
    const attacker = makeAttacker({
      combatStats: { ...makeAttacker().combatStats, status: "dead" },
    });

    try {
      runAttackPhase(
        makeInput({
          battle: {
            initiativeOrder: [attacker, makeTarget()],
            battleLog: [],
            currentRound: 1,
            currentTurnIndex: 0,
          },
        }),
      );
      throw new Error("should not reach");
    } catch (e) {
      expect(e).toBeInstanceOf(BattleRuleError);
      expect((e as Error).message).toContain("не може діяти");
    }
  });

  it("throws 400 коли attacker не має атак", () => {
    const attacker: BattleParticipant = {
      ...makeAttacker(),
      battleData: {
        ...makeAttacker().battleData,
        attacks: [],
      },
    };

    try {
      runAttackPhase(
        makeInput({
          battle: {
            initiativeOrder: [attacker, makeTarget()],
            battleLog: [],
            currentRound: 1,
            currentTurnIndex: 0,
          },
        }),
      );
      throw new Error("should not reach");
    } catch (e) {
      expect(e).toBeInstanceOf(BattleRuleError);
      expect((e as Error).message).toContain("немає доступної атаки");
    }
  });

  it("throws 400 коли targets > maxPossibleTargets", () => {
    const t1 = createMockParticipant({
      basicInfo: { ...createMockParticipant().basicInfo, id: "t1", side: ParticipantSide.ENEMY },
    });

    const t2 = createMockParticipant({
      basicInfo: { ...createMockParticipant().basicInfo, id: "t2", side: ParticipantSide.ENEMY },
    });

    // single-target attack, але 2 цілі
    try {
      runAttackPhase(
        makeInput({
          battle: {
            initiativeOrder: [makeAttacker(), t1, t2],
            battleLog: [],
            currentRound: 1,
            currentTurnIndex: 0,
          },
          data: {
            attackerId: "atk",
            targetIds: ["t1", "t2"],
            d20Roll: 10,
            damageRolls: [4],
          },
        }),
      );
      throw new Error("should not reach");
    } catch (e) {
      expect(e).toBeInstanceOf(BattleRuleError);
      expect((e as Error).message).toContain("Забагато цілей");
    }
  });

  it("throws 400 коли d20Roll out of range [1, 20] (всередині loop)", () => {
    try {
      runAttackPhase(makeInput({ data: { ...makeInput().data, d20Roll: 25 } }));
      throw new Error("should not reach");
    } catch (e) {
      expect(e).toBeInstanceOf(BattleRuleError);
      expect((e as Error).message).toContain("Некоректний кидок");
    }
  });

  it("throws 400 коли d20Roll = 0 (поза [1, 20])", () => {
    try {
      runAttackPhase(makeInput({ data: { ...makeInput().data, d20Roll: 0 } }));
      throw new Error("should not reach");
    } catch (e) {
      // d20Roll=0 → falsy → перший check спрацює (немає d20Roll)
      // Або loop range check. У будь-якому випадку — 400.
      expect(e).toBeInstanceOf(BattleRuleError);
    }
  });
});

describe("runAttackPhase — happy path smoke", () => {
  it("returns finalInitiativeOrder + allBattleActions без throw", () => {
    const r = runAttackPhase(makeInput());

    expect(r.finalInitiativeOrder).toBeDefined();
    expect(r.allBattleActions).toBeInstanceOf(Array);
    expect(r.baseBattleLog).toEqual([]);
  });

  it("attackRolls per-target eq targets.length passes initial validation", () => {
    const t1 = createMockParticipant({
      basicInfo: { ...createMockParticipant().basicInfo, id: "t1", side: ParticipantSide.ENEMY },
    });

    const t2 = createMockParticipant({
      basicInfo: { ...createMockParticipant().basicInfo, id: "t2", side: ParticipantSide.ENEMY },
    });

    // Multi-target ranged attacker: maxTargets=2 + ranged-type attack.
    // makeAttacker() clobbers attacks, тому будуємо напряму.
    const baseAttacker = makeAttacker();

    const attacker: BattleParticipant = {
      ...baseAttacker,
      combatStats: { ...baseAttacker.combatStats, maxTargets: 2 },
      battleData: {
        ...baseAttacker.battleData,
        attacks: [meleeAttack({ type: AttackType.RANGED, id: "bow", name: "Лук" })],
      },
    };

    expect(() =>
      runAttackPhase({
        battle: {
          initiativeOrder: [attacker, t1, t2],
          battleLog: [],
          currentRound: 1,
          currentTurnIndex: 0,
        },
        data: {
          attackerId: "atk",
          targetIds: ["t1", "t2"],
          attackRolls: [12, 14],
          damageRolls: [4, 5],
        },
        battleId: "b1",
        userId: "user-1",
        isDM: false,
      }),
    ).not.toThrow();
  });
});

function armed(id: string, attacks: BattleAttack[], over: Partial<BattleParticipant> = {}): BattleParticipant {
  const p = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id, name: id, side: ParticipantSide.ENEMY }, ...over });

  return { ...p, battleData: { ...p.battleData, attacks } };
}

const bowAttack = meleeAttack({ type: AttackType.RANGED, id: "bow", name: "Лук" });

const rangedCounter = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "counterAttack", attackKinds: ["ranged"], bonusPercent: 0 }] });

describe("runAttackPhase — відсіч", () => {
  it("влучання по основній цілі → подія відсічі одразу після атаки", () => {
    const r = runAttackPhase(makeInput({ battle: { initiativeOrder: [makeAttacker(), armed("tgt", [meleeAttack()])], battleLog: [], currentRound: 1, currentTurnIndex: 0 }, rng: seq(0.85) }));

    expect(r.allBattleActions.map((a) => a.actionType)).toEqual(["attack", "retaliation"]);
    expect(r.allBattleActions.map((a) => a.actionIndex)).toEqual([0, 1]);
  });

  it("звичайний промах теж викликає відсіч; критичний промах — ні", () => {
    const order = () => [makeAttacker(), armed("tgt", [meleeAttack()])];

    const miss = runAttackPhase(makeInput({ battle: { initiativeOrder: order(), battleLog: [], currentRound: 1, currentTurnIndex: 0 }, data: { ...makeInput().data, d20Roll: 2 }, rng: seq(0.85) }));

    expect(miss.allBattleActions.map((a) => a.actionType)).toEqual(["attack", "retaliation"]);

    const fumble = runAttackPhase(makeInput({ battle: { initiativeOrder: order(), battleLog: [], currentRound: 1, currentTurnIndex: 0 }, data: { ...makeInput().data, d20Roll: 1 }, rng: seq(0.85) }));

    expect(fumble.allBattleActions.map((a) => a.actionType)).toEqual(["attack"]);
  });

  it("лише основна ціль відповідає, без ланцюжка", () => {
    const aoe = meleeAttack({ targetType: "aoe", maxTargets: 2 } as Partial<BattleAttack>);

    const base = makeAttacker();

    const attacker = { ...base, battleData: { ...base.battleData, attacks: [aoe] } };

    const r = runAttackPhase({
      battle: { initiativeOrder: [attacker, armed("t1", [meleeAttack()]), armed("t2", [meleeAttack()])], battleLog: [], currentRound: 1, currentTurnIndex: 0 },
      data: { attackerId: "atk", targetIds: ["t1", "t2"], d20Roll: 15, damageRolls: [3] },
      battleId: "b1",
      userId: "user-1",
      isDM: false,
      rng: seq(0.85),
    });

    const retaliations = r.allBattleActions.filter((a) => a.actionType === "retaliation");

    expect(retaliations).toHaveLength(1);
    expect(retaliations[0].actorId).toBe("t1");
  });

  it("атакувальник упав від відсічі — решта ударів скасовано", () => {
    const base = makeAttacker();

    const attacker: BattleParticipant = {
      ...base,
      combatStats: { ...base.combatStats, maxTargets: 2, currentHp: 1 },
      battleData: { ...base.battleData, attacks: [bowAttack] },
    };

    const t1 = armed("t1", [bowAttack], { battleData: { ...createMockParticipant().battleData, attacks: [bowAttack], resolvedAbilities: [rangedCounter] } });

    const t2 = armed("t2", [bowAttack]);

    const r = runAttackPhase({
      battle: { initiativeOrder: [attacker, t1, t2], battleLog: [], currentRound: 1, currentTurnIndex: 0 },
      data: { attackerId: "atk", targetIds: ["t1", "t2"], attackRolls: [12, 14], damageRolls: [4, 5] },
      battleId: "b1",
      userId: "user-1",
      isDM: false,
      rng: seq(0.85),
    });

    expect(r.allBattleActions.map((a) => a.actionType)).toEqual(["attack", "retaliation"]);
    expect(r.finalInitiativeOrder.find((p) => p.basicInfo.id === "t2")?.combatStats.currentHp).toBe(t2.combatStats.currentHp);
  });
});
