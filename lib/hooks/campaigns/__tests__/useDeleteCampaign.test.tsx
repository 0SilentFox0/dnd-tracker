// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteCampaign } from "@/lib/api/campaigns";
import { useDeleteCampaign } from "@/lib/hooks/campaigns";

const push = vi.fn();

const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/lib/api/campaigns", () => ({ deleteCampaign: vi.fn() }));

describe("useDeleteCampaign", () => {
  beforeEach(() => vi.clearAllMocks());

  const setup = () => {
    const client = new QueryClient();

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

    return { client, ...renderHook(() => useDeleteCampaign("c1"), { wrapper }) };
  };

  it("після успіху чистить кеш кампанії й іде на /campaigns", async () => {
    vi.mocked(deleteCampaign).mockResolvedValue({ success: true });

    const { client, result } = setup();

    client.setQueryData(["campaign-members", "c1"], []);
    client.setQueryData(["campaign-members", "c2"], []);
    act(() => result.current.mutate());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/campaigns"));
    expect(deleteCampaign).toHaveBeenCalledWith("c1");
    expect(refresh).toHaveBeenCalled();
    expect(client.getQueryData(["campaign-members", "c1"])).toBeUndefined();
    expect(client.getQueryData(["campaign-members", "c2"])).toEqual([]);
  });

  it("при помилці не переходить", async () => {
    vi.mocked(deleteCampaign).mockRejectedValue(new Error("fail"));

    const { result } = setup();

    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(push).not.toHaveBeenCalled();
  });
});
