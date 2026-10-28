// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const feats = [
  { id: "a", name: "Alert", type: "origin" },
  { id: "b", name: "Archery", type: "fightingStyle" },
];

vi.mock("@/lib/hooks/feats/useFeats", () => ({
  useFeats: () => ({ data: feats, isLoading: false }),
  useCreateFeat: () => ({ mutate: vi.fn() }),
  useDeleteFeat: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/lib/hooks/common", () => ({ useConfirm: () => vi.fn(async () => true), useNotify: () => vi.fn() }));

import { useFeatsList } from "@/lib/hooks/feats/useFeatsList";

describe("useFeatsList", () => {
  it("filters by feat type", () => {
    const { result } = renderHook(() => useFeatsList("c1"));

    expect(result.current.feats).toHaveLength(2);

    act(() => result.current.typeFilter.set("fightingStyle"));

    expect(result.current.feats.map((f) => f.name)).toEqual(["Archery"]);
    expect(result.current.all).toHaveLength(2);
  });
});
