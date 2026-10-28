// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  artifacts: [
    { id: "a1", name: "Кільце", slot: "ring", setId: null, abilitySummary: ["AC +1"] },
    { id: "a2", name: "Шолом", slot: "helmet", setId: "s1", artifactSet: { id: "s1", name: "Луска" } },
  ] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/api/artifacts", () => ({
  getArtifacts: vi.fn(async () => store.artifacts.map((a) => ({ ...a }))),
  updateArtifact: vi.fn(async (_c: string, id: string, data: { slot: string }) => {
    store.artifacts = store.artifacts.map((a) => (a.id === id ? { ...a, ...data } : a));

    return {};
  }),
  createArtifact: vi.fn(),
  deleteArtifact: vi.fn(),
  deleteAllArtifacts: vi.fn(),
}));
vi.mock("@/lib/api/artifact-sets", () => ({
  getArtifactSets: vi.fn(async () => [{ id: "s1", campaignId: "c1", name: "Луска", description: null, setBonus: null, createdAt: "" }]),
  createArtifactSet: vi.fn(),
  updateArtifactSet: vi.fn(),
  deleteArtifactSet: vi.fn(),
}));

import { useArtifactsCatalog } from "@/lib/hooks/artifact-sets";
import { useUpdateArtifact } from "@/lib/hooks/artifacts";

afterEach(cleanup);

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

describe("useArtifactsCatalog", () => {
  it("групує артефакти по сетах і слотах; зміна слоту переносить картку без reload", async () => {
    const { result } = renderHook(() => ({ catalog: useArtifactsCatalog("c1"), update: useUpdateArtifact("c1") }), { wrapper });

    await waitFor(() => expect(result.current.catalog.view.sets).toHaveLength(1));

    expect(result.current.catalog.count).toBe(2);
    expect(result.current.catalog.view.sets[0].artifacts.map((a) => a.id)).toEqual(["a2"]);
    expect(result.current.catalog.view.sets[0].set).toMatchObject({ icon: null, abilitySummary: [] });
    expect(result.current.catalog.view.bySlot).toEqual([
      expect.objectContaining({ slot: "ring", artifacts: [expect.objectContaining({ id: "a1", abilitySummary: ["AC +1"], rarity: null })] }),
    ]);

    await act(() => result.current.update.mutateAsync({ artifactId: "a1", data: { slot: "amulet" } }));

    await waitFor(() => expect(result.current.catalog.view.bySlot.map((g) => g.slot)).toEqual(["amulet"]));
  });

  it("пошук шукає за назвою артефакта й сету, ховає порожні групи", async () => {
    const { result } = renderHook(() => useArtifactsCatalog("c1"), { wrapper });

    await waitFor(() => expect(result.current.view.sets).toHaveLength(1));

    act(() => result.current.search.query.set("луска"));

    await waitFor(() => expect(result.current.view.bySlot).toEqual([]));

    expect(result.current.view.sets[0].artifacts.map((a) => a.id)).toEqual(["a2"]);

    act(() => result.current.search.query.set("кільце"));

    await waitFor(() => expect(result.current.view.sets).toEqual([]));

    expect(result.current.view.bySlot.map((g) => g.slot)).toEqual(["amulet"]);
  });
});
