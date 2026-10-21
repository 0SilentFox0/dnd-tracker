// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import * as aiApi from "@/lib/api/ai";
import { useAiProposals } from "@/lib/hooks/ai";
import { scenarioKeys } from "@/lib/hooks/scenario/keys";

vi.mock("@/lib/api/ai", () => ({
  getAiProposals: vi.fn(async () => [{ id: "ap1", status: "pending" }]),
  applyAiProposal: vi.fn(async () => ({ id: "p1", version: 4, content: { legend: [], sections: [] } })),
  rejectAiProposal: vi.fn(),
}));

const setup = (opts: Parameters<typeof useAiProposals>[2] = {}) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return { qc, ...renderHook(() => useAiProposals("camp1", "p1", opts), { wrapper }) };
};

describe("useAiProposals", () => {
  it("apply: спершу beforeApply, потім запит, сторінка в кеші, onApplied", async () => {
    const order: string[] = [];

    const beforeApply = vi.fn(async () => {
      order.push("flush");

      return true;
    });

    vi.mocked(aiApi.applyAiProposal).mockImplementationOnce(async () => {
      order.push("apply");

      return { id: "p1", version: 4 } as never;
    });

    const onApplied = vi.fn();

    const { qc, result } = setup({ beforeApply, onApplied });

    await waitFor(() => expect(result.current.pending).toHaveLength(1));
    await act(() => result.current.apply("ap1"));

    expect(order).toEqual(["flush", "apply"]);
    expect(qc.getQueryData(scenarioKeys.page("camp1", "p1"))).toMatchObject({ version: 4 });
    expect(onApplied).toHaveBeenCalledWith(expect.objectContaining({ version: 4 }));
  });

  it("beforeApply повернув false (незбережено) — запит не йде", async () => {
    vi.mocked(aiApi.applyAiProposal).mockClear();

    const { result } = setup({ beforeApply: async () => false });

    await waitFor(() => expect(result.current.pending).toHaveLength(1));
    await act(() => result.current.apply("ap1"));

    expect(aiApi.applyAiProposal).not.toHaveBeenCalled();
  });
});
