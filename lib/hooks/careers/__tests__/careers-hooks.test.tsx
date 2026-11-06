// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { careerKeys, useCareerForm, useCareers } from "..";

import { createCareer, getCareers, updateCareer } from "@/lib/api/careers";
import type { CareerData } from "@/types/careers";

vi.mock("@/lib/api/careers", () => ({ getCareers: vi.fn(), createCareer: vi.fn(), updateCareer: vi.fn(), deleteCareer: vi.fn(), getCareer: vi.fn() }));

const tier = { name: "T", characteristics: ["ws" as const], skills: ["athletics"], talents: [], trappings: [] };

const career: CareerData = { id: "k1", name: "Soldier", icon: null, class: null, tiers: [tier, tier, tier, tier] };

const wrapper = (client: QueryClient) => {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return Wrapper;
};

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("career hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useCareers loads through the api client under the list key", async () => {
    vi.mocked(getCareers).mockResolvedValue([career]);

    const client = newClient();

    const { result } = renderHook(() => useCareers("c1"), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getCareers).toHaveBeenCalledWith("c1");
    expect(result.current.data).toEqual([career]);
    expect(client.getQueryData(careerKeys.list("c1"))).toEqual([career]);
  });

  it("new form has four empty tiers and creates", async () => {
    vi.mocked(createCareer).mockResolvedValue(career);

    const { result } = renderHook(() => useCareerForm("c1"), { wrapper: wrapper(newClient()) });

    expect(result.current.form.data.tiers).toHaveLength(4);

    act(() => result.current.form.set((prev) => ({ ...prev, name: "  Soldier " })));
    await act(() => result.current.save());
    expect(createCareer).toHaveBeenCalledWith("c1", expect.objectContaining({ name: "Soldier" }));
  });

  it("existing career form updates by id", async () => {
    vi.mocked(updateCareer).mockResolvedValue(career);

    const { result } = renderHook(() => useCareerForm("c1", career), { wrapper: wrapper(newClient()) });

    await act(() => result.current.save());
    expect(updateCareer).toHaveBeenCalledWith("c1", "k1", expect.objectContaining({ name: "Soldier" }));
  });
});
