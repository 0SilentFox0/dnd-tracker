// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("@/lib/api/artifacts", () => ({
  getArtifacts: vi.fn(async () => [{ id: "a1", name: "Кільце", slot: "ring" }]),
  deleteArtifact: vi.fn(async () => undefined),
  createArtifact: vi.fn(),
  updateArtifact: vi.fn(),
  deleteAllArtifacts: vi.fn(),
}));

import { deleteArtifact } from "@/lib/api/artifacts";
import { useArtifactsList, useDeleteArtifact } from "@/lib/hooks/artifacts";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

afterEach(cleanup);

describe("artifacts hooks", () => {
  it("lists artifacts", async () => {
    const { result } = renderHook(() => useArtifactsList("c1"), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });

  it("delete refreshes the server-rendered list", async () => {
    const { result } = renderHook(() => useDeleteArtifact("c1"), { wrapper });

    await act(() => result.current.mutateAsync("a1"));

    expect(deleteArtifact).toHaveBeenCalledWith("c1", "a1");
    expect(refresh).toHaveBeenCalled();
  });
});
