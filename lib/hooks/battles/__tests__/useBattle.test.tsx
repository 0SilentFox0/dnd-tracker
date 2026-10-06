// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BATTLE_ACTIVE_REFETCH_INTERVAL_MS, useBattle } from "../useBattles";

import type { BattleScene } from "@/types/api";

const getBattle = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/battles", async (orig) => ({ ...(await orig<object>()), getBattle }));

const battle = (version: number, turn: number) =>
  ({ id: "b1", status: "active", initiativeOrder: [], battleLog: [], participants: [], currentRound: 1, currentTurnIndex: turn, version, isDM: true }) as unknown as BattleScene;

describe("useBattle", () => {
  it("відповідь GET зі старішою версією не перезаписує новішу дельту в кеші", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    getBattle.mockResolvedValueOnce(battle(5, 0));

    const { result } = renderHook(() => useBattle("c1", "b1"), { wrapper });

    await waitFor(() => expect(result.current.data?.version).toBe(5));

    act(() => qc.setQueryData(["battle", "c1", "b1"], battle(7, 2)));

    getBattle.mockResolvedValueOnce({ ...battle(6, 1), isDM: undefined });

    await act(async () => {
      await qc.refetchQueries({ queryKey: ["battle", "c1", "b1"] });
    });

    expect(qc.getQueryData<BattleScene>(["battle", "c1", "b1"])).toMatchObject({ version: 7, currentTurnIndex: 2 });
  });
});

describe("useBattle — опитування без Pusher", () => {
  const intervalFor = async (status: BattleScene["status"], options?: Parameters<typeof useBattle>[2]) => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    getBattle.mockResolvedValueOnce({ ...battle(1, 0), status });

    const { result } = renderHook(() => useBattle("c1", "b1", options), { wrapper });

    await waitFor(() => expect(result.current.data?.status).toBe(status));

    const query = qc.getQueryCache().find({ queryKey: ["battle", "c1", "b1"] });

    const interval = query?.observers[0]?.options.refetchInterval;

    return typeof interval === "function" ? interval(query as never) : interval;
  };

  it.each(["prepared", "active"] as const)("бій %s опитується раз на 30 с", async (status) => {
    expect(await intervalFor(status)).toBe(BATTLE_ACTIVE_REFETCH_INTERVAL_MS);
  });

  it("завершений бій не опитується", async () => {
    expect(await intervalFor("completed")).toBe(false);
  });

  it("з Pusher не опитується навіть у prepared", async () => {
    expect(await intervalFor("prepared", { pauseRefetchWhenPusherConnected: true })).toBe(false);
  });
});
