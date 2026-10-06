// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/battles", async (orig) => ({ ...(await orig<typeof import("@/lib/api/battles")>()), attack: vi.fn() }));

import { attack } from "@/lib/api/battles";
import { useAttack } from "@/lib/hooks/battles";
import type { ClientBattleDelta } from "@/types/api";
import type { BattleAction } from "@/types/battle";

const change = (participantId: string, value: number) => ({ participantId, participantName: participantId, oldHp: 20, newHp: 20 - value, change: value });

describe("useAttack", () => {
  it("повертає зміни HP з журналу дельти — і цілі, і атакувальника", async () => {
    const log = [{ hpChanges: [change("gob", 7)] }, { hpChanges: [change("me", 4)] }] as unknown as BattleAction[];

    const delta = { battleId: "b1", version: 6, scene: { status: "active", round: 1, turnIndex: 0, pendingMoraleCheck: null }, upserted: [], removed: [], log } as ClientBattleDelta;

    vi.mocked(attack).mockResolvedValue({ delta });

    const qc = new QueryClient();

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useAttack("c1", "b1"), { wrapper });

    let out: unknown;

    await act(async () => {
      out = await result.current.mutateAsync({ attackerId: "me", targetIds: ["gob"], attackRoll: 15, damageRolls: [7] });
    });

    expect(out).toEqual({ hpChanges: [change("gob", 7), change("me", 4)] });
  });
});
