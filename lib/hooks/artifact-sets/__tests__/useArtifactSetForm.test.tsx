// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/api/artifacts", () => ({
  getArtifacts: vi.fn(async () => [
    { id: "a1", name: "Шолом", slot: "helmet", setId: null },
    { id: "a2", name: "Плащ", slot: "cloak", setId: "other" },
    { id: "a3", name: "Чоботи", slot: "boots", setId: "s1" },
  ]),
}));
vi.mock("@/lib/api/artifact-sets", () => ({
  updateArtifactSet: vi.fn(async () => ({})),
  createArtifactSet: vi.fn(async () => ({})),
  deleteArtifactSet: vi.fn(),
  getArtifactSets: vi.fn(),
}));

import { updateArtifactSet } from "@/lib/api/artifact-sets";
import { useArtifactSetForm } from "@/lib/hooks/artifact-sets";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ConfirmProvider>{children}</ConfirmProvider>
  </QueryClientProvider>
);

afterEach(cleanup);

describe("useArtifactSetForm", () => {
  it("offers only free artifacts or ones already in this set", async () => {
    const { result } = renderHook(() => useArtifactSetForm({ campaignId: "c1", setId: "s1", initial: { name: "Дракон", artifactIds: ["a3"] } }), { wrapper });

    await waitFor(() => expect(result.current.selectableArtifacts.map((a) => a.id)).toEqual(["a1", "a3"]));
  });

  it("saves the selected members and trimmed bonus, then returns to the list", async () => {
    const { result } = renderHook(() => useArtifactSetForm({ campaignId: "c1", setId: "s1", initial: { name: "Дракон", artifactIds: ["a3"], setBonus: { name: " Кров " } } }), { wrapper });

    act(() => result.current.toggleArtifact("a1"));
    await act(() => result.current.submit({ preventDefault: () => {} } as React.FormEvent));

    expect(updateArtifactSet).toHaveBeenCalledWith("c1", "s1", expect.objectContaining({ name: "Дракон", description: null, artifactIds: ["a3", "a1"], setBonus: { name: "Кров", description: undefined }, icon: null }));
    expect(push).toHaveBeenCalledWith("/campaigns/c1/dm/artifact-sets");
  });
});
