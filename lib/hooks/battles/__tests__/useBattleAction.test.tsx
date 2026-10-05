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
