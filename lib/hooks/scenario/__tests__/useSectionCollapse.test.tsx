// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useSectionCollapse } from "@/lib/hooks/scenario";

afterEach(() => localStorage.clear());

describe("useSectionCollapse", () => {
  it("розгортає окремий розділ; перемикач розгортає всі й запам'ятовується", () => {
    const { result } = renderHook(() => useSectionCollapse());

    expect(result.current.isExpanded("a")).toBe(false);
    act(() => result.current.expand("a"));
    expect(result.current.isExpanded("a")).toBe(true);
    expect(result.current.isExpanded("b")).toBe(false);

    act(() => result.current.setShowPlayed(true));
    expect(result.current.isExpanded("b")).toBe(true);

    const again = renderHook(() => useSectionCollapse());

    expect(again.result.current.showPlayed).toBe(true);
  });
});
