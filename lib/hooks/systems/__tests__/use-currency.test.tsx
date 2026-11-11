// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getCampaignRules = vi.fn();

vi.mock("@/lib/api/rules", () => ({ getCampaignRules: (...args: unknown[]) => getCampaignRules(...args), updateCampaignRules: vi.fn() }));

import { useCurrency } from "@/lib/hooks/systems";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

describe("useCurrency", () => {
  it("uses the default table and inventory labels until rules load and for d20", async () => {
    getCampaignRules.mockResolvedValue({ system: { key: "dnd5e" } });

    const { result } = renderHook(() => useCurrency("c"), { wrapper });

    expect(result.current.value).toEqual({ gp: 100, sp: 10, cp: 1 });
    expect(result.current.label("gp")).toContain("inventory.coins.gp");

    await waitFor(() => expect(getCampaignRules).toHaveBeenCalled());

    expect(result.current.value.gp).toBe(100);
  });

  it("switches to the 12/20 table for wfrp", async () => {
    getCampaignRules.mockResolvedValue({ system: { key: "wfrp" } });

    const { result } = renderHook(() => useCurrency("c"), { wrapper });

    await waitFor(() => expect(result.current.value.gp).toBe(240));

    expect(result.current.value.sp).toBe(12);
    expect(result.current.label("sp")).toContain("wfrpEquipment.money.ss");
  });
});
