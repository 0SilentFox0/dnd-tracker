// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";

const unit = { id: "u1", name: "Гоблін", race: "Гобліни", groupId: null, unitGroup: null, attacks: [], knownSpells: [] };

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/units", () => ({ getUnit: vi.fn(async () => unit), updateUnit: vi.fn(), deleteUnit: vi.fn() }));
vi.mock("@/lib/api/spells", () => ({ getSpells: vi.fn(async () => [{ id: "s1", name: "Іскра" }]) }));
vi.mock("@/lib/api/races", () => ({ getRaces: vi.fn(async () => []) }));

import { useUnitEditForm } from "@/lib/hooks/units";

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>
    <ConfirmProvider>{children}</ConfirmProvider>
  </QueryClientProvider>
);

afterEach(cleanup);

describe("useUnitEditForm", () => {
  it("loads the unit and spells, and keeps edits when the same snapshot refetches", async () => {
    const { result } = renderHook(() => useUnitEditForm("c1", "u1"), { wrapper });

    await waitFor(() => expect(result.current.formData.name).toBe("Гоблін"));
    await waitFor(() => expect(result.current.spells).toHaveLength(1));

    act(() => result.current.change({ name: "Орк" }));
    act(() => client.setQueryData(["unit", "c1", "u1"], { ...unit, maxHp: 99 }));
    await waitFor(() => expect(result.current.query.data?.maxHp).toBe(99));

    expect(result.current.formData.name).toBe("Орк");
  });
});
