/**
 * @vitest-environment happy-dom
 */
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBattleLogHistory } from "../useBattleLogHistory";

import { getBattleEvents } from "@/lib/api/battles";
import { battleQueryKey } from "@/lib/hooks/battles";
import type { BattleScene } from "@/types/api";
import type { BattleAction } from "@/types/battle";

vi.mock("@/lib/api/battles", () => ({ getBattleEvents: vi.fn() }));

const entry = (actionIndex: number) => ({ actionIndex, resultText: `#${actionIndex}` }) as BattleAction;

const battle = { id: "b1", campaignId: "c1", battleLog: [entry(31), entry(32)], version: 4 } as BattleScene;

const key = battleQueryKey("c1", "b1");

function setup() {
  const client = new QueryClient();

  client.setQueryData(key, battle);

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

  const hook = renderHook(() => useBattleLogHistory("c1", "b1", client.getQueryData<BattleScene>(key)?.battleLog), { wrapper });

  return { client, hook };
}

beforeEach(() => vi.mocked(getBattleEvents).mockReset());

describe("useBattleLogHistory", () => {
  it("підвантажує сторінку до найстарішої події й мерджить у кеш бою", async () => {
    vi.mocked(getBattleEvents).mockResolvedValue({ events: [entry(29), entry(30)], hasMore: true });

    const { client, hook } = setup();

    expect(hook.result.current.canLoadEarlier).toBe(true);

    act(() => hook.result.current.loadEarlier());

    await waitFor(() => expect(client.getQueryData<BattleScene>(key)?.battleLog.map((e) => e.actionIndex)).toEqual([29, 30, 31, 32]));
    expect(getBattleEvents).toHaveBeenCalledWith("c1", "b1", { before: 31 });
  });

  it("остання сторінка — кнопка зникає", async () => {
    vi.mocked(getBattleEvents).mockResolvedValue({ events: [entry(5)], hasMore: false });

    const { hook } = setup();

    act(() => hook.result.current.loadEarlier());

    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    hook.rerender();
    expect(hook.result.current.canLoadEarlier).toBe(false);
  });

  it("журнал від першої події — підвантажувати нічого", () => {
    const client = new QueryClient();

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useBattleLogHistory("c1", "b1", [entry(1)]), { wrapper });

    expect(result.current.canLoadEarlier).toBe(false);
  });
});
