// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBattleViewMode } from "../useBattleViewMode";

describe("useBattleViewMode", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("за замовчуванням карта; вибір памʼятається для кожного бою", () => {
    const first = renderHook(() => useBattleViewMode("b1"));

    expect(first.result.current[0]).toBe("map");
    act(() => first.result.current[1]("columns"));
    expect(first.result.current[0]).toBe("columns");
    first.unmount();

    expect(renderHook(() => useBattleViewMode("b1")).result.current[0]).toBe("columns");
    expect(renderHook(() => useBattleViewMode("b2")).result.current[0]).toBe("map");
  });

  it("працює, коли сховище кидає помилку", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });

    const { result } = renderHook(() => useBattleViewMode("b1"));

    expect(result.current[0]).toBe("map");
    act(() => result.current[1]("columns"));
    expect(result.current[0]).toBe("columns");
  });
});
