// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { usePlayerTurn } from "../usePlayerTurn";
import { fakeScene } from "./fake-scene";

describe("usePlayerTurn", () => {
  it("мораль ≠ 0 — фаза morale; «додатковий хід» → оверлей і дії", async () => {
    const { me, wrapper, moraleCheck, showResult } = fakeScene({ morale: 2 });

    const { result } = renderHook(() => usePlayerTurn(me), { wrapper });

    expect(result.current.phase).toBe("morale");

    await act(async () => result.current.rollMorale(9));

    expect(moraleCheck).toHaveBeenCalledWith({ participantId: me.basicInfo.id, d10Roll: 9 });
    expect(showResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "morale-extra", d10: 9 }));
    expect(result.current.phase).toBe("acting");
  });

  it("після вичерпаної дії — відлік; «Залишитись» — назад до дій", () => {
    const { me, wrapper } = fakeScene();

    const { result } = renderHook(() => usePlayerTurn(me), { wrapper });

    act(() => result.current.afterAction());
    expect(result.current.phase).toBe("countdown");

    act(() => result.current.stay());
    expect(result.current.phase).toBe("acting");
  });

  it("«Завершити хід» з невикористаною дією питає підтвердження; «ні» — хід триває", async () => {
    const { me, wrapper, nextTurn, confirm } = fakeScene({ confirmAnswer: false });

    const { result } = renderHook(() => usePlayerTurn(me), { wrapper });

    await act(async () => result.current.endTurn());

    expect(confirm).toHaveBeenCalled();
    expect(nextTurn).not.toHaveBeenCalled();
    expect(result.current.phase).toBe("acting");
  });

  it("«Завершити хід» після дії — без підтвердження", async () => {
    const scene = fakeScene();

    const used = { ...scene.me, actionFlags: { ...scene.me.actionFlags, hasUsedAction: true } };

    const { result } = renderHook(() => usePlayerTurn(used), { wrapper: scene.wrapper });

    await act(async () => result.current.endTurn());

    expect(scene.confirm).not.toHaveBeenCalled();
    expect(scene.nextTurn).toHaveBeenCalledWith({});
  });

  it("паніка: перехід ходу через 4 с з версією після перевірки; демонтаж скасовує таймер", async () => {
    vi.useFakeTimers();

    const scene = fakeScene({ morale: -1 });

    scene.moraleCheck.mockResolvedValue({ moraleResult: { hasExtraTurn: false, shouldSkipTurn: true, moralePositive: false, message: "" } });

    const nextMutate = scene.value.actions.nextTurn.mutate as ReturnType<typeof vi.fn>;

    const { result, unmount } = renderHook(() => usePlayerTurn(scene.me), { wrapper: scene.wrapper });

    await act(async () => result.current.rollMorale(2));
    act(() => vi.advanceTimersByTime(4_100));

    expect(nextMutate).toHaveBeenCalledWith({ expectedVersion: 5 }, expect.anything());

    nextMutate.mockClear();

    const second = renderHook(() => usePlayerTurn(scene.me), { wrapper: scene.wrapper });

    await act(async () => second.result.current.rollMorale(2));
    second.unmount();
    act(() => vi.advanceTimersByTime(4_100));

    expect(nextMutate).not.toHaveBeenCalled();

    unmount();
    vi.useRealTimers();
  });

  it("невдалий «Завершити хід» лишає дії доступними", async () => {
    const scene = fakeScene();

    const used = { ...scene.me, actionFlags: { ...scene.me.actionFlags, hasUsedAction: true } };

    scene.nextTurn.mockRejectedValueOnce(new Error("Зараз не ваш хід"));

    const { result } = renderHook(() => usePlayerTurn(used), { wrapper: scene.wrapper });

    act(() => result.current.afterAction());
    await act(async () => result.current.endTurn().catch(() => undefined));

    expect(result.current.phase).not.toBe("ended");
  });

  it("бій завершився цією дією — відлік не запускається", () => {
    const scene = fakeScene();

    const done = { ...scene.value.readBattle(), status: "completed" };

    scene.value.readBattle = () => done as never;

    const { result } = renderHook(() => usePlayerTurn(scene.me), { wrapper: scene.wrapper });

    act(() => result.current.afterAction());

    expect(result.current.phase).toBe("acting");
  });

  it("автоперехід після паніки не вдався (409) — дії повертаються, щоб завершити хід вручну", async () => {
    vi.useFakeTimers();

    const scene = fakeScene({ morale: 2 });

    scene.moraleCheck.mockResolvedValue({ moraleResult: { hasExtraTurn: false, shouldSkipTurn: true, moralePositive: false, message: "" } });

    (scene.value.actions.nextTurn.mutate as ReturnType<typeof vi.fn>).mockImplementation((_vars: unknown, opts?: { onError?: () => void }) => opts?.onError?.());

    const { result } = renderHook(() => usePlayerTurn(scene.me), { wrapper: scene.wrapper });

    await act(async () => result.current.rollMorale(2));
    expect(result.current.phase).toBe("ended");

    act(() => vi.advanceTimersByTime(4_100));
    expect(result.current.phase).toBe("acting");
    expect(result.current.skipped).toBe(true);

    vi.useRealTimers();
  });

  it("паніка: «Завершити хід» без питання «дію не використано»", async () => {
    vi.useFakeTimers();

    const scene = fakeScene({ morale: -1, confirmAnswer: false });

    scene.moraleCheck.mockResolvedValue({ moraleResult: { hasExtraTurn: false, shouldSkipTurn: true, moralePositive: false, message: "" } });

    (scene.value.actions.nextTurn.mutate as ReturnType<typeof vi.fn>).mockImplementation((_vars: unknown, opts?: { onError?: () => void }) => opts?.onError?.());

    const { result } = renderHook(() => usePlayerTurn(scene.me), { wrapper: scene.wrapper });

    await act(async () => result.current.rollMorale(2));
    act(() => vi.advanceTimersByTime(4_100));
    vi.useRealTimers();

    await act(async () => result.current.endTurn());

    expect(scene.confirm).not.toHaveBeenCalled();
    expect(scene.nextTurn).toHaveBeenCalledWith({});
  });

  it("результат моралі: без перевірки — undefined; уже перевірена в цьому ході — з pendingMoraleCheck", () => {
    const plain = fakeScene();

    expect(renderHook(() => usePlayerTurn(plain.me), { wrapper: plain.wrapper }).result.current.moraleResult).toBeUndefined();

    const checked = fakeScene({ morale: 2 });

    checked.battle.pendingMoraleCheck = { participantId: "me", d10Roll: 9, moraleResult: { hasExtraTurn: true, shouldSkipTurn: false, moralePositive: true, message: "" } };

    const { result } = renderHook(() => usePlayerTurn(checked.me), { wrapper: checked.wrapper });

    expect(result.current.phase).toBe("acting");
    expect(result.current.moraleResult).toBe("extra");
  });
});
