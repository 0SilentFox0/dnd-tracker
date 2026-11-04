// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSetupUnitsFilter } from "@/lib/hooks/battles";
import { SEARCH_DEBOUNCE_MS } from "@/lib/hooks/common";
import type { SetupUnit } from "@/types/battle-setup";

const unit = (id: string, name: string, raceName: string | null, level = 1): SetupUnit => ({ id, name, raceName, raceId: null, avatar: null, level });

const units = [unit("1", "Goblin", "Goblinoid"), unit("2", "Hobgoblin", "Goblinoid", 2), unit("3", "Wolf", "Beast"), unit("4", "Ghost", null)];

describe("useSetupUnitsFilter", () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => vi.useRealTimers());

  it("групує за расою й дає чіпи з лічильниками", () => {
    const { result } = renderHook(() => useSetupUnitsFilter(units));

    expect(result.current.groups.size).toBe(3);
    expect(result.current.chips.find((c) => c.key === "Goblinoid")?.count).toBe(2);
    expect(result.current.isFiltered).toBe(false);
  });

  it("пошук (з дебаунсом) звужує групи за назвою", () => {
    const { result } = renderHook(() => useSetupUnitsFilter(units));

    act(() => result.current.query.set("wolf"));
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

    expect([...result.current.groups.keys()]).toEqual(["Beast"]);
    expect(result.current.isFiltered).toBe(true);
  });

  it("чіп раси фільтрує, повторний клік знімає", () => {
    const { result } = renderHook(() => useSetupUnitsFilter(units));

    act(() => result.current.toggleRace("Beast"));

    expect([...result.current.groups.keys()]).toEqual(["Beast"]);

    act(() => result.current.toggleRace("Beast"));

    expect(result.current.groups.size).toBe(3);
  });
});
