// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useBattleAction } from "../useBattleAction";

import { ApiError } from "@/lib/api/client";
import type { BattleScene, ClientBattleDelta } from "@/types/api";

const key = ["battle", "c1", "b1"];

const base = { id: "b1", status: "active", initiativeOrder: [], battleLog: [], participants: [], currentRound: 1, currentTurnIndex: 0, version: 5 } as unknown as BattleScene;

const delta = (version: number): ClientBattleDelta => ({
  battleId: "b1", version, scene: { status: "active", round: 1, turnIndex: 1, pendingMoraleCheck: null }, upserted: [], removed: [], log: [],
});

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  qc.setQueryData(key, base);

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return { qc, wrapper };
}

describe("useBattleAction", () => {
  it("підставляє expectedVersion з кешу, застосовує дельту, повертає response", async () => {
    const { qc, wrapper } = setup();

    const fn = vi.fn(async () => ({ delta: delta(6), response: { ok: 1 } }));

    const { result } = renderHook(() => useBattleAction<{ x: number }, { ok: number }>("c1", "b1", fn), { wrapper });

    let out: unknown;

    await act(async () => {
      out = await result.current.mutateAsync({ x: 1 });
    });

    expect(fn).toHaveBeenCalledWith({ x: 1, expectedVersion: 5 });
    expect(out).toEqual({ ok: 1 });
    expect(qc.getQueryData<BattleScene>(key)?.version).toBe(6);
  });

  it("розрив версії — mutateAsync чекає рефетчу, щоб кеш після дії був свіжим", async () => {
    const { qc, wrapper } = setup();

    let release: () => void = () => {};

    vi.spyOn(qc, "invalidateQueries").mockImplementation(() => new Promise<void>((r) => (release = r)));

    const { result } = renderHook(() => useBattleAction("c1", "b1", async () => ({ delta: delta(8) })), { wrapper });

    let settled = false;

    let done: Promise<void> = Promise.resolve();

    act(() => {
      done = result.current.mutateAsync({}).then(() => {
        settled = true;
      });
    });

    await waitFor(() => expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: key }));
    expect(settled).toBe(false);

    await act(async () => {
      release();
      await done;
    });

    expect(settled).toBe(true);
  });

  it("пропуск версії — інвалідація замість патчу", async () => {
    const { qc, wrapper } = setup();

    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useBattleAction("c1", "b1", async () => ({ delta: delta(8) })), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({});
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: key });
    expect(qc.getQueryData<BattleScene>(key)?.version).toBe(5);
  });

  it("409 — onConflict і інвалідація, помилка прокидується", async () => {
    const { qc, wrapper } = setup();

    const spy = vi.spyOn(qc, "invalidateQueries");

    const onConflict = vi.fn();

    const fn = vi.fn(async () => {
      throw new ApiError("conflict", 409, "/x", { code: "conflict", version: 7 });
    });

    const { result } = renderHook(() => useBattleAction("c1", "b1", fn, { onConflict }), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({})).rejects.toBeInstanceOf(ApiError);
    });

    await waitFor(() => expect(onConflict).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith({ queryKey: key });
  });
});

describe("useBattleAction — версія і помилки", () => {
  it("явна expectedVersion у змінних не перезаписується кешем", async () => {
    const { wrapper } = setup();

    const fn = vi.fn(async () => ({ delta: delta(6) }));

    const { result } = renderHook(() => useBattleAction<{ expectedVersion?: number }>("c1", "b1", fn), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ expectedVersion: 3 }).catch(() => undefined);
    });

    expect(fn).toHaveBeenCalledWith({ expectedVersion: 3 });
  });

  it("помилка, що не 409, — onFailure з текстом помилки", async () => {
    const { wrapper } = setup();

    const onFailure = vi.fn();

    const fn = vi.fn(async () => {
      throw new ApiError("Бонусну дію вже використано цього ходу", 422, "/x", { code: "action_used" });
    });

    const { result } = renderHook(() => useBattleAction("c1", "b1", fn, { onFailure }), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({}).catch(() => undefined);
    });

    await waitFor(() => expect(onFailure).toHaveBeenCalledWith("Бонусну дію вже використано цього ходу"));
  });
});

describe("useBattleAction — retryOnConflict", () => {
  const conflict = () => new ApiError("conflict", 409, "/x", { code: "conflict", version: 7 });

  it("409 — перечитує бій і повторює один раз зі свіжою версією, без тосту конфлікту", async () => {
    const { qc, wrapper } = setup();

    vi.spyOn(qc, "invalidateQueries").mockImplementation(async () => {
      qc.setQueryData(key, { ...base, version: 7 });
    });

    const onConflict = vi.fn();

    const fn = vi.fn().mockRejectedValueOnce(conflict()).mockResolvedValueOnce({ delta: delta(8) });

    const { result } = renderHook(() => useBattleAction("c1", "b1", fn, { onConflict, retryOnConflict: true }), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({});
    });

    expect(fn).toHaveBeenNthCalledWith(1, { expectedVersion: 5 });
    expect(fn).toHaveBeenNthCalledWith(2, { expectedVersion: 7 });
    expect(onConflict).not.toHaveBeenCalled();
    expect(qc.getQueryData<BattleScene>(key)?.version).toBe(8);
  });

  it("другий 409 — помилка й onConflict, без третьої спроби", async () => {
    const { wrapper } = setup();

    const onConflict = vi.fn();

    const fn = vi.fn(async () => {
      throw conflict();
    });

    const { result } = renderHook(() => useBattleAction("c1", "b1", fn, { onConflict, retryOnConflict: true }), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({}).catch(() => undefined);
    });

    expect(fn).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(onConflict).toHaveBeenCalledTimes(1));
  });

  it("завершення бою інвалідує кеш листів героїв", async () => {
    const { qc, wrapper } = setup();

    const spy = vi.spyOn(qc, "invalidateQueries");

    const done: ClientBattleDelta = { ...delta(6), scene: { status: "completed", round: 1, turnIndex: 0, pendingMoraleCheck: null } };

    const { result } = renderHook(() => useBattleAction("c1", "b1", async () => ({ delta: done })), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({});
    });

    const keys = spy.mock.calls.map(([f]) => (f as { queryKey: unknown[] }).queryKey[0]);

    expect(keys).toEqual(expect.arrayContaining(["character-sheet", "characters", "character-log"]));
  });

  it("звичайна дія не чіпає кеш героїв", async () => {
    const { qc, wrapper } = setup();

    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useBattleAction("c1", "b1", async () => ({ delta: delta(6) })), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({});
    });

    expect(spy).not.toHaveBeenCalled();
  });
});
