// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as scenarioApi from "@/lib/api/scenario";
import { scenarioKeys, useGenerateScenarioSummary, useScenarioSummaries } from "@/lib/hooks/scenario";

vi.mock("@/lib/api/scenario", () => ({ getScenarioSummaries: vi.fn(), generateScenarioSummary: vi.fn() }));

const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

  return { client, wrapper };
};

describe("scenario summaries hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads summaries for the campaign", async () => {
    vi.mocked(scenarioApi.getScenarioSummaries).mockResolvedValue({ available: true, summaries: {} });

    const { wrapper } = setup();

    const { result } = renderHook(() => useScenarioSummaries("c1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(scenarioApi.getScenarioSummaries).toHaveBeenCalledWith("c1");
  });

  it("invalidates only the summaries key after generate", async () => {
    vi.mocked(scenarioApi.generateScenarioSummary).mockResolvedValue({ summary: { overview: "", events: [], secrets: [], entities: [], digest: "" }, version: 1, stale: false, truncated: false });

    const { client, wrapper } = setup();

    const spy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useGenerateScenarioSummary("c1"), { wrapper });

    act(() => result.current.generate("p1", true));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(scenarioApi.generateScenarioSummary).toHaveBeenCalledWith("c1", "p1", true);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ queryKey: scenarioKeys.summaries("c1") });
  });

  it("exposes the error message", async () => {
    vi.mocked(scenarioApi.generateScenarioSummary).mockRejectedValue(new Error("boom"));

    const { wrapper } = setup();

    const { result } = renderHook(() => useGenerateScenarioSummary("c1"), { wrapper });

    act(() => result.current.generate("p1"));
    await waitFor(() => expect(result.current.errorFor("p1")).toBe("boom"));
    expect(result.current.errorFor("p2")).toBeNull();
    expect(result.current.pendingPageId).toBeNull();
  });
});
