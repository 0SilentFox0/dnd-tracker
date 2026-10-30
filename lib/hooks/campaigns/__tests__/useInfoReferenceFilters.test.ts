// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useInfoReferenceFilters } from "@/lib/hooks/campaigns/useInfoReferenceFilters";
import type { ArtifactForReference, ClassForReference, SpellForReference } from "@/types/info-reference";

const art = (over: Partial<ArtifactForReference>): ArtifactForReference => ({
  id: "x",
  name: "Артефакт",
  icon: null,
  rarity: "rare",
  slot: "weapon",
  description: null,
  effects: [],
  setName: null,
  holderName: null,
  ...over,
});

const artifacts = [
  art({ id: "1", name: "Меч", rarity: "rare", holderName: "Боромир" }),
  art({ id: "2", name: "Щит", rarity: "epic", slot: "shield", setName: "Набір" }),
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

describe("useInfoReferenceFilters: класи", () => {
  const cls: ClassForReference = { id: "k", name: "Воїн", icon: null, color: null, summary: [{ key: "hitDie", params: { die: 10 } }], features: [{ level: 2, name: "Сплеск дій", description: null }], subclasses: [] };

  it("у класовому режимі ховає скіли та шукає за вміннями класу", () => {
    const { result } = renderHook(() => useInfoReferenceFilters([], [], [], [cls]));

    expect(result.current.filters.classMode).toBe(true);
    expect(result.current.filters.visible).toMatchObject({ skills: false, classes: true });

    act(() => result.current.filters.search.set("сплеск"));

    expect(result.current.results.filteredClasses).toHaveLength(1);

    act(() => result.current.filters.search.set("нема"));

    expect(result.current.ui.nothingFound).toBe(true);
  });

  it("без класів показує скіли, не класи", () => {
    const { result } = renderHook(() => useInfoReferenceFilters([], [], [], null));

    expect(result.current.filters.classMode).toBe(false);
    expect(result.current.filters.visible).toMatchObject({ skills: true, classes: false });
  });
});

describe("useInfoReferenceFilters: заклинання", () => {
  const spell = (id: string, over: Partial<SpellForReference>): SpellForReference => ({
    id,
    name: id,
    level: 1,
    targeting: { kind: "enemy" },
    facetKey: "enemy",
    cost: "action",
    resolution: { kind: "auto" },
    dice: 0,
    description: null,
    effects: [],
    appearanceDescription: null,
    groupName: null,
    icon: null,
    ...over,
  });

  const spells = [spell("a", {}), spell("b", {}), spell("c", { targeting: { kind: "allAllies" }, facetKey: "allAllies" })];

  it("групує цілі за facetKey і фільтрує за ним", () => {
    const { result } = renderHook(() => useInfoReferenceFilters([], spells));

    expect(result.current.filters.spell.type.options.map((o) => o.value).sort()).toEqual(["allAllies", "enemy"]);

    act(() => result.current.filters.spell.type.set("enemy"));

    expect(result.current.results.filteredSpells.map((s) => s.id)).toEqual(["a", "b"]);
  });
});
