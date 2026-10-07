// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const server = vi.hoisted(() => ({
  stats: {
    characterStats: { h1: { dpr: 14, hp: 60, kpi: 0.2 }, h2: { dpr: 14, hp: 60, kpi: 0.2 }, h3: { dpr: 14, hp: 60, kpi: 0.2 } },
    unitStats: { golem: { dpr: 10, hp: 50, kpi: 0.2, name: "Кам'яний голем", level: 3, raceId: null } },
  },
}));

vi.mock("@/lib/api/client", async (orig) => {
  const actual = await orig<Record<string, unknown>>();

  return {
    ...actual,
    campaignGet: vi.fn(async (_id: string, path: string) => (path === "/battles/balance" ? server.stats : [])),
    campaignPost: vi.fn(async (_id: string, path: string) => (path === "/battles/balance" ? { allyStats: { dpr: 42, totalHp: 180, kpi: 0.23, allyCount: 3 } } : {})),
  };
});
vi.mock("@/lib/api/characters", () => ({ getCharacters: vi.fn(async () => []) }));
vi.mock("@/lib/api/units", () => ({ getUnits: vi.fn(async () => []) }));
vi.mock("@/lib/api/races", () => ({ getRaces: vi.fn(async () => []) }));

import { useBattleSetup } from "../useBattleSetup";

let client: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}><ConfirmProvider>{children}</ConfirmProvider></QueryClientProvider>;

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useBattleSetup balance", () => {
  it("allies and an enemy unit produce a non-empty verdict from the stats endpoint", async () => {
    const { result } = renderHook(() => useBattleSetup("c1"), { wrapper });

    act(() => {
      for (const id of ["h1", "h2", "h3"]) result.current.handleParticipantToggle(id, ParticipantSourceType.CHARACTER, true);
      result.current.handleAddToSide("golem", ParticipantSourceType.UNIT, ParticipantSide.ENEMY, 5);
    });

    await waitFor(() => expect(result.current.entityStats).not.toBeNull());
    expect(result.current.fair?.party.dpr).toBe(42);
    expect(result.current.fair?.scaling.verdict).not.toBe("empty");
  });
});
