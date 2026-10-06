// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";

const battle = { id: "b1", name: "Засідка", description: "", status: "prepared", participants: [{ id: "ch1", type: "character", side: "ally" }] };

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/battles", async (orig) => {
  const actual = await orig<Record<string, unknown>>();

  return Object.fromEntries([...Object.keys(actual).map((k) => [k, vi.fn()]), ["getBattle", vi.fn(async () => battle)]]);
});
vi.mock("@/lib/api/characters", () => ({ getCharacters: vi.fn(async () => [{ id: "ch1", name: "Арвен", type: "player", controlledBy: "u1", avatar: null }]) }));
vi.mock("@/lib/api/units", () => ({ getUnits: vi.fn(async () => []) }));

import { useEditBattleData } from "@/lib/hooks/battles";

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>
    <ConfirmProvider>{children}</ConfirmProvider>
  </QueryClientProvider>
);

afterEach(cleanup);

describe("useEditBattleData", () => {
  it("seeds the form once and keeps edits when the battle refetches", async () => {
    const { result } = renderHook(() => useEditBattleData("c1", "b1"), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.formData.name).toBe("Засідка");
    expect(result.current.characters).toHaveLength(1);

    act(() => result.current.setFormData({ name: "Нова", description: "" }));
    act(() => result.current.handleParticipantToggle("ch1", "character", false));
    act(() => client.setQueryData(["battle", "c1", "b1"], { ...battle, updatedAt: "2026-10-05T12:00:00Z" }));
    await waitFor(() => expect((result.current.battle as { updatedAt?: string } | undefined)?.updatedAt).toBeDefined());

    expect(result.current.formData.name).toBe("Нова");
    expect(result.current.participants).toEqual([]);
  });

  it("does not poll the prepared battle while the DM edits it", async () => {
    const { result } = renderHook(() => useEditBattleData("c1", "b1"), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const query = client.getQueryCache().find({ queryKey: ["battle", "c1", "b1"] });

    const interval = query?.observers[0]?.options.refetchInterval;

    expect(typeof interval === "function" ? interval(query as never) : interval).toBe(false);
  });
});
