// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useBattle } from "../useBattles";

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
