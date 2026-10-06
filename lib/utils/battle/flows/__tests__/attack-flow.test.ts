import { describe, expect, it } from "vitest";

import { attackFlow, type AttackFlowAction, type AttackFlowState, attackPayload, initialAttackFlow } from "@/lib/utils/battle/flows";

const run = (...actions: AttackFlowAction[]) => actions.reduce<AttackFlowState>(attackFlow, initialAttackFlow);

const open = (weaponCount = 1, maxTargets = 1): AttackFlowAction => ({ type: "OPEN", weaponCount, attackId: "rapier", maxTargets, diceSlots: [8] });

describe("attackFlow", () => {
  it("одна зброя — одразу ціль; кілька — спершу зброя", () => {
    expect(run(open()).step).toBe("target");
    expect(run(open(3)).step).toBe("weapon");
    expect(run(open(3), { type: "SELECT_WEAPON", attackId: "bow", maxTargets: 2, diceSlots: [8] })).toMatchObject({ step: "target", attackId: "bow", maxTargets: 2 });
  });

  it("одна ціль — заміна; кілька — перемикання до максимуму", () => {
    expect(run(open(), { type: "TOGGLE_TARGET", id: "a" }, { type: "TOGGLE_TARGET", id: "b" }).targetIds).toEqual(["b"]);

    const multi = run(open(1, 2), { type: "TOGGLE_TARGET", id: "a" }, { type: "TOGGLE_TARGET", id: "b" }, { type: "TOGGLE_TARGET", id: "c" });

    expect(multi.targetIds).toEqual(["a", "b"]);
    expect(attackFlow(multi, { type: "TOGGLE_TARGET", id: "a" }).targetIds).toEqual(["b"]);
  });

  it("без цілі далі не йде", () => {
    expect(run(open(), { type: "CONFIRM_TARGETS" }).step).toBe("target");
  });

  it("промах однієї цілі — одразу відправка, без кроку шкоди", () => {
    const s = run(open(), { type: "TOGGLE_TARGET", id: "a" }, { type: "CONFIRM_TARGETS" }, { type: "ROLL", d20: 3, outcome: "miss" });

    expect(s.step).toBe("submitting");
    expect(attackPayload(s, "me")).toEqual({ attackerId: "me", attackId: "rapier", targetIds: ["a"], attackRoll: 3, damageRolls: [], endTurn: false });
  });

  it("влучання → шкода → підсумок → відправка; payload з кидками", () => {
    const s = run(
      open(),
      { type: "TOGGLE_TARGET", id: "a" },
      { type: "CONFIRM_TARGETS" },
      { type: "SET_MODE", mode: "advantage" },
      { type: "ROLL", d20: 14, second: 6, outcome: "hit" },
      { type: "DAMAGE", values: [6] },
    );

    expect(s.step).toBe("summary");
    expect(attackPayload(s, "me")).toEqual({
      attackerId: "me", attackId: "rapier", targetIds: ["a"], attackRoll: 14, advantageRoll: 6, damageRolls: [6], endTurn: false,
    });
    expect(attackFlow(s, { type: "SUBMIT" }).step).toBe("submitting");
  });

  it("дві цілі: кидок на кожну; шкода лише для влучених; payload лише з влучених", () => {
    const s = run(
      open(1, 2),
      { type: "TOGGLE_TARGET", id: "a" },
      { type: "TOGGLE_TARGET", id: "b" },
      { type: "CONFIRM_TARGETS" },
      { type: "ROLL", d20: 4, outcome: "miss" },
    );

    expect(s).toMatchObject({ step: "roll", index: 1 });

    const t = run(
      open(1, 2), { type: "TOGGLE_TARGET", id: "a" }, { type: "TOGGLE_TARGET", id: "b" }, { type: "CONFIRM_TARGETS" },
      { type: "ROLL", d20: 4, outcome: "miss" }, { type: "ROLL", d20: 17, outcome: "hit" },
    );

    expect(t).toMatchObject({ step: "damage", index: 1 });

    const u = attackFlow(t, { type: "DAMAGE", values: [5] });

    expect(attackPayload(u, "me")).toEqual({ attackerId: "me", attackId: "rapier", targetIds: ["b"], attackRolls: [17], damageRolls: [5], endTurn: false });
  });

  it("BACK із підсумку — до шкоди, з кидка першої цілі — до вибору цілі", () => {
    const sum = run(open(), { type: "TOGGLE_TARGET", id: "a" }, { type: "CONFIRM_TARGETS" }, { type: "ROLL", d20: 14, outcome: "hit" }, { type: "DAMAGE", values: [6] });

    expect(attackFlow(sum, { type: "BACK" }).step).toBe("damage");
    expect(run(open(), { type: "TOGGLE_TARGET", id: "a" }, { type: "CONFIRM_TARGETS" }, { type: "BACK" }).step).toBe("target");
  });

  it("FAIL повертає на підсумок із помилкою й не губить кидки; SUCCESS → result; CLOSE → closed", () => {
    const sum = run(open(), { type: "TOGGLE_TARGET", id: "a" }, { type: "CONFIRM_TARGETS" }, { type: "ROLL", d20: 14, outcome: "hit" }, { type: "DAMAGE", values: [6] }, { type: "SUBMIT" });

    const failed = attackFlow(sum, { type: "FAIL", error: "Стан бою змінився" });

    expect(failed).toMatchObject({ step: "summary", error: "Стан бою змінився" });
    expect(failed.strikes[0].damage).toEqual([6]);

    const ok = attackFlow(sum, { type: "SUCCESS", results: [{ kind: "hit", targetId: "a", damage: 9, downed: false }] });

    expect(ok.step).toBe("result");
    expect(attackFlow(ok, { type: "CLOSE" })).toEqual(initialAttackFlow);
  });
});
