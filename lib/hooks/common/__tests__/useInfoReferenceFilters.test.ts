// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useInfoReferenceFilters } from "@/lib/hooks/common/useInfoReferenceFilters";
import type { ArtifactForReference } from "@/types/info-reference";

const art = (over: Partial<ArtifactForReference>): ArtifactForReference => ({
  id: "x",
  name: "Артефакт",
  icon: null,
  rarity: "rare",
  slot: "weapon",
  slotLabel: "Зброя",
  description: null,
  effects: [],
  setName: null,
  holderName: null,
  ...over,
});

const artifacts = [
  art({ id: "1", name: "Меч", rarity: "rare", holderName: "Боромир" }),
  art({ id: "2", name: "Щит", rarity: "epic", slot: "shield", slotLabel: "Щит", setName: "Набір" }),
];

describe("useInfoReferenceFilters: артефакти", () => {
  it("фільтрує за рідкістю", () => {
    const { result } = renderHook(() => useInfoReferenceFilters([], [], artifacts));

    act(() => result.current.filters.artifact.rarity.set("epic"));

    expect(result.current.results.filteredArtifacts.map((a) => a.id)).toEqual(["2"]);
    expect(result.current.filters.hasActive).toBe(true);
  });

  it("шукає за власником", () => {
    const { result } = renderHook(() => useInfoReferenceFilters([], [], artifacts));

    act(() => result.current.filters.search.set("боромир"));

    expect(result.current.results.filteredArtifacts.map((a) => a.id)).toEqual(["1"]);
  });

  it("скидає фільтри артефактів", () => {
    const { result } = renderHook(() => useInfoReferenceFilters([], [], artifacts));

    act(() => result.current.filters.artifact.artifactSet.set("Набір"));
    act(() => result.current.filters.clearAll());

    expect(result.current.results.filteredArtifacts).toHaveLength(2);
    expect(result.current.filters.hasActive).toBe(false);
  });
});
