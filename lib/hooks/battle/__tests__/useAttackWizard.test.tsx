// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAttackWizard } from "../useAttackWizard";
import { fakeScene } from "./fake-scene";

import type { BattleAction } from "@/types/battle";

const hitLog = (changes: { participantId: string; change: number }[]) =>
  [{ actionIndex: 9, actionType: "attack", actorId: "me", targets: [{ participantId: "gob", participantName: "Гоблін" }], hpChanges: changes.map((c) => ({ ...c, participantName: c.participantId, oldHp: 20, newHp: 20 - c.change })), actionDetails: { isHit: true } }] as unknown as BattleAction[];

function start(afterLog: BattleAction[] = hitLog([{ participantId: "gob", change: 9 }])) {
  const scene = fakeScene({ afterLog });

  scene.mutateAsync.mockResolvedValue(undefined);

  const onDone = vi.fn();

  const hook = renderHook(() => useAttackWizard(scene.me, onDone), { wrapper: scene.wrapper });

  act(() => hook.result.current.actions.open());
  act(() => hook.result.current.actions.toggleTarget("gob"));
  act(() => hook.result.current.actions.confirmTargets());

  return { ...scene, onDone, result: hook.result };
}

describe("useAttackWizard", () => {
  it("одна зброя: ціль → кидок (влучання за AC) → шкода → підсумок → відправка → результат", async () => {
    const { result, mutateAsync, showResult, onDone } = start();

    act(() => result.current.actions.roll(14));
    expect(result.current.state.step).toBe("damage");

    act(() => result.current.actions.damage([6]));
    expect(result.current.state.step).toBe("summary");
    expect(result.current.view.steps[0].some((s) => s.side === "target")).toBe(false);
    expect(result.current.view.unknownDefense).toBe(true);

    act(() => result.current.actions.submit());

    await waitFor(() => expect(result.current.state.step).toBe("result"));
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ targetIds: ["gob"], attackRoll: 14, damageRolls: [6] }));
    expect(showResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "hit", damage: 9, downed: false }));
    expect(onDone).toHaveBeenCalled();
  });

  it("шкода — з hpChanges відповіді по цілі, а не з різниці кешу; відсіч по атакувальнику не рахується", async () => {
    const { result, showResult } = start(hitLog([{ participantId: "gob", change: 7 }, { participantId: "me", change: 4 }]));

    act(() => result.current.actions.roll(14));
    act(() => result.current.actions.damage([6]));
    act(() => result.current.actions.submit());

    await waitFor(() => expect(showResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "hit", damage: 7 })));
  });

  it("промах — відправка одразу, результат «miss»", async () => {
    const missLog = [{ actionIndex: 9, actionType: "attack", actorId: "me", targets: [{ participantId: "gob", participantName: "Гоблін" }], hpChanges: [], actionDetails: { isHit: false } }] as unknown as BattleAction[];

    const { result, mutateAsync, showResult } = start(missLog);

    act(() => result.current.actions.roll(2));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(showResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "miss" })));
  });

  it("у логу немає нових записів — картка бере прогнозований результат ударів, а не «промах»", async () => {
    const { result, showResult } = start([]);

    act(() => result.current.actions.roll(14));
    act(() => result.current.actions.damage([6]));
    act(() => result.current.actions.submit());

    await waitFor(() => expect(showResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "hit", damage: 0 })));
  });

  it("помилка мутації — підсумок із текстом помилки", async () => {
    const { result, mutateAsync } = start();

    mutateAsync.mockRejectedValueOnce(new Error("Стан бою змінився"));

    act(() => result.current.actions.roll(14));
    act(() => result.current.actions.damage([6]));
    act(() => result.current.actions.submit());

    await waitFor(() => expect(result.current.state).toMatchObject({ step: "summary", error: "Стан бою змінився" }));
  });

  it("previews: бонуси й оцінка для кожної зброї", () => {
    const { result } = start();

    expect(result.current.view.previews.rapier.estimate).toBeGreaterThan(0);
  });

  it("відсіч цілі потрапляє в результат", async () => {
    const afterLog = [
      ...hitLog([{ participantId: "gob", change: 9 }]),
      { actionIndex: 10, actionType: "retaliation", actorName: "Гоблін", targets: [{ participantId: "me", participantName: "Фрейда" }], hpChanges: [{ participantId: "me", participantName: "Фрейда", oldHp: 20, newHp: 16, change: 4 }], actionDetails: { isHit: true } },
    ] as unknown as BattleAction[];

    const scene = fakeScene({ afterLog });

    const { result } = renderHook(() => useAttackWizard(scene.me), { wrapper: scene.wrapper });

    act(() => result.current.actions.open());
    act(() => result.current.actions.toggleTarget("gob"));
    act(() => result.current.actions.confirmTargets());
    act(() => result.current.actions.roll(14));
    act(() => result.current.actions.damage([6]));
    act(() => result.current.actions.submit());

    await waitFor(() => expect(scene.showResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "hit", retaliation: { name: "Гоблін", damage: 4 } })));
  });

  it("критична невдача з серверного логу дає miss з critFail, хоч прогноз бачив влучання", async () => {
    const afterLog = [
      { actionIndex: 9, actionType: "attack", actorId: "me", targets: [{ participantId: "gob", participantName: "Гоблін" }], hpChanges: [], actionDetails: { criticalEffect: { id: 3, name: "Падіння", description: "", type: "fail", flavor: "Ви спотикаєтесь." } } },
    ] as unknown as BattleAction[];

    const scene = fakeScene({ afterLog });

    const { result } = renderHook(() => useAttackWizard(scene.me), { wrapper: scene.wrapper });

    act(() => result.current.actions.open());
    act(() => result.current.actions.toggleTarget("gob"));
    act(() => result.current.actions.confirmTargets());
    act(() => result.current.actions.roll(14));
    act(() => result.current.actions.damage([6]));
    act(() => result.current.actions.submit());

    await waitFor(() => expect(scene.showResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "miss", critFail: expect.objectContaining({ name: "Падіння", flavor: "Ви спотикаєтесь." }) })));
  });

  it("open(ціль, зброя): пропускає вибір зброї й одразу веде до кидка з цією зброєю", () => {
    const scene = fakeScene();

    const bow = { id: "bow", name: "Лук", type: "ranged", attackBonus: 4, damageDice: "1d6", damageType: "piercing", range: "80/320" };

    const archer = { ...scene.me, battleData: { ...scene.me.battleData, attacks: [...scene.me.battleData.attacks, bow] } } as typeof scene.me;

    const { result } = renderHook(() => useAttackWizard(archer), { wrapper: scene.wrapper });

    act(() => result.current.actions.open("gob", "bow"));

    expect(result.current.state.step).toBe("roll");
    expect(result.current.state.attackId).toBe("bow");
    expect(result.current.state.targetIds).toEqual(["gob"]);
  });

  it("open(ціль) без зброї при кількох атаках лишає вибір зброї", () => {
    const scene = fakeScene();

    const bow = { id: "bow", name: "Лук", type: "ranged", attackBonus: 4, damageDice: "1d6", damageType: "piercing" };

    const archer = { ...scene.me, battleData: { ...scene.me.battleData, attacks: [...scene.me.battleData.attacks, bow] } } as typeof scene.me;

    const { result } = renderHook(() => useAttackWizard(archer), { wrapper: scene.wrapper });

    act(() => result.current.actions.open("gob"));

    expect(result.current.state.step).toBe("weapon");
  });

  it("пауза на вибір ДМ: очікування без результату, після зняття pending — результат з нового журналу", async () => {
    const critLog = [
      { actionIndex: 9, actionType: "attack", actorId: "me", targets: [{ participantId: "gob", participantName: "Гоблін" }], hpChanges: [{ participantId: "gob", participantName: "Гоблін", oldHp: 20, newHp: 8, change: 12 }], actionDetails: { isHit: true, criticalEffect: { id: 1, name: "Точний удар", description: "", type: "success" } } },
    ] as unknown as BattleAction[];

    const scene = fakeScene({ afterLog: critLog });

    scene.battle.pendingCritChoice = { action: "attack", actorId: "me", triggers: [] };
    scene.mutateAsync.mockResolvedValue({ hpChanges: [], pendingCritChoice: true });

    const hook = renderHook(() => useAttackWizard(scene.me), { wrapper: scene.wrapper });

    act(() => hook.result.current.actions.open());
    act(() => hook.result.current.actions.toggleTarget("gob"));
    act(() => hook.result.current.actions.confirmTargets());
    act(() => hook.result.current.actions.roll(20));
    act(() => hook.result.current.actions.damage([6]));
    act(() => hook.result.current.actions.submit());

    await waitFor(() => expect(hook.result.current.state.waitingCrit).toBe(true));
    expect(scene.showResult).not.toHaveBeenCalled();

    scene.battle.pendingCritChoice = null;
    hook.rerender();

    await waitFor(() => expect(scene.showResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "hit", damage: 12, critEffect: expect.objectContaining({ name: "Точний удар" }) })));
    expect(hook.result.current.state).toMatchObject({ step: "result", waitingCrit: false });
  });
});
