// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAttackWizard } from "../useAttackWizard";
import { fakeScene } from "./fake-scene";

import type { BattleAction } from "@/types/battle";

function start() {
  const scene = fakeScene();

  scene.mutateAsync.mockResolvedValue({ hpChanges: [{ participantId: "gob", participantName: "Гоблін", oldHp: 20, newHp: 11, change: 9 }] });

  const onDone = vi.fn();

  const hook = renderHook(() => useAttackWizard(scene.me, onDone), { wrapper: scene.wrapper });

  act(() => hook.result.current.open());
  act(() => hook.result.current.toggleTarget("gob"));
  act(() => hook.result.current.confirmTargets());

  return { ...scene, onDone, result: hook.result };
}

describe("useAttackWizard", () => {
  it("одна зброя: ціль → кидок (влучання за AC) → шкода → підсумок → відправка → результат", async () => {
    const { result, mutateAsync, showResult, onDone } = start();

    act(() => result.current.roll(14));
    expect(result.current.state.step).toBe("damage");

    act(() => result.current.damage([6]));
    expect(result.current.state.step).toBe("summary");
    expect(result.current.steps[0].some((s) => s.side === "target")).toBe(false);
    expect(result.current.unknownDefense).toBe(true);

    act(() => result.current.submit());

    await waitFor(() => expect(result.current.state.step).toBe("result"));
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ targetIds: ["gob"], attackRoll: 14, damageRolls: [6] }));
    expect(showResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "hit", damage: 9, downed: false }));
    expect(onDone).toHaveBeenCalled();
  });

  it("шкода — з hpChanges відповіді по цілі, а не з різниці кешу; відсіч по атакувальнику не рахується", async () => {
    const { result, mutateAsync, showResult } = start();

    mutateAsync.mockResolvedValueOnce({
      hpChanges: [
        { participantId: "gob", participantName: "Гоблін", oldHp: 20, newHp: 13, change: 7 },
        { participantId: "me", participantName: "Фрейда", oldHp: 20, newHp: 16, change: 4 },
      ],
    });

    act(() => result.current.roll(14));
    act(() => result.current.damage([6]));
    act(() => result.current.submit());

    await waitFor(() => expect(showResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "hit", damage: 7 })));
  });

  it("промах — відправка одразу, результат «miss»", async () => {
    const { result, mutateAsync, showResult } = start();

    act(() => result.current.roll(2));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(showResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "miss" })));
  });

  it("помилка мутації — підсумок із текстом помилки", async () => {
    const { result, mutateAsync } = start();

    mutateAsync.mockRejectedValueOnce(new Error("Стан бою змінився"));

    act(() => result.current.roll(14));
    act(() => result.current.damage([6]));
    act(() => result.current.submit());

    await waitFor(() => expect(result.current.state).toMatchObject({ step: "summary", error: "Стан бою змінився" }));
  });

  it("previews: бонуси й оцінка для кожної зброї", () => {
    const { result } = start();

    expect(result.current.previews.rapier.estimate).toBeGreaterThan(0);
  });

  it("відсіч цілі потрапляє в результат", async () => {
    const afterLog = [
      { actionIndex: 9, actionType: "retaliation", actorName: "Гоблін", targets: [{ participantId: "me", participantName: "Фрейда" }], hpChanges: [{ participantId: "me", participantName: "Фрейда", oldHp: 20, newHp: 16, change: 4 }], actionDetails: { isHit: true } },
    ] as unknown as BattleAction[];

    const scene = fakeScene({ afterLog });

    const { result } = renderHook(() => useAttackWizard(scene.me), { wrapper: scene.wrapper });

    act(() => result.current.open());
    act(() => result.current.toggleTarget("gob"));
    act(() => result.current.confirmTargets());
    act(() => result.current.roll(14));
    act(() => result.current.damage([6]));
    act(() => result.current.submit());

    await waitFor(() => expect(scene.showResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "hit", retaliation: { name: "Гоблін", damage: 4 } })));
  });

  it("критична невдача з серверного логу дає miss з critFail, хоч прогноз бачив влучання", async () => {
    const afterLog = [
      { actionIndex: 9, actionType: "attack", actorId: "me", targets: [{ participantId: "gob", participantName: "Гоблін" }], hpChanges: [], actionDetails: { criticalEffect: { id: 3, name: "Падіння", description: "", type: "fail", flavor: "Ви спотикаєтесь." } } },
    ] as unknown as BattleAction[];

    const scene = fakeScene({ afterLog });

    const { result } = renderHook(() => useAttackWizard(scene.me), { wrapper: scene.wrapper });

    act(() => result.current.open());
    act(() => result.current.toggleTarget("gob"));
    act(() => result.current.confirmTargets());
    act(() => result.current.roll(14));
    act(() => result.current.damage([6]));
    act(() => result.current.submit());

    await waitFor(() => expect(scene.showResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "miss", critFail: { name: "Падіння", flavor: "Ви спотикаєтесь." } })));
  });
});
