// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getCampaignRules = vi.fn();

vi.mock("@/lib/api/rules", () => ({ getCampaignRules: (...args: unknown[]) => getCampaignRules(...args), updateCampaignRules: vi.fn() }));

import { useRuleSystem } from "@/lib/hooks/systems";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

describe("useRuleSystem", () => {
  it("is not ready until the campaign rules load", async () => {
    getCampaignRules.mockResolvedValue({ system: { key: "wfrp" } });

    const { result } = renderHook(() => useRuleSystem({ campaignId: "c" }), { wrapper });

    expect(result.current).toEqual({ key: undefined, system: undefined, ready: false });

    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.system?.key).toBe("wfrp");
  });

  it("is ready at once for an explicit key", () => {
    const { result } = renderHook(() => useRuleSystem({ key: "homm" }), { wrapper });

    expect(result.current.ready).toBe(true);
    expect(result.current.system?.key).toBe("homm");
  });
});
