import { describe, expect, it } from "vitest";

import { attackFlow, type AttackFlowAction, type AttackFlowState, attackPayload, effectiveD20, initialAttackFlow, strikeMode } from "@/lib/utils/battle/flows";

const run = (...actions: AttackFlowAction[]) => actions.reduce<AttackFlowState>(attackFlow, initialAttackFlow);

const open = (weaponCount = 1, maxTargets = 1): AttackFlowAction => ({ type: "OPEN", weaponCount, attackId: "rapier", maxTargets, diceSlots: [8] });

describe("attackFlow", () => {
  it("одна зброя — одразу ціль; кілька — спершу зброя", () => {
    expect(run(open()).step).toBe("target");
    expect(run(open(3)).step).toBe("weapon");
    expect(run(open(3), { type: "SELECT_WEAPON", attackId: "bow", maxTargets: 2, diceSlots: [8] })).toMatchObject({ step: "target", attackId: "bow", maxTargets: 2 });
  });

  it("OPEN з targetIds: одна зброя — крок цілі з обраною ціллю; кілька — крок зброї, SELECT_WEAPON обрізає", () => {
    const withTargets = (weaponCount: number, maxTargets: number, targetIds: string[]): AttackFlowAction => ({ type: "OPEN", weaponCount, attackId: "rapier", maxTargets, diceSlots: [8], targetIds });

    expect(run(withTargets(1, 1, ["e1"]))).toMatchObject({ step: "target", targetIds: ["e1"] });
    expect(run(withTargets(1, 1, ["e1", "e2"])).targetIds).toEqual(["e1"]);
    expect(run(withTargets(2, 2, ["e1"]))).toMatchObject({ step: "weapon", targetIds: ["e1"] });
    expect(run(withTargets(2, 2, ["e1", "e2"]), { type: "SELECT_WEAPON", attackId: "bow", maxTargets: 1, diceSlots: [8] }).targetIds).toEqual(["e1"]);
  });

  describe("CHANGE_WEAPON", () => {
    const picked: AttackFlowAction[] = [
      { type: "OPEN", weaponCount: 2, attackId: "rapier", maxTargets: 1, diceSlots: [8], targetIds: ["e1"], picked: true },
      { type: "SELECT_WEAPON", attackId: "rapier", maxTargets: 1, diceSlots: [8] },
      { type: "CONFIRM_TARGETS" },
    ];

    it("з кидка — назад до зброї з тією ж ціллю, удари скинуті, позначка вибору знята", () => {
      expect(run(...picked)).toMatchObject({ step: "roll", picked: true });

      const s = run(...picked, { type: "CHANGE_WEAPON" });

      expect(s).toMatchObject({ step: "weapon", targetIds: ["e1"], strikes: [], index: 0, picked: false });
      expect(attackFlow(s, { type: "SELECT_WEAPON", attackId: "bow", maxTargets: 1, diceSlots: [6] })).toMatchObject({ step: "target", attackId: "bow", targetIds: ["e1"] });
    });

    it("одна зброя або не крок кидка — без змін", () => {
      const single = run({ type: "OPEN", weaponCount: 1, attackId: "rapier", maxTargets: 1, diceSlots: [8], targetIds: ["e1"], picked: true }, { type: "CONFIRM_TARGETS" });

      expect(attackFlow(single, { type: "CHANGE_WEAPON" })).toBe(single);

      const atWeapon = run(picked[0]);

      expect(attackFlow(atWeapon, { type: "CHANGE_WEAPON" })).toBe(atWeapon);
    });
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
      attackerId: "me", attackId: "rapier", targetIds: ["a"], attackRoll: 14, advantageRoll: 6, rollMode: "advantage", damageRolls: [6], endTurn: false,
    });
    expect(attackFlow(s, { type: "SUBMIT" }).step).toBe("submitting");
  });

  it("перешкода — окремий перемикач, незалежний від недоліку; іде в payload", () => {
    const s = run(
      open(),
      { type: "TOGGLE_TARGET", id: "a" },
      { type: "CONFIRM_TARGETS" },
      { type: "SET_MODE", mode: "disadvantage" },
      { type: "TOGGLE_OBSTACLE" },
      { type: "ROLL", d20: 14, second: 12, outcome: "hit" },
      { type: "DAMAGE", values: [6] },
    );

    expect(s).toMatchObject({ mode: "disadvantage", obstacle: true });
    expect(attackPayload(s, "me")).toMatchObject({ obstacle: true, disadvantageRoll: 12, attackRoll: 14 });
    expect(attackFlow(s, { type: "TOGGLE_OBSTACLE" }).obstacle).toBe(false);
    expect(attackFlow(s, { type: "CLOSE" }).obstacle).toBe(false);
  });

  it("дві цілі: кидок на кожну; шкода лише для влучених; промахи теж у payload", () => {
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

    expect(attackPayload(u, "me")).toEqual({ attackerId: "me", attackId: "rapier", targetIds: ["a", "b"], attackRolls: [4, 17], damageRolls: [5], endTurn: false });
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

  it("SET_TARGETS вибирає всіх ворогів, але не більше maxTargets", () => {
    expect(run(open(1, 3), { type: "SET_TARGETS", ids: ["a", "b", "c", "d"] }).targetIds).toEqual(["a", "b", "c"]);
  });

  it("multi-target payload sends raw d20 and raw second rolls, never a pre-folded value", () => {
    const s = run(
      open(1, 2),
      { type: "TOGGLE_TARGET", id: "a" },
      { type: "TOGGLE_TARGET", id: "b" },
      { type: "CONFIRM_TARGETS" },
      { type: "SET_MODE", mode: "disadvantage" },
      { type: "ROLL", d20: 17, second: 3, outcome: "miss" },
      { type: "ROLL", d20: 15, second: 18, outcome: "hit" },
      { type: "DAMAGE", values: [5] },
    );

    expect(attackPayload(s, "me")).toMatchObject({ targetIds: ["a", "b"], attackRolls: [17, 15], secondRolls: [3, 18] });
  });

  it("payload carries misses too, so the server logs them and never rerolls", () => {
    const s = run(
      open(1, 2),
      { type: "TOGGLE_TARGET", id: "a" },
      { type: "TOGGLE_TARGET", id: "b" },
      { type: "CONFIRM_TARGETS" },
      { type: "ROLL", d20: 4, outcome: "miss" },
      { type: "ROLL", d20: 17, outcome: "hit" },
      { type: "DAMAGE", values: [5] },
    );

    expect(attackPayload(s, "me")).toMatchObject({ targetIds: ["a", "b"], attackRolls: [4, 17], damageRolls: [5] });
  });

  describe("перевага/недолік: навички vs вибір гравця", () => {
    const forced = { a: { mode: "advantage" as const, reason: "Перевага: Мітка мисливця" } };

    it("навичка задає режим: удар заблоковано, SET_MODE не змінює його, payload без rollMode", () => {
      const s = run(open(), { type: "TOGGLE_TARGET", id: "a" }, { type: "CONFIRM_TARGETS", forced }, { type: "SET_MODE", mode: "disadvantage" });

      expect(s.strikes[0].forced).toEqual(forced.a);
      expect(strikeMode(s, s.strikes[0])).toBe("advantage");
      expect(s.mode).toBe("normal");

      const done = run(open(), { type: "TOGGLE_TARGET", id: "a" }, { type: "CONFIRM_TARGETS", forced }, { type: "ROLL", d20: 4, second: 16, outcome: "hit" }, { type: "DAMAGE", values: [6] });

      expect(attackPayload(done, "me")).toMatchObject({ attackRoll: 4, advantageRoll: 16 });
      expect(attackPayload(done, "me")).not.toHaveProperty("rollMode");
      expect(effectiveD20(done.strikes[0], strikeMode(done, done.strikes[0]))).toBe(16);
    });

    it("без навичок — ручний вибір іде на сервер як rollMode", () => {
      const s = run(open(), { type: "TOGGLE_TARGET", id: "a" }, { type: "CONFIRM_TARGETS", forced: {} }, { type: "SET_MODE", mode: "disadvantage" }, { type: "ROLL", d20: 14, second: 5, outcome: "hit" }, { type: "DAMAGE", values: [6] });

      expect(attackPayload(s, "me")).toMatchObject({ rollMode: "disadvantage", disadvantageRoll: 5 });
      expect(effectiveD20(s.strikes[0], strikeMode(s, s.strikes[0]))).toBe(5);
    });

    it("взаємне скасування теж блокує: режим «звичайний», ручний вибір ігнорується", () => {
      const s = run(open(), { type: "TOGGLE_TARGET", id: "a" }, { type: "CONFIRM_TARGETS", forced: { a: { mode: "normal", reason: "скасовуються" } } }, { type: "SET_MODE", mode: "advantage" });

      expect(strikeMode(s, s.strikes[0])).toBe("normal");
    });

    it("залп: режим на кожен удар свій; удар без другого кубика — null у secondRolls", () => {
      const s = run(
        open(1, 2),
        { type: "TOGGLE_TARGET", id: "a" },
        { type: "TOGGLE_TARGET", id: "b" },
        { type: "SET_MODE", mode: "advantage" },
        { type: "CONFIRM_TARGETS", forced: { a: { mode: "normal", reason: "скасовуються" } } },
        { type: "ROLL", d20: 17, outcome: "hit" },
      );

      expect(strikeMode(s, s.strikes[1])).toBe("advantage");

      const t = run(
        open(1, 2), { type: "TOGGLE_TARGET", id: "a" }, { type: "TOGGLE_TARGET", id: "b" },
        { type: "SET_MODE", mode: "advantage" },
        { type: "CONFIRM_TARGETS", forced: { a: { mode: "normal", reason: "скасовуються" } } },
        { type: "ROLL", d20: 17, outcome: "miss" }, { type: "ROLL", d20: 4, second: 15, outcome: "hit" }, { type: "DAMAGE", values: [5] },
      );

      expect(attackPayload(t, "me")).toMatchObject({ attackRolls: [17, 4], secondRolls: [null, 15], rollMode: "advantage" });
    });
  });
});
