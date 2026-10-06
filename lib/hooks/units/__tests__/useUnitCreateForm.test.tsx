// @vitest-environment happy-dom
import type { FormEvent, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const createUnit = vi.fn(async () => ({ id: "u9" }));

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: (...a: unknown[]) => push(...a), refresh: vi.fn() }) }));
vi.mock("@/lib/api/units", () => ({ createUnit: (...a: unknown[]) => createUnit(...(a as [])) }));
vi.mock("@/lib/api/spells", () => ({ getSpells: vi.fn(async () => []) }));
vi.mock("@/lib/api/races", () => ({ getRaces: vi.fn(async () => [{ id: "r1", name: "Орки" }]) }));

import { useUnitCreateForm } from "@/lib/hooks/units";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

afterEach(cleanup);

describe("useUnitCreateForm", () => {
  it("POST з raceId, 0 у числових полях лишається, після успіху — до списку", async () => {
    const { result } = renderHook(() => useUnitCreateForm("c1"), { wrapper });

    act(() => result.current.change({ name: "Шаман", raceId: "r1", armorClass: 0 }));
    act(() => result.current.submit({ preventDefault: () => {} } as FormEvent));

    await waitFor(() =>
      expect(createUnit).toHaveBeenCalledWith("c1", expect.objectContaining({ name: "Шаман", raceId: "r1", armorClass: 0, avatar: null })),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/campaigns/c1/dm/units"));
  });
});
