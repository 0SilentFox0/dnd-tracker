// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useBattleResync } from "../useBattleResync";

import { getBattleVersion } from "@/lib/api/battles";
import { battleKeys } from "@/lib/hooks/battles/keys";

vi.mock("@/lib/api/battles", () => ({ getBattleVersion: vi.fn() }));

describe("useBattleResync", () => {
  it("запит версії старого бою не блокує ресинк нового після зміни battleId", async () => {
    const client = new QueryClient();

    client.setQueryData(battleKeys.scene("c", "b1"), { version: 1 });
    client.setQueryData(battleKeys.scene("c", "b2"), { version: 1 });

    let releaseB1: (v: { version: number }) => void = () => {};

    vi.mocked(getBattleVersion).mockImplementation((_c, battleId) =>
      battleId === "b1" ? new Promise((r) => (releaseB1 = r)) : Promise.resolve({ version: 1 }),
    );

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

    const { result, rerender } = renderHook(({ battleId }) => useBattleResync("c", battleId), { wrapper, initialProps: { battleId: "b1" } });

    const first = result.current();

    expect(result.current()).toBe(first);

    rerender({ battleId: "b2" });
    await result.current();

    expect(getBattleVersion).toHaveBeenCalledWith("c", "b2");

    releaseB1({ version: 1 });
    await first;
  });
});
